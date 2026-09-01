# Operational Requirements

This is the living checklist for treating Arcane Observatory like a real downloadable application while keeping the first release desktop-first and comfortable for at-home use.

## Supported delivery modes

### Development checkout

- Windows 10/11, Node.js 20+ and npm.
- Run from the repository root with `npm.cmd install` then `npm.cmd run dev`.
- The project is self-contained under `G:\dnd-character-studio`.

### Portable production build

- Run `npm.cmd run build`.
- Share the generated `dist/client` folder through any static file host or the preserved Sites worker bundle.
- Do not open `index.html` directly from `file://`; serve it over local HTTP so module loading, the service worker, and API requests behave consistently.
- `Start Arcane Observatory.cmd` builds the current production client, starts the tested loopback-only server, and opens the app without requiring the recipient to know commands.

### Installable PWA

- The production build includes a web app manifest, install icons, and an offline service worker.
- The application shell and bundled sample reference data work offline after first load.
- Open5e sync/search requires network access; cached results and all character data remain available offline.
- Install is optional. The same build continues to work in a normal desktop browser.

### Windows desktop installer

- Run `npm.cmd run dist:windows` to build the Electron/NSIS installer in `release/`.
- The installer bundles its application runtime. Recipients do not need Node.js, npm, a development checkout, or a separately managed local server.
- The desktop wrapper serves the same production client on the fixed loopback-only origin `http://127.0.0.1:41731`. The fixed origin preserves browser storage between launches.
- The wrapper disables renderer Node integration, enables context isolation and sandboxing, and sends external web links to the system browser.
- GitHub Actions verifies source pushes and builds an installer artifact on demand. A `v*` tag also publishes the installer on the repository's Releases page.
- Unsigned installers may trigger Windows SmartScreen. Code signing remains a release-owner decision and requires a trusted signing certificate.

## Data ownership and portability

- Character data is stored locally with schema versioning.
- Users can export a complete JSON backup and restore it on another browser/computer.
- Provider cache data is replaceable and must not be required inside backups.
- Import validates schema and preserves the existing store until the new payload passes validation.
- No account, telemetry, API key, or server database is required.

## Runtime dependencies

- Browser: current Chromium, Edge, Firefox, or Safari with localStorage, Fetch, CSS backdrop-filter fallback, and service-worker support for installation/offline mode.
- Network: optional for core character use; required only for refreshing Open5e reference data.
- Remote provider: Open5e API v2, explicitly filtered to the selected ruleset/source.
- Fonts and critical visual assets must ship in the build or degrade cleanly; core use must not depend on runtime font/image CDNs.
- The ancestry/class option catalog ships in the client and requires no network connection. Catalog source/version labels must remain visible for non-SRD, setting-specific, optional, and legacy playtest choices.
- The guided feat-name catalog and Artificer/Battle Smith/Warforged grant catalogs ship in the client. Level-up decisions and automatic grants remain functional offline; Open5e is a reference-search enhancement rather than a progression dependency.
- Structured History and note search run entirely in local character data. A backup includes both source fields and progression audit events.
- Uploaded character portraits are center-cropped and compressed in the browser, stored with the character, and included in JSON backups. Large character libraries should be exported regularly because browser storage quotas vary.

## Release checklist

1. Update the application version, changelog, and any schema migration.
2. Run `npm.cmd test`, `npm.cmd run build`, and `npm.cmd run test:packaging` (Sites, portable server, and the 260-build class matrix).
3. Exercise create/edit/level-up (subclass, ASI, feat, granted spells/features, companion), spell/inventory History, note search, and backup/restore offline and online.
4. Confirm installability, service-worker update behavior, and a clean first-run state.
5. Verify at 1440×1024, a common laptop width, and 390px narrow width.
6. Confirm no secrets, personal exports, caches, `node_modules`, `dist`, or installer output are tracked in the source repository.
7. Include `README.md`, version notes, data-backup instructions, Open5e attribution/source notes, and known limitations.
8. Review `docs/CONTENT_CATALOG.md` and confirm that distributable builds contain no copied proprietary rules prose.

## Sharing checklist

- Source share: repository without `node_modules`, `dist`, personal data, or caches.
- Hosted share: deploy `dist` through the preserved Sites-compatible worker or another static host.
- Portable local share: provide the built client plus a reviewed local launcher and concise start/stop instructions. This path requires Node.js 20+.
- Windows end-user share: provide the versioned `.exe` from GitHub Releases. This path requires no Node.js installation.
- Before sharing an update, tell users whether a schema migration occurs and require a backup for any destructive migration.

## Current open operational decisions

- Confirm the final public app name and icon before the 1.0 release.
- Choose a repository/source license and separately review bundled content and asset rights before public promotion.
- Obtain and configure an Authenticode signing certificate if a trusted Windows publisher identity is required.
- Decide whether future cross-device sync is peer-to-peer, user-chosen cloud storage, or deliberately out of scope.
- Review Open5e attribution and each enabled source license before public distribution.
