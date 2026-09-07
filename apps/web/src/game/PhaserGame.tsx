import type { AdventurePack, GameState, Lang } from "@browser-rpg/shared";
import Phaser from "phaser";
import { useEffect, useRef } from "react";
import { GameScene } from "./GameScene";
import { PlaySession } from "./session";

type Props = {
  pack: AdventurePack;
  lang: Lang;
  saved?: GameState | null;
  sessionRef: React.MutableRefObject<PlaySession | null>;
  onState: () => void;
};

export function PhaserGame({ pack, lang, saved, sessionRef, onState }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const onStateRef = useRef(onState);
  onStateRef.current = onState;
  if (sessionRef.current) sessionRef.current.lang = lang;

  useEffect(() => {
    if (!parentRef.current) return;
    const session = new PlaySession(pack, lang, saved);
    session.onState = () => onStateRef.current();
    sessionRef.current = session;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: parentRef.current,
      backgroundColor: "#0b0908",
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: parentRef.current.clientWidth || 800,
        height: parentRef.current.clientHeight || 600,
      },
      input: { keyboard: true },
    });
    game.scene.add("game", GameScene, true, { session });

    return () => {
      game.destroy(true);
      sessionRef.current = null;
    };
    // pack identity is controlled by parent key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack]);

  return <div ref={parentRef} className="phaser-parent" style={{ width: "100%", height: "100%" }} />;
}
