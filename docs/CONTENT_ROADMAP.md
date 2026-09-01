# Content Completion Roadmap

## Completion bar

An option is complete only when creation metadata, required choices, level grants, derived effects, searchable rules text, persistence/history, focused tests, and browser QA all agree. A name in a dropdown is cataloged, not complete.

## Current baseline

- 53 ancestry families and 78 dependent options are cataloged.
- 13 backgrounds and 13 classes are available in creation.
- All classes have subclass timing/name scaffolds; Artificer, Battle Smith, and Warforged are the current end-to-end depth reference.
- Run `node C:\Users\StDeL\.codex\skills\dnd-rules-catalog-expansion\scripts\audit_catalog.mjs G:\dnd-character-studio` for the live creation-detail gap list.

## Ordered batches

1. Creation identity: finish ancestry/subrace and background mechanics, flexible ASIs, proficiencies, languages, and starting choices.
2. Class chassis: levels 1-20 features, resources, spell capacity, required choices, and derived adapters for all 13 classes.
3. Subclasses: feature/grant tables and linked game pieces, beginning with SRD/common options at each class's choice level.
4. Expanded sources: setting, legacy, and optional lineages with visible source/version labels.
5. Product hardening: migrations, import/export compatibility, narrow/desktop QA, and cross-option character-build matrices.

## Batch order

| Wave | Scope | Exit check |
| --- | --- | --- |
| A | Common ancestry options, Aasimar, Genasi | Every listed option has score/trait semantics and creation tests |
| B | Remaining exotic/monstrous ancestry families | No generic confirmation placeholders in selected creation paths |
| C | Background choice and grant tables | Skills, tools, languages, equipment, and notes persist |
| D | Fighter, Rogue, Wizard, Cleric | Full level 1-20 guided builds and feature libraries |
| E | Remaining core classes | Same completion bar as Wave D |
| F | All subclass tables | Choice-level repair, grants, spells, resources, and companions tested |

## Coverage dimensions

Track each option across: `catalog`, `creation`, `progression`, `grants`, `derived`, `history`, `tests`, and `browserQA`. Expansion work should update data tables and adapters before adding view-specific conditions.
# Class-depth expansion status (2026-08-11)

- Automated source sync: `npm run sync:classes` imports licensed SRD 2014 class/subclass feature text from Open5e v2.
- Coverage audit: `npm run audit:classes` writes `docs/class-depth-audit.json` with per-class feature, subclass, resource, creation-skill, and guided-choice coverage.
- Current base: 13 classes; 110 imported class features; 12 SRD subclasses / 60 subclass features; all creation skill lists; scalable core class resources; Pact Magic; guided persisted choices for fighting styles, ranger selections, expertise, metamagic, and Pact Boon.
- Next content batches: the 32 non-SRD subclass rulesets listed by the audit; spell learning/preparation transactions; invocations and Magical Secrets; subclass-specific internal choices and derived-stat effects; companion-backed subclasses.
- Completion rule: a ruleset is complete only when creation, required choices, grants, derived mechanics, readable licensed detail, persistence/history, and regression tests all pass.
- Cross-view calculation pass begun: shared AC/speed supports armor, shields, Warforged bonuses, Defense style, Barbarian/Monk unarmored rules, Draconic Resilience, class movement, Hill Dwarf HP, and Tough HP. Remaining ancestry/subclass/item modifiers stay audit scope rather than view-local exceptions.
- Spell-linked pieces: Find Familiar supports all 15 standard forms as one named, replaceable Sheet companion. Other summon/conjure spells remain on the linked-piece catalog roadmap.
