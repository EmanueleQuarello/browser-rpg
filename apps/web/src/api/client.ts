const TOKEN_KEY = "brpg-token";
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    const err = new Error("API unreachable") as Error & { status: number };
    err.status = 0;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || res.statusText) as Error & {
      status: number;
    };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  register: (email: string, password: string) =>
    req<{ token: string; user: { id: string; email: string } }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    req<{ token: string; user: { id: string; email: string } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    }),
  loginDemo: () =>
    req<{ token: string; user: { id: string; email: string } }>("/api/auth/demo", {
      method: "POST",
      body: "{}",
    }),
  me: () => req<{ user: { id: string; email: string } | null }>("/api/auth/me"),
  listAdventures: () =>
    req<{
      adventures: { id: string; title: string; slug: string | null; publishedAt: string | null; updatedAt: string }[];
    }>("/api/adventures"),
  createAdventure: () =>
    req<{ adventure: { id: string; title: string } }>("/api/adventures", { method: "POST", body: "{}" }),
  getAdventure: (id: string) =>
    req<{
      adventure: {
        id: string;
        title: string;
        slug: string | null;
        publishedAt: string | null;
        pack: unknown;
        assets: { id: string; originalName: string; url: string }[];
      };
    }>(`/api/adventures/${id}`),
  saveAdventure: (id: string, pack: unknown, title?: string) =>
    req(`/api/adventures/${id}`, { method: "PUT", body: JSON.stringify({ pack, title }) }),
  publish: (id: string) => req<{ slug: string; url: string }>(`/api/adventures/${id}/publish`, { method: "POST", body: "{}" }),
  uploadAsset: async (id: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return req<{ asset: { id: string; url: string; src: string; originalName: string } }>(
      `/api/adventures/${id}/assets`,
      { method: "POST", body },
    );
  },
  play: (slug: string) =>
    req<{ adventure: { id: string; title: string; slug: string; pack: unknown }; save: unknown }>(
      `/api/play/${slug}`,
    ),
  saveGame: (adventureId: string, state: unknown) =>
    req(`/api/savegames/${adventureId}`, { method: "PUT", body: JSON.stringify({ state }) }),
};

export function resolveAssetSrc(src: string): string {
  if (src.startsWith("file:")) return `${API_BASE}/api/files/${src.slice(5)}`;
  if (src.startsWith("/api/")) return `${API_BASE}${src}`;
  return src;
}
