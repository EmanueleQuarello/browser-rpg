import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { ensureDemoSession } from "../demoAuth";
import { LangToggle, useAuth } from "../ui/Shell";

export function LandingPage() {
  const { t } = useTranslation();
  const { email } = useAuth();
  const nav = useNavigate();
  const editorTo = email ? "/hub" : "/login";
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoErr, setDemoErr] = useState("");

  const playDemo = async () => {
    setDemoErr("");
    setDemoBusy(true);
    try {
      await ensureDemoSession();
      nav("/play/demo");
    } catch {
      setDemoErr(t("apiUnreachable"));
      nav("/login", { state: { from: "/play/demo" } });
    } finally {
      setDemoBusy(false);
    }
  };

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">{t("brand")}</span>
        <div className="row">
          <LangToggle />
          <Link className="btn secondary" to="/login">
            {t("login")}
          </Link>
          <Link className="btn" to="/register">
            {t("register")}
          </Link>
        </div>
      </header>
      <div className="page">
        <div className="panel">
          <h1 className="display">{t("brand")}</h1>
          <p className="muted">{t("tagline")}</p>
          <p>{t("platformBlurb")}</p>
          <p className="landing-hint">{t("landingHint")}</p>
          <div className="row">
            <button className="btn" type="button" disabled={demoBusy} onClick={() => void playDemo()}>
              {demoBusy ? t("startingDemo") : t("playDemo")}
            </button>
            <Link className="btn secondary" to={editorTo} state={email ? undefined : { from: "/hub" }}>
              {t("openEditor")}
            </Link>
          </div>
          {demoErr && <p className="error">{demoErr}</p>}
          <p className="muted">{t("demoHint")}</p>
        </div>
      </div>
    </div>
  );
}
