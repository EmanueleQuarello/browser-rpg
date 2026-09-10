import { api, getToken, setToken } from "./api/client";

/** Log in as the shared demo user when no session exists yet. */
export async function ensureDemoSession(): Promise<void> {
  if (getToken()) return;
  const res = await api.loginDemo();
  setToken(res.token);
}
