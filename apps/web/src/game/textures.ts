export const TILE_COUNT = 12;
export const SPRITE_KEYS = ["player", "npc", "slime", "key", "potion"] as const;
export type BuiltinSprite = (typeof SPRITE_KEYS)[number];

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, id: number) {
  ctx.clearRect(x, y, s, s);
  switch (id) {
    case 0:
      return;
    case 1: {
      px(ctx, x, y, s, s, "#3d7a32");
      px(ctx, x + 4, y + 6, 3, 3, "#5aad45");
      px(ctx, x + 18, y + 14, 3, 3, "#2f5e28");
      px(ctx, x + 10, y + 22, 3, 3, "#5aad45");
      break;
    }
    case 2:
      px(ctx, x, y, s, s, "#c2a36b");
      px(ctx, x + 6, y + 8, 4, 2, "#a88850");
      px(ctx, x + 16, y + 18, 5, 2, "#d8bc86");
      break;
    case 3:
      px(ctx, x, y, s, s, "#2a6aa8");
      px(ctx, x, y + 8, s, 3, "#3c88c8");
      px(ctx, x, y + 20, s, 3, "#1d4e80");
      break;
    case 4:
      px(ctx, x, y, s, s, "#5a5856");
      px(ctx, x + 1, y + 1, 14, 14, "#7a7672");
      px(ctx, x + 16, y + 1, 15, 14, "#686460");
      px(ctx, x + 1, y + 16, 14, 15, "#6e6a66");
      px(ctx, x + 16, y + 16, 15, 15, "#80807a");
      break;
    case 5:
      px(ctx, x, y, s, s, "#4a4038");
      px(ctx, x + 2, y + 2, s - 4, s - 4, "#5a5046");
      px(ctx, x + 14, y, 2, s, "#3a342e");
      px(ctx, x, y + 14, s, 2, "#3a342e");
      break;
    case 6:
      px(ctx, x, y, s, s, "#4a4038");
      px(ctx, x + 4, y + 2, 24, 28, "#6b3f24");
      px(ctx, x + 20, y + 14, 4, 4, "#d4b15a");
      break;
    case 7:
      px(ctx, x, y, s, s, "#2a2420");
      px(ctx, x + 2, y + 2, 8, 28, "#6b3f24");
      px(ctx, x + 22, y + 2, 8, 28, "#5a341c");
      break;
    case 8:
      px(ctx, x, y, s, s, "#3d7a32");
      px(ctx, x + 13, y + 18, 6, 12, "#5a3a22");
      px(ctx, x + 6, y + 4, 20, 18, "#227034");
      px(ctx, x + 10, y + 8, 12, 12, "#2d8a40");
      break;
    case 9:
      px(ctx, x, y, s, s, "#8a5a3a");
      px(ctx, x + 2, y + 2, s - 4, s - 4, "#a56c46");
      px(ctx, x + 12, y + 12, 8, 12, "#3a2418");
      break;
    case 10:
      px(ctx, x, y, s, s, "#7a3030");
      px(ctx, x + 2, y + 10, 28, 12, "#9a4040");
      break;
    case 11:
      px(ctx, x, y, s, s, "#4a4038");
      for (let i = 0; i < 5; i++) {
        px(ctx, x + 4 + i * 2, y + 6 + i * 4, 24 - i * 4, 3, i % 2 ? "#d4b15a" : "#6a5a40");
      }
      break;
    default:
      px(ctx, x, y, s, s, "#ff00ff");
  }
}

export function makeTilesetCanvas(tileSize = 32): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = tileSize * TILE_COUNT;
  c.height = tileSize;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < TILE_COUNT; i++) drawTile(ctx, i * tileSize, 0, tileSize, i);
  return c;
}

export function drawSprite(ctx: CanvasRenderingContext2D, kind: BuiltinSprite, s = 32) {
  ctx.clearRect(0, 0, s, s);
  switch (kind) {
    case "player":
      px(ctx, 10, 18, 12, 10, "#3a4a8a");
      px(ctx, 12, 8, 8, 10, "#e8c8a0");
      px(ctx, 10, 6, 12, 5, "#2a2a2a");
      px(ctx, 12, 28, 4, 4, "#3a2a1a");
      px(ctx, 18, 28, 4, 4, "#3a2a1a");
      px(ctx, 8, 20, 4, 8, "#e8c8a0");
      px(ctx, 20, 20, 4, 8, "#e8c8a0");
      break;
    case "npc":
      px(ctx, 10, 16, 12, 12, "#6a3a8a");
      px(ctx, 12, 8, 8, 10, "#d0b090");
      px(ctx, 8, 6, 16, 6, "#e8e0d0");
      px(ctx, 12, 28, 8, 4, "#3a2a1a");
      break;
    case "slime":
      px(ctx, 6, 12, 20, 16, "#3cb86a");
      px(ctx, 8, 10, 16, 6, "#54d888");
      px(ctx, 12, 16, 3, 4, "#102010");
      px(ctx, 20, 16, 3, 4, "#102010");
      break;
    case "key":
      px(ctx, 14, 6, 6, 10, "#d4b15a");
      px(ctx, 12, 4, 10, 6, "#d4b15a");
      px(ctx, 16, 16, 3, 12, "#d4b15a");
      px(ctx, 16, 24, 8, 3, "#d4b15a");
      break;
    case "potion":
      px(ctx, 12, 8, 8, 4, "#c0c8d0");
      px(ctx, 10, 12, 12, 16, "#c45c8a");
      px(ctx, 12, 14, 8, 6, "#e080a8");
      break;
  }
}

export function makeSpriteCanvas(kind: BuiltinSprite, tileSize = 32): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = tileSize;
  c.height = tileSize;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  drawSprite(ctx, kind, tileSize);
  return c;
}

export function drawPrompt(ctx: CanvasRenderingContext2D, s = 16) {
  const cx = s / 2;
  const cy = s / 2 + 1;
  ctx.fillStyle = "#1a1208";
  ctx.beginPath();
  ctx.moveTo(cx, 1);
  ctx.lineTo(s - 1, cy);
  ctx.lineTo(cx, s - 1);
  ctx.lineTo(1, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d4b15a";
  ctx.beginPath();
  ctx.moveTo(cx, 3);
  ctx.lineTo(s - 3, cy);
  ctx.lineTo(cx, s - 3);
  ctx.lineTo(3, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1a1208";
  ctx.fillRect(cx - 1, 5, 2, 5);
  ctx.fillRect(cx - 1, 11, 2, 2);
}

export function makePromptCanvas(size = 16): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size, size);
  drawPrompt(ctx, size);
  return c;
}

export function isBuiltin(src: string): src is `builtin:${string}` {
  return src.startsWith("builtin:");
}
