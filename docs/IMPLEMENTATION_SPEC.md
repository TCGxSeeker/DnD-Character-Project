# Implementation Spec

## Product slice

Build a desktop-first, narrow-responsive local web app with five complete loops:

1. Create, duplicate, switch, and archive characters.
2. Use the character sheet: HP/temp HP, hit dice, inspiration, slots, and class resources.
3. Maintain spells, equipment, features, notes, background, and history.
4. Complete a staged level-up with class selection, HP method, required subclass choices, ASI-or-feat decisions, linked companion creation, automatic grants, and before/after review.
5. Browse Open5e SRD reference data and add selected spells/items to the active character.
6. Create a character through Identity, Class & target level, and Ability Scores pages; seed background skills and starting equipment, then run reviewed level-up transactions until the selected starting level is reached.
7. Ingest a single 5e Companion `.cah` character through a guarded adapter and review screen while retaining the existing Arcane Observatory JSON library backup as the only native restore/export contract.

## Architecture

- React/Vite presentation in `src/`.
- Pure calculations in `src/domain/rules.js` and `src/domain/character.js`.
- Versioned local persistence in `src/data/store.js`.
- File dispatch lives in `src/importers/characterImport.js`. Native JSON delegates unchanged to `importState`; `.cah` content is validated and normalized in `src/importers/cah.js`, then added as one ordinary native character only after review.
- Open5e v2 access/cache in `src/data/open5e.js`.
- One main route with view state for Sheet, Spells, Inventory, Features, Notes, and History.
- Modal/drawer flows for create/edit, library search, and level up.
- Configuration-driven subclass timing in `src/domain/progression.js`; linked companion calculations and state transitions in `src/domain/companions.js`.
- Licensed-name feat options and prerequisite filtering in `src/domain/feats.js`; automatically granted feature/spell resolution in `src/domain/grantedContent.js`.
- Structured auditable change groups in `src/domain/history.js`; local text indexing for notes in `src/domain/notes.js`.
- Deterministic player skill calculations in `src/domain/skills.js`; the Sheet renders all 18 skills and provides a staged Save/Cancel proficiency editor.
- Deterministic saving-throw calculations in `src/domain/savingThrows.js`; each ability card displays its total save and marks proficiency from the original class or Resilient.
- Locally authored 2014 feat and modeled-feature mechanics in `src/domain/featRules2014.js` and `src/domain/featureRules2014.js`; compact list items open complete decision details without reproducing proprietary prose.
- Complete licensed SRD spell records are normalized by `src/data/open5e.js` and exposed on demand from the spellbook. The spell header shares persisted slot-use state with the Sheet.
- Class-specific 2014 cantrip and known/prepared capacity calculations live in `src/domain/spellCapacity.js`; automatic grants are reported separately because they do not consume ordinary preparation capacity.
- Creation reference catalogs live in `src/data/backgrounds2014.js` and `src/data/creationCatalog2014.js`. Fixed ancestry adjustments are deterministic; flexible source choices remain explicit manual decisions. Starting equipment is persisted to Inventory rather than displayed as decorative copy.
- `src/domain/abilityHistory.js` reconciles a recorded ASI before/after snapshot when an interrupted persistence path left the Sheet on the transaction's exact pre-change values. The repair is idempotent and never overwrites a later value.
- `src/public/tabletopContract.js` is the versioned, serialization-safe external boundary for calculated entity snapshots and validated immutable commands. Future tabletop, transport, and presentation layers must not import rule catalogs or mutate stored character JSON directly; see `docs/TABLETOP_INTEGRATION.md`.
- `src/domain/rests.js` owns atomic short/long-rest transitions; `src/domain/restRecovery2014.js` supplies class-level Arcane Recovery, Natural Recovery, and Song of Rest validation without putting rules arithmetic in React.
- `src/domain/equipment.js` owns carrying, attunement, equip/quantity state, and ammunition transactions. `src/domain/weapons.js` canonicalizes 2014 weapon profiles, `src/domain/specialWeapons2014.js` resolves lance/net mechanics, and `src/domain/attacks.js` owns grip, hand role, attack mode, weapon/style math, constraints, and attack summaries. Character creation expands every generic starting-weapon allowance into an independent canonical selection before Inventory is written. `src/domain/armor.js` publishes armor/shield proficiency restrictions consumed by the calculation graph and spellcasting boundary. Sheet, Inventory, Spells, and the public tabletop adapter consume that shared state.

