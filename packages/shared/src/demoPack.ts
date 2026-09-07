import { TILE_SIZE, type AdventurePack, type GameMap } from "./types.js";

const G = 1; // grass
const P = 2; // path
const W = 3; // water
const S = 4; // stone wall
const F = 5; // dungeon floor
const DC = 6; // door closed
const T = 8; // tree
const H = 9; // house
const ST = 11; // stairs

function grid<T>(w: number, h: number, fill: T): T[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
}

function paint(target: number[][], rows: string, legend: Record<string, number>): void {
  const lines = rows.trim().split("\n").map((l) => l.trim());
  for (let y = 0; y < lines.length; y++) {
    const cells = lines[y]!.split(/\s+/);
    for (let x = 0; x < cells.length; x++) {
      const ch = cells[x]!;
      if (legend[ch] !== undefined) target[y]![x] = legend[ch]!;
    }
  }
}

function collisionFrom(ground: number[][], blocking: number[]): boolean[][] {
  return ground.map((row) => row.map((t) => blocking.includes(t)));
}

function village(): GameMap {
  const width = 14;
  const height = 12;
  const ground = grid(width, height, G);
  const overlay = grid(width, height, 0);
  paint(
    ground,
    `
T T T T T T T T T T T T T T
T . . . . . . . . . . . . T
T . H H H H . . . ~ ~ ~ . T
T . H H H H . . . ~ ~ ~ . T
T . H H D H . . , , , . . T
T . H H H H . . , . . . . T
T . . . . . . . , . T . . T
T . . . . . . . , . . . . T
T . . . . . . . , . . . . T
T . . . . . . . , , E . . T
T . . . . . . . . . . . . T
T T T T T T T T T T T T T T
`,
    { T, ".": G, H, D: DC, ",": P, "~": W, E: ST },
  );
  const collision = collisionFrom(ground, [T, H, W, S]);
  collision[4]![3] = true;
  return {
    id: "village",
    name: { it: "Villaggio", en: "Village" },
    width,
    height,
    ground,
    overlay,
    collision,
    tilesetAssetId: "tileset",
    entities: [
      {
        id: "intro",
        kind: "trigger",
        x: 4,
        y: 7,
        eventId: "intro",
        solid: false,
      },
      {
        id: "elder",
        kind: "npc",
        x: 5,
        y: 7,
        spriteAssetId: "npc",
        eventId: "elder_talk",
        solid: true,
      },
      {
        id: "key_drop",
        kind: "item",
        x: 3,
        y: 8,
        spriteAssetId: "key",
        eventId: "pickup_key",
        itemId: "dungeon_key",
        solid: false,
      },
      {
        id: "dungeon_gate",
        kind: "trigger",
        x: 10,
        y: 9,
        eventId: "enter_dungeon",
        solid: false,
      },
    ],
  };
}

function dungeon(): GameMap {
  const width = 12;
  const height = 10;
  const ground = grid(width, height, F);
  const overlay = grid(width, height, 0);
  paint(
    ground,
    `
S S S S S S S S S S S S
S f f f f f S f f f f S
S f f f f f S f f f f S
S f f f f f S f f f f S
S f f f f f D f f f f S
S f f f f f S S S S S S
S f f f f f f f f f f S
S f f f f f f f f f B S
S f f f f f f f f f f S
S S S S S S S S S S S S
`,
    { S, f: F, D: F, B: ST },
  );
  const collision = collisionFrom(ground, [S]);
  return {
    id: "dungeon",
    name: { it: "Cripta", en: "Crypt" },
    width,
    height,
    ground,
    overlay,
    collision,
    tilesetAssetId: "tileset",
    entities: [
      {
        id: "potion_drop",
        kind: "item",
        x: 2,
        y: 6,
        spriteAssetId: "potion",
        eventId: "pickup_potion",
        itemId: "potion",
        solid: false,
      },
      {
        id: "slime_1",
        kind: "monster",
        x: 9,
        y: 2,
        spriteAssetId: "slime",
        eventId: "fight_slime",
        monsterId: "slime",
        solid: true,
      },
      {
        id: "stairs_back",
        kind: "trigger",
        x: 10,
        y: 7,
        eventId: "return_village",
        solid: false,
      },
    ],
  };
}

