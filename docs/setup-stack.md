# Setup stack (Vercel + Render + Neon + R2)

Runbook per pubblicare Browser RPG su piani gratuiti, con Cursor collegato a ogni servizio.
Segui le sezioni **in ordine**. Non incollare segreti in git: solo nei dashboard (Vercel, Render, Neon, …).

Stack:

| Pezzo | Dove | Piano |
| --- | --- | --- |
| SPA Vite + Phaser | Vercel | Hobby (non commerciale) |
| API Fastify | Render | Free (sleep ~15 min; Starter quando serve always-on) |
| Database | Neon Postgres in cloud; SQLite solo in locale | Free |
| Asset pack (tileset, audio) | Cloudflare R2 | Free, egress 0€ |
| Errori | Sentry | Developer |
| Email transazionali | Resend | Free (quando login è pubblico) |

Limite Hobby Vercel: **100 GB/mese**, uso personale. I binari (PNG/audio) **non** devono passare da Vercel: vanno su R2.

---

## 0. Prerequisiti

**Obiettivo:** avere Node e un account email pronti.

1. Installa **Node 20+** (`node -v`).
2. Usa un’email a cui hai accesso (GitHub, Vercel, Cloudflare, …).
3. Non serve una carta per questo stack. Non aprire Oracle, Hetzner o UptimeRobot.
4. In locale: `npm ci` nella root del monorepo, poi `cp apps/api/.env.example apps/api/.env` se manca `.env`.
5. Avvio locale: `npm run dev` (API `3001`, web `5173`). Login demo: `demo@browser-rpg.local` / `demo1234`.

**Fatto quando:** `http://127.0.0.1:5173/play/demo` carica e `/api/health` risponde `{ "ok": true }`.

---

## 1. GitHub + Cursor

**Obiettivo:** repo sul tuo account GitHub e Cloud Agents/Bugbot abilitati.

