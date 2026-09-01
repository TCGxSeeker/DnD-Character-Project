# Core Engine Completion Checklist

Status values: `complete`, `foundation`, `pending`. Content breadth is tracked separately in `CONTENT_ROADMAP.md`.

| Engine capability | Status | 100% exit condition |
| --- | --- | --- |
| Reviewed level transaction | complete | One preview/commit path preserves unrelated state and records structured History |
| Multiclass prerequisites and total level | complete | Current and target class requirements, XP, proficiency, and level cap use total/class levels correctly |
| Multiclass proficiencies | complete | Later-class fixed grants and required skill/tool/instrument choices persist without granting starting saves/equipment |
| Hit Points and mixed Hit Dice | complete | Every level uses the selected class die; pools are tracked by die type; short-rest spending and long-rest recovery are available on the Sheet |
| Multiclass Spellcasting and Pact Magic | complete | Combined slots, per-class known/prepared limits, third/half/Artificer casters, separate Pact Magic, cross-pool casting, rest recovery, explanations, and History are tested |
| Shared/limited class features | complete | Channel Divinity shares uses and options; Extra Attack uses the best progression; only first Unarmored Defense applies; Fighting Styles cannot duplicate; resolved sources are displayed |
| Universal choice engine | complete | Arbitrary typed/nested choices work in creation and progression with prerequisites and replacement rules |
| Unified calculation graph | complete | Sheet HP, AC, speed, saves, skills, attacks, initiative, perception, senses, languages, and spell capacity expose one source of truth |
| Rest and resource engine | complete | Sheet actions atomically restore short/long-rest pools, Pact Magic, slots, HP, and half Hit Dice; Arcane Recovery, Natural Recovery, and Song of Rest obey class-level limits and produce structured History |
| Equipment and attack engine | complete | Canonical 2014 weapon/armor profiles, concrete generic starting-weapon substitution, grip/off-hand/thrown/lance-mounted modes, lance and net special resolution, core Fighting Styles, loading/heavy/range/reach rules, full armor/shield proficiency restrictions, transient target evaluation, ammunition, immutable equipment actions, Sheet attacks, History, and public snapshots agree |
| Universal effects | complete | Typed bonus/minimum/maximum/override, proficiency, resource, resistance, grant, and companion adapters collect from all owner types; converted owners and explicit non-effect engine boundaries are documented in `docs/UNIVERSAL_EFFECTS.md` |
| Structured mutation History | complete | Mechanical mutations use immutable domain actions, stable categories, readable change groups, and serialization-safe before/after state; work brief: `docs/STRUCTURED_HISTORY.md` |
| Schema migrations and recovery | complete | Sequential migrations, supported-version fixtures, unknown-field preservation, safe malformed imports, recovery copies, and interrupted transaction recovery are tested; work brief: `docs/SCHEMA_MIGRATIONS.md` |
| Calculation explanations | complete | Sheet core statistics expose their base formula, typed-effect source trail, restrictions, and current value; attacks, saves, skills, spells, and shared features retain their domain-specific source explanations |
| Automated build matrix | complete | `npm run test:matrix` validates every level from 1–20 for all 13 classes (260 builds); focused tests retain multiclass, choice, equipment, spell, rest, and boundary combinations |
| Offline/performance/accessibility | complete | On-demand view chunks, PWA precache, local error states, focus-managed dialogs, reduced-motion/transparency fallbacks, and desktop/390px keyboard QA are verified |
| Portable release validation | complete | The Windows launcher builds and serves the production client on loopback; Sites, portable-server, 260-build matrix, backup/recovery, PWA output, and distributable instructions are verified |
| Custom class packages | pending | Validated versioned class JSON can add rules, choices, progression, spellcasting, resources, proficiencies, and descriptions without source edits |

## External consumer boundary

- Contract v1 exposes serialization-safe calculated character and companion snapshots without internal rule-owner records.
- Validated commands currently cover damage, healing, temporary HP, ordinary resources, conditions, and rests with immutable History-producing transitions.
- Remaining Sheet direct mutations, broader action types, alternate movement, and full condition semantics stay within their existing engine checklist rows rather than becoming tabletop-specific code.

## Multiclass 2014 invariants

- Total character level determines XP thresholds and proficiency bonus.
- Both existing and target class ability prerequisites apply when taking the first level in a new class.
- Only the original class grants starting saving throws and equipment. Later classes grant only the multiclass proficiency table.
- HP uses the new class's post-level-1 die method. Hit Dice remain separated by die type when types differ.
- Class features use each class level independently. Extra Attack does not stack; Channel Divinity effects combine but uses follow explicit class progression; Unarmored Defense is acquired only once.
- Known/prepared spells are determined per class. Spell slots use combined caster level; Pact Magic remains a separate pool usable across eligible spells.

## Rest 2014 invariants

- Arcane Recovery and Natural Recovery calculate their budget from the owning class level, not total character level or combined caster level.
- Each recovery restores a selected combination of expended 1st–5th-level Spellcasting slots whose combined levels do not exceed `ceil(owning class level / 2)`; it cannot restore Pact Magic or 6th–9th-level slots.
- Arcane Recovery and Natural Recovery can each be used once before a long rest. Legacy characters without the resource record are treated as unused; the first use creates persistent spent state.
- Song of Rest is optional extra short-rest healing after at least one Hit Die is spent and scales d6/d8/d10/d12 at Bard levels 2/9/13/17.
- Hit Dice, optional healing, feature uses, recovered slots, restored resources, and Pact Magic commit as one short-rest History event. Cancel leaves the character unchanged.
