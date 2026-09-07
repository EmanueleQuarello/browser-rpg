import type { AdventurePack, Facing, GameMap, GameState, MapEntity } from "./types.js";

export function tileKey(mapId: string, x: number, y: number, layer: string): string {
  return `${mapId}:${x}:${y}:${layer}`;
}

export function collisionKey(mapId: string, x: number, y: number): string {
  return `${mapId}:${x}:${y}`;
}

export function createInitialState(pack: AdventurePack): GameState {
  const entityPositions: GameState["entityPositions"] = {};
  for (const map of pack.maps) {
    for (const e of map.entities) {
      entityPositions[e.id] = { mapId: map.id, x: e.x, y: e.y };
    }
  }
  return {
    mapId: pack.meta.startMapId,
    playerX: pack.meta.startX,
    playerY: pack.meta.startY,
    facing: "down",
    hp: pack.player.maxHp,
    maxHp: pack.player.maxHp,
    atk: pack.player.atk,
    def: pack.player.def,
    level: 1,
    xp: 0,
    inventory: [],
    flags: Object.fromEntries(pack.flags.map((f) => [f.id, false])),
    doneEvents: [],
    removedEntities: [],
    tileOverrides: {},
    collisionOverrides: {},
    entityPositions,
  };
}

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function getMap(pack: AdventurePack, mapId: string): GameMap {
  const map = pack.maps.find((m) => m.id === mapId);
  if (!map) throw new Error(`Unknown map ${mapId}`);
  return map;
}

export function getTile(
  pack: AdventurePack,
  state: GameState,
  mapId: string,
  x: number,
  y: number,
  layer: "ground" | "overlay",
): number {
  const override = state.tileOverrides[tileKey(mapId, x, y, layer)];
  if (override) return override.tile;
  const map = getMap(pack, mapId);
  return map[layer][y]?.[x] ?? 0;
}

export function isBlocked(
  pack: AdventurePack,
  state: GameState,
  mapId: string,
  x: number,
  y: number,
  ignoreEntityId?: string,
): boolean {
  const map = getMap(pack, mapId);
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;
  const ck = collisionKey(mapId, x, y);
  if (ck in state.collisionOverrides) return state.collisionOverrides[ck]!;
  if (map.collision[y]?.[x]) return true;
  for (const e of visibleEntities(pack, state, mapId)) {
    if (e.id === ignoreEntityId) continue;
    const pos = entityPos(state, map, e);
    const solid = e.solid ?? (e.kind === "npc" || e.kind === "monster");
    if (pos.x === x && pos.y === y && solid) return true;
  }
  return false;
}

export function entityPos(state: GameState, map: GameMap, entity: MapEntity): { x: number; y: number } {
  const p = state.entityPositions[entity.id];
  if (p && p.mapId === map.id) return { x: p.x, y: p.y };
  return { x: entity.x, y: entity.y };
}

export function visibleEntities(pack: AdventurePack, state: GameState, mapId: string): MapEntity[] {
  const map = getMap(pack, mapId);
  return map.entities.filter((e) => {
    if (state.removedEntities.includes(e.id)) return false;
    const p = state.entityPositions[e.id];
    if (p) return p.mapId === mapId;
    return true;
  });
}

export function entityAt(
  pack: AdventurePack,
  state: GameState,
  mapId: string,
  x: number,
  y: number,
): MapEntity | undefined {
  const map = getMap(pack, mapId);
  return visibleEntities(pack, state, mapId).find((e) => {
    const p = entityPos(state, map, e);
    return p.x === x && p.y === y;
  });
}

export function isAdjacent(ax: number, ay: number, bx: number, by: number): boolean {
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}

export function facingFromDelta(dx: number, dy: number): Facing | null {
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

export function tileAhead(x: number, y: number, facing: Facing): { x: number; y: number } {
  switch (facing) {
    case "up":
      return { x, y: y - 1 };
    case "down":
      return { x, y: y + 1 };
    case "left":
      return { x: x - 1, y };
    case "right":
      return { x: x + 1, y };
  }
}

export function entityNearPlayer(
  pack: AdventurePack,
  state: GameState,
  entityId: string,
): boolean {
  const map = getMap(pack, state.mapId);
  const entity = visibleEntities(pack, state, map.id).find((e) => e.id === entityId);
  if (!entity) return false;
  const p = entityPos(state, map, entity);
  return Math.abs(p.x - state.playerX) + Math.abs(p.y - state.playerY) <= 1;
}

export function isInteractEntity(pack: AdventurePack, entity: MapEntity): boolean {
  if (!entity.eventId) return false;
  return pack.events.find((e) => e.id === entity.eventId)?.trigger === "interact";
}

/** Entity that Action would target: tile ahead, else tile underfoot. */
export function getActionTarget(pack: AdventurePack, state: GameState): MapEntity | undefined {
  const ahead = tileAhead(state.playerX, state.playerY, state.facing ?? "down");
  const front = entityAt(pack, state, state.mapId, ahead.x, ahead.y);
  const here = entityAt(pack, state, state.mapId, state.playerX, state.playerY);
  if (front && isInteractEntity(pack, front)) return front;
  if (here && isInteractEntity(pack, here)) return here;
  return undefined;
}
