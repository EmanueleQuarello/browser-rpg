import { Navigate, Route, Routes } from "react-router-dom";
import { AuthPage } from "./pages/Auth";
import { EditorPage } from "./pages/EditorPage";
import { HubPage } from "./pages/Hub";
import { LandingPage } from "./pages/Landing";
import { PlayPage } from "./pages/PlayPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/hub" element={<HubPage />} />
      <Route path="/editor/:id" element={<EditorPage />} />
      <Route path="/play/:slug" element={<PlayPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
