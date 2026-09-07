export type Lang = "it" | "en";

export type LocalizedString = {
  it: string;
  en: string;
};

export function loc(text: LocalizedString, lang: Lang): string {
  return text[lang] || text.it || text.en || "";
}

export const TILE_SIZE = 32;

export type AssetKind = "tileset" | "sprite";

export type AdventureAsset = {
  id: string;
  kind: AssetKind;
  name: string;
  /** builtin:key or /api/files/:id */
  src: string;
  tileSize: number;
  columns?: number;
};

export type Condition =
  | { type: "flag"; flagId: string; value?: boolean }
  | { type: "hasItem"; itemId: string; qty?: number }
  | { type: "not"; condition: Condition };

export type EventCommand =
  | { type: "showText"; text: LocalizedString }
  | {
      type: "showChoices";
      prompt: LocalizedString;
      choices: { text: LocalizedString; commands: EventCommand[] }[];
    }
  | { type: "setFlag"; flagId: string; value: boolean }
  | { type: "if"; condition: Condition; then: EventCommand[]; else?: EventCommand[] }
  | { type: "giveItem"; itemId: string; qty?: number }
  | { type: "removeItem"; itemId: string; qty?: number }
  | { type: "teleport"; mapId: string; x: number; y: number }
  | { type: "startBattle"; monsterId: string }
  | { type: "moveNpc"; entityId: string; steps: { dx: number; dy: number }[] }
  | { type: "wait"; ms: number }
  | {
      type: "setTile";
      mapId?: string;
      x: number;
      y: number;
      layer: "ground" | "overlay";
      tile: number;
      collision?: boolean;
    }
  | { type: "removeEntity"; entityId: string };

export type EventTrigger = "stepOn" | "interact" | "autorun";

export type GameEvent = {
  id: string;
  name: string;
  trigger: EventTrigger;
  once?: boolean;
  commands: EventCommand[];
};

export type EntityKind = "npc" | "item" | "monster" | "trigger";

export type MapEntity = {
  id: string;
  kind: EntityKind;
  x: number;
  y: number;
  spriteAssetId?: string;
  eventId?: string;
  itemId?: string;
  monsterId?: string;
  solid?: boolean;
};

export type GameMap = {
  id: string;
  name: LocalizedString;
  width: number;
  height: number;
  ground: number[][];
  overlay: number[][];
  collision: boolean[][];
  entities: MapEntity[];
  tilesetAssetId: string;
};

export type ItemKind = "consumable" | "weapon" | "armor" | "key";

export type Facing = "up" | "down" | "left" | "right";

export type ItemUse = {
  targetEntityIds: string[];
  consume?: boolean;
  tooFar: LocalizedString;
  commands: EventCommand[];
};

export type ItemDef = {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  iconAssetId?: string;
  kind: ItemKind;
  effect?: { heal?: number; atk?: number; def?: number };
  use?: ItemUse;
};

export type MonsterDef = {
  id: string;
  name: LocalizedString;
  spriteAssetId?: string;
  hp: number;
  atk: number;
  def: number;
  xp: number;
  loot?: { itemId: string; chance: number }[];
};

export type PlayerTemplate = {
  name: LocalizedString;
  spriteAssetId: string;
  maxHp: number;
  atk: number;
  def: number;
};

export type InventorySlot = { itemId: string; qty: number };

export type AdventurePack = {
  formatVersion: 1;
  meta: {
    title: LocalizedString;
    description: LocalizedString;
    startMapId: string;
    startX: number;
    startY: number;
    defaultLang: Lang;
  };
  assets: AdventureAsset[];
  maps: GameMap[];
  events: GameEvent[];
  items: ItemDef[];
  monsters: MonsterDef[];
  flags: { id: string; name: LocalizedString }[];
  player: PlayerTemplate;
};

export type GameState = {
  mapId: string;
  playerX: number;
  playerY: number;
  facing: Facing;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  level: number;
  xp: number;
  inventory: InventorySlot[];
  equippedWeapon?: string;
  equippedArmor?: string;
  flags: Record<string, boolean>;
  doneEvents: string[];
  removedEntities: string[];
  tileOverrides: Record<string, { layer: "ground" | "overlay"; tile: number }>;
  collisionOverrides: Record<string, boolean>;
  entityPositions: Record<string, { mapId: string; x: number; y: number }>;
};

export type SaveSnapshot = GameState;

export type BattleFighter = {
  name: LocalizedString;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spriteAssetId?: string;
};

export type BattleResult =
  | { outcome: "won"; xp: number; loot: InventorySlot[] }
  | { outcome: "fled" }
  | { outcome: "lost" };
