import { BACKGROUNDS_2014 } from "../data/backgrounds2014.js";
import { abilityModifier, totalCharacterLevel } from "./rules.js";

const RULESET = "5e-2014";
const effect = (source, operation, target, value, extra = {}) => ({ ruleset: RULESET, source, operation, target, ...(value == null ? {} : { value }), ...extra });
const classLevel = (character, classId) => Number(character?.classLevels?.find((entry) => entry.classId === classId)?.level || 0);
const subclassIs = (character, classId, subclassId) => {
  const entry = character?.classLevels?.find((candidate) => candidate.classId === classId);
  return entry?.subclassId === subclassId || String(entry?.subclass || "").toLowerCase().includes(subclassId.replaceAll("-", " "));
};
const hasFeat = (character, featId) => (character?.features || []).find((entry) => entry.id === `feat-${featId}`);

function ancestryEffects(character) {
  const id = character?.ancestryId;
  const option = character?.ancestryOptionId;
  const results = [];
  const darkvision60 = new Set(["aasimar", "dwarf", "elf", "gnome", "half-elf", "half-orc", "tiefling"]);
  if (darkvision60.has(id)) results.push(effect(`${character.ancestry || id} ancestry`, "minimum", "sense.darkvision", option === "drow" ? 120 : 60));
  if (id === "warforged" && [undefined, "", "published"].includes(option) && !Number(character?.armorClassBonuses?.ancestry || 0)) results.push(effect("Integrated Protection", "bonus", "armorClass", 1));
  if (id === "dwarf" && option === "hill") results.push(effect("Dwarven Toughness", "bonus", "maxHp", totalCharacterLevel(character.classLevels || [])));
  if (id === "dwarf") {
    results.push(effect("Dwarven Resilience", "resistance", "damage.poison"));
    ["battleaxe", "handaxe", "light-hammer", "warhammer"].forEach((weapon) => results.push(effect("Dwarven Combat Training", "proficiency", `weapon.${weapon}`)));
  }
  if (id === "halfling" && option === "stout") results.push(effect("Stout Resilience", "resistance", "damage.poison"));
  if (id === "tiefling" || (id === "half-elf" && option === "mark-storm")) results.push(effect(id === "tiefling" ? "Hellish Resistance" : "Storm's Boon", "resistance", `damage.${id === "tiefling" ? "fire" : "lightning"}`));
  if (id === "aasimar") ["radiant", "necrotic"].forEach((type) => results.push(effect("Celestial Resistance", "resistance", `damage.${type}`)));
  if (id === "dwarf" && option === "mountain") ["light", "medium"].forEach((kind) => results.push(effect("Dwarven Armor Training", "proficiency", `armor.${kind}`)));
  return results;
}

function backgroundEffects(character) {
  const id = character?.backgroundId;
  const background = BACKGROUNDS_2014.find((entry) => entry.id === id);
  if (!background) return [];
  const source = `${background.name} background`;
  return [
    ...background.skills.map((skill) => effect(source, "proficiency", `skill.${skill.toLowerCase().replaceAll(" ", "-")}`)),
    ...background.tools.filter((tool) => !/of your choice/i.test(tool)).map((tool) => effect(source, "proficiency", `tool.${tool.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`)),
    effect(source, "grant", `feature.${background.feature.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`),
  ];
}

function classAndSubclassEffects(character) {
  const results = [];
  const barbarian = classLevel(character, "barbarian");
  if (barbarian >= 5) results.push(effect("Barbarian Fast Movement", "bonus", "speed", 10, { requirements: { noHeavyArmor: true } }));
  const monk = classLevel(character, "monk");
  if (monk >= 2) results.push(effect("Monk Unarmored Movement", "bonus", "speed", monk >= 18 ? 30 : monk >= 14 ? 25 : monk >= 10 ? 20 : monk >= 6 ? 15 : 10, { requirements: { unarmored: true, noShield: true } }));
  if (subclassIs(character, "sorcerer", "draconic-bloodline")) {
    results.push(effect("Draconic Resilience", "bonus", "maxHp", classLevel(character, "sorcerer")));
    results.push(effect("Draconic Resilience", "minimum", "armorClass", 13 + abilityModifier(character?.abilities?.dexterity ?? 10), { requirements: { unarmored: true } }));
  }
  const wearingArmor = { wearingArmor: true };
  for (const choiceId of ["fighter-style", "paladin-style", "ranger-style"]) {
    if ((character?.classChoices || []).some((choice) => choice.id === choiceId && choice.selections?.includes("Defense"))) {
      results.push(effect("Defense Fighting Style", "bonus", "armorClass", 1, { requirements: wearingArmor }));
      break;
    }
  }
  return results;
}

function featEffects(character) {
  const results = [];
  const totalLevel = totalCharacterLevel(character?.classLevels || []);
  if (hasFeat(character, "alert")) results.push(effect("Alert", "bonus", "initiative", 5));
  if (hasFeat(character, "mobile")) results.push(effect("Mobile", "bonus", "speed", 10));
  if (hasFeat(character, "observant")) results.push(effect("Observant", "bonus", "passivePerception", 5));
  if (hasFeat(character, "tough")) results.push(effect("Tough", "bonus", "maxHp", totalLevel * 2));
  const resilient = hasFeat(character, "resilient");
  if (resilient?.savingThrowAbility) results.push(effect("Resilient", "proficiency", `save.${resilient.savingThrowAbility}`));
  return results;
}

function conditionEffects(character) {
  const speedZero = new Set(["grappled", "paralyzed", "petrified", "restrained", "unconscious"]);
  return (character?.conditions || []).flatMap((entry) => {
    const id = String(typeof entry === "string" ? entry : entry.id || entry.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!speedZero.has(id)) return [];
    return [effect(typeof entry === "string" ? entry : entry.name || id, "override", "speed", 0)];
  });
}

export function ownerEffects2014(character) {
  return [...ancestryEffects(character), ...backgroundEffects(character), ...classAndSubclassEffects(character), ...featEffects(character), ...conditionEffects(character)];
}
