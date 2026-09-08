import { AwsClient } from "aws4fetch";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import { UPLOAD_ROOT } from "./paths.js";

export function r2Enabled(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_BASE_URL,
  );
}

function r2PublicBase(): string {
  return (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
}

function r2Client(): AwsClient {
  return new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(key: string): string {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const bucket = process.env.R2_BUCKET_NAME!;
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
}

export function assetPublicUrl(storedPath: string, fileId: string, apiOrigin: string): string {
  if (storedPath.startsWith("r2:")) return `${r2PublicBase()}/${storedPath.slice(3)}`;
  return `${apiOrigin}/api/files/${fileId}`;
}

export async function putAssetFile(opts: {
  adventureId: string;
  assetId: string;
  ext: string;
  mime: string;
  body: Readable;
}): Promise<{ storedPath: string; filename: string }> {
  const filename = `${opts.assetId}${opts.ext}`;
  if (r2Enabled()) {
    const key = `adventures/${opts.adventureId}/${filename}`;
    const buf = await readableToBuffer(opts.body);
    const res = await r2Client().fetch(objectUrl(key), {
      method: "PUT",
      headers: { "Content-Type": opts.mime },
      body: new Uint8Array(buf),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`R2 upload failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    return { storedPath: `r2:${key}`, filename };
  }
  const dir = path.join(UPLOAD_ROOT, opts.adventureId);
  await mkdir(dir, { recursive: true });
  const dest = path.join(dir, filename);
  await pipeline(opts.body, createWriteStream(dest));
  return { storedPath: dest, filename };
}

export async function deleteAssetFile(storedPath: string): Promise<void> {
  if (storedPath.startsWith("r2:")) {
    if (!r2Enabled()) return;
    const key = storedPath.slice(3);
    await r2Client().fetch(objectUrl(key), { method: "DELETE" }).catch(() => undefined);
    return;
  }
  await unlink(storedPath).catch(() => undefined);
}

async function readableToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
