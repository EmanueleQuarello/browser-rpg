import { useTranslation } from "react-i18next";
import { useTouchUi } from "./useTouchUi";

/** Device-aware onboarding hint for the play screen. */
export function PlayControlsHint({ className }: { className?: string }) {
  const { t } = useTranslation();
  const touchUi = useTouchUi();
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const key = touchUi || coarse ? "tapHintTouch" : "tapHintKeyboard";
  return <span className={className ?? "play-hint"}>{t(key)}</span>;
}
