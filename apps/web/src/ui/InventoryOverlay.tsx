import { loc, removeItem, type AdventurePack, type GameState, type Lang } from "@browser-rpg/shared";
import { useTranslation } from "react-i18next";
import { useRuntimeUi } from "../game/runtimeStore";

export function InventoryOverlay({
  pack,
  state,
  lang,
  onState,
  onUseItem,
}: {
  pack: AdventurePack;
  state: GameState;
  lang: Lang;
  onState: () => void;
  onUseItem?: (itemId: string) => void;
}) {
  const { t } = useTranslation();
  const open = useRuntimeUi((s) => s.inventoryOpen);
  if (!open) return null;

  return (
    <div className="overlay-card" style={{ bottom: "auto", top: 64 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>{t("inventory")}</h3>
        <button className="btn secondary" type="button" onClick={() => useRuntimeUi.getState().setInventoryOpen(false)}>
          {t("close")}
        </button>
      </div>
      {state.inventory.length === 0 && <p className="muted">{t("emptyInv")}</p>}
      {state.inventory.map((slot) => {
        const item = pack.items.find((i) => i.id === slot.itemId);
        if (!item) return null;
        return (
          <div key={slot.itemId} className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
            <div>
              <strong>{loc(item.name, lang)}</strong> ×{slot.qty}
              <div className="muted">{loc(item.description, lang)}</div>
            </div>
            <div className="row">
              {item.kind === "consumable" && (
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    if (item.effect?.heal) {
                      state.hp = Math.min(state.maxHp, state.hp + item.effect.heal);
                      removeItem(state, item.id, 1);
                      onState();
                    }
                  }}
                >
                  {t("use")}
                </button>
              )}
              {item.use && (
                <button className="btn" type="button" onClick={() => onUseItem?.(item.id)}>
                  {t("use")}
                </button>
              )}
              {item.kind === "weapon" && (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => {
                    state.equippedWeapon = state.equippedWeapon === item.id ? undefined : item.id;
                    onState();
                  }}
                >
                  {state.equippedWeapon === item.id ? t("unequip") : t("equip")}
                </button>
              )}
              {item.kind === "armor" && (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => {
                    state.equippedArmor = state.equippedArmor === item.id ? undefined : item.id;
                    onState();
                  }}
                >
                  {state.equippedArmor === item.id ? t("unequip") : t("equip")}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
