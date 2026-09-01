import { abilityModifier } from "./rules.js";

const BARD_SPELLS_KNOWN = [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22];
const SORCERER_SPELLS_KNOWN = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15];
const WARLOCK_SPELLS_KNOWN = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];
const RANGER_SPELLS_KNOWN = [0, 0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11];

function stepped(level, steps) {
  return steps.reduce((value, [minimum, amount]) => level >= minimum ? amount : value, 0);
}

function cantripsForClass(classId, level) {
  if (classId === "artificer") return stepped(level, [[1, 2], [10, 3], [14, 4]]);
  if (["bard", "cleric", "druid", "warlock"].includes(classId)) return stepped(level, [[1, 2], [4, 3], [10, 4]]);
  if (classId === "sorcerer") return stepped(level, [[1, 4], [4, 5], [10, 6]]);
  if (classId === "wizard") return stepped(level, [[1, 3], [4, 4], [10, 5]]);
  return 0;
}

function classSpellCapacity(classId, level, abilities) {
  const ability = {
    artificer: "intelligence", cleric: "wisdom", druid: "wisdom", paladin: "charisma", wizard: "intelligence",
  }[classId];
  const modifier = ability ? abilityModifier(abilities?.[ability] ?? 10) : 0;
  if (classId === "artificer") return { limit: Math.max(1, modifier + Math.floor(level / 2)), mode: "prepared" };
  if (["cleric", "druid", "wizard"].includes(classId)) return { limit: Math.max(1, modifier + level), mode: "prepared" };
  if (classId === "paladin") return { limit: level < 2 ? 0 : Math.max(1, modifier + Math.floor(level / 2)), mode: "prepared" };
  if (classId === "bard") return { limit: BARD_SPELLS_KNOWN[level] || 0, mode: "known" };
  if (classId === "sorcerer") return { limit: SORCERER_SPELLS_KNOWN[level] || 0, mode: "known" };
  if (classId === "warlock") return { limit: WARLOCK_SPELLS_KNOWN[level] || 0, mode: "known" };
  if (classId === "ranger") return { limit: RANGER_SPELLS_KNOWN[level] || 0, mode: "known" };
  return { limit: 0, mode: "known/prepared" };
}

export function spellCapacity(character) {
  const parts = (character.classLevels || []).map(({ classId, level }) => ({
    classId,
    classLevel: Number(level || 0),
    ...classSpellCapacity(classId, Number(level || 0), character.abilities),
    cantrips: cantripsForClass(classId, Number(level || 0)),
  }));
  const modes = new Set(parts.filter((part) => part.limit > 0).map((part) => part.mode));
  return {
    leveledLimit: parts.reduce((sum, part) => sum + part.limit, 0),
    cantripLimit: parts.reduce((sum, part) => sum + part.cantrips, 0),
    mode: modes.size === 1 ? [...modes][0] : "known/prepared",
    classes: parts.filter((part) => part.limit > 0 || part.cantrips > 0),
  };
}

export function spellUsageByClass(character, spells = []) {
  const capacity = spellCapacity(character);
  return capacity.classes.map((part) => {
    const owned = spells.filter((spell) => !spell.granted && Number(spell.level) > 0 && (spell.sourceClassId === part.classId || (!spell.sourceClassId && capacity.classes.length === 1)));
    const used = part.mode === "prepared" ? owned.filter((spell) => spell.prepared).length : owned.length;
    return { ...part, used, remaining: Math.max(0, part.limit - used) };
  });
}
