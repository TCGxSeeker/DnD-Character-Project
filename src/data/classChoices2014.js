const skillChoice = (count, options) => ({ count, options });

export const CLASS_CREATION_CHOICES_2014 = {
  artificer: { skills: skillChoice(2, ["Arcana", "History", "Investigation", "Medicine", "Nature", "Perception", "Sleight of Hand"]), tools: ["Thieves' tools", "Tinker's tools", "One artisan's tool"] },
  barbarian: { skills: skillChoice(2, ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"]) },
  bard: { skills: skillChoice(3, ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"]), instruments: 3 },
  cleric: { skills: skillChoice(2, ["History", "Insight", "Medicine", "Persuasion", "Religion"]) },
  druid: { skills: skillChoice(2, ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"]), tools: ["Herbalism kit"] },
  fighter: { skills: skillChoice(2, ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"]) },
  monk: { skills: skillChoice(2, ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"]), tools: ["One artisan's tool or musical instrument"] },
  paladin: { skills: skillChoice(2, ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"]) },
  ranger: { skills: skillChoice(3, ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"]) },
  rogue: { skills: skillChoice(4, ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"]), tools: ["Thieves' tools"] },
  sorcerer: { skills: skillChoice(2, ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"]) },
  warlock: { skills: skillChoice(2, ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"]) },
  wizard: { skills: skillChoice(2, ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"]) },
};

const choice = (id, level, label, count, options, extra = {}) => ({ id, level, label, count, options, ...extra });

export const CLASS_LEVEL_CHOICES_2014 = {
  barbarian: [],
  bard: [
    choice("bard-expertise-3", 3, "Expertise", 2, [], { kind: "expertise", fromSkills: true }),
    choice("bard-expertise-10", 10, "Additional Expertise", 2, [], { kind: "expertise", fromSkills: true }),
    choice("bard-magical-secrets-10", 10, "Magical Secrets", 2, [], { kind: "spell", openSpellList: true }),
    choice("bard-magical-secrets-14", 14, "Magical Secrets", 2, [], { kind: "spell", openSpellList: true }),
    choice("bard-magical-secrets-18", 18, "Magical Secrets", 2, [], { kind: "spell", openSpellList: true }),
  ],
  cleric: [],
  druid: [],
  fighter: [choice("fighter-style", 1, "Fighting Style", 1, ["Archery", "Defense", "Dueling", "Great Weapon Fighting", "Protection", "Two-Weapon Fighting"])],
  monk: [],
  paladin: [choice("paladin-style", 2, "Fighting Style", 1, ["Defense", "Dueling", "Great Weapon Fighting", "Protection"])],
  ranger: [
    choice("ranger-favored-enemy-1", 1, "Favored Enemy", 1, ["Aberrations", "Beasts", "Celestials", "Constructs", "Dragons", "Elementals", "Fey", "Fiends", "Giants", "Monstrosities", "Oozes", "Plants", "Undead", "Two humanoid peoples"]),
    choice("ranger-natural-explorer-1", 1, "Natural Explorer terrain", 1, ["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp", "Underdark"]),
    choice("ranger-style", 2, "Fighting Style", 1, ["Archery", "Defense", "Dueling", "Two-Weapon Fighting"]),
    choice("ranger-favored-enemy-6", 6, "Additional Favored Enemy", 1, ["Aberrations", "Beasts", "Celestials", "Constructs", "Dragons", "Elementals", "Fey", "Fiends", "Giants", "Monstrosities", "Oozes", "Plants", "Undead", "Two humanoid peoples"], { excludeSelectionsFrom: ["ranger-favored-enemy-1"] }),
    choice("ranger-natural-explorer-6", 6, "Additional favored terrain", 1, ["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp", "Underdark"], { excludeSelectionsFrom: ["ranger-natural-explorer-1"] }),
    choice("ranger-natural-explorer-10", 10, "Additional favored terrain", 1, ["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp", "Underdark"], { excludeSelectionsFrom: ["ranger-natural-explorer-1", "ranger-natural-explorer-6"] }),
    choice("ranger-favored-enemy-14", 14, "Additional Favored Enemy", 1, ["Aberrations", "Beasts", "Celestials", "Constructs", "Dragons", "Elementals", "Fey", "Fiends", "Giants", "Monstrosities", "Oozes", "Plants", "Undead", "Two humanoid peoples"], { excludeSelectionsFrom: ["ranger-favored-enemy-1", "ranger-favored-enemy-6"] }),
  ],
  rogue: [
    choice("rogue-expertise-1", 1, "Expertise", 2, [], { kind: "expertise", fromSkills: true, includeThievesTools: true }),
    choice("rogue-expertise-6", 6, "Additional Expertise", 2, [], { kind: "expertise", fromSkills: true, includeThievesTools: true }),
  ],
  sorcerer: [
    choice("sorcerer-metamagic-3", 3, "Metamagic", 2, ["Careful Spell", "Distant Spell", "Empowered Spell", "Extended Spell", "Heightened Spell", "Quickened Spell", "Subtle Spell", "Twinned Spell"]),
    choice("sorcerer-metamagic-10", 10, "Additional Metamagic", 1, ["Careful Spell", "Distant Spell", "Empowered Spell", "Extended Spell", "Heightened Spell", "Quickened Spell", "Subtle Spell", "Twinned Spell"], { excludeSelectionsFrom: ["sorcerer-metamagic-3"] }),
    choice("sorcerer-metamagic-17", 17, "Additional Metamagic", 1, ["Careful Spell", "Distant Spell", "Empowered Spell", "Extended Spell", "Heightened Spell", "Quickened Spell", "Subtle Spell", "Twinned Spell"], { excludeSelectionsFrom: ["sorcerer-metamagic-3", "sorcerer-metamagic-10"] }),
  ],
  warlock: [
    choice("warlock-invocations-2", 2, "Eldritch Invocations", 2, [], { kind: "invocation", catalogPending: true }),
    choice("warlock-pact-boon", 3, "Pact Boon", 1, ["Pact of the Chain", "Pact of the Blade", "Pact of the Tome"]),
  ],
  wizard: [],
  artificer: [],
};

export function creationChoicesForClass(classId) {
  return CLASS_CREATION_CHOICES_2014[classId] || { skills: skillChoice(0, []) };
}

export function levelChoicesDue(character, classId) {
  const currentLevel = Number(character.classLevels.find((entry) => entry.classId === classId)?.level || 0);
  const nextLevel = currentLevel + 1;
  const resolved = new Set((character.classChoices || []).map((entry) => entry.id));
  return (CLASS_LEVEL_CHOICES_2014[classId] || []).filter((entry) => entry.level <= nextLevel && !resolved.has(entry.id));
}

export function levelOneChoicesForClass(classId) {
  return (CLASS_LEVEL_CHOICES_2014[classId] || []).filter((entry) => entry.level === 1 && !entry.catalogPending && entry.kind !== "spell");
}
