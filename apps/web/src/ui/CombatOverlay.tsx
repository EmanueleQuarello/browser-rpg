import {
  computeDamage,
  effectiveAtk,
  effectiveDef,
  loc,
  removeItem,
  rollLoot,
  tryFlee,
  type AdventurePack,
  type GameState,
  type Lang,
} from "@browser-rpg/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRuntimeUi } from "../game/runtimeStore";

export function CombatOverlay({
  pack,
  state,
  lang,
  onState,
}: {
  pack: AdventurePack;
  state: GameState;
  lang: Lang;
  onState: () => void;
}) {
  const { t } = useTranslation();
  const combat = useRuntimeUi((s) => s.combat);
  const monsterDef = pack.monsters.find((m) => m.id === combat?.monsterId);
  const [monsterHp, setMonsterHp] = useState(monsterDef?.hp ?? 1);
  const [log, setLog] = useState<string[]>([]);
  const [pickingItem, setPickingItem] = useState(false);

  useEffect(() => {
    setMonsterHp(monsterDef?.hp ?? 1);
    setLog([]);
    setPickingItem(false);
  }, [combat?.monsterId, monsterDef?.hp]);

  const playerAtk = useMemo(() => effectiveAtk(state, pack.items), [state, pack.items]);
  const playerDef = useMemo(() => effectiveDef(state, pack.items), [state, pack.items]);

  if (!combat || !monsterDef) return null;

  const push = (it: string, en: string) => setLog((l) => [...l, lang === "it" ? it : en]);

  const end = (result: Parameters<typeof combat.resolve>[0]) => {
    useRuntimeUi.getState().setCombat(null);
    combat.resolve(result);
  };

  const monsterTurn = (hpNow: number) => {
    if (hpNow <= 0) return;
    const dmg = computeDamage(monsterDef.atk, playerDef);
    state.hp = Math.max(0, state.hp - dmg);
    onState();
    push(`La ${loc(monsterDef.name, "it")} infligge ${dmg} danni.`, `The ${loc(monsterDef.name, "en")} deals ${dmg} damage.`);
    if (state.hp <= 0) {
      push("Sei stato sconfitto.", "You were defeated.");
      setTimeout(() => end({ outcome: "lost" }), 400);
    }
  };

  const attack = () => {
    const dmg = computeDamage(playerAtk, monsterDef.def);
    const next = monsterHp - dmg;
    setMonsterHp(next);
    push(`Infliggi ${dmg} danni.`, `You deal ${dmg} damage.`);
    if (next <= 0) {
      const loot = rollLoot(monsterDef.loot);
      setTimeout(
        () =>
          end({
            outcome: "won",
            xp: monsterDef.xp,
            loot,
          }),
        350,
      );
      return;
    }
    monsterTurn(next);
  };

  const flee = () => {
    if (tryFlee()) {
      end({ outcome: "fled" });
    } else {
      push("La fuga fallisce!", "You failed to flee!");
      monsterTurn(monsterHp);
    }
  };

  const useConsumable = (itemId: string) => {
    const item = pack.items.find((i) => i.id === itemId);
    if (!item || item.kind !== "consumable") return;
    removeItem(state, itemId, 1);
    if (item.effect?.heal) {
      state.hp = Math.min(state.maxHp, state.hp + item.effect.heal);
      push(`Recuperi ${item.effect.heal} PV.`, `You recover ${item.effect.heal} HP.`);
    }
    onState();
    setPickingItem(false);
    monsterTurn(monsterHp);
  };

  const consumables = state.inventory
    .map((s) => ({ slot: s, item: pack.items.find((i) => i.id === s.itemId) }))
    .filter((x) => x.item?.kind === "consumable");

  return (
    <div className="overlay-card">
      <h3 style={{ margin: "0 0 8px" }}>{loc(monsterDef.name, lang)}</h3>
      <div className="row" style={{ marginBottom: 8 }}>
        <span>
          {t("hp")} {state.hp}/{state.maxHp}
        </span>
        <span>
          {t("hp")} {Math.max(0, monsterHp)}/{monsterDef.hp}
        </span>
      </div>
      <div className="bar" style={{ width: "100%", marginBottom: 8 }}>
        <span style={{ width: `${(Math.max(0, monsterHp) / monsterDef.hp) * 100}%`, background: "#6a9a5a" }} />
      </div>
      <div style={{ fontSize: 13, minHeight: 48, color: "var(--muted)" }}>
        {log.slice(-3).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      {pickingItem ? (
        <div>
          {consumables.length === 0 && <p className="muted">{t("emptyInv")}</p>}
          {consumables.map(({ slot, item }) => (
            <button key={slot.itemId} className="choice" type="button" onClick={() => useConsumable(slot.itemId)}>
              {item ? loc(item.name, lang) : slot.itemId} ×{slot.qty}
            </button>
          ))}
          <button className="btn secondary" type="button" onClick={() => setPickingItem(false)}>
            {t("close")}
          </button>
        </div>
      ) : (
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" type="button" onClick={attack}>
            {t("attack")}
          </button>
          <button className="btn secondary" type="button" onClick={() => setPickingItem(true)}>
            {t("item")}
          </button>
          <button className="btn secondary" type="button" onClick={flee}>
            {t("flee")}
          </button>
        </div>
      )}
    </div>
  );
}
