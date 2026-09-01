import { abilityModifier, proficiencyBonus, totalCharacterLevel } from "./rules.js";
import { CHANGE_CATEGORIES, recordMutation } from "./mutations.js";

export const SKILL_DEFINITIONS = [
  { id: "acrobatics", name: "Acrobatics", ability: "dexterity" },
  { id: "animal-handling", name: "Animal Handling", ability: "wisdom" },
  { id: "arcana", name: "Arcana", ability: "intelligence" },
  { id: "athletics", name: "Athletics", ability: "strength" },
  { id: "deception", name: "Deception", ability: "charisma" },
  { id: "history", name: "History", ability: "intelligence" },
  { id: "insight", name: "Insight", ability: "wisdom" },
  { id: "intimidation", name: "Intimidation", ability: "charisma" },
  { id: "investigation", name: "Investigation", ability: "intelligence" },
  { id: "medicine", name: "Medicine", ability: "wisdom" },
  { id: "nature", name: "Nature", ability: "intelligence" },
  { id: "perception", name: "Perception", ability: "wisdom" },
  { id: "performance", name: "Performance", ability: "charisma" },
  { id: "persuasion", name: "Persuasion", ability: "charisma" },
  { id: "religion", name: "Religion", ability: "intelligence" },
  { id: "sleight-of-hand", name: "Sleight of Hand", ability: "dexterity" },
  { id: "stealth", name: "Stealth", ability: "dexterity" },
  { id: "survival", name: "Survival", ability: "wisdom" },
];

const skillByName = new Map(SKILL_DEFINITIONS.map((skill) => [skill.name.toLowerCase(), skill]));

export function findSkill(skillName) {
  return skillByName.get(String(skillName || "").toLowerCase()) || null;
}

export function normalizedSkillNames(skillNames = []) {
  const selected = new Set(skillNames.map((name) => String(name).toLowerCase()));
  return SKILL_DEFINITIONS.filter((skill) => selected.has(skill.name.toLowerCase())).map((skill) => skill.name);
}

export function skillProficiencyLevel(character, skillName) {
  const name = String(skillName).toLowerCase();
  const expertise = [...(character.expertise || []), ...(character.skillExpertise || [])].some((entry) => String(entry).toLowerCase() === name);
  if (expertise) return 2;
  return (character.skills || []).some((entry) => String(entry).toLowerCase() === name) ? 1 : 0;
}

export function skillBonus(character, skillName) {
  const skill = findSkill(skillName);
  if (!skill) throw new Error(`Unknown skill: ${skillName}`);
  const level = totalCharacterLevel(character.classLevels);
  const adjustment = Number(character.skillBonuses?.[skill.id] || 0);
  return abilityModifier(character.abilities[skill.ability]) + (skillProficiencyLevel(character, skill.name) * proficiencyBonus(level)) + adjustment;
}

export function characterSkillRows(character) {
  return SKILL_DEFINITIONS.map((skill) => ({
    ...skill,
    proficiency: skillProficiencyLevel(character, skill.name),
    bonus: skillBonus(character, skill.name),
  }));
}

export function setSkillProficiencies(character, skillNames) {
  const skills = normalizedSkillNames(skillNames);
  const selected = new Set(skills.map((name) => name.toLowerCase()));
  const expertise = (character.expertise || []).filter((name) => selected.has(String(name).toLowerCase()));
  const skillExpertise = (character.skillExpertise || []).filter((name) => selected.has(String(name).toLowerCase()));
  const before = { skills: character.skills || [], expertise: character.expertise || [], skillExpertise: character.skillExpertise || [] };
  const after = { skills, expertise, skillExpertise };
  const beforeSet = new Set(before.skills.map((entry) => String(entry).toLowerCase()));
  const afterSet = new Set(skills.map((entry) => String(entry).toLowerCase()));
  const changed = [...skills.filter((entry) => !beforeSet.has(entry.toLowerCase())).map((entry) => `Added ${entry}`), ...before.skills.filter((entry) => !afterSet.has(String(entry).toLowerCase())).map((entry) => `Removed ${entry}`)];
  return recordMutation(character, { title: "Skill proficiencies changed", category: CHANGE_CATEGORIES.PROFICIENCY, before, after, changes: { proficienciesChanged: changed } }, (current) => ({ ...current, ...after }));
}
