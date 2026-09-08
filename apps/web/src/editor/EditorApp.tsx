import {
  createBlankMap,
  TILE_SIZE,
  type AdventurePack,
  type GameEvent,
  type MapEntity,
} from "@browser-rpg/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { drawTile } from "../game/textures";
import { CommandList } from "./EventListEditor";
import { MapCanvas, type EditorTool } from "./MapCanvas";

const TIP_KEY = "brpg-editor-tip-dismissed";

type Props = {
  adventureId: string;
  pack: AdventurePack;
  slug: string | null;
  onPack: (p: AdventurePack) => void;
  onPlaytest: () => void;
};

const TOOL_HELP: Record<EditorTool, string> = {
  paint: "toolPaintHelp",
  collision: "toolCollisionHelp",
  erase: "toolEraseHelp",
  place: "toolPlaceHelp",
};

const TOOL_LABEL: Record<EditorTool, string> = {
  paint: "paint",
  collision: "collision",
  erase: "erase",
  place: "place",
};

const KIND_LABEL: Record<MapEntity["kind"], string> = {
  npc: "npc",
  monster: "monster",
  item: "itemKind",
  trigger: "trigger",
};

const TRIGGER_LABEL: Record<GameEvent["trigger"], string> = {
  interact: "triggerInteract",
  stepOn: "triggerStepOn",
  autorun: "triggerAutorun",
};

const TRIGGER_HELP: Record<GameEvent["trigger"], string> = {
  interact: "triggerInteractHelp",
  stepOn: "triggerStepOnHelp",
  autorun: "triggerAutorunHelp",
};

