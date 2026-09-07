import {
  addItem,
  createInitialState,
  entityAt,
  entityNearPlayer,
  entityPos,
  facingFromDelta,
  findPath,
  findPathAdjacent,
  getEvent,
  getActionTarget,
  getMap,
  grantXp,
  isBlocked,
  loc,
  removeItem,
  runAutoruns,
  runCommands,
  runEvent,
  triggerAt,
  visibleEntities,
  type AdventurePack,
  type BattleResult,
  type GameState,
  type InterpreterHost,
  type Lang,
  type LocalizedString,
  type MapEntity,
} from "@browser-rpg/shared";
import { useRuntimeUi } from "./runtimeStore";

export type SceneApi = {
  redrawMap: () => void;
  tweenPlayer: (x: number, y: number) => Promise<void>;
  tweenEntity: (id: string, x: number, y: number) => Promise<void>;
  loadMap: (mapId: string, x: number, y: number) => void;
  syncEntities: () => void;
  refreshPrompts: () => void;
};

function uiBlocked(): boolean {
  const ui = useRuntimeUi.getState();
  return !!ui.dialogue || !!ui.combat;
}

export class PlaySession {
  pack: AdventurePack;
  state: GameState;
  lang: Lang;
  scene: SceneApi | null = null;
  busy = false;
  activeEntityId?: string;
  onState?: () => void;

  constructor(pack: AdventurePack, lang: Lang, saved?: GameState | null) {
    this.pack = pack;
    this.lang = lang;
    this.state = saved ?? createInitialState(pack);
    if (!this.state.facing) this.state.facing = "down";
  }

  host(): InterpreterHost {
    return {
      showText: (text) =>
        new Promise((resolve) => {
          useRuntimeUi.getState().setDialogue({ text, resolve: () => resolve() });
        }),
      showChoices: (prompt, choices) =>
        new Promise((resolve) => {
          useRuntimeUi.getState().setDialogue({
            text: prompt,
            choices,
            resolve: (i) => resolve(i),
          });
        }),
      wait: (ms) => new Promise((r) => setTimeout(r, ms)),
      moveNpc: async (entityId, steps) => {
        const map = getMap(this.pack, this.state.mapId);
        const entity = visibleEntities(this.pack, this.state, map.id).find((e) => e.id === entityId);
        if (!entity) return;
        let pos = entityPos(this.state, map, entity);
        for (const step of steps) {
          pos = { x: pos.x + step.dx, y: pos.y + step.dy };
          this.state.entityPositions[entityId] = { mapId: this.state.mapId, x: pos.x, y: pos.y };
          this.notify();
          if (this.scene) await this.scene.tweenEntity(entityId, pos.x, pos.y);
        }
      },
      startBattle: async (monsterId) => {
        const result = await new Promise<BattleResult>((resolve) => {
          useRuntimeUi.getState().setCombat({
            monsterId,
            entityId: this.activeEntityId,
            resolve,
          });
        });
        if (result.outcome === "won") {
          grantXp(this.state, result.xp);
          for (const loot of result.loot) addItem(this.state, loot.itemId, loot.qty);
          if (this.activeEntityId && !this.state.removedEntities.includes(this.activeEntityId)) {
            this.state.removedEntities.push(this.activeEntityId);
          }
          this.notify();
          this.scene?.syncEntities();
          const monster = this.pack.monsters.find((m) => m.id === monsterId);
          const name = monster ? loc(monster.name, this.lang) : monsterId;
          await this.host().showText({
            it: `Hai sconfitto ${name}! +${result.xp} PE`,
            en: `You defeated ${name}! +${result.xp} XP`,
          } satisfies LocalizedString);
        }
        if (result.outcome === "fled") {
          await this.host().showText({ it: "Sei fuggito.", en: "You fled." });
        }
        return result;
      },
      onStateChanged: () => this.notify(),
      onTeleport: async (mapId, x, y) => {
        this.scene?.loadMap(mapId, x, y);
        await this.runEnterMap();
      },
      onTileChanged: () => this.scene?.redrawMap(),
    };
  }

  notify() {
    this.onState?.();
    useRuntimeUi.getState().bumpHud();
    this.scene?.refreshPrompts();
  }

