// Original, compact mechanical summaries for making selections in-app.
// These are calculation/editorial facts, not reproduced rulebook prose.
export const FEAT_RULES_2014 = {
  actor: {
    summary: "Excel at impersonation and vocal mimicry.",
    benefits: ["Increase Charisma by 1, to a maximum of 20.", "Gain advantage on Deception and Performance checks made to pass as another person.", "After listening for 1 minute, mimic a creature's speech or another sound; a suspicious listener contests your Deception with Insight."],
  },
  alert: {
    summary: "React rapidly and deny ambushers their usual edge.",
    benefits: ["Gain +5 to initiative.", "You cannot be surprised while conscious.", "Attackers do not gain advantage solely because they are unseen by you."],
  },
  athlete: {
    summary: "Improve movement, climbing, jumping, and recovery from prone.",
    benefits: ["Increase Strength or Dexterity by 1, to a maximum of 20.", "Standing from prone costs only 5 feet of movement.", "Climbing does not cost extra movement.", "A running long or high jump needs only a 5-foot run-up."],
  },
  charger: {
    summary: "Convert a Dash into a forceful bonus-action attack or shove.",
    benefits: ["After using your action to Dash, make one melee weapon attack or shove as a bonus action.", "If you moved at least 10 feet straight toward the target immediately beforehand, add 5 damage to the attack or push the target up to 10 additional feet."],
  },
  "crossbow-expert": {
    summary: "Use crossbows rapidly and fight effectively at close range.",
    benefits: ["Ignore the loading property of crossbows you are proficient with.", "Being within 5 feet of a hostile creature does not impose disadvantage on your ranged attacks.", "After attacking with a one-handed weapon, make a hand-crossbow attack as a bonus action if you hold one."],
  },
  "defensive-duelist": {
    summary: "Turn finesse and proficiency into a reactive defense.",
    benefits: ["While wielding a finesse weapon you are proficient with, use your reaction when hit by a melee attack.", "Add your proficiency bonus to AC against that attack, potentially causing it to miss."],
  },
  "dual-wielder": {
    summary: "Fight with two one-handed weapons without requiring the Light property.",
    benefits: ["Gain +1 AC while wielding a separate melee weapon in each hand.", "Use two-weapon fighting with one-handed melee weapons even when they are not light.", "Draw or stow two one-handed weapons whenever you could normally draw or stow one."],
  },
  "dungeon-delver": {
    summary: "Notice hidden architecture and survive traps more reliably.",
    benefits: ["Gain advantage on Perception and Investigation checks to detect secret doors.", "Gain advantage on saving throws against traps.", "Gain resistance to damage dealt by traps.", "Fast travel does not apply its usual penalty to your passive Perception."],
  },
  durable: {
    summary: "Recover more reliably when spending Hit Dice.",
    benefits: ["Increase Constitution by 1, to a maximum of 20.", "For each Hit Die spent to recover HP, the die result cannot be lower than twice your Constitution modifier, with a minimum result of 2."],
  },
  "elemental-adept": {
    summary: "Specialize in one elemental damage type for more dependable spell damage.",
    benefits: ["Choose acid, cold, fire, lightning, or thunder when taking this feat.", "Your spells ignore resistance to the chosen damage type.", "Treat a 1 on a damage die for that spell damage as a 2.", "You may take this feat again, choosing a different damage type each time."],
  },
  grappler: {
    summary: "Gain leverage against creatures you have grappled.",
    benefits: ["Gain advantage on attacks against a creature you are grappling.", "Use an action to make another grapple check against that creature; on success, both you and the creature become restrained until the grapple ends."],
  },
  "great-weapon-master": {
    summary: "Trade accuracy for heavy damage and capitalize on decisive blows.",
    benefits: ["After a melee critical hit or reducing a creature to 0 HP with a melee weapon, make one melee weapon attack as a bonus action.", "Before attacking with a heavy melee weapon you are proficient with, take −5 to the attack roll to add +10 damage on a hit."],
  },
  healer: {
    summary: "Make healer's kits restore HP instead of merely stabilizing.",
    benefits: ["When stabilizing with a healer's kit, the creature also regains 1 HP.", "As an action, expend one kit use to restore 1d6 + 4 + the target's maximum Hit Dice in HP.", "A creature can receive that healing only once between short or long rests."],
  },
  "heavily-armored": {
    summary: "Gain heavy armor training and a Strength increase.",
    benefits: ["Increase Strength by 1, to a maximum of 20.", "Gain proficiency with heavy armor."],
  },
  "heavy-armor-master": {
    summary: "Use heavy armor to blunt ordinary weapon damage.",
    benefits: ["Increase Strength by 1, to a maximum of 20.", "While wearing heavy armor, reduce nonmagical bludgeoning, piercing, and slashing damage you take by 3."],
  },
  "inspiring-leader": {
    summary: "Bolster a group with temporary HP after a short speech.",
    benefits: ["Spend 10 minutes inspiring up to six friendly creatures within 30 feet that can see or hear and understand you.", "Each gains temporary HP equal to your level + Charisma modifier.", "A creature must complete a short or long rest before benefiting from this feat again."],
  },
  "keen-mind": {
    summary: "Sharpen memory, navigation, and timekeeping.",
    benefits: ["Increase Intelligence by 1, to a maximum of 20.", "Always know north.", "Always know how long remains before the next sunrise or sunset.", "Accurately recall anything seen or heard within the past month."],
  },
  "lightly-armored": {
    summary: "Learn to use light armor while improving Strength or Dexterity.",
    benefits: ["Increase Strength or Dexterity by 1, to a maximum of 20.", "Gain proficiency with light armor."],
  },
  linguist: {
    summary: "Learn languages and create difficult-to-break written ciphers.",
    benefits: ["Increase Intelligence by 1, to a maximum of 20.", "Learn three languages of your choice.", "Create written ciphers that require your teaching, magic, or a successful Intelligence check against DC equal to your Intelligence score + proficiency bonus to decipher."],
  },
  lucky: {
    summary: "Spend luck points to influence attacks, checks, saves, and attacks against you.",
    benefits: ["Gain 3 luck points, all restored on a long rest.", "Spend one after rolling an attack, ability check, or save—but before the outcome—to roll another d20 and choose which result to use.", "When attacked, spend one to roll a d20 and choose whether the attacker uses its roll or yours.", "Only one luck point may affect a roll."],
  },
  "mage-slayer": {
    summary: "Pressure nearby spellcasters and resist their magic.",
    benefits: ["When a creature within 5 feet casts a spell, use your reaction to make a melee weapon attack against it.", "Creatures have disadvantage on concentration saves caused by your damage.", "Gain advantage on saves against spells cast by creatures within 5 feet."],
  },
  "magic-initiate": {
    summary: "Learn two cantrips and one 1st-level spell from a chosen class.",
    benefits: ["Choose bard, cleric, druid, sorcerer, warlock, or wizard.", "Learn two cantrips from that class's spell list.", "Learn one 1st-level spell from that list and cast it once at 1st level; regain that use on a long rest.", "Use the chosen class's spellcasting ability for these spells."],
  },
  "martial-adept": {
    summary: "Learn two combat maneuvers and gain one superiority die.",
    benefits: ["Learn two maneuvers from the Battle Master list.", "Gain one d6 superiority die, restored on a short or long rest; existing superiority dice instead increase by one.", "Maneuver save DC is 8 + proficiency bonus + Strength or Dexterity modifier, your choice."],
  },
  "medium-armor-master": {
    summary: "Move quietly and use more Dexterity while wearing medium armor.",
    benefits: ["Medium armor no longer imposes disadvantage on Stealth checks.", "When Dexterity is 16 or higher, apply up to +3 Dexterity to AC in medium armor instead of +2."],
  },
  mobile: {
    summary: "Move faster, cross difficult ground, and disengage from attacked foes.",
    benefits: ["Increase speed by 10 feet.", "After taking Dash, difficult terrain does not cost extra movement for that turn.", "After making a melee attack against a creature, that creature cannot make opportunity attacks against you that turn, whether the attack hits or misses."],
  },
  "moderately-armored": {
    summary: "Advance from light armor into medium armor and shields.",
    benefits: ["Increase Strength or Dexterity by 1, to a maximum of 20.", "Gain proficiency with medium armor and shields."],
  },
  "mounted-combatant": {
    summary: "Protect a mount and gain leverage over smaller foes.",
    benefits: ["While mounted on a willing, non-incapacitated creature, gain advantage on melee attacks against unmounted creatures smaller than the mount.", "Force an attack targeting your mount to target you instead.", "If the mount makes a Dexterity save for half damage, it takes no damage on a success and half on a failure."],
  },
  observant: {
    summary: "Improve mental acuity, lip-reading, and passive awareness.",
    benefits: ["Increase Intelligence or Wisdom by 1, to a maximum of 20.", "Read a visible creature's lips when it speaks a language you understand.", "Gain +5 to passive Perception and passive Investigation."],
  },
  "polearm-master": {
    summary: "Gain a haft strike and punish creatures entering your polearm's reach.",
    benefits: ["After attacking only with a glaive, halberd, quarterstaff, or spear, make a bonus-action attack with the opposite end for 1d4 bludgeoning damage.", "While wielding one of those weapons, creatures provoke an opportunity attack when they enter its reach."],
  },
  resilient: {
    summary: "Improve one ability and become proficient in its saving throws.",
    benefits: ["Choose one ability and increase it by 1, to a maximum of 20.", "Gain proficiency in saving throws using that ability."],
  },
  "ritual-caster": {
    summary: "Build a ritual book from one class's spell list.",
    benefits: ["Choose bard, cleric, druid, sorcerer, warlock, or wizard and gain a ritual book with two 1st-level ritual spells from that class.", "Cast spells in the book only as rituals, using Intelligence for wizard or Wisdom for the other lists.", "Copy additional written ritual spells from the chosen list when their level is no more than half your character level, paying 2 hours and 50 gp per spell level."],
  },
  "savage-attacker": {
    summary: "Reroll a melee weapon's damage dice once per turn.",
    benefits: ["Once per turn when you roll melee weapon damage, roll the weapon's damage dice a second time and use either total."],
  },
  sentinel: {
    summary: "Lock down enemies and retaliate when they attack your allies.",
    benefits: ["A creature's speed becomes 0 for the rest of the turn when your opportunity attack hits it.", "Creatures provoke your opportunity attacks even after taking Disengage.", "When a creature within 5 feet attacks someone other than you, use your reaction to make a melee weapon attack against the attacker."],
  },
  sharpshooter: {
    summary: "Ignore common ranged penalties and trade accuracy for damage.",
    benefits: ["Attacking at long range does not impose disadvantage.", "Ranged weapon attacks ignore half and three-quarters cover.", "Before attacking with a ranged weapon you are proficient with, take −5 to the attack roll to add +10 damage on a hit."],
  },
  "shield-master": {
    summary: "Turn a shield into an offensive and defensive specialty.",
    benefits: ["When you take the Attack action, use a bonus action to shove a creature within 5 feet using the shield.", "Add the shield's AC bonus to Dexterity saves against effects that target only you.", "When a Dexterity save would deal half damage on success, use your reaction after succeeding to take no damage while wielding the shield."],
  },
  skilled: {
    summary: "Gain three new skill or tool proficiencies.",
    benefits: ["Choose any combination of three skills or tools and gain proficiency with each."],
  },
  skulker: {
    summary: "Hide and attack from dim conditions without giving yourself away as easily.",
    benefits: ["You may try to hide when only lightly obscured.", "Missing with a ranged weapon attack does not reveal your position.", "Dim light does not impose disadvantage on Perception checks that rely on sight."],
  },
  "spell-sniper": {
    summary: "Extend spell attacks, bypass cover, and learn an attack cantrip.",
    benefits: ["Double the range of spells that require attack rolls.", "Your ranged spell attacks ignore half and three-quarters cover.", "Learn one attack-roll cantrip from bard, cleric, druid, sorcerer, warlock, or wizard, using that class's spellcasting ability."],
  },
  "tavern-brawler": {
    summary: "Fight effectively with improvised weapons and flow into grapples.",
    benefits: ["Increase Strength or Constitution by 1, to a maximum of 20.", "Gain proficiency with improvised weapons and unarmed strikes.", "Your unarmed strike uses a d4 for damage.", "After hitting with an unarmed strike or improvised weapon, attempt a grapple as a bonus action."],
  },
  tough: {
    summary: "Gain 2 additional maximum HP for every character level.",
    benefits: ["Maximum HP increases by twice your current level when selected.", "Maximum HP increases by 2 again whenever you gain a level."],
  },
  "war-caster": {
    summary: "Maintain concentration and cast effectively with occupied hands.",
    benefits: ["Gain advantage on Constitution saves to maintain concentration after taking damage.", "Perform somatic components even when weapons or a shield occupy your hands.", "When movement provokes an opportunity attack, use your reaction to cast a 1-action spell that targets only that creature instead."],
  },
  "weapon-master": {
    summary: "Improve Strength or Dexterity and learn four weapon proficiencies.",
    benefits: ["Increase Strength or Dexterity by 1, to a maximum of 20.", "Choose four simple or martial weapon types and gain proficiency with each."],
  },
};
