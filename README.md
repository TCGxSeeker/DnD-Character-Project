# Arcane Observatory

Arcane Observatory is a desktop-first, local D&D 5e character studio. It keeps multiple characters, progression history, HP and class resources, spells, equipment, notes, and guided level-ups together in one portable app.

## Install on Windows (no Node.js required)

Open the repository's **Releases** page, download `Arcane-Observatory-Setup-<version>.exe`, and run it. The installer contains the application runtime, creates Start menu and desktop shortcuts, and does not require Node.js or npm on the recipient's computer. Either shortcut starts the private local service and opens the complete application in one step; no terminal window is shown.

Windows may show a SmartScreen warning until release installers are code-signed. Confirm that the publisher/repository is the expected one before continuing. Character data remains on the computer where the app is installed; use the in-app Export action to make portable backups.

## Run from source

Source development requires [Node.js 20 or newer](https://nodejs.org/) and npm. Clone or download this repository, then run:

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173/` unless Vite reports a different local address.

### Windows portable launcher

Developers and source-download users can also double-click `Start Arcane Observatory.cmd`. The launcher installs missing dependencies, builds the production client, opens the app, and serves it only on this computer at `http://127.0.0.1:4173/`. This source launcher requires Node.js; the Release installer above does not.

To build a Windows installer locally:

```powershell
npm.cmd run dist:windows
```

The installer is written to `release/`. GitHub also builds it automatically when a version tag such as `v0.9.0` is pushed.

## Verify and build

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:packaging
```

The production client is written to `dist/client`. `npm.cmd run serve:portable` serves that build on loopback without a development server. It can also be served from a static host and installed as a PWA in supporting browsers.

## Data and updates

- Characters and settings are stored locally, not in a project server or account.
- Export a JSON backup before changing computers, browsers, or major application versions.
- Installing a newer desktop release preserves the Electron application profile and its local character store.
- Open5e searches need internet access. Core character data, calculations, and the bundled catalog remain local-first.

### Test organization

Application coverage is intentionally grouped into six behavioral suites rather than mirroring every implementation module with a separate file:

- catalog and storage
- character building and progression
- calculations and derived statistics
- combat and equipment
- spells, rests, and resources
- state mutations and external integration

Keep new assertions in the closest behavioral suite. Create another test file only when it exercises a genuinely different runtime or release boundary, such as the portable server or Sites worker.

## Rules and reference data

- Calculation logic is deterministic code covered by tests.
- The current app target is the 2014 5e SRD ruleset.
- Open5e API v2 supplies filtered spell and equipment reference data; it is not treated as the authority for character calculations.
- Core use is local-first. Network access is optional except for fresh Open5e searches.

See `docs/OPERATIONS.md` for the living portability and release checklist.

## Licensing status

The application code, bundled art, and game-reference content have different licensing considerations. A final repository license has intentionally not been assigned without the owner's choice. Public repository access alone does not grant permission to reuse or redistribute the source. See `docs/CONTENT_CATALOG.md` and `docs/OPEN5E.md` for the current content-source boundaries.