  async runEnterMap() {
    this.notify();
    await runAutoruns(this.pack, this.state, this.host());
  }

  walkable = (x: number, y: number) => !isBlocked(this.pack, this.state, this.state.mapId, x, y);

  faceToward(tx: number, ty: number) {
    const f = facingFromDelta(tx - this.state.playerX, ty - this.state.playerY);
    if (f) this.state.facing = f;
  }

  async handleTileTap(tx: number, ty: number) {
    if (this.busy || uiBlocked()) return;
    const map = getMap(this.pack, this.state.mapId);
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return;

    const px = this.state.playerX;
    const py = this.state.playerY;
    if (tx === px && ty === py) return;

    const entity = entityAt(this.pack, this.state, this.state.mapId, tx, ty);
    const solid = entity ? (entity.solid ?? (entity.kind === "npc" || entity.kind === "monster")) : false;

    if (solid) {
      const path = findPathAdjacent({ x: px, y: py }, { x: tx, y: ty }, this.walkable);
      if (path) await this.walkPath(path);
      this.faceToward(tx, ty);
      this.notify();
      return;
    }

    if (this.walkable(tx, ty)) {
      const path = findPath({ x: px, y: py }, { x: tx, y: ty }, this.walkable);
      if (!path) return;
      await this.walkPath(path);
    }
  }

  async handleStep(dx: number, dy: number) {
    if (this.busy || uiBlocked()) return;
    const facing = facingFromDelta(dx, dy);
    if (facing) this.state.facing = facing;
    this.notify();
    const nx = this.state.playerX + dx;
    const ny = this.state.playerY + dy;
    const entity = entityAt(this.pack, this.state, this.state.mapId, nx, ny);
    if (entity) {
      const solid = entity.solid ?? (entity.kind === "npc" || entity.kind === "monster");
      if (solid) return;
    }
    if (!this.walkable(nx, ny)) return;
    await this.walkPath([{ x: nx, y: ny }]);
  }

  async handleAction() {
    if (this.busy || uiBlocked() || useRuntimeUi.getState().inventoryOpen) return;
    const target = getActionTarget(this.pack, this.state);
    if (target) await this.interactEntity(target);
  }

  async useItem(itemId: string) {
    if (this.busy || uiBlocked()) return;
    const item = this.pack.items.find((i) => i.id === itemId);
    if (!item?.use) return;
    useRuntimeUi.getState().setInventoryOpen(false);
    const near = item.use.targetEntityIds.some((id) => entityNearPlayer(this.pack, this.state, id));
    if (!near) {
      await this.host().showText(item.use.tooFar);
      return;
    }
    this.busy = true;
    useRuntimeUi.getState().setBusy(true);
    try {
      await runCommands(item.use.commands, this.pack, this.state, this.host());
      if (item.use.consume) removeItem(this.state, itemId, 1);
      this.notify();
    } finally {
      this.busy = false;
      useRuntimeUi.getState().setBusy(false);
    }
  }

  private async interactEntity(entity: MapEntity) {
    this.activeEntityId = entity.id;
    const event = getEvent(this.pack, entity.eventId);
    if (event?.trigger === "interact") {
      this.busy = true;
      useRuntimeUi.getState().setBusy(true);
      try {
        await runEvent(event, this.pack, this.state, this.host());
      } finally {
        this.busy = false;
        useRuntimeUi.getState().setBusy(false);
        this.activeEntityId = undefined;
      }
    }
  }

  private async walkPath(path: { x: number; y: number }[]) {
    this.busy = true;
    useRuntimeUi.getState().setBusy(true);
    try {
      for (const step of path) {
        const f = facingFromDelta(step.x - this.state.playerX, step.y - this.state.playerY);
        if (f) this.state.facing = f;
        if (this.scene) await this.scene.tweenPlayer(step.x, step.y);
        this.state.playerX = step.x;
        this.state.playerY = step.y;
        this.notify();
        const mapBefore = this.state.mapId;
        await this.afterStep();
        if (this.state.mapId !== mapBefore) break;
      }
    } finally {
      this.busy = false;
      useRuntimeUi.getState().setBusy(false);
    }
  }

  private async afterStep() {
    await triggerAt(this.pack, this.state, this.host(), "stepOn", this.state.playerX, this.state.playerY);
  }
}
