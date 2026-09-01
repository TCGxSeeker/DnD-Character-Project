# Agent Scope Guardrail

This file is the short, agent-facing authority for what Arcane Observatory is currently building. Read it with `AGENTS.md` before meaningful work. Do not infer a new feature, rules source, platform, or integration from a related idea. If a requested change expands this boundary, update this file and the relevant detailed document as part of the approved change.

## Product currently in scope

- A local-first, desktop-first, narrow-responsive D&D 5e character studio.
- Relatively unlimited locally stored characters with switching, duplication, management, JSON backup, and restore.
- D&D 5e 2014 rules only. Edition-specific code must remain isolated.
- Levels 1–20 using milestone or XP advancement.
- Reviewed, one-level-at-a-time progression with class, HP, subclass, ASI/feat, spell, feature, companion, and other required mechanical choices.
- Safe 2014 multiclassing: prerequisites, total/class levels, starting-versus-later proficiencies, mixed Hit Dice, combined Spellcasting slots, separate Pact Magic, and non-stacking features.
- A live Sheet with canonical HP, temporary HP, Hit Dice, inspiration, AC, initiative, speed, saves, skills, senses, languages, attacks, spell capacity, spell slots, class resources, conditions, and linked game pieces.
- Character libraries for spells, inventory, features, notes, and structured History.
- Three-page creation: Identity, Class/target level, and Ability Scores, including ancestry option, background, class skills, point buy/manual scores, and selectable starting equipment.
- Open5e v2 `srd-2014` as the approved runtime licensed-reference provider. Locally authored deterministic rules remain the calculation authority.
- Installable/reproducible PWA output, offline caching, local persistence, import/export, and Sites packaging.
- A versioned, serialization-safe tabletop integration boundary for calculated snapshots and validated commands. This boundary is architecture only; a tabletop application is a separate project.

## Engine checklist still in scope

Work down these remaining rows from `docs/ENGINE_COMPLETION.md`; do not replace them with unrelated feature work:

1. Custom class packages: validated versioned JSON for rules, choices, progression, spellcasting, resources, proficiencies, and original descriptions without editing source code.

Calculation explanations, automated build matrices, offline/performance/accessibility, portable release validation, universal effects, structured mutation History, and schema migration/recovery are completed foundations. Repair regressions through their documented contracts rather than reopening their architecture without a demonstrated requirement.

The reviewed level transaction, multiclass foundations, mixed Hit Dice/HP, multiclass spellcasting/Pact Magic, shared limited features, universal choices, calculation graph, rest/resource engine, and equipment/attack engine are complete foundations. Repair regressions in them, but do not redesign them without a demonstrated requirement.

## Content completion still in scope

Content breadth is separate from engine completion. Follow `docs/CONTENT_ROADMAP.md` and its completion bar: catalog, creation, progression, grants, derived effects, readable licensed detail, persistence/History, focused tests, and browser QA must agree.

Ordered content work:

1. Finish ancestry, subrace/lineage, and background mechanics and choices.
2. Complete the level 1–20 chassis for all 13 supported classes.
3. Complete subclass grants, choices, spells, resources, derived effects, and linked game pieces, beginning with SRD/common options.
4. Add expanded setting/legacy/optional sources only with explicit source and version labels.
5. Run cross-option build matrices, migration checks, and desktop/narrow QA.

A name appearing in a dropdown means it is cataloged, not mechanically complete. Artificer, Battle Smith, and Warforged remain the current end-to-end depth reference.

## Explicitly deferred or out of scope

- D&D 5e 2024 rules or silent mixing of editions.
- Accounts, cloud sync, campaigns, shared parties, multiplayer, encounter management, maps, or a virtual tabletop UI.
- Mobile wrappers as prerequisites. The approved Windows Electron wrapper is an optional distribution layer over the same production PWA; it must not become a prerequisite for web or source development.
- Production deployment or publishing unless the user explicitly requests it.
- Copying proprietary class, feat, spell, ancestry, or subclass prose. Store licensed Open5e text or original structured mechanical summaries only.
- Runtime scraping or dependency on D&D Beyond, Wikidot, Google results, or mobile reference apps. Those may inform source verification or UX only when explicitly requested.
- Automatic creation of a companion merely because a summon spell is known/prepared. Presence requires an explicit cast/place action.
- The separate tabletop side-project. Only the existing contract boundary belongs here.
- A future gameplay companion may be acknowledged in navigation or product previews only when requested. Until that separate app is implemented, every such control must either be visibly disabled with a clear "Coming later" status or open an accessible informational dialog such as "Gameplay companion is not implemented yet." It must never resemble a working action, navigate to a blank screen, or mutate character data.
- Any speculative AI assistant, campaign generator, DM tool, encounter builder, social feature, marketplace, monetization, or analytics system.

## Scope decision rule

Before implementing a proposed item:

1. Match it to a bullet or checklist row in this file.
2. Confirm its detailed behavior in `docs/IMPLEMENTATION_SPEC.md`, `docs/RULES_ENGINE.md`, `docs/CONTENT_ROADMAP.md`, or `docs/OPERATIONS.md`.
3. If no match exists, treat it as unapproved scope. Record it as a possible future item only when the user asks; do not scaffold or implement it.
4. A direct new user request may expand scope. State the expansion and update this guardrail plus the appropriate detailed document before implementation.
5. When sources disagree, the newest direct user instruction wins, followed by this file, `AGENTS.md`, and the detailed documents.

## Required completion behavior

- Keep rules logic deterministic and outside React.
- Preserve existing user data and unrelated character state.
- Add focused regression tests for every mechanical change.
- Keep tests grouped by broad behavioral responsibility. Do not restore one-test-file-per-module structure; add cases to the six consolidated application suites unless a genuinely separate runtime boundary requires its own file.
- Run `npm.cmd test`, `npm.cmd run build`, and `npm.cmd run test:packaging` after meaningful changes.
- Exercise user-facing changes in the running app at desktop and narrow widths.
- Update the exact checklist row instead of claiming broad product completion.
