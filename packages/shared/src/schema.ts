import { z } from "zod";
import type { AdventurePack } from "./types.js";

const localized = z.object({ it: z.string(), en: z.string() });

const conditionSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("flag"), flagId: z.string(), value: z.boolean().optional() }),
    z.object({ type: z.literal("hasItem"), itemId: z.string(), qty: z.number().optional() }),
    z.object({ type: z.literal("not"), condition: conditionSchema }),
  ]),
);

const commandSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("showText"), text: localized }),
    z.object({
      type: z.literal("showChoices"),
      prompt: localized,
      choices: z.array(
        z.object({
          text: localized,
          commands: z.array(commandSchema),
        }),
      ),
    }),
    z.object({ type: z.literal("setFlag"), flagId: z.string(), value: z.boolean() }),
    z.object({
      type: z.literal("if"),
      condition: conditionSchema,
      then: z.array(commandSchema),
      else: z.array(commandSchema).optional(),
    }),
    z.object({ type: z.literal("giveItem"), itemId: z.string(), qty: z.number().optional() }),
    z.object({ type: z.literal("removeItem"), itemId: z.string(), qty: z.number().optional() }),
    z.object({
      type: z.literal("teleport"),
      mapId: z.string(),
      x: z.number(),
      y: z.number(),
    }),
    z.object({ type: z.literal("startBattle"), monsterId: z.string() }),
    z.object({
      type: z.literal("moveNpc"),
      entityId: z.string(),
      steps: z.array(z.object({ dx: z.number(), dy: z.number() })),
    }),
    z.object({ type: z.literal("wait"), ms: z.number() }),
    z.object({
      type: z.literal("setTile"),
      mapId: z.string().optional(),
      x: z.number(),
      y: z.number(),
      layer: z.enum(["ground", "overlay"]),
      tile: z.number(),
      collision: z.boolean().optional(),
    }),
    z.object({ type: z.literal("removeEntity"), entityId: z.string() }),
  ]),
);

export const adventurePackSchema: z.ZodType<AdventurePack> = z.object({
  formatVersion: z.literal(1),
  meta: z.object({
    title: localized,
    description: localized,
    startMapId: z.string(),
    startX: z.number(),
    startY: z.number(),
    defaultLang: z.enum(["it", "en"]),
  }),
  assets: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["tileset", "sprite"]),
      name: z.string(),
      src: z.string(),
      tileSize: z.number(),
      columns: z.number().optional(),
    }),
  ),
  maps: z.array(
    z.object({
      id: z.string(),
      name: localized,
      width: z.number(),
      height: z.number(),
      ground: z.array(z.array(z.number())),
      overlay: z.array(z.array(z.number())),
      collision: z.array(z.array(z.boolean())),
      tilesetAssetId: z.string(),
      entities: z.array(
        z.object({
          id: z.string(),
          kind: z.enum(["npc", "item", "monster", "trigger"]),
          x: z.number(),
          y: z.number(),
          spriteAssetId: z.string().optional(),
          eventId: z.string().optional(),
          itemId: z.string().optional(),
          monsterId: z.string().optional(),
          solid: z.boolean().optional(),
        }),
      ),
    }),
  ),
  events: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      trigger: z.enum(["stepOn", "interact", "autorun"]),
      once: z.boolean().optional(),
      commands: z.array(commandSchema),
    }),
  ),
  items: z.array(
    z.object({
      id: z.string(),
      name: localized,
      description: localized,
      iconAssetId: z.string().optional(),
      kind: z.enum(["consumable", "weapon", "armor", "key"]),
      effect: z
        .object({
          heal: z.number().optional(),
          atk: z.number().optional(),
          def: z.number().optional(),
        })
        .optional(),
      use: z
        .object({
          targetEntityIds: z.array(z.string()),
          consume: z.boolean().optional(),
          tooFar: localized,
          commands: z.array(commandSchema),
        })
        .optional(),
    }),
  ),
  monsters: z.array(
    z.object({
      id: z.string(),
      name: localized,
      spriteAssetId: z.string().optional(),
      hp: z.number(),
      atk: z.number(),
      def: z.number(),
      xp: z.number(),
      loot: z.array(z.object({ itemId: z.string(), chance: z.number() })).optional(),
    }),
  ),
  flags: z.array(z.object({ id: z.string(), name: localized })),
  player: z.object({
    name: localized,
    spriteAssetId: z.string(),
    maxHp: z.number(),
    atk: z.number(),
    def: z.number(),
  }),
}) as z.ZodType<AdventurePack>;

export function parseAdventurePack(data: unknown): AdventurePack {
  return adventurePackSchema.parse(data);
}

export const COMMAND_TYPES = [
  "showText",
  "showChoices",
  "setFlag",
  "if",
  "giveItem",
  "removeItem",
  "teleport",
  "startBattle",
  "moveNpc",
  "wait",
  "setTile",
  "removeEntity",
] as const;
