import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { api, getToken, setToken } from "../api/client";

export function LangToggle() {
  const { i18n, t } = useTranslation();
  const active = i18n.language.startsWith("en") ? "en" : "it";
  const next = active === "it" ? "en" : "it";
  return (
    <button
      className="lang-toggle"
      type="button"
      aria-label={t("switchLanguage", { lang: next.toUpperCase() })}
      title={t("switchLanguage", { lang: next.toUpperCase() })}
      onClick={() => {
        void i18n.changeLanguage(next);
        localStorage.setItem("brpg-lang", next);
      }}
    >
      {active.toUpperCase()}
    </button>
  );
}

export function TopBar({ email }: { email?: string | null }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  return (
    <header className="topbar">
      <Link className="brand" to="/">
        {t("brand")}
      </Link>
      <div className="row">
        <LangToggle />
        {email ? (
          <>
            <span className="muted">{email}</span>
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                setToken(null);
                nav("/login");
              }}
            >
              {t("logout")}
            </button>
          </>
        ) : (
          <Link className="btn" to="/login">
            {t("login")}
          </Link>
        )}
      </div>
    </header>
  );
}

export function useAuth() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then((r) => setEmail(r.user?.email ?? null))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);
  return { email, ready };
}
