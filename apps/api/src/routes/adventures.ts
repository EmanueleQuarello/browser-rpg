import { createDemoPack, parseAdventurePack, type AdventurePack } from "@browser-rpg/shared";
import type { FastifyInstance } from "fastify";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { requireUser, userId } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { UPLOAD_ROOT } from "../lib/paths.js";

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .slice(0, 40) || "adventure";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

function locTitle(pack: AdventurePack): string {
  return pack.meta.title.it || pack.meta.title.en || "Adventure";
}

export function resolvePackAssets(pack: AdventurePack, _origin?: string): AdventurePack {
  return {
    ...pack,
    assets: pack.assets.map((a) =>
      a.src.startsWith("file:") ? { ...a, src: `/api/files/${a.src.slice(5)}` } : a,
    ),
  };
}

export async function adventureRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: requireUser }, async (req) => {
    const list = await prisma.adventure.findMany({
      where: { ownerId: userId(req) },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, slug: true, publishedAt: true, updatedAt: true },
    });
    return { adventures: list };
  });

  app.post("/", { preHandler: requireUser }, async (req) => {
    const pack = createDemoPack();
    const created = await prisma.adventure.create({
      data: {
        ownerId: userId(req),
        title: locTitle(pack),
        packJson: JSON.stringify(pack),
      },
    });
    return { adventure: { id: created.id, title: created.title, pack } };
  });

  app.get("/:id", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const adv = await prisma.adventure.findFirst({
      where: { id, ownerId: userId(req) },
      include: { assets: true },
    });
    if (!adv) return reply.code(404).send({ error: "Not found" });
    const pack = parseAdventurePack(JSON.parse(adv.packJson));
    return {
      adventure: {
        id: adv.id,
        title: adv.title,
        slug: adv.slug,
        publishedAt: adv.publishedAt,
        pack: resolvePackAssets(pack, originOf(req)),
        assets: adv.assets.map((a) => ({
          id: a.id,
          originalName: a.originalName,
          mime: a.mime,
          url: `${originOf(req)}/api/files/${a.id}`,
        })),
      },
    };
  });

  app.put("/:id", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const adv = await prisma.adventure.findFirst({ where: { id, ownerId: userId(req) } });
    if (!adv) return reply.code(404).send({ error: "Not found" });
    const body = req.body as { pack?: unknown; title?: string };
    let pack: AdventurePack;
    try {
      pack = parseAdventurePack(body.pack);
    } catch {
      return reply.code(400).send({ error: "Invalid adventure pack" });
    }
    const updated = await prisma.adventure.update({
      where: { id },
      data: { packJson: JSON.stringify(pack), title: body.title || locTitle(pack) },
    });
    return { adventure: { id: updated.id, title: updated.title, slug: updated.slug } };
  });

  app.delete("/:id", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const adv = await prisma.adventure.findFirst({ where: { id, ownerId: userId(req) } });
    if (!adv) return reply.code(404).send({ error: "Not found" });
    await prisma.adventure.delete({ where: { id } });
    return { ok: true };
  });

  app.post("/:id/publish", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const adv = await prisma.adventure.findFirst({ where: { id, ownerId: userId(req) } });
    if (!adv) return reply.code(404).send({ error: "Not found" });
    const slug = adv.slug ?? slugify(adv.title);
    const updated = await prisma.adventure.update({
      where: { id },
      data: { slug, publishedAt: new Date() },
    });
    return { slug: updated.slug, url: `/play/${updated.slug}` };
  });

  app.post("/:id/assets", { preHandler: requireUser }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const adv = await prisma.adventure.findFirst({ where: { id, ownerId: userId(req) } });
    if (!adv) return reply.code(404).send({ error: "Not found" });
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "Missing file" });
    const mime = file.mimetype;
    if (!mime.startsWith("image/")) return reply.code(400).send({ error: "Images only" });
    const dir = path.join(UPLOAD_ROOT, id);
    await mkdir(dir, { recursive: true });
    const assetId = crypto.randomUUID();
    const ext = path.extname(file.filename || "") || ".png";
    const stored = `${assetId}${ext}`;
    const dest = path.join(dir, stored);
    await pipeline(file.file, createWriteStream(dest));
    const row = await prisma.asset.create({
      data: {
        id: assetId,
        adventureId: id,
        filename: stored,
        mime,
        path: dest,
        originalName: file.filename || stored,
      },
    });
    return {
      asset: {
        id: row.id,
        originalName: row.originalName,
        mime: row.mime,
        url: `${originOf(req)}/api/files/${row.id}`,
        src: `file:${row.id}`,
      },
    };
  });

  app.delete("/:id/assets/:assetId", { preHandler: requireUser }, async (req, reply) => {
    const { id, assetId } = req.params as { id: string; assetId: string };
    const adv = await prisma.adventure.findFirst({ where: { id, ownerId: userId(req) } });
    if (!adv) return reply.code(404).send({ error: "Not found" });
    const asset = await prisma.asset.findFirst({ where: { id: assetId, adventureId: id } });
    if (!asset) return reply.code(404).send({ error: "Not found" });
    await unlink(asset.path).catch(() => undefined);
    await prisma.asset.delete({ where: { id: assetId } });
    return { ok: true };
  });
}

export function originOf(req: { headers: { origin?: string; host?: string }; protocol: string }): string {
  if (req.headers.origin) return req.headers.origin;
  return `http://${req.headers.host ?? "localhost:3001"}`;
}
