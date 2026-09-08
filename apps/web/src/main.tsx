import { Sentry } from "./sentry";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./i18n";
import "./index.css";

function CrashFallback() {
  const { t } = useTranslation();
  return (
    <div className="shell">
      <p>{t("crashFallback")}</p>
      <button type="button" className="btn" onClick={() => window.location.reload()}>
        {t("retry")}
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<CrashFallback />}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
