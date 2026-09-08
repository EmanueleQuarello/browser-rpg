import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireUser, signToken, userId } from "../lib/auth.js";
import { sendWelcomeEmail } from "../lib/mail.js";
import { prisma } from "../lib/prisma.js";

const creds = z.object({
  email: z.string().trim().min(3).max(200),
  password: z.string().min(6),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (req, reply) => {
    const parsed = creds.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid payload" });
    const email = parsed.data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return reply.code(409).send({ error: "Email already registered" });
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    const token = await signToken(app, user.id, user.email);
    void sendWelcomeEmail(user.email);
    return { token, user: { id: user.id, email: user.email } };
  });

  app.post("/login", async (req, reply) => {
    const parsed = creds.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid payload" });
    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(401).send({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: "Invalid credentials" });
    const token = await signToken(app, user.id, user.email);
    return { token, user: { id: user.id, email: user.email } };
  });

  app.post("/demo", async () => {
    const email = "demo@browser-rpg.local";
    const passwordHash = await bcrypt.hash("demo1234", 10);
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash },
      update: { passwordHash },
    });
    const token = await signToken(app, user.id, user.email);
    return { token, user: { id: user.id, email: user.email } };
  });

  app.get(
    "/me",
    { preHandler: requireUser },
    async (req) => {
      const user = await prisma.user.findUnique({ where: { id: userId(req) } });
      if (!user) return { user: null };
      return { user: { id: user.id, email: user.email } };
    },
  );
}
