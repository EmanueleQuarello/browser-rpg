import { COMMAND_TYPES, type AdventurePack, type EventCommand } from "@browser-rpg/shared";
import { useTranslation } from "react-i18next";
import { makeCommand } from "./commands";

function LocFields({
  value,
  onChange,
}: {
  value: { it: string; en: string };
  onChange: (v: { it: string; en: string }) => void;
}) {
  return (
    <div className="row">
      <input className="input" placeholder="IT" value={value.it} onChange={(e) => onChange({ ...value, it: e.target.value })} />
      <input className="input" placeholder="EN" value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} />
    </div>
  );
}

function CommandView({
  cmd,
  pack,
  onChange,
  onRemove,
}: {
  cmd: EventCommand;
  pack: AdventurePack;
  onChange: (c: EventCommand) => void;
  onRemove: () => void;
}) {
  return (
    <div className="cmd-block">
      <div className="row">
        <select
          value={cmd.type}
          onChange={(e) => onChange(makeCommand(e.target.value as EventCommand["type"]))}
        >
          {COMMAND_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button className="btn danger" type="button" onClick={onRemove}>
          ×
        </button>
      </div>
      {cmd.type === "showText" && <LocFields value={cmd.text} onChange={(text) => onChange({ ...cmd, text })} />}
      {cmd.type === "setFlag" && (
        <div className="row">
          <select value={cmd.flagId} onChange={(e) => onChange({ ...cmd, flagId: e.target.value })}>
            <option value="">flag</option>
            {pack.flags.map((f) => (
              <option key={f.id} value={f.id}>
                {f.id}
              </option>
            ))}
          </select>
          <select
            value={String(cmd.value)}
            onChange={(e) => onChange({ ...cmd, value: e.target.value === "true" })}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
      )}
      {(cmd.type === "giveItem" || cmd.type === "removeItem") && (
        <div className="row">
          <select value={cmd.itemId} onChange={(e) => onChange({ ...cmd, itemId: e.target.value })}>
            <option value="">item</option>
            {pack.items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.id}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="number"
            value={cmd.qty ?? 1}
            onChange={(e) => onChange({ ...cmd, qty: Number(e.target.value) })}
          />
        </div>
      )}
      {cmd.type === "teleport" && (
        <div className="row">
          <select value={cmd.mapId} onChange={(e) => onChange({ ...cmd, mapId: e.target.value })}>
            {pack.maps.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </select>
          <input className="input" type="number" value={cmd.x} onChange={(e) => onChange({ ...cmd, x: Number(e.target.value) })} />
          <input className="input" type="number" value={cmd.y} onChange={(e) => onChange({ ...cmd, y: Number(e.target.value) })} />
        </div>
      )}
      {cmd.type === "startBattle" && (
        <select value={cmd.monsterId} onChange={(e) => onChange({ ...cmd, monsterId: e.target.value })}>
          <option value="">monster</option>
          {pack.monsters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}
            </option>
          ))}
        </select>
      )}
      {cmd.type === "wait" && (
        <input className="input" type="number" value={cmd.ms} onChange={(e) => onChange({ ...cmd, ms: Number(e.target.value) })} />
      )}
      {cmd.type === "setTile" && (
        <div className="row">
          <input className="input" type="number" value={cmd.x} onChange={(e) => onChange({ ...cmd, x: Number(e.target.value) })} />
          <input className="input" type="number" value={cmd.y} onChange={(e) => onChange({ ...cmd, y: Number(e.target.value) })} />
          <input className="input" type="number" value={cmd.tile} onChange={(e) => onChange({ ...cmd, tile: Number(e.target.value) })} />
          <select
            value={String(cmd.collision)}
            onChange={(e) => onChange({ ...cmd, collision: e.target.value === "true" })}
          >
            <option value="false">walk</option>
            <option value="true">block</option>
          </select>
        </div>
      )}
      {cmd.type === "removeEntity" && (
        <input className="input" value={cmd.entityId} onChange={(e) => onChange({ ...cmd, entityId: e.target.value })} />
      )}
      {cmd.type === "moveNpc" && (
        <input className="input" value={cmd.entityId} onChange={(e) => onChange({ ...cmd, entityId: e.target.value })} />
      )}
      {cmd.type === "if" && (
        <div>
          <select
            value={cmd.condition.type === "hasItem" ? "hasItem" : "flag"}
            onChange={(e) =>
              onChange({
                ...cmd,
                condition:
                  e.target.value === "hasItem"
                    ? { type: "hasItem", itemId: "" }
                    : { type: "flag", flagId: "" },
              })
            }
          >
            <option value="flag">flag</option>
            <option value="hasItem">hasItem</option>
          </select>
          {cmd.condition.type === "flag" && (
            <select
              value={cmd.condition.flagId}
              onChange={(e) => onChange({ ...cmd, condition: { type: "flag", flagId: e.target.value } })}
            >
              {pack.flags.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id}
                </option>
              ))}
            </select>
          )}
          {cmd.condition.type === "hasItem" && (
            <select
              value={cmd.condition.itemId}
              onChange={(e) => onChange({ ...cmd, condition: { type: "hasItem", itemId: e.target.value } })}
            >
              {pack.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.id}
                </option>
              ))}
            </select>
          )}
          <CommandList
            pack={pack}
            commands={cmd.then}
            onChange={(then) => onChange({ ...cmd, then })}
          />
          <CommandList
            pack={pack}
            commands={cmd.else ?? []}
            onChange={(els) => onChange({ ...cmd, else: els })}
          />
        </div>
      )}
      {cmd.type === "showChoices" && (
        <div>
          <LocFields value={cmd.prompt} onChange={(prompt) => onChange({ ...cmd, prompt })} />
          {cmd.choices.map((ch, i) => (
            <div key={i} className="cmd-block">
              <LocFields
                value={ch.text}
                onChange={(text) => {
                  const choices = cmd.choices.slice();
                  choices[i] = { ...ch, text };
                  onChange({ ...cmd, choices });
                }}
              />
              <CommandList
                pack={pack}
                commands={ch.commands}
                onChange={(commands) => {
                  const choices = cmd.choices.slice();
                  choices[i] = { ...ch, commands };
                  onChange({ ...cmd, choices });
                }}
              />
            </div>
          ))}
          <button
            className="btn secondary"
            type="button"
            onClick={() =>
              onChange({
                ...cmd,
                choices: [...cmd.choices, { text: { it: "", en: "" }, commands: [] }],
              })
            }
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

export function CommandList({
  pack,
  commands,
  onChange,
}: {
  pack: AdventurePack;
  commands: EventCommand[];
  onChange: (c: EventCommand[]) => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      {commands.map((c, i) => (
        <CommandView
          key={i}
          cmd={c}
          pack={pack}
          onChange={(next) => {
            const copy = commands.slice();
            copy[i] = next;
            onChange(copy);
          }}
          onRemove={() => onChange(commands.filter((_, j) => j !== i))}
        />
      ))}
      <button
        className="btn secondary"
        type="button"
        onClick={() => onChange([...commands, makeCommand("showText")])}
      >
        {t("addCommand")}
      </button>
    </div>
  );
}
