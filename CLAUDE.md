# Axon Desktop — Project Guide for Claude Code

## What is this?

Axon Desktop is the paid desktop client for Axon (open-source, `marcelgast/axon`).
It wraps the open-source Axon stack in a native desktop experience:
- Checks for Docker, starts it automatically if needed
- Runs `docker compose up` in the background — user never sees a terminal
- Shows the Axon web UI inside a native window
- Lives as a tray icon: Start / Stop / Restart / Quit
- Ships as a single installer binary: Windows `.msi`, macOS `.dmg`, Linux `.AppImage`

Built with **Tauri v2** (Rust backend) + **React + TypeScript** (frontend, Vite).

The open-source `axon` repo contains the backend (FastAPI) and dashboard (Next.js).
This repo only contains the native wrapper — it does NOT duplicate any Axon logic.

**Monetisation:** sold via Shopify as a monthly subscription (€19/mo).
License key validated at startup against Shopify API.

---

## Stack

| Layer | Technology |
|---|---|
| Native shell | Tauri v2 (Rust) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 |
| Testing | Vitest (frontend) |
| Bundling | Tauri bundler → `.msi` / `.dmg` / `.AppImage` |

---

## Repo Structure

```
axon-desktop/
├── CLAUDE.md
├── src/                    ← React frontend
│   ├── App.tsx             ← Root: setup check → wizard or dashboard
│   ├── index.css           ← Tailwind + global styles
│   ├── main.tsx
│   ├── components/
│   │   └── StatusBadge.tsx
│   ├── hooks/
│   │   ├── useDockerStatus.ts
│   │   └── useAxonStatus.ts
│   └── pages/
│       ├── Dashboard.tsx   ← Iframe wrapper for Axon web UI
│       ├── SetupWizard.tsx ← Multi-step first-run wizard
│       └── wizard/
│           ├── DockerCheck.tsx
│           ├── Disclaimer.tsx
│           └── Starting.tsx
├── src-tauri/              ← Rust / Tauri backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   └── src/
│       ├── lib.rs          ← App setup, tray, command registration
│       ├── main.rs
│       └── commands/
│           ├── mod.rs
│           └── docker.rs   ← Docker check, start/stop Axon
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## Coding Standards — Non-Negotiable

Same principles as `marcelgast/axon` (see that repo's CLAUDE.md). Summarised:

### TypeScript (Frontend)
- `"strict": true` — no `any`, ever. Use `unknown` and narrow.
- Functional components only, max ~100 lines per component
- One component = one responsibility
- Custom hooks for all non-rendering logic (`useDockerStatus`, `useAxonStatus`)
- Prefer `const` over `let`, never `var`

### Rust (Tauri backend)
- No `unwrap()` in production code — use `?` or explicit error handling
- Keep Tauri commands thin — they delegate to service modules
- All `#[tauri::command]` functions in `commands/` modules, never in `lib.rs`
- Max ~30 lines per function
- Return `Result<T, String>` from commands — never panic

---

## Security Rules

- **No Docker socket** — commands use the Docker CLI, never `/var/run/docker.sock`
- **No license key in code** — validated at runtime against Shopify API, never hardcoded
- **No telemetry** — this app collects nothing, sends nothing
- **Minimal capabilities** — only `shell:allow-execute` and `opener:default`
- Tray icon and window management are the only privileged operations

---

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (Vite + Tauri hot reload)
npm run tauri dev

# Build production binary
npm run tauri build
```

Requires: Rust + Cargo, Node.js 20+, Docker (to test the Docker check).

---

## Roadmap (Phase 1 — this repo)

- [x] Tauri v2 scaffold (React + TypeScript + Tailwind)
- [x] System tray: Open / Start / Stop / Quit
- [x] Setup wizard: Docker check → Disclaimer → Start Axon
- [x] Dashboard view: Axon web UI in iframe with thin toolbar
- [x] Docker lifecycle commands (check, start, stop, status)
- [ ] License key validation (Shopify API)
- [ ] Full setup wizard (Persona → LLM → Agents → Telegram)
- [ ] Performance stats panel (RAM, CPU, tokens/sec)
- [ ] Auto-update via Tauri updater
- [ ] Code-signed installers (Windows + macOS)
