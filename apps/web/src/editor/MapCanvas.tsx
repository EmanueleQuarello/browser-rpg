import { TILE_SIZE, type AdventurePack, type GameMap, type MapEntity } from "@browser-rpg/shared";
import { useEffect, useRef } from "react";
import { drawPrompt, drawTile, makeSpriteCanvas, type BuiltinSprite } from "../game/textures";

export type EditorTool = "paint" | "collision" | "erase" | "place";

type Props = {
  pack: AdventurePack;
  map: GameMap;
  tool: EditorTool;
  tile: number;
  layer: "ground" | "overlay";
  placeKind: MapEntity["kind"];
  onChangeMap: (map: GameMap) => void;
  selectedEntityId?: string;
  onSelectEntity: (id: string | undefined) => void;
};

export function MapCanvas({
  pack,
  map,
  tool,
  tile,
  layer,
  placeKind,
  onChangeMap,
  selectedEntityId,
  onSelectEntity,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const scale = 1.5;
  const ts = TILE_SIZE * scale;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = map.width * ts;
    canvas.height = map.height * ts;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        drawTile(ctx, x * ts, y * ts, ts, map.ground[y]![x] ?? 0);
        const ov = map.overlay[y]![x] ?? 0;
        if (ov) drawTile(ctx, x * ts, y * ts, ts, ov);
        if (map.collision[y]![x]) {
          ctx.fillStyle = "rgba(180,40,40,0.35)";
          ctx.fillRect(x * ts, y * ts, ts, ts);
        }
      }
    }
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    for (let x = 0; x <= map.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * ts, 0);
      ctx.lineTo(x * ts, map.height * ts);
      ctx.stroke();
    }
    for (let y = 0; y <= map.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * ts);
      ctx.lineTo(map.width * ts, y * ts);
      ctx.stroke();
    }
    for (const e of map.entities) {
      const sprite = e.spriteAssetId;
      const kind = (sprite && ["player", "npc", "slime", "key", "potion"].includes(sprite)
        ? sprite
        : e.kind === "npc"
          ? "npc"
          : e.kind === "monster"
            ? "slime"
            : e.kind === "item"
              ? "key"
              : null) as BuiltinSprite | null;
      if (kind) {
        const tmp = makeSpriteCanvas(kind, TILE_SIZE);
        ctx.drawImage(tmp, e.x * ts, e.y * ts, ts, ts);
      } else {
        ctx.fillStyle = "#d4b15a";
        ctx.fillRect(e.x * ts + 8, e.y * ts + 8, ts - 16, ts - 16);
      }
      if (e.id === selectedEntityId) {
        ctx.strokeStyle = "#d4b15a";
        ctx.lineWidth = 2;
        ctx.strokeRect(e.x * ts + 1, e.y * ts + 1, ts - 2, ts - 2);
        ctx.lineWidth = 1;
      }
      const ev = pack.events.find((event) => event.id === e.eventId);
      if (ev?.trigger === "interact") {
        const icon = 14;
        const px = e.x * ts + (ts - icon) / 2;
        const py = e.y * ts - 2;
        ctx.save();
        ctx.translate(px, py);
        drawPrompt(ctx, icon);
        ctx.restore();
      }
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(pack.meta.startX * ts + 4, pack.meta.startY * ts + 4, 6, 6);
  }, [map, pack.events, pack.meta.startX, pack.meta.startY, selectedEntityId, ts]);

  const applyCell = (clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * map.width);
    const y = Math.floor(((clientY - rect.top) / rect.height) * map.height);
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
    const next: GameMap = structuredClone(map);
    if (tool === "paint") {
      next[layer][y]![x] = tile;
    } else if (tool === "erase") {
      next[layer][y]![x] = 0;
      if (layer === "ground") next.collision[y]![x] = false;
    } else if (tool === "collision") {
      next.collision[y]![x] = !next.collision[y]![x];
    } else if (tool === "place") {
      const existing = next.entities.find((e) => e.x === x && e.y === y);
      if (existing) {
        onSelectEntity(existing.id);
        return;
      }
      const id = `${placeKind}_${Date.now().toString(36)}`;
      const entity: MapEntity = {
        id,
        kind: placeKind,
        x,
        y,
        solid: placeKind === "npc" || placeKind === "monster",
        spriteAssetId: placeKind === "npc" ? "npc" : placeKind === "monster" ? "slime" : placeKind === "item" ? "key" : undefined,
      };
      next.entities.push(entity);
      onSelectEntity(id);
    }
    onChangeMap(next);
  };

  return (
    <canvas
      ref={ref}
      style={{ imageRendering: "pixelated", maxWidth: "100%", cursor: "crosshair", background: "#0b0908" }}
      onClick={(e) => applyCell(e.clientX, e.clientY, e.currentTarget)}
    />
  );
}
