# Character Option Catalog

## Purpose

The creation catalog supplies stable local identifiers, names, grouping, source labels, size, base speed, and dependent lineage choices. It is deliberately separate from Open5e runtime reference data so character creation remains available offline.

## Current scope

- The twelve 2014 core classes plus Artificer.
- Common, exotic, monstrous, setting-specific, and custom ancestry families.
- Dependent options for ancestry families with subraces, heritages, versions, or legacy playtest choices.
- Warforged defaults to the published Eberron version; Envoy, Juggernaut, and Skirmisher are visibly labeled legacy playtest choices.
- Ability scores entered in creation are pre-ancestry scores. Fixed ancestry adjustments are previewed and applied exactly once; flexible adjustments remain an explicit player choice with a reminder in the builder.
- Backgrounds expose their skill proficiencies and roleplay hooks during identity selection. Starting class equipment is previewed, selected, and persisted with structured armor/shield metadata.

## References

- D&D 5e Wikidot lineage index: https://dnd5e.wikidot.com/lineage
- Warforged reference and version split: https://dnd5e.wikidot.com/lineage:warforged
- Artificer reference: https://dnd5e.wikidot.com/artificer
- Open5e v2 remains the only runtime provider: https://open5e.com/api-docs

These references inform factual mechanics and option taxonomy. Do not copy their descriptive prose or full feature text into the repository. Names, short source labels, numeric rules facts, and locally authored summaries are acceptable catalog metadata. Setting-specific, legacy, and optional entries should remain visibly marked so a player can confirm them with the DM.

The 2014 feat picker and currently modeled Artificer, Battle Smith, and Warforged features include locally authored mechanical summaries and bullet lists. These are decision aids, not source-book reproductions. Licensed SRD spell descriptions are loaded through Open5e and remain visibly attributed.

## Applied calculations

- Artificer: d8 Hit Die, Intelligence 13 multiclass prerequisite, Intelligence spellcasting, and half-caster contribution rounded up for multiclass spell-slot calculation.
- Ancestry base speed is applied to new characters.
- Published Warforged adds its cataloged +1 Armor Class bonus to the creation preview result.
- Fixed ancestry ability adjustments are applied at creation. Flexible-origin choices remain pending until the player assigns them.
- Other ancestry features are recorded as selections but are converted into derived values only where a tested rule adapter exists.

## Future catalog work

- Add source-book filters and a default "SRD/common only" mode.
- Add an explicit assignment control for flexible ASIs, point buy, and rolled scores.
- Add locally authored short trait summaries and pending-choice prompts where calculation support exists.
- Add migrations only if catalog identifiers become required fields; current additions remain backward compatible.
