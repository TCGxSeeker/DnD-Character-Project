export const SUBCLASS_RULES = {
  artificer: {
    level: 3,
    label: "Artificer specialist",
    options: [
      { id: "alchemist", name: "Alchemist", source: "Eberron / Tasha's" },
      { id: "armorer", name: "Armorer", source: "Tasha's" },
      { id: "artillerist", name: "Artillerist", source: "Eberron / Tasha's" },
      { id: "battle-smith", name: "Battle Smith", source: "Eberron / Tasha's", companionType: "steel-defender" },
    ],
  },
  barbarian: { level: 3, label: "Primal path", options: [{ id: "berserker", name: "Path of the Berserker" }, { id: "totem-warrior", name: "Path of the Totem Warrior" }] },
  bard: { level: 3, label: "Bard college", options: [{ id: "lore", name: "College of Lore" }, { id: "valor", name: "College of Valor" }] },
  cleric: { level: 1, label: "Divine domain", options: [{ id: "knowledge", name: "Knowledge Domain" }, { id: "life", name: "Life Domain" }, { id: "light", name: "Light Domain" }, { id: "nature", name: "Nature Domain" }, { id: "tempest", name: "Tempest Domain" }, { id: "trickery", name: "Trickery Domain" }, { id: "war", name: "War Domain" }] },
  druid: { level: 2, label: "Druid circle", options: [{ id: "land", name: "Circle of the Land" }, { id: "moon", name: "Circle of the Moon" }] },
  fighter: { level: 3, label: "Martial archetype", options: [{ id: "battle-master", name: "Battle Master" }, { id: "champion", name: "Champion" }, { id: "eldritch-knight", name: "Eldritch Knight", casterOverride: "third" }] },
  monk: { level: 3, label: "Monastic tradition", options: [{ id: "four-elements", name: "Way of the Four Elements" }, { id: "open-hand", name: "Way of the Open Hand" }, { id: "shadow", name: "Way of Shadow" }] },
  paladin: { level: 3, label: "Sacred oath", options: [{ id: "ancients", name: "Oath of the Ancients" }, { id: "devotion", name: "Oath of Devotion" }, { id: "vengeance", name: "Oath of Vengeance" }] },
  ranger: { level: 3, label: "Ranger archetype", options: [{ id: "beast-master", name: "Beast Master" }, { id: "hunter", name: "Hunter" }] },
  rogue: { level: 3, label: "Roguish archetype", options: [{ id: "arcane-trickster", name: "Arcane Trickster", casterOverride: "third" }, { id: "assassin", name: "Assassin" }, { id: "thief", name: "Thief" }] },
  sorcerer: { level: 1, label: "Sorcerous origin", options: [{ id: "draconic-bloodline", name: "Draconic Bloodline" }, { id: "wild-magic", name: "Wild Magic" }] },
  warlock: { level: 1, label: "Otherworldly patron", options: [{ id: "archfey", name: "The Archfey" }, { id: "fiend", name: "The Fiend" }, { id: "great-old-one", name: "The Great Old One" }] },
  wizard: { level: 2, label: "Arcane tradition", options: [{ id: "abjuration", name: "School of Abjuration" }, { id: "conjuration", name: "School of Conjuration" }, { id: "divination", name: "School of Divination" }, { id: "enchantment", name: "School of Enchantment" }, { id: "evocation", name: "School of Evocation" }, { id: "illusion", name: "School of Illusion" }, { id: "necromancy", name: "School of Necromancy" }, { id: "transmutation", name: "School of Transmutation" }] },
};

export const ABILITY_SCORE_LEVELS = {
  artificer: [4, 8, 12, 16, 19],
  barbarian: [4, 8, 12, 16, 19],
  bard: [4, 8, 12, 16, 19],
  cleric: [4, 8, 12, 16, 19],
  druid: [4, 8, 12, 16, 19],
  fighter: [4, 6, 8, 12, 14, 16, 19],
  monk: [4, 8, 12, 16, 19],
  paladin: [4, 8, 12, 16, 19],
  ranger: [4, 8, 12, 16, 19],
  rogue: [4, 8, 10, 12, 16, 19],
  sorcerer: [4, 8, 12, 16, 19],
  warlock: [4, 8, 12, 16, 19],
  wizard: [4, 8, 12, 16, 19],
};

export function subclassChoiceForLevel(character, classId) {
  const rule = SUBCLASS_RULES[classId];
  if (!rule) return null;
  const current = character.classLevels.find((entry) => entry.classId === classId);
  if (current?.subclass || current?.subclassId) return null;
  const nextClassLevel = Number(current?.level || 0) + 1;
  return nextClassLevel >= rule.level ? { ...rule, classId, nextClassLevel } : null;
}

export function findSubclassOption(classId, subclassId) {
  return SUBCLASS_RULES[classId]?.options.find((option) => option.id === subclassId) || null;
}

function hasRecordedAbilityChoice(character, classId, classLevel) {
  const ids = [`asi-${classId}-${classLevel}`];
  return (character.features || []).some((feature) => ids.includes(feature.id)
    || (feature.id?.startsWith("feat-") && feature.classId === classId && feature.classLevel === classLevel));
}

function hasManagedCurrentLevel(character, classId, classLevel) {
  const className = classId[0].toUpperCase() + classId.slice(1);
  return (character.history || []).some((event) => event.type === "level-up"
    && (event.classId === classId || String(event.detail || "").startsWith(className))
    && (event.classLevel === classLevel || String(event.title || "").endsWith(`level ${classLevel}`)));
}

export function abilityScoreChoiceForLevel(character, classId) {
  const current = character.classLevels.find((entry) => entry.classId === classId);
  const currentClassLevel = Number(current?.level || 0);
  const nextClassLevel = currentClassLevel + 1;
  const levels = ABILITY_SCORE_LEVELS[classId] || [];
  if (levels.includes(nextClassLevel)) return { classId, classLevel: nextClassLevel, repair: false };
  if (levels.includes(currentClassLevel)
    && hasManagedCurrentLevel(character, classId, currentClassLevel)
    && !hasRecordedAbilityChoice(character, classId, currentClassLevel)) {
    return { classId, classLevel: currentClassLevel, repair: true };
  }
  return null;
}
