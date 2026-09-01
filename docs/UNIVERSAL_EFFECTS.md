# Universal Effects Work Brief

Status: `complete`
Checklist authority: `docs/ENGINE_COMPLETION.md` → Universal effects

## Goal

Convert ancestry, background, class, subclass, feat, item, and condition mechanics into edition-scoped typed effects consumed by the shared calculation graph. Catalog presence alone does not count as mechanical completion.

## Implemented contract

- `src/domain/effects.js` collects effects from every supported owner type, enforces the `5e-2014` ruleset, evaluates equipment requirements, and rejects targets outside the registered vocabulary.
- Numeric operations: `bonus`, `minimum`, `maximum`, `override`.
- Registry operations: `proficiency`, `resistance`, `grant`, `resource`, `companion`.
- `src/domain/effectCatalog2014.js` adapts ancestry, background, class/subclass, feat, and standard condition owners to typed effects.
- `src/domain/calculationGraph.js` applies numeric and proficiency effects, publishes resistance/grant/resource/companion registries, and attaches every applied effect source to the affected explanation node.
- Focused tests cover precedence, every operation family, allowed/unknown/edition-mismatched targets, owner composition, source explanations, equipment requirements, attunement, and conditions.

## Owner-family audit

- Ancestry: darkvision, maximum HP, Armor Class, training, and modeled damage resistances are typed; one-time creation ability choices remain committed character inputs.
- Background: fixed skill/tool proficiencies and the background feature grant are typed; user-selected flexible language/tool choices remain explicit creation inputs.
- Class/subclass: ongoing AC, HP, and movement modifiers are typed. Spell-slot progressions, rest recovery, resources, attack formulas, and companion stat blocks remain explicit pure engine boundaries because they are state machines or formulas rather than scalar/registry modifiers.
- Feats: modeled initiative, movement, passive awareness, maximum HP, and saving-throw training are typed. Situational action/attack rules remain in the attack/choice engines.
- Items: arbitrary item effects are typed and gated by quantity, equip state, and attunement. Armor/weapon base profiles remain canonical equipment-engine inputs.
- Conditions: modeled movement-locking conditions are typed; condition add/remove state remains in the shared command/mutation engine.

## Primary files

- `src/domain/effects.js`
- `src/domain/calculationGraph.js`
- `src/domain/derivedMechanics.js`
- `src/domain/grantedContent.js`
- `src/data/ancestries.js`
- `src/data/backgrounds2014.js`
- `src/domain/featRules2014.js`
- `src/domain/calculationGraph.test.js`
- Relevant catalog and owner-specific tests for each conversion batch

## Compatibility and verification

Legacy `ancestryEffects`, `backgroundEffects`, feature/item/condition `effects`, and bare damage-resistance targets remain readable. Calculator-specific Dwarven Toughness, Draconic Resilience, Tough, Alert, Mobile, Observant, Resilient, darkvision, class movement, and Defense Style exceptions were removed after parity tests. Full tests, production/Sites builds, and desktop/390px browser QA pass.

## Exclusions

- No 2024 rules or silent edition mixing.
- No copying proprietary descriptive prose.
- No custom-class package loader; that remains a later checklist row.
- No unrelated content expansion while converting existing mechanics.
