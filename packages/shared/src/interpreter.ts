import { addItem, itemCount, removeItem as takeItem } from "./combat.js";
import {
  collisionKey,
  entityAt,
  getMap,
  tileKey,
  visibleEntities,
} from "./state.js";
import type {
  AdventurePack,
  BattleResult,
  Condition,
  EventCommand,
  GameEvent,
  GameState,
  LocalizedString,
  MapEntity,
} from "./types.js";

export type InterpreterHost = {
  showText(text: LocalizedString): Promise<void>;
  showChoices(prompt: LocalizedString, choices: LocalizedString[]): Promise<number>;
  wait(ms: number): Promise<void>;
  moveNpc(entityId: string, steps: { dx: number; dy: number }[]): Promise<void>;
  startBattle(monsterId: string, sourceEntity?: MapEntity): Promise<BattleResult>;
  onStateChanged(): void;
  onTeleport(mapId: string, x: number, y: number): Promise<void>;
  onTileChanged(): void;
};

export function evalCondition(condition: Condition, state: GameState): boolean {
  switch (condition.type) {
    case "flag":
      return (state.flags[condition.flagId] ?? false) === (condition.value ?? true);
    case "hasItem":
      return itemCount(state, condition.itemId) >= (condition.qty ?? 1);
    case "not":
      return !evalCondition(condition.condition, state);
  }
}

export async function runCommands(
  commands: EventCommand[],
  pack: AdventurePack,
  state: GameState,
  host: InterpreterHost,
): Promise<void> {
  for (const cmd of commands) {
    switch (cmd.type) {
      case "showText":
        await host.showText(cmd.text);
        break;
      case "showChoices": {
        const idx = await host.showChoices(
          cmd.prompt,
          cmd.choices.map((c) => c.text),
        );
        const choice = cmd.choices[idx];
        if (choice) await runCommands(choice.commands, pack, state, host);
        break;
      }
      case "setFlag":
        state.flags[cmd.flagId] = cmd.value;
        host.onStateChanged();
        break;
      case "if":
        if (evalCondition(cmd.condition, state)) {
          await runCommands(cmd.then, pack, state, host);
        } else if (cmd.else) {
          await runCommands(cmd.else, pack, state, host);
        }
        break;
      case "giveItem":
        addItem(state, cmd.itemId, cmd.qty ?? 1);
        host.onStateChanged();
        break;
      case "removeItem":
        takeItem(state, cmd.itemId, cmd.qty ?? 1);
        host.onStateChanged();
        break;
      case "teleport":
        state.mapId = cmd.mapId;
        state.playerX = cmd.x;
        state.playerY = cmd.y;
        host.onStateChanged();
        await host.onTeleport(cmd.mapId, cmd.x, cmd.y);
        break;
      case "startBattle": {
        const result = await host.startBattle(cmd.monsterId);
        if (result.outcome === "won") {
          // xp/loot applied by host/combat UI via state
        }
        if (result.outcome === "lost") {
          state.hp = state.maxHp;
          state.mapId = pack.meta.startMapId;
          state.playerX = pack.meta.startX;
          state.playerY = pack.meta.startY;
          host.onStateChanged();
          await host.onTeleport(state.mapId, state.playerX, state.playerY);
        }
        break;
      }
      case "moveNpc":
        await host.moveNpc(cmd.entityId, cmd.steps);
        break;
      case "wait":
        await host.wait(cmd.ms);
        break;
      case "setTile": {
        const mapId = cmd.mapId ?? state.mapId;
        state.tileOverrides[tileKey(mapId, cmd.x, cmd.y, cmd.layer)] = {
          layer: cmd.layer,
          tile: cmd.tile,
        };
        if (cmd.collision !== undefined) {
          state.collisionOverrides[collisionKey(mapId, cmd.x, cmd.y)] = cmd.collision;
        }
        host.onStateChanged();
        host.onTileChanged();
        break;
      }
      case "removeEntity":
        if (!state.removedEntities.includes(cmd.entityId)) {
          state.removedEntities.push(cmd.entityId);
        }
        host.onStateChanged();
        host.onTileChanged();
        break;
    }
  }
}

export async function runEvent(
  event: GameEvent,
  pack: AdventurePack,
  state: GameState,
  host: InterpreterHost,
): Promise<void> {
  if (event.once && state.doneEvents.includes(event.id)) return;
  await runCommands(event.commands, pack, state, host);
  if (event.once) {
    state.doneEvents.push(event.id);
    host.onStateChanged();
  }
}

export function getEvent(pack: AdventurePack, eventId: string | undefined): GameEvent | undefined {
  if (!eventId) return undefined;
  return pack.events.find((e) => e.id === eventId);
}

export async function runAutoruns(
  pack: AdventurePack,
  state: GameState,
  host: InterpreterHost,
): Promise<void> {
  const map = getMap(pack, state.mapId);
  for (const entity of visibleEntities(pack, state, map.id)) {
    const event = getEvent(pack, entity.eventId);
    if (event?.trigger === "autorun") {
      await runEvent(event, pack, state, host);
    }
  }
  for (const event of pack.events) {
    if (event.trigger !== "autorun") continue;
    const attached = pack.maps.some((m) => m.entities.some((e) => e.eventId === event.id));
    if (!attached && !state.doneEvents.includes(event.id)) {
      // map-global autorun: run once per pack if name starts with map id or flag in commands... skip unattached
    }
  }
}

export async function triggerAt(
  pack: AdventurePack,
  state: GameState,
  host: InterpreterHost,
  trigger: "stepOn" | "interact",
  x: number,
  y: number,
): Promise<boolean> {
  const entity = entityAt(pack, state, state.mapId, x, y);
  if (!entity) return false;
  const event = getEvent(pack, entity.eventId);
  if (!event || event.trigger !== trigger) return false;
  await runEvent(event, pack, state, host);
  return true;
}
