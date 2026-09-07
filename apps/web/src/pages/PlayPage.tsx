import {
  parseAdventurePack,
  type AdventurePack,
  type GameState,
  type Lang,
} from "@browser-rpg/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { PhaserGame } from "../game/PhaserGame";
import { useRuntimeUi } from "../game/runtimeStore";
import type { PlaySession } from "../game/session";
import { CombatOverlay } from "../ui/CombatOverlay";
import { DialogueOverlay } from "../ui/DialogueOverlay";
import { Hud } from "../ui/Hud";
import { InventoryOverlay } from "../ui/InventoryOverlay";
import { LangToggle, useAuth } from "../ui/Shell";
import { useTouchUi } from "../ui/useTouchUi";

export function PlayPage() {
  const { slug } = useParams();
  const { email, ready } = useAuth();
  const nav = useNavigate();
  const [pack, setPack] = useState<AdventurePack | null>(null);
  const [adventureId, setAdventureId] = useState<string>();
  const [saved, setSaved] = useState<GameState | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (ready && !email) nav("/login", { state: { from: `/play/${slug}` } });
  }, [ready, email, nav, slug]);

  useEffect(() => {
    if (!slug || !email) return;
    void api
      .play(slug)
      .then((r) => {
        setPack(parseAdventurePack(r.adventure.pack));
        setAdventureId(r.adventure.id);
        setSaved((r.save as GameState) ?? null);
      })
      .catch(() => setErr("not found"));
  }, [slug, email]);

  if (!email && ready) return null;
  if (err) {
    return (
      <div className="page">
        <p className="error">{err}</p>
        <Link to="/">back</Link>
      </div>
    );
  }
  if (!pack || !adventureId) return null;
  return <PlayView pack={pack} adventureId={adventureId} saved={saved} persist />;
}

export function PlayView({
  pack,
  adventureId,
  saved,
  persist,
  onBack,
}: {
  pack: AdventurePack;
  adventureId: string;
  saved?: GameState | null;
  persist?: boolean;
  onBack?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language.startsWith("en") ? "en" : "it") as Lang;
  const sessionRef = useRef<PlaySession | null>(null);
  const [tick, setTick] = useState(0);
  const onState = useCallback(() => setTick((n) => n + 1), []);
  const state = sessionRef.current?.state;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "i" || e.key === "I") useRuntimeUi.getState().setInventoryOpen(true);
      if (e.key === "Escape") {
        useRuntimeUi.getState().setInventoryOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const save = async () => {
    const s = sessionRef.current?.state;
    if (!s || !persist) return;
    await api.saveGame(adventureId, s);
    useRuntimeUi.getState().setToast(t("saved"));
    setTimeout(() => useRuntimeUi.getState().setToast(null), 1200);
  };

  const toast = useRuntimeUi((s) => s.toast);
  const touchUi = useTouchUi();

  return (
    <div className="play-layout">
      <header className="topbar">
        <div className="row">
          {onBack ? (
            <button className="btn secondary" type="button" onClick={onBack}>
              {t("back")}
            </button>
          ) : (
            <Link className="brand" to="/hub">
              {t("brand")}
            </Link>
          )}
          <span className="muted">{t("tapHint")}</span>
        </div>
        <div className="row">
          <LangToggle />
        </div>
      </header>
      <div className="game-wrap">
        <PhaserGame
          key={`${adventureId}:${saved ? "save" : "new"}`}
          pack={pack}
          lang={lang}
          saved={saved}
          sessionRef={sessionRef}
          onState={onState}
        />
        {state && (
          <>
            <Hud pack={pack} state={state} lang={lang} onSave={persist ? () => void save() : undefined} />
            <DialogueOverlay lang={lang} />
            <CombatOverlay pack={pack} state={state} lang={lang} onState={onState} />
            <InventoryOverlay
              pack={pack}
              state={state}
              lang={lang}
              onState={onState}
              onUseItem={(id) => void sessionRef.current?.useItem(id)}
            />
          </>
        )}
        {touchUi && (
          <button
            className="action-btn force-show"
            type="button"
            data-testid="action-btn"
            onClick={() => void sessionRef.current?.handleAction()}
          >
            {t("action")}
          </button>
        )}
        {!state && tick === 0 && <Hud pack={pack} state={dummyState(pack)} lang={lang} />}
        {toast && (
          <div className="overlay-card" style={{ bottom: "auto", top: 12 }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

function dummyState(pack: AdventurePack): GameState {
  return {
    mapId: pack.meta.startMapId,
    playerX: pack.meta.startX,
    playerY: pack.meta.startY,
    facing: "down",
    hp: pack.player.maxHp,
    maxHp: pack.player.maxHp,
    atk: pack.player.atk,
    def: pack.player.def,
    level: 1,
    xp: 0,
    inventory: [],
    flags: {},
    doneEvents: [],
    removedEntities: [],
    tileOverrides: {},
    collisionOverrides: {},
    entityPositions: {},
  };
}
