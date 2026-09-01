import { ABILITIES, abilityModifier, proficiencyBonus, totalCharacterLevel } from "./rules.js";
import { collectCharacterEffects, effectRegistry } from "./effects.js";

export const CLASS_SAVE_PROFICIENCIES = {
  artificer: ["constitution", "intelligence"],
  barbarian: ["strength", "constitution"],
  bard: ["dexterity", "charisma"],
  cleric: ["wisdom", "charisma"],
  druid: ["intelligence", "wisdom"],
  fighter: ["strength", "constitution"],
  monk: ["strength", "dexterity"],
  paladin: ["wisdom", "charisma"],
  ranger: ["strength", "dexterity"],
  rogue: ["dexterity", "intelligence"],
  sorcerer: ["constitution", "charisma"],
  warlock: ["wisdom", "charisma"],
  wizard: ["intelligence", "wisdom"],
};

function canonicalAbility(value) {
  const ability = String(value || "").toLowerCase();
  return ABILITIES.includes(ability) ? ability : null;
}

export function startingSavingThrows(classId) {
  return [...(CLASS_SAVE_PROFICIENCIES[classId] || [])];
}

export function savingThrowProficiencies(character) {
  const explicit = (character.saves || []).map(canonicalAbility).filter(Boolean);
  const startingClass = character.classLevels?.[0]?.classId;
  const base = explicit.length ? explicit : startingSavingThrows(startingClass);
  const effectGranted = effectRegistry(collectCharacterEffects(character), "proficiency")
    .filter((effect) => effect.target.startsWith("save."))
    .map((effect) => canonicalAbility(effect.target.slice(5)))
    .filter(Boolean);
  return [...new Set([...base, ...effectGranted])];
}

export function savingThrowBonus(character, ability) {
  const canonical = canonicalAbility(ability);
  if (!canonical) return 0;
  const proficient = savingThrowProficiencies(character).includes(canonical);
  const modifier = abilityModifier(character.abilities?.[canonical] ?? 10);
  const proficiency = proficient ? proficiencyBonus(totalCharacterLevel(character.classLevels)) : 0;
  const adjustment = Number(character.savingThrowBonuses?.[canonical] || 0);
  return modifier + proficiency + adjustment;
}

export function characterSavingThrows(character) {
  const proficient = new Set(savingThrowProficiencies(character));
  return ABILITIES.map((ability) => ({
    ability,
    bonus: savingThrowBonus(character, ability),
    proficient: proficient.has(ability),
  }));
}