export function EditorApp({ adventureId, pack, slug, onPack, onPlaytest }: Props) {
  const { t, i18n } = useTranslation();
  const [mapId, setMapId] = useState(pack.maps[0]?.id ?? "");
  const [tool, setTool] = useState<EditorTool>("paint");
  const [tile, setTile] = useState(1);
  const [layer, setLayer] = useState<"ground" | "overlay">("ground");
  const [placeKind, setPlaceKind] = useState<MapEntity["kind"]>("npc");
  const [selectedEntityId, setSelectedEntityId] = useState<string>();
  const [tab, setTab] = useState<"map" | "events" | "assets">("map");
  const [msg, setMsg] = useState("");
  const [tipOpen, setTipOpen] = useState(() => localStorage.getItem(TIP_KEY) !== "1");
  const map = pack.maps.find((m) => m.id === mapId) ?? pack.maps[0];
  const selected = map?.entities.find((e) => e.id === selectedEntityId);
  const selectedEvent = pack.events.find((e) => e.id === selected?.eventId);

  const palette = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 11], []);

  const contextDetail =
    tool === "place"
      ? t("placeKindDetail", { kind: t(KIND_LABEL[placeKind]) })
      : t("tileSelected", { id: tile });

  const updateMap = (next: typeof map) => {
    if (!next) return;
    onPack({ ...pack, maps: pack.maps.map((m) => (m.id === next.id ? next : m)) });
  };

  const save = async () => {
    await api.saveAdventure(adventureId, pack, pack.meta.title.it);
    setMsg(t("saved"));
  };

  const publish = async () => {
    await api.saveAdventure(adventureId, pack, pack.meta.title.it);
    const res = await api.publish(adventureId);
    setMsg(`${t("published")}: ${res.url}`);
  };

  const dismissTip = () => {
    localStorage.setItem(TIP_KEY, "1");
    setTipOpen(false);
  };

  const attachEvent = () => {
    if (!selected || !map) return;
    const ev: GameEvent = {
      id: `evt_${selected.id}`,
      name: selected.id,
      trigger:
        selected.kind === "item"
          ? "stepOn"
          : selected.kind === "trigger" && selected.id.includes("intro")
            ? "autorun"
            : "interact",
      commands: [{ type: "showText", text: { it: "", en: "" } }],
    };
    onPack({
      ...pack,
      events: [...pack.events.filter((e) => e.id !== ev.id), ev],
      maps: pack.maps.map((m) =>
        m.id === map.id
          ? {
              ...m,
              entities: m.entities.map((e) => (e.id === selected.id ? { ...e, eventId: ev.id } : e)),
            }
          : m,
      ),
    });
  };

  return (
    <div className="editor-layout">
      <header className="topbar">
        <div className="row">
          <Link className="brand" to="/">
            {t("brand")}
          </Link>
          <span className="muted">{t("editor")}</span>
        </div>
        <div className="row">
          <button
            className="lang-toggle"
            type="button"
            onClick={() => {
              const next = i18n.language === "it" ? "en" : "it";
              void i18n.changeLanguage(next);
              localStorage.setItem("brpg-lang", next);
            }}
          >
            {i18n.language === "it" ? "EN" : "IT"}
          </button>
          <button
            className="btn secondary"
            type="button"
            title={t("playtestHelp")}
            aria-label={t("playtest")}
            onClick={onPlaytest}
          >
            {t("playtest")}
          </button>
          <button
            className="btn secondary"
            type="button"
            title={t("saveHelp")}
            aria-label={t("save")}
            onClick={() => void save()}
          >
            {t("save")}
          </button>
          <button
            className="btn"
            type="button"
            title={t("publishHelp")}
            aria-label={t("publish")}
            onClick={() => void publish()}
          >
            {t("publish")}
          </button>
          {slug && (
            <button
              className="btn secondary"
              type="button"
              title={t("copyLinkHelp")}
              aria-label={t("copyLink")}
              onClick={() => {
                void navigator.clipboard.writeText(`${window.location.origin}/play/${slug}`);
                setMsg(t("linkCopied"));
              }}
            >
              {t("copyLink")}
            </button>
          )}
        </div>
      </header>
      <aside className="panel" style={{ margin: 8, overflow: "auto" }}>
        {tipOpen && (
          <div className="editor-tip">
            <strong>{t("editorTipTitle")}</strong>
            <p className="help-line">{t("editorTipBody")}</p>
            <button className="btn secondary" type="button" onClick={dismissTip}>
              {t("editorTipDismiss")}
            </button>
          </div>
        )}
        <label>
          {t("title")} IT
          <input
            className="input"
            value={pack.meta.title.it}
            onChange={(e) =>
              onPack({
                ...pack,
                meta: { ...pack.meta, title: { ...pack.meta.title, it: e.target.value } },
              })
            }
          />
        </label>
        <label>
          {t("title")} EN
          <input
            className="input"
            value={pack.meta.title.en}
            onChange={(e) =>
              onPack({
                ...pack,
                meta: { ...pack.meta, title: { ...pack.meta.title, en: e.target.value } },
              })
            }
          />
        </label>
        <label>
          {t("map")}
          <select value={mapId} onChange={(e) => setMapId(e.target.value)}>
            {pack.maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn secondary"
          type="button"
          onClick={() => {
            const id = `map_${pack.maps.length + 1}`;
            const m = createBlankMap(id, 12, 10, pack.maps[0]?.tilesetAssetId ?? "tileset");
            onPack({ ...pack, maps: [...pack.maps, m] });
            setMapId(id);
          }}
        >
          {t("addMap")}
        </button>
        <div className="row" style={{ marginTop: 12 }}>
          {(["paint", "collision", "erase", "place"] as EditorTool[]).map((k) => (
            <button
              key={k}
              className={tool === k ? "btn" : "btn secondary"}
              type="button"
              title={t(TOOL_HELP[k])}
              aria-label={t(TOOL_LABEL[k])}
              onClick={() => setTool(k)}
            >
              {t(TOOL_LABEL[k])}
            </button>
          ))}
        </div>
        <p className="help-line">{t(TOOL_HELP[tool])}</p>
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className={layer === "ground" ? "btn" : "btn secondary"}
            type="button"
            title={t("layerGroundHelp")}
            aria-label={t("ground")}
            onClick={() => setLayer("ground")}
          >
            {t("ground")}
          </button>
          <button
            className={layer === "overlay" ? "btn" : "btn secondary"}
            type="button"
            title={t("layerOverlayHelp")}
            aria-label={t("overlay")}
            onClick={() => setLayer("overlay")}
          >
            {t("overlay")}
          </button>
        </div>
        <p className="help-line">{t(layer === "ground" ? "layerGroundHelp" : "layerOverlayHelp")}</p>
        <div className="tile-palette" style={{ marginTop: 8 }}>
          {palette.map((id) => (
            <TileButton key={id} id={id} selected={tile === id} onClick={() => setTile(id)} />
          ))}
        </div>
        <p className="help-line">{t("tileSelected", { id: tile })}</p>
        {tool === "place" && (
          <label style={{ marginTop: 8 }}>
            {t("entities")}
            <select value={placeKind} onChange={(e) => setPlaceKind(e.target.value as MapEntity["kind"])}>
              <option value="npc">{t("npc")}</option>
              <option value="monster">{t("monster")}</option>
              <option value="item">{t("itemKind")}</option>
              <option value="trigger">{t("trigger")}</option>
            </select>
          </label>
        )}
        {msg && <p className="muted">{msg}</p>}
      </aside>
      <main style={{ overflow: "auto", padding: 8 }}>
        {map && (
          <>
            <MapCanvas
              pack={pack}
              map={map}
              tool={tool}
              tile={tile}
              layer={layer}
              placeKind={placeKind}
              onChangeMap={updateMap}
              selectedEntityId={selectedEntityId}
              onSelectEntity={setSelectedEntityId}
            />
            <p className="help-line" style={{ marginTop: 8 }}>
              {t("editorContext", {
                tool: t(TOOL_LABEL[tool]),
                layer: t(layer === "ground" ? "ground" : "overlay"),
                detail: contextDetail,
              })}
            </p>
          </>
        )}
      </main>
      <aside className="panel" style={{ margin: 8, overflow: "auto" }}>
        <div className="row">
          {(["map", "events", "assets"] as const).map((k) => (
            <button key={k} className={tab === k ? "btn" : "btn secondary"} type="button" onClick={() => setTab(k)}>
              {t(k === "map" ? "entities" : k === "events" ? "events" : "assets")}
            </button>
          ))}
        </div>
        {tab === "map" &&
          (selected && map ? (
            <div>
              <p>
                {t(KIND_LABEL[selected.kind])} · {selected.id} ({selected.x},{selected.y})
              </p>
              <label>
                {t("event")}
                <select
                  value={selected.eventId ?? ""}
                  onChange={(e) =>
                    updateMap({
                      ...map,
                      entities: map.entities.map((ent) =>
                        ent.id === selected.id ? { ...ent, eventId: e.target.value || undefined } : ent,
                      ),
                    })
                  }
                >
                  <option value="">—</option>
                  {pack.events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn secondary" type="button" onClick={attachEvent}>
                {t("attachEvent")}
              </button>
              <button
                className="btn danger"
                type="button"
                onClick={() => {
                  updateMap({ ...map, entities: map.entities.filter((e) => e.id !== selected.id) });
                  setSelectedEntityId(undefined);
                }}
              >
                {t("delete")}
              </button>
              {pack.meta.startMapId === map.id && (
                <>
                  <button
                    className="btn secondary"
                    type="button"
                    title={t("spawnHelp")}
                    aria-label={t("spawn")}
                    onClick={() =>
                      onPack({
                        ...pack,
                        meta: { ...pack.meta, startX: selected.x, startY: selected.y, startMapId: map.id },
                      })
                    }
                  >
                    {t("spawn")}
                  </button>
                  <p className="help-line">{t("spawnHelp")}</p>
                </>
              )}
            </div>
          ) : (
            <p className="help-line">{t("selectEntityHint")}</p>
          ))}
        {tab === "events" && (
          <div>
            {selectedEvent ? (
              <div>
                <label>
                  {t("triggerLabel")}
                  <select
                    value={selectedEvent.trigger}
                    title={t(TRIGGER_HELP[selectedEvent.trigger])}
                    onChange={(e) =>
                      onPack({
                        ...pack,
                        events: pack.events.map((ev) =>
                          ev.id === selectedEvent.id
                            ? { ...ev, trigger: e.target.value as GameEvent["trigger"] }
                            : ev,
                        ),
                      })
                    }
                  >
                    <option value="interact">{t("triggerInteract")}</option>
                    <option value="stepOn">{t("triggerStepOn")}</option>
                    <option value="autorun">{t("triggerAutorun")}</option>
                  </select>
                </label>
                <p className="help-line">{t(TRIGGER_HELP[selectedEvent.trigger])}</p>
                <label title={t("onceHelp")}>
                  {t("once")}
                  <input
                    type="checkbox"
                    checked={!!selectedEvent.once}
                    onChange={(e) =>
                      onPack({
                        ...pack,
                        events: pack.events.map((ev) =>
                          ev.id === selectedEvent.id ? { ...ev, once: e.target.checked } : ev,
                        ),
                      })
                    }
                  />
                </label>
                <p className="help-line">{t("onceHelp")}</p>
                <p className="muted" style={{ marginTop: 8 }}>
                  {t("commands")}
                </p>
                <CommandList
                  pack={pack}
                  commands={selectedEvent.commands}
                  onChange={(commands) =>
                    onPack({
                      ...pack,
                      events: pack.events.map((ev) => (ev.id === selectedEvent.id ? { ...ev, commands } : ev)),
                    })
                  }
                />
              </div>
            ) : (
              <p className="help-line">{t("selectEventHint")}</p>
            )}
            <hr />
            {pack.events.map((ev) => (
              <button
                key={ev.id}
                className="choice"
                type="button"
                onClick={() => {
                  const host = pack.maps.flatMap((m) => m.entities).find((e) => e.eventId === ev.id);
                  if (host) {
                    setMapId(pack.maps.find((m) => m.entities.some((e) => e.id === host.id))?.id ?? mapId);
                    setSelectedEntityId(host.id);
                  }
                }}
              >
                {ev.name} ({t(TRIGGER_LABEL[ev.trigger])})
              </button>
            ))}
          </div>
        )}
        {tab === "assets" && (
          <div>
            <p className="help-line">{t("assetsHint")}</p>
            <label className="btn secondary" style={{ display: "inline-block", textAlign: "center" }}>
              {t("uploadSprite")}
              <input
                type="file"
                accept="image/png,image/jpeg"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void api.uploadAsset(adventureId, file).then((res) => {
                    onPack({
                      ...pack,
                      assets: [
                        ...pack.assets,
                        {
                          id: res.asset.id,
                          kind: "sprite",
                          name: res.asset.originalName,
                          src: res.asset.src,
                          tileSize: TILE_SIZE,
                        },
                      ],
                    });
                  });
                }}
              />
            </label>
            {pack.assets.length === 0 ? (
              <p className="muted">{t("noFile")}</p>
            ) : (
              <ul>
                {pack.assets.map((a) => (
                  <li key={a.id}>
                    {a.name} · {a.src}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function TileButton({ id, selected, onClick }: { id: number; selected: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  const ref = (el: HTMLCanvasElement | null) => {
    if (!el) return;
    el.width = 32;
    el.height = 32;
    const ctx = el.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    drawTile(ctx, 0, 0, 32, id);
  };
  return (
    <canvas
      ref={ref}
      width={32}
      height={32}
      title={t("tileSelected", { id })}
      aria-label={t("tileSelected", { id })}
      onClick={onClick}
      style={{ border: selected ? "2px solid #d4b15a" : "2px solid #333", cursor: "pointer" }}
    />
  );
}
