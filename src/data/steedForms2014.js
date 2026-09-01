const steed = (id, name, armorClass, maxHp, speed, abilities, details = {}) => ({
  id, name, type: "spell-steed", size: details.size || "Large", creatureType: details.creatureType || "celestial, fey, or fiend", armorClass, maxHp, speed, abilities,
  savesText: "Use the form's ability modifiers", skillsText: details.skillsText || "None", sensesText: details.sensesText || "Passive Perception 10",
  defensesText: "Intelligence becomes at least 6. The steed understands one language you speak and serves as a loyal mount.",
  actions: details.actions || [{ name: "Hooves", detail: "Use the selected form's licensed creature entry for its attack and damage." }],
});

export const STEED_FORMS_2014 = [
  steed("warhorse", "Warhorse", 11, 19, 60, { strength: 18, dexterity: 12, constitution: 13, intelligence: 6, wisdom: 12, charisma: 7 }, { sensesText: "Passive Perception 11", actions: [{ name: "Hooves", detail: "+6 to hit · 2d6 + 4 bludgeoning." }, { name: "Trampling Charge", detail: "A qualifying charge can knock the target prone and enable a bonus-action hoof attack." }] }),
  steed("pony", "Pony", 10, 11, 40, { strength: 15, dexterity: 10, constitution: 13, intelligence: 6, wisdom: 11, charisma: 7 }, { size: "Medium", sensesText: "Passive Perception 10", actions: [{ name: "Hooves", detail: "+4 to hit · 2d4 + 2 bludgeoning." }] }),
  steed("camel", "Camel", 9, 15, 50, { strength: 16, dexterity: 8, constitution: 14, intelligence: 6, wisdom: 8, charisma: 5 }, { sensesText: "Passive Perception 9", actions: [{ name: "Bite", detail: "+5 to hit · 1d4 + 3 bludgeoning." }] }),
  steed("elk", "Elk", 10, 13, 50, { strength: 16, dexterity: 10, constitution: 12, intelligence: 6, wisdom: 10, charisma: 6 }, { sensesText: "Passive Perception 10", actions: [{ name: "Ram", detail: "+5 to hit · 1d6 + 3 bludgeoning." }, { name: "Charge", detail: "A qualifying charge adds damage and can knock the target prone." }] }),
  steed("mastiff", "Mastiff", 12, 5, 40, { strength: 13, dexterity: 14, constitution: 12, intelligence: 6, wisdom: 12, charisma: 7 }, { size: "Medium", skillsText: "Perception +3", sensesText: "Passive Perception 13 · Keen Hearing and Smell", actions: [{ name: "Bite", detail: "+3 to hit · 1d6 + 1 piercing; target may be knocked prone." }] }),
];

export function steedForm(formId) {
  return STEED_FORMS_2014.find((entry) => entry.id === formId) || STEED_FORMS_2014[0];
}
