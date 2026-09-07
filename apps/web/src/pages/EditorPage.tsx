import { parseAdventurePack, type AdventurePack } from "@browser-rpg/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { EditorApp } from "../editor/EditorApp";
import { PlayView } from "./PlayPage";
import { useAuth } from "../ui/Shell";

export function EditorPage() {
  const { id } = useParams();
  const { email, ready } = useAuth();
  const nav = useNavigate();
  const [pack, setPack] = useState<AdventurePack | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [playtest, setPlaytest] = useState(false);

  useEffect(() => {
    if (ready && !email) nav("/login", { state: { from: `/editor/${id}` } });
  }, [ready, email, nav, id]);

  useEffect(() => {
    if (!id || !email) return;
    void api.getAdventure(id).then((r) => {
      setPack(parseAdventurePack(r.adventure.pack));
      setSlug(r.adventure.slug);
    });
  }, [id, email]);

  if (!pack || !id) return null;

  if (playtest) {
    return (
      <PlayView
        pack={pack}
        adventureId={id}
        onBack={() => setPlaytest(false)}
        persist={false}
      />
    );
  }

  return (
    <div className="shell" style={{ height: "100%" }}>
      <EditorApp
        adventureId={id}
        pack={pack}
        slug={slug}
        onPack={setPack}
        onPlaytest={() => setPlaytest(true)}
      />
    </div>
  );
}
