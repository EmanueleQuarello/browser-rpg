import { parseAdventurePack } from "@browser-rpg/shared";
import type { FastifyInstance } from "fastify";
import { requireUser, userId } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { originOf, resolvePackAssets } from "./adventures.js";

export async function playRoutes(app: FastifyInstance) {
  app.get("/:slug", { preHandler: requireUser }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const adv = await prisma.adventure.findFirst({
      where: { slug, publishedAt: { not: null } },
    });
    if (!adv) return reply.code(404).send({ error: "Adventure not found" });
    const pack = resolvePackAssets(parseAdventurePack(JSON.parse(adv.packJson)), originOf(req));
    const save = await prisma.savegame.findUnique({
      where: { userId_adventureId: { userId: userId(req), adventureId: adv.id } },
    });
    return {
      adventure: { id: adv.id, title: adv.title, slug: adv.slug, pack },
      save: save ? JSON.parse(save.stateJson) : null,
    };
  });
}

export async function savegameRoutes(app: FastifyInstance) {
  app.get("/:adventureId", { preHandler: requireUser }, async (req, reply) => {
    const { adventureId } = req.params as { adventureId: string };
    const save = await prisma.savegame.findUnique({
      where: { userId_adventureId: { userId: userId(req), adventureId } },
    });
    if (!save) return reply.code(404).send({ error: "No save" });
    return { state: JSON.parse(save.stateJson) };
  });

  app.put("/:adventureId", { preHandler: requireUser }, async (req, reply) => {
    const { adventureId } = req.params as { adventureId: string };
    const adv = await prisma.adventure.findUnique({ where: { id: adventureId } });
    if (!adv) return reply.code(404).send({ error: "Not found" });
    const body = req.body as { state?: unknown };
    if (!body.state) return reply.code(400).send({ error: "Missing state" });
    const save = await prisma.savegame.upsert({
      where: { userId_adventureId: { userId: userId(req), adventureId } },
      update: { stateJson: JSON.stringify(body.state) },
      create: {
        userId: userId(req),
        adventureId,
        stateJson: JSON.stringify(body.state),
      },
    });
    return { ok: true, updatedAt: save.updatedAt };
  });
}