export function createDemoPack(): AdventurePack {
  return {
    formatVersion: 1,
    meta: {
      title: { it: "La chiave della cripta", en: "The Crypt Key" },
      description: {
        it: "Un villaggio, una chiave, un mostro. Avventura demo.",
        en: "A village, a key, a monster. Demo adventure.",
      },
      startMapId: "village",
      startX: 4,
      startY: 7,
      defaultLang: "it",
    },
    assets: [
      { id: "tileset", kind: "tileset", name: "Builtin tileset", src: "builtin:tileset", tileSize: TILE_SIZE, columns: 12 },
      { id: "player", kind: "sprite", name: "Hero", src: "builtin:player", tileSize: TILE_SIZE },
      { id: "npc", kind: "sprite", name: "Elder", src: "builtin:npc", tileSize: TILE_SIZE },
      { id: "slime", kind: "sprite", name: "Slime", src: "builtin:slime", tileSize: TILE_SIZE },
      { id: "key", kind: "sprite", name: "Key", src: "builtin:key", tileSize: TILE_SIZE },
      { id: "potion", kind: "sprite", name: "Potion", src: "builtin:potion", tileSize: TILE_SIZE },
    ],
    maps: [village(), dungeon()],
    events: [
      {
        id: "intro",
        name: "Intro",
        trigger: "autorun",
        once: true,
        commands: [
          {
            type: "showText",
            text: {
              it: "Il villaggio è silenzioso. Qualcosa si muove nella cripta a est.",
              en: "The village is quiet. Something stirs in the crypt to the east.",
            },
          },
        ],
      },
      {
        id: "elder_talk",
        name: "Elder",
        trigger: "interact",
        commands: [
          {
            type: "if",
            condition: { type: "flag", flagId: "talked_elder" },
            then: [
              {
                type: "if",
                condition: { type: "hasItem", itemId: "dungeon_key" },
                then: [
                  {
                    type: "showText",
                    text: {
                      it: "Anziano: Hai la chiave. La scala a est apre la cripta. Fai attenzione.",
                      en: "Elder: You have the key. The stairs to the east open the crypt. Be careful.",
                    },
                  },
                ],
                else: [
                  {
                    type: "showText",
                    text: {
                      it: "Anziano: Cerca la chiave vicino agli alberi a ovest. Poi vai alle scale.",
                      en: "Elder: Search for the key near the trees to the west. Then go to the stairs.",
                    },
                  },
                ],
              },
            ],
            else: [
              {
                type: "showText",
                text: {
                  it: "Anziano: Sei sveglio. I mostri sono tornati nella cripta.",
                  en: "Elder: You're awake. The monsters have returned to the crypt.",
                },
              },
              {
                type: "showChoices",
                prompt: {
                  it: "Cosa rispondi?",
                  en: "What do you say?",
                },
                choices: [
                  {
                    text: { it: "Dimmi di più.", en: "Tell me more." },
                    commands: [
                      {
                        type: "showText",
                        text: {
                          it: "Anziano: Serve la chiave antica. L'ho vista cadere vicino al sentiero.",
                          en: "Elder: You need the old key. I saw it fall near the path.",
                        },
                      },
                      { type: "setFlag", flagId: "talked_elder", value: true },
                      {
                        type: "moveNpc",
                        entityId: "elder",
                        steps: [{ dx: 0, dy: 1 }],
                      },
                    ],
                  },
                  {
                    text: { it: "Devo andare.", en: "I have to go." },
                    commands: [
                      {
                        type: "showText",
                        text: { it: "Anziano: Torna quando vuoi.", en: "Elder: Come back anytime." },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "pickup_key",
        name: "Pick up key",
        trigger: "stepOn",
        once: true,
        commands: [
          { type: "giveItem", itemId: "dungeon_key", qty: 1 },
          { type: "removeEntity", entityId: "key_drop" },
          {
            type: "showText",
            text: { it: "Hai trovato la Chiave della cripta.", en: "You found the Crypt Key." },
          },
        ],
      },
      {
        id: "enter_dungeon",
        name: "Enter dungeon",
        trigger: "interact",
        commands: [
          {
            type: "if",
            condition: { type: "flag", flagId: "crypt_unlocked" },
            then: [
              {
                type: "showText",
                text: { it: "Scendi nella cripta.", en: "You descend into the crypt." },
              },
              { type: "teleport", mapId: "dungeon", x: 10, y: 7 },
            ],
            else: [
              {
                type: "showText",
                text: {
                  it: "È chiusa, serve una chiave per aprirla.",
                  en: "It's locked. You need a key to open it.",
                },
              },
            ],
          },
        ],
      },
      {
        id: "pickup_potion",
        name: "Potion",
        trigger: "stepOn",
        once: true,
        commands: [
          { type: "giveItem", itemId: "potion", qty: 1 },
          { type: "removeEntity", entityId: "potion_drop" },
          {
            type: "showText",
            text: { it: "Hai raccolto una pozione.", en: "You picked up a potion." },
          },
        ],
      },
      {
        id: "fight_slime",
        name: "Slime battle",
        trigger: "interact",
        commands: [{ type: "startBattle", monsterId: "slime" }],
      },
      {
        id: "return_village",
        name: "Return",
        trigger: "interact",
        commands: [{ type: "teleport", mapId: "village", x: 10, y: 9 }],
      },
    ],
    items: [
      {
        id: "dungeon_key",
        name: { it: "Chiave della cripta", en: "Crypt Key" },
        description: { it: "Apre le scale a est del villaggio.", en: "Opens the stairs east of the village." },
        iconAssetId: "key",
        kind: "key",
        use: {
          targetEntityIds: ["dungeon_gate"],
          consume: false,
          tooFar: {
            it: "Non c'è nulla da aprire qui.",
            en: "There's nothing to unlock here.",
          },
          commands: [
            { type: "setFlag", flagId: "crypt_unlocked", value: true },
            { type: "setTile", x: 10, y: 9, layer: "ground", tile: 7, collision: false },
            {
              type: "showText",
              text: {
                it: "La chiave gira. Le scale si aprono.",
                en: "The key turns. The stairs open.",
              },
            },
          ],
        },
      },
      {
        id: "potion",
        name: { it: "Pozione", en: "Potion" },
        description: { it: "Ripristina 12 punti vita.", en: "Restores 12 HP." },
        iconAssetId: "potion",
        kind: "consumable",
        effect: { heal: 12 },
      },
      {
        id: "rusty_sword",
        name: { it: "Spada arrugginita", en: "Rusty Sword" },
        description: { it: "+2 attacco.", en: "+2 attack." },
        kind: "weapon",
        effect: { atk: 2 },
      },
    ],
    monsters: [
      {
        id: "slime",
        name: { it: "Melma", en: "Slime" },
        spriteAssetId: "slime",
        hp: 16,
        atk: 4,
        def: 1,
        xp: 18,
        loot: [{ itemId: "potion", chance: 0.5 }],
      },
    ],
    flags: [
      { id: "talked_elder", name: { it: "Hai parlato con l'anziano", en: "Talked to the elder" } },
      { id: "crypt_unlocked", name: { it: "Cripta sbloccata", en: "Crypt unlocked" } },
    ],
    player: {
      name: { it: "Eroe", en: "Hero" },
      spriteAssetId: "player",
      maxHp: 24,
      atk: 6,
      def: 2,
    },
  };
}

export function emptyPack(): AdventurePack {
  const pack = createDemoPack();
  pack.meta.title = { it: "Nuova avventura", en: "New adventure" };
  pack.meta.description = { it: "", en: "" };
  return pack;
}

export function createBlankMap(
  id: string,
  width: number,
  height: number,
  tilesetAssetId: string,
): GameMap {
  return {
    id,
    name: { it: id, en: id },
    width,
    height,
    ground: grid(width, height, G),
    overlay: grid(width, height, 0),
    collision: grid(width, height, false),
    entities: [],
    tilesetAssetId,
  };
}
