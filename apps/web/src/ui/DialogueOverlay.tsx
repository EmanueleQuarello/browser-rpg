import { loc, type Lang, type LocalizedString } from "@browser-rpg/shared";
import { useTranslation } from "react-i18next";
import { useRuntimeUi } from "../game/runtimeStore";

export function DialogueOverlay({ lang }: { lang: Lang }) {
  const { t } = useTranslation();
  const dialogue = useRuntimeUi((s) => s.dialogue);
  if (!dialogue) return null;

  const finish = (i: number) => {
    const d = useRuntimeUi.getState().dialogue;
    useRuntimeUi.getState().setDialogue(null);
    d?.resolve(i);
  };

  return (
    <div className="overlay-card">
      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{loc(dialogue.text as LocalizedString, lang)}</p>
      {dialogue.choices?.length ? (
        dialogue.choices.map((c, i) => (
          <button key={i} className="choice" type="button" onClick={() => finish(i)}>
            {loc(c, lang)}
          </button>
        ))
      ) : (
        <button className="btn" type="button" style={{ marginTop: 12, width: "100%" }} onClick={() => finish(0)}>
          {t("continue")}
        </button>
      )}
    </div>
  );
}
