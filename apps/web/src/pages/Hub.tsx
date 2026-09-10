import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ensureDemoSession } from "../demoAuth";
import { TopBar, useAuth } from "../ui/Shell";

export function HubPage() {
  const { t } = useTranslation();
  const { email, ready } = useAuth();
  const nav = useNavigate();
  const [demoBusy, setDemoBusy] = useState(false);
  const [list, setList] = useState<
    { id: string; title: string; slug: string | null; publishedAt: string | null; updatedAt: string }[]
  >([]);

  useEffect(() => {
    if (ready && !email) nav("/login");
  }, [ready, email, nav]);

  useEffect(() => {
    if (!email) return;
    void api.listAdventures().then((r) => setList(r.adventures));
  }, [email]);

  const playDemo = async () => {
    setDemoBusy(true);
    try {
      await ensureDemoSession();
      nav("/play/demo");
    } finally {
      setDemoBusy(false);
    }
  };

  if (!ready || !email) return null;

  return (
    <div className="shell">
      <TopBar email={email} />
      <div className="page">
        <div className="panel" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>{t("editor")}</h2>
          <p className="muted">{t("editorBlurb")}</p>
          <button
            className="btn"
            type="button"
            onClick={() => void api.createAdventure().then((r) => nav(`/editor/${r.adventure.id}`))}
          >
            {t("newAdventure")}
          </button>
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>{t("myAdventures")}</h2>
          <button className="btn secondary" type="button" disabled={demoBusy} onClick={() => void playDemo()}>
            {demoBusy ? t("startingDemo") : t("playDemo")}
          </button>
        </div>
        <div className="grid-cards" style={{ marginTop: 16 }}>
          {list.map((a) => (
            <div className="panel" key={a.id}>
              <h3 style={{ marginTop: 0 }}>{a.title}</h3>
              <p className="muted">{a.publishedAt ? t("published") : a.id}</p>
              <div className="row">
                <Link className="btn" to={`/editor/${a.id}`}>
                  {t("editor")}
                </Link>
                {a.slug && (
                  <Link className="btn secondary" to={`/play/${a.slug}`}>
                    {t("play")}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
