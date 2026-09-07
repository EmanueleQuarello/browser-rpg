import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const API_ROOT = path.resolve(here, "../..");
export const UPLOAD_ROOT = path.join(API_ROOT, "data", "uploads");
