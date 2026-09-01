# Rules Engine Contract

## Universal choices

Creation and progression share the declarative resolver in `src/domain/choices.js`. Choices and individual options may declare total/class level, ability, proficiency, or prior-choice prerequisites. Selected options may reveal nested choices. Cross-level exclusions prevent duplicate selections, while explicit replacement records require both the prior selection and its replacement before the reviewed transaction can commit. React only renders resolver output; it does not reproduce rule validation.

## Core formulas

- Ability modifier: `floor((score - 10) / 2)`.
- Proficiency bonus: `1 + ceil(totalLevel / 4)`.
- Level 1 HP: class hit-die maximum + Constitution modifier.
- Later HP gain: chosen die result or class average (die / 2 + 1) + Constitution modifier.
- Constitution changes: `newMaxHP = oldMaxHP + (newConMod - oldConMod) * totalLevel`.

XP thresholds for levels 1–20:

`[0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000]`

## Multiclass

- Validate current and target-class ability prerequisites at 13+ before adding a class level.
- Unified caster level: full class levels + floor(half-caster levels / 2) + floor(third-caster levels / 3).
- Pact Magic slots are recorded separately from Spellcasting slots.
- Features are keyed by stable class/source identifiers. Multiple Extra Attack grants do not increase attacks beyond the best applicable feature.
- Fighting Style cannot be selected more than once across classes. Channel Divinity uses one shared pool while retaining every granted option. The first acquired Unarmored Defense formula remains authoritative.

## Spell capacity and resources

- Spell slots and spell capacity are separate calculations. Multiclass slot combination never replaces each class's known/prepared-spell rules.
- Artificer prepares `Intelligence modifier + floor(Artificer level / 2)` spells, minimum one, and uses its class-table cantrip progression.
- Cleric, Druid, Paladin, and Wizard prepared capacity derives from class level and their spellcasting ability. Bard, Ranger, Sorcerer, and Warlock use their 2014 spells-known tables.
- Multiclass display capacity sums each class's independent capacity. Automatic subclass/ancestry grants are displayed separately and do not consume that number.
- `spellSlots` stores maximum slots by level and `usedSpellSlots` stores spent slots. Every slot control must mutate this shared state and clamp usage between zero and its level maximum.
- Each user-added spell stores its owning class. Known/prepared capacity is counted independently for that class; legacy single-caster spells infer the only caster class.
- An eligible spell can expend either a sufficiently high Spellcasting slot or Pact Magic slot. Spending one pool never mutates the other, and the selected pool is recorded in structured History.

## Rest recovery

- `src/domain/rests.js` is the atomic rest transaction boundary; `src/domain/restRecovery2014.js` validates optional class-feature recovery before that transaction commits.
- Arcane Recovery and Natural Recovery use `ceil(class level / 2)` recovery levels, may select only expended 1st–5th-level Spellcasting slots, and consume a once-per-long-rest resource.
- Song of Rest is accepted only when the character has the feature, its die matches the Bard-level progression, and at least one Hit Die was spent in the same short-rest draft.
- The UI stages Hit Dice, Song of Rest, and slot selections. Domain validation remains authoritative for imported data and non-UI consumers.

## Subclasses and linked companions

- Each class defines its subclass selection level and a catalog of allowed option identifiers.
- If an imported or earlier character has passed that level without a subclass, the next guided level-up must repair the missing choice before commit.
- A subclass choice is written to the matching class-level record and added once to the feature list.
- Battle Smith creates one stable Steel Defender companion. Repeating later level-ups must preserve that companion rather than duplicate it.
- Steel Defender maximum HP is `2 + Intelligence modifier + (5 × Artificer level)`; its proficiency-derived saves, skills, attacks, damage, repair, and perception recalculate from its Battle Smith.
- Companion name, current HP, repair uses, presence, and collapsed state are persisted user state. Derived statistics are not duplicated in storage.

## HP history

Persist each class level and its raw hit-die contribution before Constitution. This preserves exact recalculation when Constitution changes and makes level-up history auditable.

## Armor Class

- With no tracked body armor equipped, use the character's persisted unarmored/baseline AC so imported and legacy characters retain intentional bonuses.
- Equipped light armor adds the full Dexterity modifier; medium armor caps that modifier at +2; heavy armor ignores it.
- When more than one body armor entry is marked equipped, use the highest valid armor formula rather than stacking them.
- One equipped shield contributes its bonus; multiple shields do not stack.
- Quantity zero and unequipped items never affect AC.
- Ancestry and explicit miscellaneous AC bonuses remain separate from equipment and apply to an equipped body-armor formula.