## Initial rules scope

- D&D 5e 2014 SRD, levels 1–20.
- XP and milestone advancement.
- Standard ability modifiers and proficiency.
- Single-class and common multiclass HP/spell-slot behavior.
- Full-, half-, and third-caster unified slots; Pact Magic stored separately.
- Multiclass prerequisite validation and non-stacking Extra Attack warning.
- Required 2014 subclass selection levels, including repair of a missing earlier choice before another class level can be committed.
- A reusable linked-companion model. Battle Smith's Steel Defender is the first fully derived stat block and scales from Artificer level, Intelligence, and proficiency bonus.
- Class-specific Ability Score Improvement timing, including Fighter and Rogue exceptions. A due choice must resolve as either two +1 increases (which may target the same score) or an eligible feat before commit.
- The full 2014 core feat-name catalog is selectable without copied rules prose. Ability prerequisites, spellcasting prerequisites, duplicate prevention, and half-feat score increases are automated; armor-proficiency prerequisites remain explicitly user-confirmed until proficiency modeling is complete.
- Artificer, Battle Smith, and Warforged feature grants are derived from current character state. Battle Smith specialist spells are derived as always prepared and de-duplicated against manual spell entries.
- Level-up History stores structured feature, feat, spell, companion, and ability deltas. Manual spell and inventory add/remove actions use the same change vocabulary.
- Spell-origin companions share the linked-game-piece schema (`origin`, source spell, duration, static stat block, dismissible state). Automatic creation from a cast spell is a later UI phase.
- Player skill bonuses derive from the governing ability, total-level proficiency bonus, proficiency/expertise state, and optional explicit adjustments. Passive Perception uses the calculated Perception bonus rather than assuming proficiency.
- Saving throws derive from the ability modifier, total-level proficiency bonus when proficient, and optional explicit adjustments. New characters persist their starting-class proficiencies; legacy empty save lists infer them from the first class.
- The normal Sheet condenses skills into the core stat workspace and shows only positive bonuses. Edit mode intentionally restores the complete 18-skill proficiency editor.
- Spell detail records include casting time, reaction condition, range, duration, concentration, ritual status, V/S/M components, material text, school, full description, and higher-level scaling when supplied by Open5e.
- New-character creation always commits level 1 first. A selected level 2–20 target opens the same reviewed level-up transaction once per level; closing the wizard pauses the queue without discarding completed levels.
- Third-party imports never register executable rules, calculation targets, or untyped effects. Supported character-owned values are mapped; custom class/subclass names and descriptions remain readable; ambiguous mechanics and equipment are surfaced as warnings; the original source id and unmapped field names remain in import metadata without storing a second full persistence payload.
- The 2014 background selection grants its two skill proficiencies immediately. The chosen class package creates real Inventory entries, including machine-readable armor/shield profiles used by derived Armor Class.

## Annotation priority — 2026-08-09

1. Immediate and complete: guided ASI/feat choice, automatic Battle Smith/Warforged features, automatic Battle Smith spells, and readable spell-slot review.
2. Immediate supporting work: structured level-up History that lists features, feats, spells, companions, and ability changes.
3. Lower-priority foundation: searchable persisted note fields and a generic spell-companion contract.
4. Deferred catalog expansion: apply the granted-content resolver to every remaining class/subclass/ancestry and connect cast-time summon controls to the companion panel.

## Out of phase

- Accounts/cloud sync, campaigns, shared parties, encounter management, complete granted-content catalogs for every subclass, cast-time summon lifecycle automation, licensed rules prose, and 2024 rule mixing.
- Full proprietary rules prose remains out of scope; the local option catalog stores names, source labels, and calculation facts only.

## Selected experience

The sheet overview matches `design/selected-character-studio.png`. The mobile screenshots inform interaction details. Detailed rules are shown contextually in dedicated flows rather than filling the overview.
