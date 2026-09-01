# Tabletop Integration Contract

The Character Studio is the authoritative rules engine. A future tabletop/VTT owns spatial, presentation, campaign, turn-display, visibility, and transport state. It references engine entities by stable ID and never duplicates or interprets class, subclass, ancestry, feat, spell, item, feature, or effect internals.

## Public module

`src/public/tabletopContract.js` is the only initial integration surface:

- `TABLETOP_CONTRACT_VERSION`
- `getTabletopEntitySnapshot(characterState)`
- `getTabletopCompanionSnapshot(ownerState, companionState)`
- `evaluateTabletopAttackContext(characterState, attackId, context)`
- `applyTabletopCommand(characterState, command)`

All returned snapshots are plain serialization-safe objects. Consumers must branch on `contractVersion`; contract-breaking changes require a new version. Internal modules, persistence records, calculation nodes, `classLevels`, `features`, `effects`, and inventory records are not public merely because the adapter reads them.

## Character snapshot v1

The snapshot exposes:

- identity: version, entity type, stable ID, name, portrait reference, ruleset, level, and nullable size;
- combat state: current/maximum/temporary HP, calculated AC, initiative, walking speed, senses, abilities, saves, skills, and conditions;
- calculated actions: equipped attacks, ammunition availability, attacks per action, concise spells, and feature/action summaries;
- equipment capacity: current carried weight, standard capacity, push/drag/lift capacity, and the reported variant-encumbrance state;
- resource state: class resources, standard spell slots, and Pact Magic;
- globally stable linked companion IDs, composed as `<owner-id>:<companion-id>`.

Snapshots expose results, not formulas or source catalogs. A consumer may cache a snapshot for display but must not treat it as writable authoritative state.

Target context is deliberately requested on demand rather than embedded in the snapshot. `evaluateTabletopAttackContext` accepts transient distance, cover, visibility, nearby-hostile, and prone inputs and returns attack legality, range band, cover bonuses, advantage/disadvantage state, and explanations without mutating character state.

## Command envelope v1

Commands are plain objects shaped as `{ type, payload }`. Supported commands are:

| Type | Payload |
| --- | --- |
| `applyDamage` | `{ amount }` |
| `applyHealing` | `{ amount }` |
| `setTemporaryHp` | `{ amount }` |
| `consumeResource` | `{ resourceId, amount? }` |
| `restoreResource` | `{ resourceId, amount? }` |
| `applyCondition` | `{ condition: { id, name, source?, duration? } }` |
| `removeCondition` | `{ conditionId }` |
| `performRest` | `{ kind: "short" | "long", context?, hitDieRecoveryOrder? }` |
| `useAmmunition` | `{ weaponId, amount? }` |

`applyTabletopCommand` validates input, returns a new character value, preserves unrelated state, and records History. It does not save to `localStorage` or perform network synchronization; the owning host commits the returned state through its persistence layer. Future transport may wrap commands with command IDs and authorization without changing mechanical semantics.

## Tabletop-owned state

Keep campaigns, scenes, maps, grids, token coordinates/scale/art, fog, visibility, initiative presentation, rulers, drawings, pings, annotations, DM-only projections, player projections, and networking outside character state. A token stores an engine entity ID plus tabletop presentation state.

## Current architecture review

### Compatible foundations

- Pure domain calculations already centralize derived state.
- Immutable level-up/rest/resource operations already produce structured History.
- Character and reference persistence are separated.
- Companions derive their public statistics from their owner inside the engine.
- The adapter can change internal imports without changing its public result.

### Known seams to close during normal engine work

- Some Sheet counters still patch HP, Hit Dice, Pact Magic, inspiration, experience, or resources directly. Route combat-facing mutations through public/domain commands as each workflow is revised.
- Size is not yet canonical on every stored character; v1 therefore returns `null` when absent.
- Movement currently exposes calculated walking speed only. Add fly, swim, climb, burrow, and conditional movement to the calculation graph before adding them to a later compatible contract revision.
- Conditions have a public shape and mutation boundary, but the full 2014 condition/effect catalog is not yet modeled.
- Attack summaries cover equipped weapon attacks and ammunition availability/consumption, while the on-demand evaluator resolves common spatial target conditions. Spell attacks, save-based actions, and remaining conditional actions remain engine-roadmap work.
- Companion snapshots cover current linked companions. A general monster/NPC entity model remains future engine scope.
- The browser store is intentionally not part of the public API. A later integration host should call the adapter and persist returned authoritative state itself.

## Compatibility rules

1. Add optional fields compatibly within contract v1; never change the meaning or type of an existing v1 field.
2. Increment the contract version for removals, renames, type changes, or semantic changes.
3. Keep contract fixtures/tests independent of UI and storage.
4. Never make consumers reconstruct calculated values or interpret internal rule-owner records.
5. Do not introduce networking into Character Studio to satisfy transport concerns.
