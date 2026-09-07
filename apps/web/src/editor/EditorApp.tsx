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

type Props = {
  adventureId: string;
  pack: AdventurePack;
  slug: string | null;
  onPack: (p: AdventurePack) => void;
  onPlaytest: () => void;
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
  const map = pack.maps.find((m) => m.id === mapId) ?? pack.maps[0];
  const selected = map?.entities.find((e) => e.id === selectedEntityId);
  const selectedEvent = pack.events.find((e) => e.id === selected?.eventId);

  const palette = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 11];
  }, []);

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

  const attachEvent = () => {
    if (!selected || !map) return;
    const ev: GameEvent = {
      id: `evt_${selected.id}`,
      name: selected.id,
      trigger: selected.kind === "item" ? "stepOn" : selected.kind === "trigger" && selected.id.includes("intro") ? "autorun" : "interact",
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
          <button className="lang-toggle" type="button" onClick={() => void i18n.changeLanguage(i18n.language === "it" ? "en" : "it")}>
            {i18n.language === "it" ? "EN" : "IT"}
          </button>
          <button className="btn secondary" type="button" onClick={onPlaytest}>
            {t("playtest")}
          </button>
          <button className="btn secondary" type="button" onClick={() => void save()}>
            {t("save")}
          </button>
          <button className="btn" type="button" onClick={() => void publish()}>
            {t("publish")}
          </button>
          {slug && (
            <button
              className="btn secondary"
              type="button"
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
        <label>
          {t("title")} IT
          <input
            className="input"
            value={pack.meta.title.it}
            onChange={(e) => onPack({ ...pack, meta: { ...pack.meta, title: { ...pack.meta.title, it: e.target.value } } })}
          />
        </label>
        <label>
          {t("title")} EN
          <input
            className="input"
            value={pack.meta.title.en}
            onChange={(e) => onPack({ ...pack, meta: { ...pack.meta, title: { ...pack.meta.title, en: e.target.value } } })}
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
            <button key={k} className={tool === k ? "btn" : "btn secondary"} type="button" onClick={() => setTool(k)}>
              {t(k === "paint" ? "paint" : k === "collision" ? "collision" : k === "erase" ? "erase" : "place")}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className={layer === "ground" ? "btn" : "btn secondary"} type="button" onClick={() => setLayer("ground")}>
            {t("ground")}
          </button>
          <button className={layer === "overlay" ? "btn" : "btn secondary"} type="button" onClick={() => setLayer("overlay")}>
            {t("overlay")}
          </button>
        </div>
        <div className="tile-palette" style={{ marginTop: 8 }}>
          {palette.map((id) => (
            <TileButton key={id} id={id} selected={tile === id} onClick={() => setTile(id)} />
          ))}
        </div>
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
      <main style={{ overflow: "auto", padding: 8 }}>{map && (
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
      )}</main>
      <aside className="panel" style={{ margin: 8, overflow: "auto" }}>
        <div className="row">
          {(["map", "events", "assets"] as const).map((k) => (
            <button key={k} className={tab === k ? "btn" : "btn secondary"} type="button" onClick={() => setTab(k)}>
              {t(k === "map" ? "entities" : k === "events" ? "events" : "assets")}
            </button>
          ))}
        </div>
        {tab === "map" && selected && map && (
          <div>
            <p>
              {selected.kind} · {selected.id} ({selected.x},{selected.y})
            </p>
            <label>
              event
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
              + event
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
              <button
                className="btn secondary"
                type="button"
                onClick={() =>
                  onPack({
                    ...pack,
                    meta: { ...pack.meta, startX: selected.x, startY: selected.y, startMapId: map.id },
                  })
                }
              >
                spawn
              </button>
            )}
          </div>
        )}
        {tab === "events" && (
          <div>
            {selectedEvent ? (
              <div>
                <label>
                  trigger
                  <select
                    value={selectedEvent.trigger}
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
                    <option value="interact">interact</option>
                    <option value="stepOn">stepOn</option>
                    <option value="autorun">autorun</option>
                  </select>
                </label>
                <label>
                  once
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
              <p className="muted">Select entity / event</p>
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
                {ev.name} ({ev.trigger})
              </button>
            ))}
          </div>
        )}
        {tab === "assets" && (
          <div>
            <input
              type="file"
              accept="image/png,image/jpeg"
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
            <ul>
              {pack.assets.map((a) => (
                <li key={a.id}>
                  {a.name} · {a.src}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function TileButton({ id, selected, onClick }: { id: number; selected: boolean; onClick: () => void }) {
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
      onClick={onClick}
      style={{ border: selected ? "2px solid #d4b15a" : "2px solid #333", cursor: "pointer" }}
    />
  );
}
