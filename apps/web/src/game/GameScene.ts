import {
  TILE_SIZE,
  entityPos,
  getActionTarget,
  getMap,
  getTile,
  visibleEntities,
  type AdventurePack,
} from "@browser-rpg/shared";
import Phaser from "phaser";
import { resolveAssetSrc } from "../api/client";
import type { PlaySession } from "./session";
import { isBuiltin, makePromptCanvas, makeSpriteCanvas, makeTilesetCanvas, type BuiltinSprite } from "./textures";

export class GameScene extends Phaser.Scene {
  session!: PlaySession;
  tileImages: Phaser.GameObjects.Image[] = [];
  overlayImages: Phaser.GameObjects.Image[] = [];
  entitySprites = new Map<string, Phaser.GameObjects.Image>();
  prompt?: Phaser.GameObjects.Image;
  promptTween?: Phaser.Tweens.Tween;
  player!: Phaser.GameObjects.Image;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  actionKeys: Phaser.Input.Keyboard.Key[] = [];
  keyLock = false;

  constructor() {
    super("game");
  }

  init(data: { session: PlaySession }) {
    this.session = data.session;
  }

  preload() {
    const pack = this.session.pack;
    if (!this.textures.exists("builtin-tileset")) {
      this.textures.addCanvas("builtin-tileset", makeTilesetCanvas(TILE_SIZE));
    }
    for (const key of ["player", "npc", "slime", "key", "potion"] as BuiltinSprite[]) {
      const id = `builtin:${key}`;
      if (!this.textures.exists(id)) this.textures.addCanvas(id, makeSpriteCanvas(key, TILE_SIZE));
    }
    if (!this.textures.exists("builtin:prompt")) {
      this.textures.addCanvas("builtin:prompt", makePromptCanvas(16));
    }
    const atlas = this.textures.get("builtin-tileset");
    for (let i = 0; i < 12; i++) {
      if (!atlas.has(String(i))) atlas.add(String(i), 0, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    }
    for (const asset of pack.assets) {
      if (isBuiltin(asset.src)) continue;
      const url = resolveAssetSrc(asset.src);
      if (asset.kind === "tileset") this.load.image(`asset:${asset.id}`, url);
      else this.load.image(`asset:${asset.id}`, url);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b0908");
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const tx = Math.floor(world.x / TILE_SIZE);
      const ty = Math.floor(world.y / TILE_SIZE);
      void this.session.handleTileTap(tx, ty);
    });
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        w: this.input.keyboard.addKey("W"),
        a: this.input.keyboard.addKey("A"),
        s: this.input.keyboard.addKey("S"),
        d: this.input.keyboard.addKey("D"),
      };
      this.actionKeys = [
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      ];
      this.input.keyboard.addCapture([Phaser.Input.Keyboard.KeyCodes.SPACE, Phaser.Input.Keyboard.KeyCodes.E]);
    }
    for (const asset of this.session.pack.assets) {
      if (asset.kind !== "tileset" || isBuiltin(asset.src)) continue;
      const key = `asset:${asset.id}`;
      if (!this.textures.exists(key)) continue;
      const tex = this.textures.get(key);
      const src = tex.getSourceImage() as HTMLImageElement;
      const ts = asset.tileSize || TILE_SIZE;
      const cols = asset.columns || Math.max(1, Math.floor(src.width / ts));
      const rows = Math.max(1, Math.floor(src.height / ts));
      let n = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const fname = String(n);
          if (!tex.has(fname)) tex.add(fname, 0, c * ts, r * ts, ts, ts);
          n++;
        }
      }
    }
    this.buildMap();
    this.session.scene = {
      redrawMap: () => this.redrawTiles(),
      tweenPlayer: (x, y) => this.tweenTo(this.player, x, y),
      tweenEntity: (id, x, y) => {
        const spr = this.entitySprites.get(id);
        if (!spr) return Promise.resolve();
        return this.tweenTo(spr, x, y);
      },
      loadMap: (mapId, x, y) => {
        this.session.state.mapId = mapId;
        this.session.state.playerX = x;
        this.session.state.playerY = y;
        this.buildMap();
      },
      syncEntities: () => this.rebuildEntities(),
      refreshPrompts: () => this.refreshPrompts(),
    };
    void this.session.runEnterMap();
  }

  update() {
    if (!this.cursors) return;
    if (this.session.busy || this.keyLock) return;
    if (this.actionKeys.some((k) => Phaser.Input.Keyboard.JustDown(k))) {
      void this.session.handleAction();
      return;
    }
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd?.a?.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.wasd?.d?.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.wasd?.w?.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.wasd?.s?.isDown) dy = 1;
    if (dx || dy) {
      this.keyLock = true;
      void this.session.handleStep(dx, dy).finally(() => {
        this.time.delayedCall(40, () => {
          this.keyLock = false;
        });
      });
    }
  }

  textureForTile(pack: AdventurePack, tile: number): { key: string; frame?: string } {
    const map = getMap(pack, this.session.state.mapId);
    const asset = pack.assets.find((a) => a.id === map.tilesetAssetId);
    if (!asset || isBuiltin(asset.src)) {
      return { key: "builtin-tileset", frame: String(tile) };
    }
    return { key: `asset:${asset.id}` };
  }

  spriteKey(assetId?: string): string {
    if (!assetId) return "builtin:player";
    const asset = this.session.pack.assets.find((a) => a.id === assetId);
    if (!asset || isBuiltin(asset.src)) {
      const name = asset?.src?.replace("builtin:", "") || assetId;
      if (this.textures.exists(`builtin:${name}`)) return `builtin:${name}`;
      if (this.textures.exists(asset?.src || "")) return asset!.src;
      return "builtin:player";
    }
    return `asset:${asset.id}`;
  }

  buildMap() {
    this.tileImages.forEach((i) => i.destroy());
    this.overlayImages.forEach((i) => i.destroy());
    this.tileImages = [];
    this.overlayImages = [];
    this.entitySprites.forEach((s) => s.destroy());
    this.entitySprites.clear();
    this.clearPrompt();
    this.player?.destroy();

    const { pack, state } = this.session;
    const map = getMap(pack, state.mapId);
    this.redrawTiles();

    this.player = this.add.image(
      state.playerX * TILE_SIZE + TILE_SIZE / 2,
      state.playerY * TILE_SIZE + TILE_SIZE / 2,
      this.spriteKey(pack.player.spriteAssetId),
    );
    this.player.setDisplaySize(TILE_SIZE, TILE_SIZE);
    this.player.setDepth(10);

    this.rebuildEntities();
    const zoom = this.fitZoom(map.width, map.height);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.cameras.main.startFollow(this.player, true, 0.18, 0.18);
  }

  fitZoom(mw: number, mh: number): number {
    const w = this.scale.width || 800;
    const h = this.scale.height || 600;
    const zoom = Math.min(w / (mw * TILE_SIZE), h / (mh * TILE_SIZE)) * 0.88;
    return Math.max(0.8, Math.min(zoom, 3));
  }

  redrawTiles() {
    this.tileImages.forEach((i) => i.destroy());
    this.overlayImages.forEach((i) => i.destroy());
    this.tileImages = [];
    this.overlayImages = [];
    const { pack, state } = this.session;
    const map = getMap(pack, state.mapId);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const g = getTile(pack, state, map.id, x, y, "ground");
        const info = this.textureForTile(pack, g);
        const img = this.add.image(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          info.key,
          info.frame,
        );
        img.setDisplaySize(TILE_SIZE, TILE_SIZE);
        img.setDepth(0);
        this.tileImages.push(img);
        const o = getTile(pack, state, map.id, x, y, "overlay");
        if (o) {
          const oi = this.textureForTile(pack, o);
          const ov = this.add.image(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            oi.key,
            oi.frame,
          );
          ov.setDisplaySize(TILE_SIZE, TILE_SIZE);
          ov.setDepth(1);
          this.overlayImages.push(ov);
        }
      }
    }
  }

  rebuildEntities() {
    this.entitySprites.forEach((s) => s.destroy());
    this.entitySprites.clear();
    const { pack, state } = this.session;
    const map = getMap(pack, state.mapId);
    for (const e of visibleEntities(pack, state, map.id)) {
      if (!e.spriteAssetId) continue;
      const pos = entityPos(state, map, e);
      const spr = this.add.image(
        pos.x * TILE_SIZE + TILE_SIZE / 2,
        pos.y * TILE_SIZE + TILE_SIZE / 2,
        this.spriteKey(e.spriteAssetId),
      );
      spr.setDisplaySize(TILE_SIZE, TILE_SIZE);
      spr.setDepth(5);
      this.entitySprites.set(e.id, spr);
    }
    this.refreshPrompts();
  }

  clearPrompt() {
    this.promptTween?.stop();
    this.promptTween = undefined;
    this.prompt?.destroy();
    this.prompt = undefined;
  }

  refreshPrompts() {
    const target = getActionTarget(this.session.pack, this.session.state);
    if (!target) {
      this.clearPrompt();
      return;
    }
    const map = getMap(this.session.pack, this.session.state.mapId);
    const pos = entityPos(this.session.state, map, target);
    const x = pos.x * TILE_SIZE + TILE_SIZE / 2;
    const y = pos.y * TILE_SIZE - 4;
    if (!this.prompt) {
      this.prompt = this.add.image(x, y, "builtin:prompt");
      this.prompt.setDisplaySize(14, 14);
      this.prompt.setDepth(20);
      this.promptTween = this.tweens.add({
        targets: this.prompt,
        y: y - 4,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else {
      this.prompt.setPosition(x, y);
      this.promptTween?.stop();
      this.promptTween = this.tweens.add({
        targets: this.prompt,
        y: y - 4,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  tweenTo(img: Phaser.GameObjects.Image, x: number, y: number): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        targets: img,
        x: x * TILE_SIZE + TILE_SIZE / 2,
        y: y * TILE_SIZE + TILE_SIZE / 2,
        duration: 140,
        ease: "Linear",
        onComplete: () => resolve(),
      });
    });
  }
}
