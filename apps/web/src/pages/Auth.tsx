import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api, setToken } from "../api/client";
import { LangToggle } from "../ui/Shell";

function authErrorMessage(t: (k: string) => string, e: unknown): string {
  const err = e as Error & { status?: number };
  if (err.status === 401) return t("invalid");
  if (err.status === 409) return t("emailTaken");
  if (err.status === 0 || err.status === 502 || err.message === "API unreachable") {
    return t("apiUnreachable");
  }
  return err.message || t("invalid");
}

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState(mode === "login" ? "demo@browser-rpg.local" : "");
  const [password, setPassword] = useState(mode === "login" ? "demo1234" : "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const goIn = (token: string) => {
    setToken(token);
    const dest = (loc.state as { from?: string } | null)?.from || "/hub";
    nav(dest);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(email, password);
      goIn(res.token);
    } catch (caught) {
      setErr(authErrorMessage(t, caught));
    } finally {
      setBusy(false);
    }
  };

  const enterDemo = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await api.loginDemo();
      goIn(res.token);
    } catch (caught) {
      setErr(authErrorMessage(t, caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" to="/">
          {t("brand")}
        </Link>
        <LangToggle />
      </header>
      <div className="page" style={{ maxWidth: 420 }}>
        <form className="panel" onSubmit={(e) => void submit(e)} autoComplete="off">
          <h2>{mode === "login" ? t("login") : t("register")}</h2>
          <label>
            {t("email")}
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="text"
              inputMode="email"
              autoComplete="username"
              required
            />
          </label>
          <label>
            {t("password")}
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
            />
          </label>
          {err && <p className="error">{err}</p>}
          <button className="btn" type="submit" disabled={busy}>
            {mode === "login" ? t("login") : t("register")}
          </button>
          {mode === "login" && (
            <button className="btn secondary" type="button" disabled={busy} onClick={() => void enterDemo()}>
              {t("loginDemo")}
            </button>
          )}
          <p className="muted">{t("demoHint")}</p>
          {mode === "login" ? (
            <Link to="/register">{t("register")}</Link>
          ) : (
            <Link to="/login">{t("login")}</Link>
          )}
        </form>
      </div>
    </div>
  );
}
