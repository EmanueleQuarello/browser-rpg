import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import bcrypt from "bcryptjs";
import { createReadStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createDemoPack } from "@browser-rpg/shared";
import { prisma } from "./lib/prisma.js";
import { UPLOAD_ROOT } from "./lib/paths.js";
import { adventureRoutes } from "./routes/adventures.js";
import { authRoutes } from "./routes/auth.js";
import { playRoutes, savegameRoutes } from "./routes/play.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

async function seedDemo() {
  const email = "demo@browser-rpg.local";
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });
  const pack = createDemoPack();
  const existing = await prisma.adventure.findFirst({ where: { slug: "demo" } });
  if (!existing) {
    await prisma.adventure.create({
      data: {
        ownerId: user.id,
        title: pack.meta.title.it,
        slug: "demo",
        publishedAt: new Date(),
        packJson: JSON.stringify(pack),
      },
    });
    console.log("Seeded published demo adventure at /play/demo");
  } else {
    await prisma.adventure.update({
      where: { id: existing.id },
      data: { packJson: JSON.stringify(pack), title: pack.meta.title.it },
    });
  }
}

async function main() {
  await mkdir(UPLOAD_ROOT, { recursive: true });
  await seedDemo();

  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true, credentials: true });
  await app.register(jwt, { secret: process.env.JWT_SECRET ?? "dev-secret", sign: { expiresIn: "7d" } });
  await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024 } });

  app.get("/api/health", async () => ({ ok: true }));

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(adventureRoutes, { prefix: "/api/adventures" });
  await app.register(playRoutes, { prefix: "/api/play" });
  await app.register(savegameRoutes, { prefix: "/api/savegames" });

  app.get("/api/files/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return reply.code(404).send({ error: "Not found" });
    reply.header("Content-Type", asset.mime);
    return reply.send(createReadStream(asset.path));
  });

  await app.listen({ port: PORT, host: HOST });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
