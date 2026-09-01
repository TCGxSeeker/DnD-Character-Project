# Continuation Brief — 2026-09-01

## Product contract

Arcane Observatory is a local-first, desktop-first D&D 5e 2014 character studio. Its deterministic local engine is authoritative; Open5e v2 records filtered to `srd-2014` are licensed reference data, not runtime rules authority. Preserve the established dark liquid-glass, indigo/aubergine, copper-edged visual direction. Do not mix 2024 rules, copy proprietary prose, deploy publicly, or broaden into accounts, cloud sync, campaign/VTT, or multiplayer work without explicit approval.

## Current verified state

- Universal typed effects, structured mutation History, schema migration/recovery, reviewed level transactions, multiclass, mixed Hit Dice, spellcasting/Pact Magic, universal choices, rests/resources, equipment/attacks, and calculation graph are complete.
- Calculation provenance is visible from Sheet core statistics and all applied typed effects retain their source.
- The Open5e class payload was refreshed on 2026-09-01: 12 SRD classes, 12 SRD subclasses, 110 class features, and 60 subclass features. Artificer and Battle Smith remain local, explicitly labeled expanded content.
- All 78 ancestry options have authored creation guidance. Expanded, setting-specific, multiverse, and legacy options remain visibly source-labeled and use original summaries.
- The production UI is code-split. Initial JavaScript is 305 kB (92.8 kB gzip), down from 785 kB; the oversized-chunk warning is eliminated.
- `Start Arcane Observatory.cmd` now builds and serves the production app through the tested loopback server. `npm run dev` remains the development workflow.
- Automated release coverage is 164 application tests, 4 Sites tests, 2 portable-server tests, and a 260-build class/level matrix.
- Notes now use a schema-v3 dated session archive. The composer remains a locally persisted draft; Save Session appends an immutable recap, and archive cards open a focused catch-up dialog. Legacy v2 prose migrates without loss.
- The former 36 module-paired application test files are consolidated into six behavioral suites. Preserve this domain-oriented organization; do not recreate a 1:1 source-to-test file pattern.

## Remaining authorized product work

The only pending engine row is **Custom class packages**: versioned validated JSON packages that can add a class without source edits. Content breadth remains a separate roadmap. The 12 SRD subclasses plus local Battle Smith are mechanically supported; the 32 cataloged non-SRD subclass names reported by `npm run audit:classes` are not a promise of automated proprietary rules.

Before a public distribution, a human must still approve final name/icon, attribution and source licenses, expanded-content policy, and any deployment target.

The user has a separate future gameplay application in mind. Do not build or silently integrate it into this character studio. If a future design pass introduces a gameplay-facing button before that app exists, make the control visibly disabled with a professional “Coming later” status or have it open an accessible informational dialog stating that the gameplay companion is not implemented yet. Never leave a dead button, blank destination, or control that appears operational.

## Commands and handoff

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:packaging
npm.cmd run audit:classes
node C:\Users\StDeL\.codex\skills\dnd-rules-catalog-expansion\scripts\audit_catalog.mjs G:\dnd-character-studio
```

Expected catalog audit: 53 ancestry families, 78 options, 78 with creation details, 13 backgrounds, and 13 classes with subclass rules. Browser QA must cover desktop and 390px, leave no disposable character mutation, report console warnings/errors, and end `design-qa.md` with `final result: passed`.
