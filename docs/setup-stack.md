# Setup stack (Vercel + Render + Neon + R2)

## Sei qui (8 settembre 2026)

Account fatti: **Vercel, Render, Neon, R2, Resend, Sentry**. Il gioco è **online**.

- SPA: https://browser-rpg-snowy.vercel.app
- API: https://browser-rpg-api.onrender.com (`/api/health` → `{"ok":true}`)
- Demo: `demo@browser-rpg.local` / `demo1234`

R2 bucket `browser-rpg-packs` (pubblico + CORS). Chiavi Resend/Sentry nei dashboard.

Nel codice: Sentry (errori), mail di benvenuto Resend su register, upload asset su R2 se le chiavi S3 sono su Render (altrimenti disco locale).

Se esiste un secondo progetto Vercel **browser-rpg-api**, cancellalo.

---

Runbook aggiornato a **settembre 2026** (Cursor Customize, Origin, Vercel for Origin).
Segui le sezioni **in ordine**. Non incollare segreti in git: solo nei dashboard.

## Perché GitHub resta la fonte di verità (e Origin non cambia le carte)

Cursor ha un forge proprio: **Origin** (`origin.cursor.com`, browse su [cursor.com/codebase](https://cursor.com/codebase)). Non sostituisce GitHub **per questo progetto**, per quattro motivi documentati:

| Vincolo | Dettaglio |
| --- | --- |
| Piano Cursor | Origin è su **Pro / Teams / Enterprise**, non sul piano Free |
| Visibilità | I repo Origin sono **sempre privati** (Internal o grant espliciti). Niente clone anonimo, niente Actions pubbliche |
| Vercel Hobby | [Vercel for Origin](https://vercel.com/docs/git/vercel-for-origin): *«All Origin repositories are private and cannot be deployed from a Vercel Hobby team.»* |
| Render | Non è tra le Origin Apps (solo Vercel, Depot, Buildkite). Render importa da GitHub |

Quindi: **GitHub pubblico + Vercel Hobby + Render Free** resta lo stack gratis. Origin è un **mirror opzionale** (Pro+) per Cloud Agents e PR su `cursor.com/codebase`, con GitHub che resta source of truth.

Non usare **New Project → Continue with Origin** su un team Vercel Hobby: fallisce. Importa il repo GitHub.

---

## Due superfici Cursor (non confonderle)

Nella app **non** esiste più `Settings → Cursor Settings → Integrations`.

| Cosa | Dove | URL |
| --- | --- | --- |
| Plugin, MCP, skill, rules | Sidebar **Customize** → **MCPs** / Marketplace | [cursor.com/docs/customize-cursor](https://cursor.com/docs/customize-cursor) |
| Collegare GitHub / Slack / Linear | **Dashboard web** → **Integrations** | [cursor.com/dashboard](https://cursor.com/dashboard) |
| Cloud Agents | Dashboard o input agente → **Cloud** | [cursor.com/agents](https://cursor.com/agents) |
| Bugbot e automazioni | **Automations** | [cursor.com/automations](https://cursor.com/automations) |
| Repo Origin (opzionale) | Codebase | [cursor.com/codebase](https://cursor.com/codebase) |

GitHub **non** va in `mcp.json`: è l’app nativa sul dashboard.

---

## Stack

| Pezzo | Dove | Piano |
| --- | --- | --- |
| Codice + CI | GitHub | Free (repo già pubblico) |
| SPA Vite + Phaser | Vercel | Hobby (non commerciale) |
| API Fastify | Render | Free (sleep ~15 min) |
| Database | Neon in cloud; SQLite in locale | Free |
| Asset pack | Cloudflare R2 | Free, egress 0€ |
| Errori | Sentry | Developer |
| Email | Resend | Free (quando il login è pubblico) |
| Mirror + Cloud Agents (opz.) | Cursor Origin | Solo se hai Cursor **Pro+** |

Limite Hobby: **100 GB/mese**. PNG/audio **non** da Vercel: da R2.

---

## 0. Prerequisiti

**Obiettivo:** Node e un’email pronti.

1. Node **20+** (`node -v`).
2. Email per GitHub, Vercel, Cloudflare, Neon, Render.
3. Niente carta. Niente Oracle, Hetzner, UptimeRobot.
4. `npm ci` in root; se manca: `cp apps/api/.env.example apps/api/.env`.
5. `npm run dev` → web `5173`, API `3001`. Demo: `demo@browser-rpg.local` / `demo1234`.

**Fatto quando:** `http://127.0.0.1:5173/play/demo` carica e `/api/health` risponde `{ "ok": true }`.

---

## 1. GitHub (obbligatorio) + Cursor dashboard

**Obiettivo:** source of truth su GitHub; Cloud Agents/Bugbot sul **dashboard**, non in Customize.

Repo già esistente: **https://github.com/EmanueleQuarello/browser-rpg** (`main`).

1. Account [GitHub Free](https://github.com/signup) se serve (qui: `EmanueleQuarello`).
2. Clone fresco:

   ```bash
   git remote add origin https://github.com/EmanueleQuarello/browser-rpg.git
   git push -u origin main
   ```

3. Apri [cursor.com/dashboard](https://cursor.com/dashboard) → **Integrations** → **GitHub** → **Connect**.
   Installa [github.com/apps/cursor](https://github.com/apps/cursor) e autorizza `browser-rpg` (tutti i repo o solo questo).
4. **Bugbot:** [cursor.com/automations](https://cursor.com/automations) → Bugbot → abilita sul repo. Funziona su PR **GitHub**, non su PR solo-Origin.
5. **Cloud Agents:** [cursor.com/agents](https://cursor.com/agents) (o dropdown **Cloud** nell’agente desktop) sullo stesso repo.

**Fatto quando:** il dashboard mostra GitHub connesso e il repo è selezionabile per Agents/Bugbot.

**Limite Free GitHub:** Actions illimitata se il repo resta **pubblico**.

---

## 1b. Origin — solo se hai Cursor Pro+ (opzionale)

**Obiettivo:** mirror per browse/agenti su `cursor.com/codebase`. GitHub resta la fonte.

Non creare un secondo remote al posto di GitHub. Non staccare `origin` GitHub.

1. Piano Cursor **Pro, Teams o Enterprise**. Su Free Origin non c’è.
2. [cursor.com/codebase](https://cursor.com/codebase) → **Get Started** e scegli il namespace (in beta **non si cambia più**).
3. **Sync from GitHub** → org `EmanueleQuarello` → repo `browser-rpg`. Serve l’app GitHub di Cursor e ruolo admin sul repo.
4. Per il CLI: `curl -fsSL https://downloads.cursor.com/origin/install.sh | sh` poi `origin auth login`.
5. Pushes sul remote Origin **synced** passano a GitHub. **Detach from GitHub** rende Origin source of truth: **non farlo** finché usi Hobby + Render.

**Fatto quando:** su `cursor.com/codebase/.../browser-rpg` vedi il codice con icona “synced from GitHub”.

Se Origin non compare, ignora questa sezione: lo stack gratis non ne ha bisogno.

---

## 2. Vercel Hobby (solo frontend, da GitHub)

**Obiettivo:** SPA su `*.vercel.app`. API **non** su Vercel.

1. [vercel.com/signup](https://vercel.com/signup) con **GitHub**, piano **Hobby**.
2. **Add New → Project** → importa `EmanueleQuarello/browser-rpg`.
   Non cliccare **Continue with Origin** (Hobby non deploya repo Origin).
3. Impostazioni:
   - **Root Directory:** vuoto (monorepo). Vale `vercel.json` in root.
   - **Build:** `npm run build -w @browser-rpg/web`
   - **Output:** `apps/web/dist`
   - **Install:** `npm ci`
4. Non mettere ancora `VITE_API_URL` (dopo Render). Il primo deploy mostra la landing; `/api` fallisce: normale.
5. Plugin: sidebar **Customize** → cerca **Vercel** → **Add to Cursor**, OAuth.
   In `.cursor/mcp.json` c’è già l’URL; in **Customize → MCPs** fai **Connect**.

Rewrite SPA: `/play/:slug`, `/hub`, `/editor/:id` → `index.html`. `/assets/` resta statico.

**Fatto quando:** l’URL Vercel mostra la landing.

**Limite Hobby:** 100 GB/mese, **non commerciale**. Per Origin→Vercel servirebbe un **team Vercel a pagamento**, fuori da questo piano.

---

## 3. Neon (Postgres)

**Obiettivo:** `DATABASE_URL` Postgres per Render. In locale SQLite.

1. [neon.tech](https://neon.tech) piano Free (0.5 GB).
2. **Create project** (EU se Render è Frankfurt).
3. **Connection string (la password del database).** Nel progetto Neon apri **Dashboard → Connect** (o **Connection details**) e copia l’URI, tipo `postgresql://utente:password@….neon.tech/neondb?sslmode=require`. È `DATABASE_URL`: l’API su Render la userà per leggere/scrivere utenti, avventure e savegame. Conservala (gestore password), **non** metterla nel repo, in `apps/api/.env` committato, né in chat. La incolli più avanti nelle env di Render (sezione 4). In locale il gioco continua a usare SQLite (`file:./dev.db`); questa stringa serve solo al cloud.
4. **Plugin Neon in Cursor (opzionale, il gioco funziona anche senza).** Serve solo se vuoi che l’agente in questa chat possa ispezionare il DB Neon. Sidebar **Customize → MCPs** (o Marketplace) → **Neon** → **Add to Cursor** / **Connect**. Si apre il browser, accedi con lo stesso account Neon (OAuth = login, non un token da copiare). Se salti questo passo, Neon e Render funzionano lo stesso.

**Cosa fa Prisma (e perché c’è quel file).**  
`apps/api/prisma/schema.prisma` elenca le tabelle (User, Adventure, …). In cima dice *che tipo* di database usare. Oggi c’è `sqlite`: un file sul PC (`dev.db`). Neon è **Postgres**, un altro tipo. Prisma non parla con Neon finché nel file resta `sqlite`. Non ci sono due copie del file e nessun “branch di deploy” separato: è **un solo file**.

**Adesso:** se stai solo aprendo Neon, **non toccare** `schema.prisma`. Il PC resta su SQLite.

**Quando Render è pronto** (sezione 4), si fa una volta sola:

1. In `schema.prisma` cambi `provider = "sqlite"` in `provider = "postgresql"`.
2. Su Render (e, se sviluppi contro il cloud, nel `.env` locale che **non** va su git) metti la connection string Neon come `DATABASE_URL`.
3. Col terminale, con quella URL:

   ```bash
   export DATABASE_URL="incolla-qui-la-stringa-neon"
   npm run db:generate -w @browser-rpg/api
   npm run db:push -w @browser-rpg/api
   ```

   `db:push` crea su Neon le tabelle. Poi nel dashboard Neon vedi `User`, `Adventure`, ecc.

Dopo quel cambio il file `dev.db` in locale **non** basta più (SQLite e Postgres non convivono nello stesso schema). O punti a Neon, o si torna a sqlite: una cosa alla volta.

**Fatto quando (Neon):** hai account, progetto e connection string salvata. Il cambio di `schema.prisma` si fa con Render, non ora.

**Limite Free:** 0.5 GB, scale-to-zero. 1000 MAU ci stanno.

---

## 4. Render (API Fastify, da GitHub)

**Obiettivo:** Node su `*.onrender.com`. Import **GitHub**, non Origin.

1. [render.com](https://render.com) con GitHub.
2. **New → Blueprint** (`render.yaml`) **oppure** Web Service:
   - Repo GitHub `browser-rpg`
   - Runtime Node, plan **Free**
   - **Build:** `npm ci --include=dev && npm run db:generate -w @browser-rpg/api`
   - **Start:** `npm run start -w @browser-rpg/api`
   - **Health:** `/api/health`
3. Env: `NODE_VERSION=20`, `HOST=0.0.0.0`, `JWT_SECRET` lungo (non quello locale), `DATABASE_URL` Neon, opzionale `FRONTEND_ORIGIN`.
4. Se le tabelle mancano: `npm run db:push -w @browser-rpg/api` con la stessa `DATABASE_URL`.
5. `https://<servizio>.onrender.com/api/health` → `{"ok":true}`. Free: sleep ~15 min, prima richiesta 30–50 s.
6. **Customize** → plugin **Render** → OAuth. Log e stato da chat.

Poi **Vercel → Settings → Environment Variables**:

- `VITE_API_URL` = `https://<servizio>.onrender.com` (niente slash finale)
- Redeploy frontend

**Fatto quando:** da Vercel, login demo e `/play/demo` funzionano (attendi il wake-up).

**Limite Free:** 0.1 CPU / 512 MB. Always-on: **Render Starter**, stesso plugin.

Niente SQLite su disco Render. Niente Fastify su Vercel Functions.

---

## 5. Cloudflare R2

**Obiettivo:** tileset/audio fuori da Vercel.

1. [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) Free.
2. **R2 → Create bucket** `browser-rpg-packs`.
3. Public access (`r2.dev` o custom).
4. CORS: origini Vercel + `http://localhost:5173`, `GET`/`HEAD`.
5. Path upload: `adventures/<adventureId>/<uuid>.png`.
6. **API token** (per upload da Render): R2 → Manage R2 API Tokens → Create. Permessi **Object Read & Write** sul bucket `browser-rpg-packs`. Su Render: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME=browser-rpg-packs`, `R2_PUBLIC_BASE_URL=https://pub-….r2.dev`.
7. **Customize** → Cloudflare → OAuth.

Il JSON avventura resta nel DB. Senza le chiavi R2 l’editor salva sul disco di Render (effimero).

**Fatto quando:** un PNG di test risponde su `https://pub-….r2.dev/...`.

**Limite Free:** 10 GB, 1M write, 10M read/mese, egress 0€.

---

## 6. Sentry

**Obiettivo:** crash visibili in Cursor; Automation su issue nuove.

1. [sentry.io](https://sentry.io) **Developer**.
2. Progetti React/Vite e Node (o uno).
3. DSN: `VITE_SENTRY_DSN` su Vercel, `SENTRY_DSN` su Render (quando c’è l’SDK).
4. **Customize → MCPs** → Sentry (già in `mcp.json`) → OAuth.
   Per un’Automation che apre PR, Sentry deve essere anche plugin/dashboard MCP, non solo il file: l’editor Automations non vede i server *solo* in `.cursor/mcp.json`.
5. [cursor.com/automations](https://cursor.com/automations) → trigger **Sentry → issue created** → l’agente apre una PR su **GitHub** (o su Origin se hai il mirror e lo scegli come checkout).

**Fatto quando:** MCP Sentry è connected (non “needs login”).

**Limite Developer:** 5k error/mese, 1 seat.

---

## 7. Resend (quando il login è pubblico)

Si può saltare con il solo login demo.

1. [resend.com](https://resend.com) Free.
2. Dominio o sandbox.
3. `RESEND_API_KEY` solo su Render.
4. 3000 mail/mese, **100/giorno**.

**Fatto quando:** parte una mail di test. JWT resta in Fastify: niente Auth0/Clerk.

---

## 8. Customize + `mcp.json`

Il file [`.cursor/mcp.json`](../.cursor/mcp.json) è nel repo (URL OAuth, **niente token**). Resta valido e si merge con Customize.

| Nome in file | URL |
| --- | --- |
| vercel | `https://mcp.vercel.com` |
| render | `https://mcp.render.com/mcp` |
| Neon | `https://mcp.neon.tech/mcp` |
| cloudflare | `https://mcp.cloudflare.com/mcp` |
| sentry | `https://mcp.sentry.dev/mcp` |

1. Sidebar **Customize → MCPs** (non Settings → MCP).
2. Per ogni server: **Connect** / OAuth. Installa anche i plugin Marketplace (skill/regole in più).
3. Cloud Agents: MCP dal dropdown su [cursor.com/agents](https://cursor.com/agents) o **Dashboard → Integrations & MCP**, non dal solo `mcp.json` locale.
4. Toggle e log: **Customize → MCPs**; Output → **MCP Logs**.

**Fatto quando:** in Customize i cinque server sono connected.

---

## 9. Verifica end-to-end

1. `curl -sS https://<api>.onrender.com/api/health` → `{"ok":true}` (cold start).
2. URL Vercel → landing.
3. Login demo o **Prova demo**.
4. `/play/demo` e movimento.
5. Editor: salva un’avventura (JSON su Neon).
6. Da chat: log Render e ultimo deploy Vercel (plugin connessi).

**Fatto quando:** play demo su Vercel parla con Render+Neon.

- [ ] `/hub` e `/play/demo` non 404
- [ ] Login poi ok dopo il wake-up Render
- [ ] Nessun tileset pesante da `*.vercel.app`

---

## 10. Cosa non aprire / non fare

- **Continue with Origin** su Vercel Hobby
- Sostituire il remote GitHub con `origin.cursor.com` (Render e Hobby si rompono)
- Vercel Blob, AWS S3, Cloudinary — usate R2
- Auth0, Clerk, Redis, Fly.io, Railway
- Oracle, Hetzner, UptimeRobot
- Datadog a pagamento
- Path UI `Settings → Integrations` nella app desktop

---

## Variabili d’ambiente

| Variabile | Dove | Esempio |
| --- | --- | --- |
| `VITE_API_URL` | Vercel (build) | `https://browser-rpg-api.onrender.com` |
| `DATABASE_URL` | Locale `.env` | `file:./dev.db` |
| `DATABASE_URL` | Render | URI Neon `postgresql://…` |
| `JWT_SECRET` | Render | valore generato |
| `HOST` | Render | `0.0.0.0` |
| `SENTRY_DSN` | Render | DSN progetto `browser-rpg-api` |
| `VITE_SENTRY_DSN` | Vercel (build) | DSN progetto `browser-rpg-web` |
| `RESEND_API_KEY` | Render | `re_…` |
| `R2_ACCOUNT_ID` | Render | Account ID Cloudflare |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Render | API token R2 |
| `R2_BUCKET_NAME` | Render | `browser-rpg-packs` |
| `R2_PUBLIC_BASE_URL` | Render | `https://pub-….r2.dev` |

Esempi: [`apps/api/.env.example`](../apps/api/.env.example), [`apps/web/.env.example`](../apps/web/.env.example).

Se cambiano `build`/`start`, aggiorna questo file, `vercel.json` e `render.yaml`.
