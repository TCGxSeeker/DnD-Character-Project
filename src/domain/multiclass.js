import { CLASS_CREATION_CHOICES_2014 } from "../data/classChoices2014.js";
import { MULTICLASS_PROFICIENCIES_2014, MUSICAL_INSTRUMENTS_2014 } from "../data/multiclass2014.js";
import { CLASS_RULES } from "./rules.js";

function unique(values = []) { return [...new Set(values.filter(Boolean))]; }

export function isNewClass(character, classId) {
  return !(character.classLevels || []).some((entry) => entry.classId === classId);
}

export function multiclassChoices(character, classId) {
  if (!isNewClass(character, classId) || !(character.classLevels || []).length) return [];
  const grants = MULTICLASS_PROFICIENCIES_2014[classId] || {};
  const choices = [];
  if (grants.skillChoices) {
    const available = grants.skillFromClass ? CLASS_CREATION_CHOICES_2014[classId]?.skills.options || [] : Object.values(CLASS_CREATION_CHOICES_2014).flatMap((entry) => entry.skills.options);
    choices.push({ id: `multiclass-${classId}-skills`, label: "Multiclass skill proficiency", kind: "skill", count: grants.skillChoices, options: unique(available).filter((skill) => !(character.skills || []).includes(skill)) });
  }
  if (grants.instrumentChoices) choices.push({ id: `multiclass-${classId}-instruments`, label: "Musical instrument proficiency", kind: "instrument", count: grants.instrumentChoices, options: MUSICAL_INSTRUMENTS_2014 });
  return choices;
}

export function applyMulticlassProficiencies(character, classId, selections = {}) {
  if (!isNewClass(character, classId) || !(character.classLevels || []).length) return { proficiencies: character.proficiencies || {}, skills: character.skills || [], choices: [] };
  const grants = MULTICLASS_PROFICIENCIES_2014[classId] || {};
  const resolved = multiclassChoices(character, classId).map((choice) => {
    const selected = unique(selections[choice.id] || []);
    if (selected.length !== choice.count || selected.some((entry) => !choice.options.includes(entry))) {
      const error = new Error(`Choose ${choice.count} option for ${choice.label}.`); error.code = "MULTICLASS_CHOICE_REQUIRED"; throw error;
    }
    return { ...choice, selections: selected, options: undefined };
  });
  const skillSelections = resolved.filter((choice) => choice.kind === "skill").flatMap((choice) => choice.selections);
  const instrumentSelections = resolved.filter((choice) => choice.kind === "instrument").flatMap((choice) => choice.selections);
  return {
    skills: unique([...(character.skills || []), ...skillSelections]),
    proficiencies: {
      ...(character.proficiencies || {}),
      armor: unique([...(character.proficiencies?.armor || []), ...(grants.armor || [])]),
      weapons: unique([...(character.proficiencies?.weapons || []), ...(grants.weapons || [])]),
      tools: unique([...(character.proficiencies?.tools || []), ...(grants.tools || []), ...instrumentSelections]),
    },
    choices: resolved,
  };
}

export function hitDicePools(classLevels = [], spent = {}) {
  const maximums = classLevels.reduce((pools, entry) => {
    const die = `d${CLASS_RULES[entry.classId]?.hitDie || 8}`;
    pools[die] = (pools[die] || 0) + Number(entry.level || 0);
    return pools;
  }, {});
  return Object.fromEntries(Object.entries(maximums).map(([die, max]) => [die, { max, current: Math.max(0, max - Number(spent[die] || 0)) }]));
}

export function syncHitDicePools(existing = {}, classLevels = []) {
  const spent = Object.fromEntries(Object.entries(existing).map(([die, pool]) => [die, Math.max(0, Number(pool.max || 0) - Number(pool.current || 0))]));
  return hitDicePools(classLevels, spent);
}

export function legacyHitDicePools(classLevels = [], remaining) {
  const pools = hitDicePools(classLevels);
  let spent = Math.max(0, Object.values(pools).reduce((sum, pool) => sum + pool.max, 0) - Number(remaining ?? 0));
  return Object.fromEntries(Object.entries(pools).map(([die, pool]) => {
    const spentHere = Math.min(pool.max, spent);
    spent -= spentHere;
    return [die, { ...pool, current: pool.max - spentHere }];
  }));
}

export function effectiveExtraAttacks(character) {
  const fighter = Number(character.classLevels?.find((entry) => entry.classId === "fighter")?.level || 0);
  if (fighter >= 20) return 4;
  if (fighter >= 11) return 3;
  const qualifying = (character.classLevels || []).some((entry) => ["barbarian", "fighter", "monk", "paladin", "ranger"].includes(entry.classId) && Number(entry.level) >= 5)
    || (character.classLevels || []).some((entry) => entry.classId === "artificer" && entry.subclassId === "battle-smith" && Number(entry.level) >= 5);
  return qualifying ? 2 : 1;
}

export function firstUnarmoredDefense(character) {
  const acquired = (character.levelHistory || []).filter((entry) => ["barbarian", "monk"].includes(entry.classId)).sort((a, b) => Number(a.level) - Number(b.level))[0];
  if (acquired?.classId) return acquired.classId;
  return character.classLevels?.find((entry) => ["barbarian", "monk"].includes(entry.classId))?.classId || null;
}
