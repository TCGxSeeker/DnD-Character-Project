# Gotchas

- Open5e contains multiple game systems and publishers. Always filter sources explicitly.
- API feature prose can be incomplete or irregular. Do not derive core arithmetic from prose at runtime.
- Multiclass spell slots and spells known/prepared are separate concepts.
- Never label the ordinary spell-slot result as merely “unified slots.” Show the per-level slot distribution; explain the shared pool only for multiclass spellcasting.
- An Ability Score Improvement is a required mechanical branch, not a freeform note. Feat selection must validate known prerequisites, prevent unintended duplicates, and apply any modeled score increase before HP is recalculated.
- Prepared/known class spells are not the same as always-prepared subclass or ancestry spells. Auto-populate grants; do not add an entire class spell list to the character.
- Passive Perception is `10 + the character's actual Perception bonus`; do not add proficiency unless Perception is proficient. Expertise and explicit skill adjustments must flow through the same skill calculation.
- Skill editing is a draft workflow. Save replaces only the canonical skill-proficiency list and removes expertise entries that no longer have proficiency; Cancel must not mutate character state.
- Saving-throw proficiencies come only from the original class; taking a later multiclass never grants that class's saves. Legacy characters with an empty `saves` list infer the original-class pair, while Resilient adds its selected ability through structured feat data.
- A compact skill summary is not the proficiency editor: normal Sheet view filters to bonuses above zero, while Edit must always expose all 18 skills, including zero and negative modifiers.
- A spell name, casting time, and range are insufficient at the table. Preserve Open5e's licensed description, components, duration, concentration/ritual flags, reaction condition, school, and higher-level text when normalizing a spell.
- Proprietary feat and class-feature prose must not be copied. Store complete mechanical facts as original summaries and structured bullets, with an explicit source label.
- Spell-slot controls on the Spells view and Sheet are two views of the same `spellSlots`/`usedSpellSlots` state. Never introduce a second slot counter.
- Do not count automatically granted spells against known/prepared capacity. Show total entries, ordinary chosen/prepared usage, automatic grants, and cantrip capacity as distinct values.
- Derived feature/spell catalogs must de-duplicate manual legacy entries by stable name while retaining user-authored state in backups.
- Constitution changes must update HP for every existing level, not only the next level.
- Rest actions are auditable character mutations. Hit Die healing is staged until a short rest is committed; cancelling the dialog must preserve HP, dice, resources, slots, and History exactly.
- Special recovery budgets use the feature's owning class level, never total level or combined caster level. They may restore shared Spellcasting slots after multiclassing, but not Pact Magic or slots above 5th level.
- Song of Rest requires at least one Hit Die spent in the same short-rest transaction. Record it in that rest's History instead of issuing a second healing mutation.
- Multiclass spell slots are shared casting capacity, not shared spell knowledge. Persist the class that owns each chosen spell; Pact Magic remains a separate pool even when it casts another class's eligible spell.
- A starting-level target is not permission to skip levels. Create level 1, then remount the guided wizard for every transaction so subclass, HP, feat/ASI, spell, and companion choices are reviewed in order.
- Ability Score Improvements must persist numeric scores plus a structured before/after snapshot. If a saved Sheet still equals the exact recorded `before` state, load-time reconciliation may apply the `after` state once; never add the increase blindly or overwrite a later score.
- Creation ability inputs are pre-ancestry scores. Apply only cataloged fixed modifiers automatically; flexible “any ability” choices stay manual and must be called out beside the inputs.
- Starting equipment belongs in `inventory` with armor metadata. Preview-only gear leaves Armor Class and portability out of sync.
- Extra Attack grants do not stack.
- Armor Class is derived from equipped inventory. Body armor never stacks, only one shield applies, and legacy stored AC must remain the no-equipment fallback during data normalization.
- Inventory controls are mechanical transactions, not view toggles. Equip, quantity, attunement, and ammunition changes must pass through `domain/equipment.js`, preserve unrelated state, and write structured History.
- Variant encumbrance is optional. Calculate and display its thresholds without silently reducing speed; enabling its penalties requires an explicit, persisted rules choice. The 2014 variant ignores the armor table's Strength column, so never stack its speed penalty with a heavy-armor Strength penalty.
- Items requiring attunement contribute no typed effects until attuned, and the character-wide limit is three items.
- A legacy display-only weapon name is still playable when it matches the canonical 2014 catalog; normalize it at read time instead of rewriting the save. Derive missing original-class weapon proficiencies only when no explicit weapon list exists.
- Armor-proficiency failure is not a numeric penalty. Preserve displayed bonuses, attach disadvantage reasons only to Strength/Dexterity checks, saves, and attacks, and block every spellcasting pool. Shields participate in this rule even though they are stored separately from body armor.
- Thrown is an attack mode, not automatically a ranged weapon category. A thrown melee weapon normally keeps Strength (or its finesse choice), while a dart remains a ranged weapon. Keep grip, off-hand role, and attack mode in the equipment transaction boundary.
- Target context is encounter input, not character state. Do not persist distance, cover, visibility, or prone-target selections and do not write History for them. Half and three-quarters cover modify the target's AC/Dexterity saves; advantage and disadvantage cancel even when either side has multiple sources.
- Special weapon text is executable rules data, not a generic warning. Lance grip depends on transient mounted state; net target size/form affects only its on-hit restraint, and a 2014 net never adds an ability modifier as damage because it deals no damage.
- Generic starting-weapon allowances must resolve once per granted weapon. Expand quantities into independent slots, filter the canonical 2014 catalog by simple/martial and melee requirements, and never save “Simple weapon” or “Martial weapon” as display-only Inventory entries.
- Missing subclass data on an already-eligible imported character is still a pending required choice; do not assume the choice was intentionally skipped.
- Linked companions combine persisted play state with owner-derived statistics. Never freeze a Steel Defender's calculated maximum HP or proficiency values into the character backup.
- Merely knowing or preparing a summon spell must not create a present companion. Spell-origin pieces are instantiated when the user casts/adds one and retain duration or concentration metadata separately from presence.
- LocalStorage writes can fail or exceed quota. Surface a readable error and preserve the last in-memory state.
- Never conflate full JSON backup with reference-data cache export.
- Local saves use a pending transaction record plus a recovery copy. Never write the primary character key directly or clear pending/recovery records as a migration shortcut.
- Schema migrations advance exactly one integer version per registry entry and preserve unknown user-authored fields unless a documented incompatibility makes that unsafe. Imports validate and migrate before replacing in-memory state.
- The Product Design bootstrap script crashed while copying directly to this G: drive; preserve the manually copied official template files.
# Cross-view mechanics and spell pieces

- A known or prepared summon spell must not create a companion automatically. Find Familiar exposes an explicit form/name action inside the expanded spell; it creates one replaceable, dismissible Sheet instance.
- Inventory and Sheet must call the same pure armor and speed functions. Never reproduce AC/speed arithmetic inside a view.
- HP bonuses from ancestry, subclass, and feats must be included in creation and every progression preview, not patched into display-only values.
# Choice resolution

- Do not add one-off mechanical pickers directly to creation or level-up React components. Define the choice once and route both workflows through the universal resolver.
- A nested choice becomes required only after its parent option is selected. Clearing the parent makes the child inactive; stale child selections must never be committed.
- Replacement is not duplicate exclusion. Exclusions hide an already-known option; replacements require the user to identify the prior selection and record its removal in the reviewed transaction.
