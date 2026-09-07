import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LangToggle, useAuth } from "../ui/Shell";

export function LandingPage() {
  const { t } = useTranslation();
  const { email } = useAuth();
  const editorTo = email ? "/hub" : "/login";
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
          <p>{t("tapHint")}</p>
          <div className="row">
            <Link className="btn" to="/play/demo">
              {t("playDemo")}
            </Link>
            <Link className="btn secondary" to={editorTo} state={email ? undefined : { from: "/hub" }}>
              {t("openEditor")}
            </Link>
          </div>
          <p className="muted">{t("demoHint")}</p>
        </div>
      </div>
    </div>
  );
}
