import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { api, getToken, setToken } from "../api/client";

export function LangToggle() {
  const { i18n } = useTranslation();
  return (
    <button
      className="lang-toggle"
      type="button"
      onClick={() => {
        const next = i18n.language === "it" ? "en" : "it";
        void i18n.changeLanguage(next);
        localStorage.setItem("brpg-lang", next);
      }}
    >
      {i18n.language === "it" ? "EN" : "IT"}
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
