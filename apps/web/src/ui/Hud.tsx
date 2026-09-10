import { effectiveAtk, effectiveDef, loc, type AdventurePack, type GameState, type Lang } from "@browser-rpg/shared";
import { useTranslation } from "react-i18next";
import { useRuntimeUi } from "../game/runtimeStore";

export function Hud({
  pack,
  state,
  lang,
  onSave,
}: {
  pack: AdventurePack;
  state: GameState;
  lang: Lang;
  onSave?: () => void;
}) {
  const { t } = useTranslation();
  useRuntimeUi((s) => s.hudTick);
  const atk = effectiveAtk(state, pack.items);
  const def = effectiveDef(state, pack.items);
  return (
    <div className="hud">
      <div className="panel" style={{ padding: 8 }}>
        <div>
          <strong>{loc(pack.player.name, lang)}</strong> · {t("lvl")} {state.level}
        </div>
        <div className="bar" style={{ margin: "6px 0" }}>
          <span style={{ width: `${(state.hp / state.maxHp) * 100}%` }} />
        </div>
        <div className="hud-stats">
          {t("hp")} {state.hp}/{state.maxHp} · {t("atk")} {atk} · {t("def")} {def} · {t("xp")} {state.xp}
        </div>
      </div>
      <div className="row">
        <button className="btn secondary" type="button" onClick={() => useRuntimeUi.getState().setInventoryOpen(true)}>
          {t("inventory")}
        </button>
        {onSave && (
          <button className="btn" type="button" onClick={onSave}>
            {t("save")}
          </button>
        )}
      </div>
    </div>
  );
}
