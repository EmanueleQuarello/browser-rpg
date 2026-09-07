import { COMMAND_TYPES, type EventCommand } from "@browser-rpg/shared";

export function makeCommand(type: (typeof COMMAND_TYPES)[number]): EventCommand {
  switch (type) {
    case "showText":
      return { type, text: { it: "", en: "" } };
    case "showChoices":
      return {
        type,
        prompt: { it: "", en: "" },
        choices: [{ text: { it: "", en: "" }, commands: [] }],
      };
    case "setFlag":
      return { type, flagId: "", value: true };
    case "if":
      return { type, condition: { type: "flag", flagId: "" }, then: [], else: [] };
    case "giveItem":
      return { type, itemId: "", qty: 1 };
    case "removeItem":
      return { type, itemId: "", qty: 1 };
    case "teleport":
      return { type, mapId: "", x: 0, y: 0 };
    case "startBattle":
      return { type, monsterId: "" };
    case "moveNpc":
      return { type, entityId: "", steps: [{ dx: 0, dy: 1 }] };
    case "wait":
      return { type, ms: 400 };
    case "setTile":
      return { type, x: 0, y: 0, layer: "ground", tile: 1, collision: false };
    case "removeEntity":
      return { type, entityId: "" };
  }
}
