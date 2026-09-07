import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}

export function userId(req: FastifyRequest): string {
  const payload = req.user as { sub: string };
  return payload.sub;
}

export async function signToken(app: FastifyInstance, id: string, email: string) {
  return app.jwt.sign({ sub: id, email });
}