## Equipment, carrying, and attacks

- `src/domain/equipment.js` is the mutation boundary for equip state, quantities, attunement, and ammunition. React and public consumers dispatch to it instead of patching Inventory arrays.
- Equipping body armor replaces other equipped body armor; equipping a shield replaces other equipped shields. Setting quantity to zero clears equipped and attuned state.
- Chain mail requires Strength 13; splint and plate require Strength 15. Below the listed score, equipped armor reduces speed by 10 feet. Dwarves ignore that speed reduction.
- Variant encumbrance is an explicit per-character option. Above 5 × Strength carried weight, speed drops by 10 feet; above 10 × Strength through maximum capacity, speed drops by 20 feet and Strength-, Dexterity-, and Constitution-based checks, attacks, and saves have disadvantage.
- When variant encumbrance is enabled, ignore armor-table Strength requirements rather than stacking the two speed systems.
- Armor profiles retain category, Strength requirement, Stealth disadvantage, and proficiency diagnostics alongside their AC formula. Views consume these fields but do not interpret or reproduce the rules.
- An equipped armor or shield lacking proficiency adds one shared restriction record: Strength- and Dexterity-based ability checks, saving throws, and attack rolls have disadvantage, and spellcasting is blocked. Numeric modifiers remain unchanged; Sheet, Spells, companion-spell launchers, attacks, and the public snapshot consume the restriction metadata.
- When an older save lacks an explicit armor proficiency list, only its original class grants the fallback package. Later multiclass proficiencies never replace that original-class baseline.
- A character may be attuned to at most three available items. An item that requires attunement contributes no typed effects until it is attuned.
- Standard carrying capacity is `Strength × 15`, and push/drag/lift is `Strength × 30`, modified by creature size. Variant thresholds are reported at `Strength × 5` and `Strength × 10` but do not alter speed unless that optional rule is explicitly enabled later.
- Ammunition weapons report a compatible aggregate inventory count. Consuming ammunition is bounded, immutable, persisted through the owning store, and recorded in History; an attack is unavailable when its required ammunition count is zero.
- `src/domain/weapons.js` normalizes Open5e, creation-catalog, and legacy display-only weapon records into the same 2014 profile. Old characters may derive a missing original-class weapon proficiency, but an explicit saved proficiency list remains authoritative.
- Each equipped weapon has validated grip, main/off-hand role, and melee/ranged/thrown use. Versatile damage, finesse ability choice, two-weapon modifier rules, Archery, Dueling, Great Weapon Fighting, loading, Heavy disadvantage, reach, range, and ammunition are calculated in `src/domain/attacks.js` rather than React.
- Sheet, Inventory, and the public tabletop snapshot consume the same attack rows. Changing weapon use is immutable, writes structured History, and persists through reload.
- `src/domain/attackContext2014.js` evaluates ephemeral target distance, reach/range bands, cover, visibility, nearby hostile creatures, and prone positioning. It combines all advantage/disadvantage sources using 2014 cancellation, applies Sharpshooter and Crossbow Expert exceptions, and never persists target or map state.
- Lance and net rules are structured in `src/domain/specialWeapons2014.js`. A lance defaults to two hands, permits a one-handed mounted configuration, requires two hands while unmounted, and has disadvantage within 5 feet. A net deals no damage, limits its action/bonus-action/reaction attack sequence to one attack, and reports restraint, size/form exclusions, DC 10 Strength escape, and AC 10/5 slashing-damage destruction details.
- Generic class-package entries such as “simple weapon” or “martial melee weapon” are resolved to independently selected canonical 2014 weapon profiles during creation. Placeholder display records never enter a newly created character's Inventory.

## Calculation graph and effects

- `calculateCharacterGraph` is the Sheet-facing source for derived numeric values and their explanations.
- Effects are edition-scoped records with `operation`, `target`, `value` when numeric, and `source`.
- Numeric operations are bonus, minimum, maximum, and override. Registry operations are proficiency, resistance, grant, resource, and companion.
- Effects may be owned by the character, ancestry, background, features, equipped inventory, or active conditions. Unequipped item effects declaring `requiresEquipped` do not apply.
