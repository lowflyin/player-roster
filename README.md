# Netball Player Roster

An offline-first Progressive Web App (PWA) for coaches and managers of junior netball teams.
Track your squad and the positions players have played, with configurable quarter lengths
(e.g. 10 or 12 minutes) to suit different competitions.

All data is stored on the device (IndexedDB). There is no backend and no account.

## Tech stack

| Concern       | Choice                                                                                 |
| ------------- | -------------------------------------------------------------------------------------- |
| Build / dev   | [Vite](https://vite.dev)                                                               |
| UI            | React + TypeScript                                                                     |
| PWA           | [vite-plugin-pwa](https://vite-pwa-org.netlify.app) (Workbox service worker, manifest) |
| Local storage | [Dexie](https://dexie.org) (IndexedDB) + `useLiveQuery` for reactive data              |
| Tests         | Vitest + Testing Library + fake-indexeddb                                              |
| Lint / format | ESLint (flat config) + Prettier                                                        |
| CI / hosting  | GitHub Actions → GitHub Pages                                                          |

## Getting started

Requires Node.js (version in [.nvmrc](.nvmrc)).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script            | What it does                                            |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | Dev server with hot reload (service worker disabled)    |
| `npm run build`   | Type-check and build to `dist/`                         |
| `npm run preview` | Serve the production build (service worker enabled)     |
| `npm run check`   | Lint, format check, type-check and tests (what CI runs) |
| `npm test`        | Run tests once (`npm run test:watch` to watch)          |
| `npm run format`  | Format all files with Prettier                          |
| `npm run icons`   | Regenerate PWA icons from `public/logo.svg`             |

### Testing on your phone

`npm run dev -- --host` exposes the dev server on your local network, so you can open the
printed `http://192.168.x.x:5173` address on a phone on the same Wi-Fi. Installing the app and
the service worker require HTTPS, so test those on the deployed GitHub Pages site.

## Project structure

```
src/
  App.tsx               App shell: header, bottom tab navigation
  components/           Shared UI (e.g. update-available prompt)
  db/db.ts              Dexie database, schema and data helpers
  domain/netball.ts     Netball rules: positions, zones, quarters, game time
  domain/lineup.ts      Per-quarter lineup rules (assign, swap, bench)
  features/<feature>/   One folder per screen/feature
  test/setup.ts         Test environment setup
public/                 Static assets and PWA icons
.github/workflows/      CI and deploy pipelines
```

When changing the stored data shape, add a new `db.version(n)` in [src/db/db.ts](src/db/db.ts)
rather than editing an existing one, so data already on coaches' phones is migrated.

## Publishing to GitHub Pages

1. Create a **public** repository on GitHub (Pages on private repos requires a paid plan) and push:

   ```bash
   git remote add origin https://github.com/<you>/player-roster.git
   git push -u origin main
   ```

2. In the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push/merge to `main` now runs [deploy.yml](.github/workflows/deploy.yml): checks,
   build, deploy. You can also run it manually from **Actions → Deploy to GitHub Pages → Run
   workflow**.
4. The site appears at `https://<you>.github.io/player-roster/`. The base path is picked up
   automatically from the Pages settings, including if you later add a custom domain.

Pull requests and branch pushes run [ci.yml](.github/workflows/ci.yml) (lint, format, types,
tests, build) without deploying. Consider protecting `main` so changes land via PR with CI green.

### Releasing a new version

Bump `version` in `package.json` (shown on the Settings screen). When a coach next opens the
app, it shows an **Update** banner rather than reloading by itself, so it never refreshes
mid-game.

## Roadmap ideas

- Player details and preferred positions
- ~~Game day: record who played which position each quarter~~ (Matches tab)
- Game-time tracking per player (respecting quarter length)
- Suggested line-ups for fair rotation
- Share a line-up as an image (Web Share API → WhatsApp) and print-friendly view
- Backup / restore data to a file
