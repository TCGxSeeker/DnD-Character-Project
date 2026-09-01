# Workflow Skill Candidates

Capture a candidate when a repeatable process closes a meaningful implementation slice with unusually low iteration cost. Promote it to a real skill only after it succeeds in a second context.

## D&D unified calculation graph

- **Trigger:** A character app derives the same statistic independently across Sheet, inventory, features, progression, or companions.
- **Inputs:** Repository rules contract, owner state schemas, existing pure calculators, display consumers, focused tests.
- **Efficient process:** Inventory calculators and effect owners; define a small typed effect vocabulary; collect owner effects once; compose existing calculators into an explanation-bearing graph; move one consumer to the graph; add table-driven source/precedence tests; run full regression and build.
- **Why it worked:** Reused verified domain calculators instead of rewriting rules; added a compatibility layer before converting catalogs; changed one UI boundary rather than every feature.
- **Verification:** Derived baseline values remain unchanged, effect precedence is deterministic, equipped requirements work, source explanations survive, full suite/build/package pass.
- **Traps:** Double-applying legacy bonuses, letting UI interpret effects, accepting malformed targets, converting every catalog entry in the foundation pass.
- **Status:** Reused successfully for shared multiclass feature precedence, explanation output, and armor-caused roll/spellcasting restrictions across Sheet, Spells, attacks, and the public boundary. Ready to promote in the next skill-authoring session.

## Immutable equipment transaction boundary

- **Trigger:** Inventory actions affect several derived consumers such as Armor Class, attacks, carrying capacity, attunement, ammunition, History, or an external snapshot.
- **Inputs:** Character schema, equipment catalog/profile normalizer, derived calculators, History contract, UI action, integration snapshot, focused tests.
- **Efficient process:** Normalize item mechanics once; express each user action as an immutable domain transaction; validate limits and prerequisites before mutation; append categorized History in the same transaction; make Sheet, Inventory, attacks, and the public contract consume the resulting canonical state; verify reload persistence.
- **Why it worked:** One state transition immediately repaired every downstream view and avoided duplicating rules inside React event handlers.
- **Verification:** Repeat actions preserve unrelated state, invalid actions are inert or return a readable error, derived values agree across screens, History records the change, reload persists it, and full suite/build/package pass.
- **Traps:** Mutating nested item objects, trusting display labels as identifiers, consuming ammunition without a matching weapon, applying unattuned magic effects, and updating one screen without the shared snapshot.
- **Status:** Reused successfully for equip/unequip, quantities, attunement, ammunition, Armor Class, variant encumbrance, and persisted weapon-use configuration across Sheet, History, and the tabletop boundary. Ready to promote into a project skill when the next skill-maintenance pass begins.

## PWA current-bundle browser QA

- **Trigger:** Source tests pass but a local preview appears to show old markup, behavior, or assets after a service-worker-enabled build.
- **Inputs:** Expected asset manifest, development and preview origins, service-worker registrations/caches, browser console, persistence-safe test character.
- **Efficient process:** Confirm the served HTML asset hashes first; distinguish source regression from stale client control; use the development origin as the current-bundle oracle; run the real workflow in an isolated browser profile or disposable character; reload to verify persistence; then separately repair or invalidate preview caching if needed.
- **Why it worked:** It prevented debugging correct source against an obsolete browser bundle and preserved the user's normal local character store during destructive interaction tests.
- **Verification:** Current navigation/labels match source, the user action changes canonical state, reload preserves it, History reflects it, desktop and narrow layouts remain usable, and the console has no new errors.
- **Traps:** Treating a service-worker response as a fresh build, clearing the user's storage to fix cache symptoms, testing only static appearance, and leaving an altered active character selected.
- **Status:** Successful during the equipment/ammunition slice. Validate once more during an offline/cache-specific checklist row before promotion.

## Ephemeral rules-context evaluator

- **Trigger:** Deterministic mechanics depend on encounter input that must not contaminate persisted character state.
- **Inputs:** Canonical calculated action, small normalized context schema, feature exceptions, public adapter, compact UI controls, table-driven rules cases.
- **Efficient process:** Verify the rule intersections first; implement one pure evaluator with explicit reasons; feed it canonical attack rows; expose an on-demand serialization-safe adapter; keep React state local; test each rule plus cancellation; visually exercise one normal, advantage, and blocked result.
- **Why it worked:** One small function served Sheet and the tabletop boundary without introducing map state, migrations, History noise, or duplicate attack arithmetic.
- **Verification:** 2014 range, reach, cover, close combat, visibility, prone, feat exceptions, and cancellation tests; desktop/narrow interaction; clean console; full suite/build/package.
- **Traps:** Persisting target state, adding cover to the attack bonus instead of target defense, counting multiple advantage sources, or letting Sharpshooter bypass total cover.
- **Status:** Reused successfully for lance mounted/grip context and net target eligibility after the general range/cover pass. Ready to promote during the next skill-maintenance session.
