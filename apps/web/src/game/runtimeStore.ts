import type { BattleResult, LocalizedString } from "@browser-rpg/shared";
import { create } from "zustand";

export type DialoguePrompt = {
  text: LocalizedString;
  choices?: LocalizedString[];
  resolve: (choiceIndex: number) => void;
};

export type CombatPrompt = {
  monsterId: string;
  entityId?: string;
  resolve: (result: BattleResult) => void;
};

type UiState = {
  dialogue: DialoguePrompt | null;
  combat: CombatPrompt | null;
  inventoryOpen: boolean;
  hudTick: number;
  toast: string | null;
  busy: boolean;
  setDialogue: (d: DialoguePrompt | null) => void;
  setCombat: (c: CombatPrompt | null) => void;
  setInventoryOpen: (v: boolean) => void;
  bumpHud: () => void;
  setToast: (t: string | null) => void;
  setBusy: (v: boolean) => void;
};

export const useRuntimeUi = create<UiState>((set) => ({
  dialogue: null,
  combat: null,
  inventoryOpen: false,
  hudTick: 0,
  toast: null,
  busy: false,
  setDialogue: (dialogue) => set({ dialogue }),
  setCombat: (combat) => set({ combat }),
  setInventoryOpen: (inventoryOpen) => set({ inventoryOpen }),
  bumpHud: () => set((s) => ({ hudTick: s.hudTick + 1 })),
  setToast: (toast) => set({ toast }),
  setBusy: (busy) => set({ busy }),
}));
