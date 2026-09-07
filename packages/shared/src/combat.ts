import type { GameState, InventorySlot, ItemDef } from "./types.js";

export function computeDamage(atk: number, def: number): number {
  const variance = 0.85 + Math.random() * 0.3;
  return Math.max(1, Math.round((atk - def) * variance));
}

export function xpToNext(level: number): number {
  return level * 20;
}

export function grantXp(state: GameState, amount: number): { leveled: boolean } {
  state.xp += amount;
  let leveled = false;
  while (state.xp >= xpToNext(state.level)) {
    state.xp -= xpToNext(state.level);
    state.level += 1;
    state.maxHp += 5;
    state.hp = state.maxHp;
    state.atk += 1;
    state.def += 1;
    leveled = true;
  }
  return { leveled };
}

export function effectiveAtk(state: GameState, items: ItemDef[]): number {
  const w = items.find((i) => i.id === state.equippedWeapon);
  return state.atk + (w?.effect?.atk ?? 0);
}

export function effectiveDef(state: GameState, items: ItemDef[]): number {
  const a = items.find((i) => i.id === state.equippedArmor);
  return state.def + (a?.effect?.def ?? 0);
}

export function tryFlee(): boolean {
  return Math.random() < 0.55;
}

export function addItem(state: GameState, itemId: string, qty = 1): void {
  const slot = state.inventory.find((s) => s.itemId === itemId);
  if (slot) slot.qty += qty;
  else state.inventory.push({ itemId, qty });
}

export function removeItem(state: GameState, itemId: string, qty = 1): boolean {
  const slot = state.inventory.find((s) => s.itemId === itemId);
  if (!slot || slot.qty < qty) return false;
  slot.qty -= qty;
  if (slot.qty <= 0) {
    state.inventory = state.inventory.filter((s) => s.itemId !== itemId);
    if (state.equippedWeapon === itemId) state.equippedWeapon = undefined;
    if (state.equippedArmor === itemId) state.equippedArmor = undefined;
  }
  return true;
}

export function itemCount(state: GameState, itemId: string): number {
  return state.inventory.find((s) => s.itemId === itemId)?.qty ?? 0;
}

export function rollLoot(loot: { itemId: string; chance: number }[] | undefined): InventorySlot[] {
  if (!loot) return [];
  const drops: InventorySlot[] = [];
  for (const entry of loot) {
    if (Math.random() <= entry.chance) drops.push({ itemId: entry.itemId, qty: 1 });
  }
  return drops;
}