1. Crea un account [GitHub Free](https://github.com/signup) se non ce l’hai.
2. Dalla root del progetto (se il remote manca ancora):

   ```bash
   git init
   git add .
   git commit -m "chore: initial commit"
   gh repo create browser-rpg --public --source=. --remote=origin --push
   ```

   In alternativa: GitHub → **New repository** → push con le istruzioni mostrate.
3. In Cursor: **Settings → Cursor Settings → Integrations → GitHub** → connetti l’account e autorizza il repo `browser-rpg`.
4. Abilita **Cloud Agents** e **Bugbot** sullo stesso repo (stessa schermata Integrations / dashboard Cursor).

**Fatto quando:** su github.com vedi il codice e in Cursor Integrations GitHub risulta connesso.

**Limite Free:** Actions illimitata se il repo è **pubblico**; se privato, 2000 minuti/mese.

---

## 2. Vercel Hobby (solo frontend)

**Obiettivo:** SPA su `*.vercel.app`. L’API **non** va su Vercel.

1. Registrati su [vercel.com](https://vercel.com/signup) con GitHub, piano **Hobby**.
2. **Add New → Project** → importa `browser-rpg`.
3. Impostazioni progetto:
   - **Root Directory:** lascia vuoto (root del monorepo). `vercel.json` in root imposta già install/build/output.
   - **Build Command:** `npm run build -w @browser-rpg/web`
   - **Output Directory:** `apps/web/dist`
   - **Install Command:** `npm ci`
4. Non aggiungere ancora `VITE_API_URL` (lo fai dopo Render). Deploy: otterrai un URL tipo `https://browser-rpg-xxx.vercel.app`. Le chiamate `/api` falliranno finché non c’è Render: è atteso.
5. Plugin Cursor: Marketplace → **Vercel**, oppure Settings → MCP: deve comparire `vercel` da `.cursor/mcp.json`. Completa il login OAuth.

Rewrite SPA: le route `/play/:slug`, `/hub`, `/editor/:id` tornano `index.html`. I file sotto `/assets/` restano statici.

**Fatto quando:** l’URL Vercel mostra la landing (anche se login/play non parlano ancora con l’API).

**Limite Hobby:** 100 GB transfer/mese; **non commerciale**. Se vendi il prodotto, passa a Pro o a Cloudflare Pages.

---

## 3. Neon (Postgres)

**Obiettivo:** `DATABASE_URL` Postgres per Render. In locale resti su SQLite.

1. Registrati su [neon.tech](https://neon.tech) (piano Free, 0.5 GB).
2. **Create project** (region EU se l’API è a Frankfurt).
3. Dashboard → **Connection string** → URI tipo `postgresql://...@...neon.tech/neondb?sslmode=require`. Copiala: va **solo** su Render, non nel repo.
4. Plugin Cursor: Marketplace → **Neon**, oppure MCP `Neon` in `.cursor/mcp.json` → OAuth.

Prima del primo deploy cloud, in `apps/api/prisma/schema.prisma` cambia **solo sull’ambiente di produzione** (branch di deploy o override):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

In locale lascia `provider = "sqlite"` e `DATABASE_URL="file:./dev.db"` in `apps/api/.env`. Non mischiare un URL Postgres con `provider = "sqlite"`.

Dopo il cambio a `postgresql`, dalla root (con `DATABASE_URL` Neon esportata):

```bash
export DATABASE_URL="postgresql://..."
npm run db:generate -w @browser-rpg/api
npm run db:push -w @browser-rpg/api
```

**Fatto quando:** Neon mostra tabelle (`User`, `Adventure`, …) dopo `db:push`.

**Limite Free:** 0.5 GB; scale-to-zero (cold start breve). 1000 utenti/mese ci stanno.

---

## 4. Render (API Fastify)

**Obiettivo:** processo Node sempre raggiungibile su `*.onrender.com` (con sleep sul piano Free).

1. Registrati su [render.com](https://render.com) con GitHub.
2. **New → Blueprint** e collega il repo (usa `render.yaml`), **oppure** **New → Web Service** a mano:
   - Repo: `browser-rpg`
   - Runtime: Node
   - **Plan:** Free
   - **Build:** `npm ci --include=dev && npm run db:generate -w @browser-rpg/api`
   - **Start:** `npm run start -w @browser-rpg/api`
   - **Health:** `/api/health`
3. Environment:
   - `NODE_VERSION` = `20`
   - `HOST` = `0.0.0.0`
   - `JWT_SECRET` = stringa lunga casuale (non quella di `.env` locale)
   - `DATABASE_URL` = URI Neon (provider Prisma `postgresql`)
   - `FRONTEND_ORIGIN` = URL Vercel (es. `https://browser-rpg-xxx.vercel.app`) — opzionale; CORS oggi è `origin: true`
4. Dopo il primo deploy, dalla shell Render o in locale con la stessa `DATABASE_URL`: `npm run db:push -w @browser-rpg/api` se le tabelle non ci sono.
5. Prova: `https://<servizio>.onrender.com/api/health` → `{ "ok": true }`.
   Sul Free, dopo ~15 minuti di inattività il servizio dorme: la prima richiesta può impiegare 30–50 s.
6. Plugin Cursor: Marketplace → **Render**, MCP `render` → OAuth. Da chat puoi chiedere log e stato del servizio.

Poi torna su **Vercel → Settings → Environment Variables**:

- `VITE_API_URL` = `https://<servizio>.onrender.com` (**senza** slash finale)
- Redeploy del frontend

**Fatto quando:** da Vercel, login demo e `/play/demo` funzionano (attendi il wake-up Render se dorme).

**Limite Free:** 0.1 CPU / 512 MB, sleep. Per ~1000 MAU always-on: **Render Starter**, stesso plugin Cursor.

Non usare SQLite su disco Render (niente persistenza). Non wrappare Fastify in Vercel Functions.

---

## 5. Cloudflare R2 (pacchetti asset)

**Obiettivo:** tileset/sprite/audio fuori da Vercel, con egress gratuito.

1. Account [Cloudflare](https://dash.cloudflare.com/sign-up) piano Free.
2. **R2 → Create bucket** (es. `browser-rpg-packs`).
3. Abilita **Public access** (dominio `r2.dev` o custom).
4. CORS del bucket: origini Vercel + `http://localhost:5173`, metodi `GET` / `HEAD` (Phaser carica le PNG dal browser).
5. Convenzione path: `/packs/<slug>/v<n>/tileset.png` (hash o versione nel path, `Cache-Control` lungo).
6. Plugin Cursor: Marketplace Cloudflare, MCP `cloudflare` → OAuth. Da chat puoi creare bucket e ispezionare oggetti.

JSON avventura (`AdventurePack`) resta nel DB; i `src` delle immagini punteranno agli URL R2 pubblici, non a `/api/files`, quando i pack saranno pronti. Fino ad allora gli upload editor restano su disco dell’API (ok in locale; su Render il disco è effimero).

**Fatto quando:** un PNG di test è raggiungibile da URL pubblico `https://pub-….r2.dev/...`.

**Limite Free:** 10 GB storage, 1M write, 10M read/mese, **egress 0€**.

---

## 6. Sentry

**Obiettivo:** crash Phaser/API visibili in Cursor (e, dopo, Automation su issue nuove).

1. Account [Sentry](https://sentry.io) piano **Developer**.
2. Crea due progetti (o uno): **React/Vite** (web) e **Node** (API).
3. Copia i DSN:
   - Web: `VITE_SENTRY_DSN` su Vercel (quando collegherete l’SDK)
   - API: `SENTRY_DSN` su Render
4. MCP: in `.cursor/mcp.json` c’è `sentry` → OAuth al primo uso.
5. Automation Cursor (dopo che arrivano eventi): trigger **Sentry → issue created** → l’agente apre una PR. Si configura in Cursor Automations, non in questo file.

**Fatto quando:** MCP Sentry è autenticato e (dopo l’SDK) un errore di prova compare nel progetto.

**Limite Developer:** 5k error/mese, 1 seat.

---

## 7. Resend (quando il login è pubblico)

**Obiettivo:** verifica email e reset password. Si può saltare finché usi solo il login demo.

1. Account [Resend](https://resend.com) Free.
2. Verifica un dominio (o usa il sandbox per test).
3. API key **solo** su Render: `RESEND_API_KEY`.
4. Limite: 3000 mail/mese, **100/giorno** — un launch con centinaia di signup nello stesso giorno satura il cap.

**Fatto quando:** da Resend parte una mail di test.

Non serve Auth0/Clerk: JWT è già in Fastify.

---

## 8. Cursor `mcp.json`

Il file [`.cursor/mcp.json`](../.cursor/mcp.json) è nel repo (solo URL OAuth, **niente token**).

Server:

| Nome | URL |
| --- | --- |
| vercel | `https://mcp.vercel.com` |
| render | `https://mcp.render.com/mcp` |
| Neon | `https://mcp.neon.tech/mcp` |
| cloudflare | `https://mcp.cloudflare.com/mcp` |
| sentry | `https://mcp.sentry.dev/mcp` |

1. Ricarica Cursor (o MCP settings) dopo il clone.
2. Per ogni riga: **Connect** / login OAuth.
3. GitHub **non** sta in `mcp.json`: è l’app nativa (passo 1).
4. Plugin Marketplace (Vercel, Render, Neon, Cloudflare) installano anche skill/regole: conviene installarli comunque.

**Fatto quando:** in Settings → MCP tutti e cinque i server risultano connected (non “needs login”).

---

## 9. Verifica end-to-end

**Obiettivo:** un utente reale usa landing, login e demo sul web pubblico.

1. `curl -sS https://<api>.onrender.com/api/health` → `{"ok":true}` (attendi il cold start).
2. Apri l’URL Vercel → landing.
3. Login demo (`demo@browser-rpg.local` / `demo1234`) oppure **Prova demo**.
4. Hub → apri `/play/demo` e muovi il personaggio.
5. Crea un’avventura in editor e salva (pack JSON su Neon).
6. Log: da Cursor chiedi all’agente i log Render e l’ultimo deploy Vercel. Non serve UptimeRobot.

**Fatto quando:** play demo funziona su Vercel parlante con Render+Neon.

Checklist regressione:

- [ ] `/hub` e `/play/demo` non danno 404 (rewrite SPA)
- [ ] Login fallisce in modo visibile se Render dorme, poi riesce al retry
- [ ] Nessun tileset pesante è servito da `*.vercel.app`

---

## 10. Cosa non aprire

- Vercel Blob, AWS S3, Cloudinary — usate R2
- Auth0, Clerk, Supabase Auth
- Upstash Redis
- Fly.io, Railway (niente free tier sostenibile)
- Oracle Cloud, Hetzner, UptimeRobot (niente integrazione Cursor)
- Datadog a pagamento

---

## Variabili d’ambiente (riepilogo)

| Variabile | Dove | Esempio |
| --- | --- | --- |
| `VITE_API_URL` | Vercel (build) | `https://browser-rpg-api.onrender.com` |
| `DATABASE_URL` | Locale `.env` | `file:./dev.db` |
| `DATABASE_URL` | Render | URI Neon `postgresql://…` |
| `JWT_SECRET` | Render | valore generato |
| `HOST` | Render | `0.0.0.0` |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | Render / Vercel | quando c’è l’SDK |
| `RESEND_API_KEY` | Render | quando servono le email |

File di esempio: [`apps/api/.env.example`](../apps/api/.env.example), [`apps/web/.env.example`](../apps/web/.env.example).

Se cambiano gli script `build`/`start` del monorepo, aggiorna questo documento, `vercel.json` e `render.yaml`.
