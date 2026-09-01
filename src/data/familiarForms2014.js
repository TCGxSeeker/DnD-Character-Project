const form = (id, name, armorClass, maxHp, speed, abilities, extra = {}) => ({
  id, name, type: "familiar", size: "Tiny", creatureType: "beast", armorClass, maxHp, speed, abilities,
  savesText: "Use the form's ability modifiers", skillsText: extra.skillsText || "None", sensesText: extra.sensesText || "Passive Perception 10",
  defensesText: extra.defensesText || "A familiar cannot attack, but can take other actions normally.",
  actions: extra.actions || [{ name: "Familiar actions", detail: "Cannot attack; can take other actions and can deliver qualifying touch spells." }],
});

export const FAMILIAR_FORMS_2014 = [
  form("bat", "Bat", 12, 1, 5, { strength: 2, dexterity: 15, constitution: 8, intelligence: 2, wisdom: 12, charisma: 4 }, { sensesText: "Blindsight 60 ft. · Passive Perception 11 · Echolocation", skillsText: "Perception +1" }),
  form("cat", "Cat", 12, 2, 40, { strength: 3, dexterity: 15, constitution: 10, intelligence: 3, wisdom: 12, charisma: 7 }, { sensesText: "Passive Perception 13 · Keen Smell", skillsText: "Perception +3 · Stealth +4" }),
  form("crab", "Crab", 11, 2, 20, { strength: 2, dexterity: 11, constitution: 10, intelligence: 1, wisdom: 8, charisma: 2 }, { sensesText: "Blindsight 30 ft. · Passive Perception 9", skillsText: "Stealth +2", defensesText: "Amphibious. A familiar cannot attack." }),
  form("frog", "Frog (Toad)", 11, 1, 20, { strength: 1, dexterity: 13, constitution: 8, intelligence: 1, wisdom: 8, charisma: 3 }, { sensesText: "Darkvision 30 ft. · Passive Perception 11", skillsText: "Perception +1 · Stealth +3", defensesText: "Amphibious · Standing Leap · cannot attack as a familiar" }),
  form("hawk", "Hawk", 13, 1, 10, { strength: 5, dexterity: 16, constitution: 8, intelligence: 2, wisdom: 14, charisma: 6 }, { sensesText: "Passive Perception 14 · Keen Sight", skillsText: "Perception +4" }),
  form("lizard", "Lizard", 10, 2, 20, { strength: 2, dexterity: 11, constitution: 10, intelligence: 1, wisdom: 8, charisma: 3 }, { sensesText: "Darkvision 30 ft. · Passive Perception 9" }),
  form("octopus", "Octopus", 12, 3, 5, { strength: 4, dexterity: 15, constitution: 11, intelligence: 3, wisdom: 10, charisma: 4 }, { sensesText: "Darkvision 30 ft. · Passive Perception 10", skillsText: "Perception +2 · Stealth +4", defensesText: "Hold Breath · Underwater Camouflage · cannot attack as a familiar" }),
  form("owl", "Owl", 11, 1, 5, { strength: 3, dexterity: 13, constitution: 8, intelligence: 2, wisdom: 12, charisma: 7 }, { sensesText: "Darkvision 120 ft. · Passive Perception 13 · Keen Hearing and Sight", skillsText: "Perception +3 · Stealth +3", defensesText: "Flyby · cannot attack as a familiar" }),
  form("poisonous-snake", "Poisonous Snake", 13, 2, 30, { strength: 2, dexterity: 16, constitution: 11, intelligence: 1, wisdom: 10, charisma: 3 }, { sensesText: "Blindsight 10 ft. · Passive Perception 12", skillsText: "Perception +2" }),
  form("quipper", "Quipper", 13, 1, 0, { strength: 2, dexterity: 16, constitution: 9, intelligence: 1, wisdom: 7, charisma: 2 }, { sensesText: "Darkvision 60 ft. · Passive Perception 8", defensesText: "Swim 40 ft. · Water Breathing · cannot attack as a familiar" }),
  form("rat", "Rat", 10, 1, 20, { strength: 2, dexterity: 11, constitution: 9, intelligence: 2, wisdom: 10, charisma: 4 }, { sensesText: "Darkvision 30 ft. · Passive Perception 10 · Keen Smell" }),
  form("raven", "Raven", 12, 1, 10, { strength: 2, dexterity: 14, constitution: 8, intelligence: 2, wisdom: 12, charisma: 6 }, { sensesText: "Passive Perception 13", skillsText: "Perception +3", defensesText: "Fly 50 ft. · Mimicry · cannot attack as a familiar" }),
  form("sea-horse", "Sea Horse", 11, 1, 0, { strength: 1, dexterity: 12, constitution: 8, intelligence: 1, wisdom: 10, charisma: 2 }, { sensesText: "Passive Perception 10", defensesText: "Swim 20 ft. · Water Breathing · cannot attack as a familiar" }),
  form("spider", "Spider", 12, 1, 20, { strength: 2, dexterity: 14, constitution: 8, intelligence: 1, wisdom: 10, charisma: 2 }, { sensesText: "Darkvision 30 ft. · Passive Perception 10 · Web Sense", skillsText: "Stealth +4", defensesText: "Spider Climb · Web Walker · cannot attack as a familiar" }),
  form("weasel", "Weasel", 13, 1, 30, { strength: 3, dexterity: 16, constitution: 8, intelligence: 2, wisdom: 12, charisma: 3 }, { sensesText: "Passive Perception 13 · Keen Hearing and Smell", skillsText: "Perception +3 · Stealth +5" }),
];

export function familiarForm(formId) {
  return FAMILIAR_FORMS_2014.find((entry) => entry.id === formId) || FAMILIAR_FORMS_2014.find((entry) => entry.id === "owl");
}
