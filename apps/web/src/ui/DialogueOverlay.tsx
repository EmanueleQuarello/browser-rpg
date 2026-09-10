import { loc, type Lang, type LocalizedString } from "@browser-rpg/shared";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useRuntimeUi } from "../game/runtimeStore";

export function DialogueOverlay({ lang }: { lang: Lang }) {
  const { t } = useTranslation();
  const dialogue = useRuntimeUi((s) => s.dialogue);
  const continueRef = useRef<HTMLButtonElement>(null);

  const finish = (i: number) => {
    const d = useRuntimeUi.getState().dialogue;
    if (!d) return;
    d.resolve(i);
    useRuntimeUi.getState().setDialogue(null);
  };

  useEffect(() => {
    if (!dialogue) return;
    continueRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      e.stopPropagation();
      if (dialogue.choices?.length) return;
      finish(0);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [dialogue]);

  if (!dialogue) return null;

  return (
    <div className="dialogue-overlay" role="dialog" aria-modal="true">
      <div className="overlay-card dialogue-card">
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{loc(dialogue.text as LocalizedString, lang)}</p>
        {dialogue.choices?.length ? (
          dialogue.choices.map((c, i) => (
            <button key={i} className="choice" type="button" onClick={() => finish(i)}>
              {loc(c, lang)}
            </button>
          ))
        ) : (
          <button
            ref={continueRef}
            className="btn"
            type="button"
            data-testid="dialogue-continue"
            style={{ marginTop: 12, width: "100%" }}
            onClick={() => finish(0)}
          >
            {t("continue")}
          </button>
        )}
      </div>
    </div>
  );
}
