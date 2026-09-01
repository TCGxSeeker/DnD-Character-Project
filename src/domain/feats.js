import { ABILITIES, CLASS_RULES } from "./rules.js";
import { FEAT_RULES_2014 } from "./featRules2014.js";

const feat = (id, name, details = {}) => ({ id, name, source: "Player's Handbook (2014)", ...FEAT_RULES_2014[id], ...details });

export const FEATS_2014 = [
  feat("actor", "Actor", { abilityChoices: ["charisma"] }),
  feat("alert", "Alert"),
  feat("athlete", "Athlete", { abilityChoices: ["strength", "dexterity"] }),
  feat("charger", "Charger"),
  feat("crossbow-expert", "Crossbow Expert"),
  feat("defensive-duelist", "Defensive Duelist", { prerequisite: "Dexterity 13+", minimumAbilities: { dexterity: 13 } }),
  feat("dual-wielder", "Dual Wielder"),
  feat("dungeon-delver", "Dungeon Delver"),
  feat("durable", "Durable", { abilityChoices: ["constitution"] }),
  feat("elemental-adept", "Elemental Adept", { prerequisite: "Spellcasting", requiresSpellcasting: true }),
  feat("grappler", "Grappler", { source: "SRD 5.1 (2014)", prerequisite: "Strength 13+", minimumAbilities: { strength: 13 } }),
  feat("great-weapon-master", "Great Weapon Master"),
  feat("healer", "Healer"),
  feat("heavily-armored", "Heavily Armored", { prerequisite: "Medium armor proficiency", abilityChoices: ["strength"], requiresReview: true }),
  feat("heavy-armor-master", "Heavy Armor Master", { prerequisite: "Heavy armor proficiency", abilityChoices: ["strength"], requiresReview: true }),
  feat("inspiring-leader", "Inspiring Leader", { prerequisite: "Charisma 13+", minimumAbilities: { charisma: 13 } }),
  feat("keen-mind", "Keen Mind", { abilityChoices: ["intelligence"] }),
  feat("lightly-armored", "Lightly Armored", { abilityChoices: ["strength", "dexterity"] }),
  feat("linguist", "Linguist", { abilityChoices: ["intelligence"] }),
  feat("lucky", "Lucky"),
  feat("mage-slayer", "Mage Slayer"),
  feat("magic-initiate", "Magic Initiate"),
  feat("martial-adept", "Martial Adept"),
  feat("medium-armor-master", "Medium Armor Master", { prerequisite: "Medium armor proficiency", requiresReview: true }),
  feat("mobile", "Mobile"),
  feat("moderately-armored", "Moderately Armored", { prerequisite: "Light armor proficiency", abilityChoices: ["strength", "dexterity"], requiresReview: true }),
  feat("mounted-combatant", "Mounted Combatant"),
  feat("observant", "Observant", { abilityChoices: ["intelligence", "wisdom"] }),
  feat("polearm-master", "Polearm Master"),
  feat("resilient", "Resilient", { abilityChoices: ABILITIES }),
  feat("ritual-caster", "Ritual Caster", { prerequisite: "Intelligence or Wisdom 13+", anyMinimumAbility: { abilities: ["intelligence", "wisdom"], score: 13 } }),
  feat("savage-attacker", "Savage Attacker"),
  feat("sentinel", "Sentinel"),
  feat("sharpshooter", "Sharpshooter"),
  feat("shield-master", "Shield Master"),
  feat("skilled", "Skilled"),
  feat("skulker", "Skulker", { prerequisite: "Dexterity 13+", minimumAbilities: { dexterity: 13 } }),
  feat("spell-sniper", "Spell Sniper", { prerequisite: "Spellcasting", requiresSpellcasting: true }),
  feat("tavern-brawler", "Tavern Brawler", { abilityChoices: ["strength", "constitution"] }),
  feat("tough", "Tough"),
  feat("war-caster", "War Caster", { prerequisite: "Spellcasting", requiresSpellcasting: true }),
  feat("weapon-master", "Weapon Master", { abilityChoices: ["strength", "dexterity"] }),
];

export function findFeat(featId) {
  return FEATS_2014.find((entry) => entry.id === featId) || null;
}

export function characterCanCastSpells(character) {
  return character.classLevels.some(({ classId }) => !["none", undefined].includes(CLASS_RULES[classId]?.caster));
}

export function featEligibility(character, candidate) {
  const reasons = [];
  const alreadySelected = (character.features || []).some((feature) => feature.id === `feat-${candidate.id}`);
  if (alreadySelected && !candidate.repeatable) reasons.push("Already selected");
  Object.entries(candidate.minimumAbilities || {}).forEach(([ability, minimum]) => {
    if (Number(character.abilities[ability]) < minimum) reasons.push(`${ability} ${minimum}+ required`);
  });
  if (candidate.anyMinimumAbility) {
    const met = candidate.anyMinimumAbility.abilities.some((ability) => Number(character.abilities[ability]) >= candidate.anyMinimumAbility.score);
    if (!met) reasons.push(candidate.prerequisite);
  }
  if (candidate.requiresSpellcasting && !characterCanCastSpells(character)) reasons.push("Spellcasting required");
  return { eligible: reasons.length === 0, reasons, requiresReview: Boolean(candidate.requiresReview) };
}

export function availableFeats(character) {
  return FEATS_2014.map((candidate) => ({ ...candidate, eligibility: featEligibility(character, candidate) }));
}
