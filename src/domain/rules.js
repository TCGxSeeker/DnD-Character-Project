export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000,
  305000, 355000,
];

export const SPELL_SLOT_TABLE = [
  [],
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1],
  [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

export const CLASS_RULES = {
  artificer: { name: "Artificer", hitDie: 8, caster: "artificer", prerequisites: { intelligence: 13 }, levelOneSlots: [2] },
  barbarian: { name: "Barbarian", hitDie: 12, caster: "none", prerequisites: { strength: 13 } },
  bard: { name: "Bard", hitDie: 8, caster: "full", prerequisites: { charisma: 13 } },
  cleric: { name: "Cleric", hitDie: 8, caster: "full", prerequisites: { wisdom: 13 } },
  druid: { name: "Druid", hitDie: 8, caster: "full", prerequisites: { wisdom: 13 } },
  fighter: { name: "Fighter", hitDie: 10, caster: "none", prerequisites: { strengthOrDexterity: 13 } },
  monk: { name: "Monk", hitDie: 8, caster: "none", prerequisites: { dexterity: 13, wisdom: 13 } },
  paladin: { name: "Paladin", hitDie: 10, caster: "half", prerequisites: { strength: 13, charisma: 13 } },
  ranger: { name: "Ranger", hitDie: 10, caster: "half", prerequisites: { dexterity: 13, wisdom: 13 } },
  rogue: { name: "Rogue", hitDie: 8, caster: "none", prerequisites: { dexterity: 13 } },
  sorcerer: { name: "Sorcerer", hitDie: 6, caster: "full", prerequisites: { charisma: 13 } },
  warlock: { name: "Warlock", hitDie: 8, caster: "pact", prerequisites: { charisma: 13 } },
  wizard: { name: "Wizard", hitDie: 6, caster: "full", prerequisites: { intelligence: 13 } },
};

export const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];

export function abilityModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}

export function proficiencyBonus(totalLevel) {
  return 1 + Math.ceil(Math.max(1, Number(totalLevel)) / 4);
}

export function levelFromExperience(experience) {
  const xp = Math.max(0, Number(experience) || 0);
  let level = 1;
  XP_THRESHOLDS.forEach((threshold, index) => {
    if (xp >= threshold) level = index + 1;
  });
  return level;
}

export function xpToNextLevel(experience) {
  const currentLevel = levelFromExperience(experience);
  if (currentLevel >= 20) return 0;
  return XP_THRESHOLDS[currentLevel] - Number(experience);
}

export function averageHitDie(hitDie) {
  return Math.floor(Number(hitDie) / 2) + 1;
}

export function totalCharacterLevel(classLevels = []) {
  return classLevels.reduce((sum, entry) => sum + Number(entry.level || 0), 0);
}

export function calculateMaxHp(levelHistory = [], constitutionScore = 10) {
  const con = abilityModifier(constitutionScore);
  return levelHistory.reduce((sum, entry) => sum + Number(entry.baseHp || 0) + con, 0);
}

export function hpAfterConstitutionChange(currentMaxHp, oldScore, newScore, totalLevel) {
  const delta = abilityModifier(newScore) - abilityModifier(oldScore);
  return Number(currentMaxHp) + delta * Number(totalLevel);
}

export function multiclassCasterLevel(classLevels = []) {
  let full = 0;
  let half = 0;
  let third = 0;
  let artificer = 0;
  classLevels.forEach(({ classId, level, casterOverride }) => {
    const caster = casterOverride || CLASS_RULES[classId]?.caster || "none";
    const amount = Number(level || 0);
    if (caster === "full") full += amount;
    // Paladins and rangers do not have Spellcasting at class level 1, and
    // third-caster subclasses do not have it before class level 3.
    if (caster === "half" && amount >= 2) half += amount;
    if (caster === "third" && amount >= 3) third += amount;
    if (caster === "artificer") artificer += amount;
  });
  return Math.min(20, full + Math.floor(half / 2) + Math.floor(third / 3) + Math.ceil(artificer / 2));
}

export function multiclassSpellSlots(classLevels = []) {
  return [...(SPELL_SLOT_TABLE[multiclassCasterLevel(classLevels)] || [])];
}

function meetsRule(scores, key, required) {
  if (key === "strengthOrDexterity") {
    return Math.max(Number(scores.strength), Number(scores.dexterity)) >= required;
  }
  return Number(scores[key]) >= required;
}

export function validateMulticlassPrerequisites(scores, currentClassIds, targetClassId) {
  const classIds = [...new Set([...(currentClassIds || []), targetClassId])];
  const failures = [];
  classIds.forEach((classId) => {
    const rule = CLASS_RULES[classId];
    if (!rule) return;
    Object.entries(rule.prerequisites).forEach(([ability, required]) => {
      if (!meetsRule(scores, ability, required)) {
        failures.push({ classId, ability, required });
      }
    });
  });
  return { valid: failures.length === 0, failures };
}

export function formatModifier(value) {
  const number = Number(value);
  return number >= 0 ? `+${number}` : String(number);
}
