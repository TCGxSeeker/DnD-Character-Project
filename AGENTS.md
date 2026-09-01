# Repository Guidelines

## Repository isolation

Treat `G:\dnd-character-studio` as the only authored workspace. Keep source, dependencies, generated assets, fixtures, screenshots, build output, and local development data under this root. Before significant work, verify the project root and current Git state. Never copy secrets, user exports, or runtime data from sibling projects.

The Product Design bootstrap script crashed while copying to this G: drive with Windows status `-1073740791`; the bundled `prototype` template was copied intact as the documented fallback. Preserve `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs`.

## Product goal

Arcane Observatory is a local-first D&D 5e character studio. It should let one player create relatively unlimited characters, use a live character sheet at the table, level characters through 20, multiclass safely, maintain spells/equipment/features/notes/history, and import/export portable backups.

The first authoritative ruleset is the 2014 SRD. Keep edition-specific rules isolated so a 2024 ruleset can be added without silently mixing rules. Open5e supplies licensed reference data; it is not the calculation engine.

## Source map

- `AGENT_SCOPE.md`: mandatory short-form scope guardrail; consult it before proposing or implementing new product work.
- `docs/IMPLEMENTATION_SPEC.md`: active product scope and architecture.
- `docs/RULES_ENGINE.md`: deterministic formulas and supported multiclass behavior.
- `docs/OPEN5E.md`: provider contract, source filters, cache, and failure behavior.
- `docs/CONTENT_CATALOG.md`: editorial ancestry/class catalog sources, scope, and licensing boundary.
- `docs/OPERATIONS.md`: living requirements for running, packaging, updating, backing up, and sharing the app.
- `docs/DECISIONS.md`: durable product and technical decisions.
- `docs/GOTCHAS.md`: corrections and recurring traps.
- `docs/VERIFICATION_PLAN.md`: required automated and visual checks.
- `design/selected-character-studio.png`: source of truth for visual hierarchy and art direction.
- `design/references/`: functional reference screenshots; copy interactions, not styling.
- `src/domain/`: pure character and rules calculations.
- `src/data/`: versioned persistence, migrations, and Open5e access.
- `src/features/`: product workflows and feature UI.
- `src/components/`: reusable interface primitives.
- `src/assets/`: generated project-owned visual assets.

## Stable constraints

- Character calculations must be deterministic, pure, and covered by focused tests.
- Store user-entered data locally with a versioned schema and explicit migration path.
- Preserve data across updates. Never clear or overwrite a character store as a shortcut.
- Support full JSON backup and restore. Keep compendium/reference caches separate from user data.
- Keep the production build reproducible and installable as a desktop-first PWA. A native Windows wrapper is optional later and must not become a prerequisite for core development.
- Open5e v2 is the only approved runtime remote data source for this phase. Default filters to `srd-2014`; never mix 2014, 2024, A5E, or third-party documents without an explicit source choice. The bundled editorial ancestry/class catalog may cite other references for names, source labels, and mechanics facts, but must not copy protected descriptive rules text.
- Remote access belongs in `src/data/open5e.js`, never view components. Use field selection, pagination, timeouts, readable failures, and local caching.
- A character level-up is a staged transaction: choose class, resolve HP, resolve required choices, review changes, then commit once.
- Constitution changes retroactively affect HP by the modifier delta multiplied by total character level.
- Multiclass spell slots use the unified spellcaster table. Pact Magic remains separate. Extra Attack does not stack.
- The user is final authority. Do not mutate character progression without a reviewed commit action.

## Visual and interaction direction

Treat `design/selected-character-studio.png` as the selected visual target: calm dark liquid glass, deep indigo/aubergine foundation, restrained copper edge light, cinematic atmosphere, serif identity type, crisp sans-serif data, and generous hierarchy.

Use the mobile references for functional patterns: inline resource counters, grouped spell slots, modular sheet sections, separate editors, XP/milestone control, freeform biography, and quick spell/equipment scanning. Do not inherit their teal palette, long undifferentiated scroll, buried menus, or unclear visual hierarchy.

Do not use emoji, ASCII art, handcrafted SVG, CSS drawings, fake asset placeholders, or generic dashboard decoration. Use generated raster artwork for portraits/backgrounds and a maintained icon library for interface icons. Keep the overview focused; detailed creation, editing, and level-up choices belong in dedicated flows.

## Working mode

Use one continuous implementation cycle unless a human-validation zone applies:

1. Plan, audit, and verify rules.
2. Implement engine, data, and UI changes.
3. Add focused tests.
4. Run the full tests and production/package build.
5. Visually verify user-facing changes at desktop and narrow widths.
6. Update the checklist and reusable workflow notes.

Do not pause between routine phases. Ask for confirmation only before destructive actions, major scope or architecture choices, uncertain rules interpretations, or another human-validation zone below. A code-sanitation review is optional when the user explicitly requests it; routine delivery does not require the user to inspect source code.

Before a meaningful change, identify the goal, files involved, verification method, and human validation needs. Prefer small modules and reviewable behavior. Update `docs/IMPLEMENTATION_SPEC.md` for architecture or scope changes and `docs/GOTCHAS.md` when the user corrects a durable behavior.

## Verification

After meaningful changes, run:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:sites
```

For user-facing UI, also exercise the running app in the in-app browser at desktop and narrow widths. Test create character, switch character, edit HP/resources, add/remove spells and items, complete a level-up, reload persistence, and export/import. Inspect console errors and capture the final states.

Visual handoff is blocked until `design-qa.md` exists and says `final result: passed`. Compare the selected mock and implementation at the same 1440×1024 viewport, fix P0/P1/P2 mismatches, and record remaining P3 polish only.

## Human validation zones

Require explicit user review before changing edition defaults, progression rules, source licenses, scoring/evaluation logic, destructive migrations, secrets, production deployment, or the established visual direction. Ordinary implementation and bug fixes within these rules do not require a pause.

## Completion response

Summarize what changed, files changed, verification performed, known risks, and one useful next step. Keep the verified local preview running and open for inspection.
