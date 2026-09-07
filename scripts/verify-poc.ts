import {
  createDemoPack,
  createInitialState,
  entityNearPlayer,
  findPath,
  itemCount,
  parseAdventurePack,
  runCommands,
  runEvent,
  type InterpreterHost,
} from "@browser-rpg/shared";

const pack = parseAdventurePack(createDemoPack());
const state = createInitialState(pack);

const host: InterpreterHost = {
  showText: async (t) => {
    console.log("TEXT", t.it);
  },
  showChoices: async (_p, choices) => {
    console.log(
      "CHOICES",
      choices.map((c) => c.it),
    );
    return 0;
  },
  wait: async () => undefined,
  moveNpc: async (id, steps) => {
    const pos = state.entityPositions[id];
    if (!pos) return;
    for (const s of steps) {
      pos.x += s.dx;
      pos.y += s.dy;
    }
    console.log("NPC", id, pos);
  },
  startBattle: async () => ({ outcome: "won", xp: 18, loot: [] }),
  onStateChanged: () => undefined,
  onTeleport: async (mapId, x, y) => {
    console.log("TELEPORT", mapId, x, y);
  },
  onTileChanged: () => undefined,
};

const intro = pack.events.find((e) => e.id === "intro")!;
const elder = pack.events.find((e) => e.id === "elder_talk")!;
const key = pack.events.find((e) => e.id === "pickup_key")!;
const gate = pack.events.find((e) => e.id === "enter_dungeon")!;
const dungeonKey = pack.items.find((i) => i.id === "dungeon_key")!;

async function main() {
  await runEvent(intro, pack, state, host);
  await runEvent(elder, pack, state, host);
  if (!state.flags.talked_elder) throw new Error("flag not set");
  await runEvent(key, pack, state, host);
  if (itemCount(state, "dungeon_key") < 1) throw new Error("key not given");

  await runEvent(gate, pack, state, host);
  if (state.mapId !== "village") throw new Error("stairs opened without using the key");
  if (state.flags.crypt_unlocked) throw new Error("crypt unlocked too early");

  state.playerX = 10;
  state.playerY = 9;
  if (!entityNearPlayer(pack, state, "dungeon_gate")) throw new Error("not near stairs");
  if (!dungeonKey.use) throw new Error("key has no use");
  await runCommands(dungeonKey.use.commands, pack, state, host);
  if (!state.flags.crypt_unlocked) throw new Error("flag not set after using key");

  await runEvent(gate, pack, state, host);
  if (state.mapId !== "dungeon") throw new Error("did not teleport after unlock");

  const village = pack.maps[0]!;
  const walkable = (x: number, y: number) => !village.collision[y]?.[x];
  const path = findPath({ x: 4, y: 7 }, { x: 10, y: 9 }, walkable);
  if (!path || path.length < 3) throw new Error("pathfinding failed");
  console.log("path length", path.length);
  console.log("OK");
}

void main();
