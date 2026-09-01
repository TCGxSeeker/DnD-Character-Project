import { abilityModifier, formatModifier, proficiencyBonus, totalCharacterLevel } from "./rules.js";

export function classLevel(character, classId) {
  return Number(character.classLevels.find((entry) => entry.classId === classId)?.level || 0);
}

export function createSubclassCompanion(character, option, name) {
  if (option?.companionType !== "steel-defender") return null;
  const companion = {
    id: "steel-defender",
    type: "steel-defender",
    origin: "class-feature",
    source: "Battle Smith 3",
    name: name.trim(),
    present: true,
    collapsed: false,
    repairUsesRemaining: 3,
  };
  return { ...companion, currentHp: deriveCompanionStats(character, companion).maxHp };
}

export function createSpellCompanion({ id, name, spellId, spellName, statBlock, duration = "Concentration or spell duration" }) {
  if (!id || !name || !spellId || !statBlock) throw new Error("Spell companions require an id, name, spell, and stat block.");
  return {
    id,
    type: statBlock.type || "summoned-creature",
    origin: "spell",
    source: spellName,
    sourceSpellId: spellId,
    duration,
    name: name.trim(),
    present: true,
    collapsed: false,
    dismissible: true,
    statBlock: structuredClone(statBlock),
    currentHp: Number(statBlock.maxHp),
  };
}

export function createFamiliar(character, spell, form, name) {
  const sourceSpellId = spell.canonicalId || spell.id || "find-familiar";
  return createSpellCompanion({
    id: `familiar-${character.id}`,
    name: String(name || form.name).trim(),
    spellId: sourceSpellId,
    spellName: "Find Familiar",
    statBlock: form,
    duration: "Persistent until dismissed or reduced to 0 HP",
  });
}

export function createSteed(character, spell, form, name) {
  const sourceSpellId = spell.canonicalId || spell.id || "find-steed";
  return createSpellCompanion({
    id: `steed-${character.id}`,
    name: String(name || form.name).trim(),
    spellId: sourceSpellId,
    spellName: "Find Steed",
    statBlock: form,
    duration: "Persistent until dismissed or reduced to 0 HP",
  });
}

export function patchCompanion(character, companionId, patch) {
  return {
    ...character,
    companions: (character.companions || []).map((companion) => companion.id === companionId ? { ...companion, ...patch } : companion),
  };
}

export function deriveCompanionStats(character, companion) {
  if (companion.type !== "steel-defender") {
    if (!companion.statBlock) throw new Error(`Unsupported companion type: ${companion.type}`);
    return structuredClone(companion.statBlock);
  }
  const artificerLevel = classLevel(character, "artificer");
  const totalLevel = totalCharacterLevel(character.classLevels);
  const pb = proficiencyBonus(totalLevel);
  const intelligence = abilityModifier(character.abilities.intelligence);
  const improved = artificerLevel >= 15;
  return {
    armorClass: 15 + (improved ? 2 : 0),
    maxHp: 2 + intelligence + (5 * artificerLevel),
    hitDice: `${artificerLevel}d8`,
    speed: 40,
    proficiencyBonus: pb,
    abilities: { strength: 14, dexterity: 12, constitution: 14, intelligence: 4, wisdom: 10, charisma: 6 },
    savingThrows: { dexterity: 1 + pb, constitution: 2 + pb },
    skills: { athletics: 2 + pb, perception: 2 * pb },
    passivePerception: 10 + (2 * pb),
    rendAttack: formatModifier(pb + intelligence),
    rendDamage: `1d8 + ${pb} force`,
    repairHealing: `2d8 + ${pb}`,
    improved,
  };
}
