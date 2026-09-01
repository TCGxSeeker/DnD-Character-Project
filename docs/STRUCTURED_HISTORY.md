# Structured Mutation History Work Brief

Status: `complete`
Checklist authority: `docs/ENGINE_COMPLETION.md` → Structured mutation History

## Contract

Mechanical changes cross immutable domain actions. Events use the stable categories in `src/domain/mutations.js`, retain readable change groups, and include serialization-safe `stateChanges` entries with categorized before/after values where a scalar or bounded mechanical record changes. No-op actions return the original character and append no event; cancelled staged workflows never call a commit action.

## Covered boundaries

- Creation and reviewed progression events, including abilities, grants, choices, companions, and HP.
- Sheet HP, inspiration, XP, Hit Dice, resources, skills, conditions, rests, and companion play state.
- Spells, preparation/ownership, Spellcasting slots, Pact Magic, casting, and spell-created companions.
- Inventory addition/removal, quantity, equip state, attunement, weapon use, ammunition, and encumbrance choice.
- Character duplication plus existing safe import/export and character-management boundaries.

Narrative note typing, transient dialogs, collapsed panels, search terms, and attack target context are intentionally outside mechanical History.

## Vocabulary

`hit-points`, `hit-dice`, `inspiration`, `experience`, `resource`, `spell-slot`, `spell`, `proficiency`, `equipment`, `condition`, `companion`, and `identity`.

## Verification

`src/domain/mutations.test.js` table-drives immutability, category coverage, before/after state, serialization, and no-op behavior. Owner-specific suites retain compatibility checks for progression, rests, spells, equipment, conditions, and companions.
