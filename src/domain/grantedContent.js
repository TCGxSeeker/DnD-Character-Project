import { FEATURE_RULES_2014 } from "./featureRules2014.js";
import classContent2014 from "../data/generated/classContent2014.json" with { type: "json" };

const feature = (id, name, level, detail) => ({ id, name, level, detail, benefits: FEATURE_RULES_2014[id] || [] });

const ARTIFICER_FEATURES = [
  feature("artificer-magical-tinkering", "Magical Tinkering", 1, "Imbue a tiny object with a minor magical property."),
  feature("artificer-spellcasting", "Spellcasting", 1, "Prepare and cast artificer spells using Intelligence."),
  feature("artificer-infuse-item", "Infuse Item", 2, "Create and maintain artificer infusions after a long rest."),
  feature("artificer-specialist", "Artificer Specialist", 3, "Your chosen specialist grants additional features and spells."),
  feature("artificer-right-tool", "The Right Tool for the Job", 3, "Create one set of artisan's tools with thieves' or artisan's tools."),
  feature("artificer-tool-expertise", "Tool Expertise", 6, "Double proficiency for proficient tool checks."),
  feature("artificer-flash-of-genius", "Flash of Genius", 7, "Use your reaction to add Intelligence to a nearby check or save."),
  feature("artificer-magic-item-adept", "Magic Item Adept", 10, "Attune to more magic items and craft common or uncommon items faster."),
  feature("artificer-spell-storing-item", "Spell-Storing Item", 11, "Store an artificer spell in an object for repeated use."),
  feature("artificer-magic-item-savant", "Magic Item Savant", 14, "Attune to additional items and ignore many attunement requirements."),
  feature("artificer-magic-item-master", "Magic Item Master", 18, "Attune to up to six magic items."),
  feature("artificer-soul-of-artifice", "Soul of Artifice", 20, "Gain saving throw resilience from attuned magic items."),
];

const BATTLE_SMITH_FEATURES = [
  feature("battle-smith-tool-proficiency", "Tool Proficiency", 3, "Gain smith's tools proficiency; choose another artisan's tool if already proficient."),
  feature("battle-smith-spells", "Battle Smith Spells", 3, "Specialist spells are always prepared and do not count against prepared spells."),
  feature("battle-smith-battle-ready", "Battle Ready", 3, "Use Intelligence for attacks with qualifying magic weapons and gain martial weapon proficiency."),
  feature("battle-smith-steel-defender", "Steel Defender", 3, "A named construct companion whose statistics scale with its Battle Smith."),
  feature("battle-smith-extra-attack", "Extra Attack", 5, "Attack twice when taking the Attack action."),
  feature("battle-smith-arcane-jolt", "Arcane Jolt", 9, "Channel magical energy through an attack or Steel Defender strike."),
  feature("battle-smith-improved-defender", "Improved Defender", 15, "Improve Arcane Jolt and the Steel Defender's defenses."),
];

const WARFORGED_FEATURES = [
  feature("warforged-constructed-resilience", "Constructed Resilience", 1, "Warforged resilience against poison, disease, sleep, and environmental needs."),
  feature("warforged-sentrys-rest", "Sentry's Rest", 1, "Remain aware while taking an inactive long rest."),
  feature("warforged-integrated-protection", "Integrated Protection", 1, "Armor integrates with the body; its bonus is included in derived Armor Class."),
  feature("warforged-specialized-design", "Specialized Design", 1, "Gain an additional skill and tool proficiency."),
];

const battleSmithSpells = [
  [3, "heroism", "Heroism", 1, "1 action", "Touch"],
  [3, "shield", "Shield", 1, "1 reaction", "Self"],
  [5, "branding-smite", "Branding Smite", 2, "1 bonus action", "Self"],
  [5, "warding-bond", "Warding Bond", 2, "1 action", "Touch"],
  [9, "aura-of-vitality", "Aura of Vitality", 3, "1 action", "Self"],
  [9, "conjure-barrage", "Conjure Barrage", 3, "1 action", "Self"],
  [13, "aura-of-purity", "Aura of Purity", 4, "1 action", "Self"],
  [13, "fire-shield", "Fire Shield", 4, "1 action", "Self"],
  [17, "banishing-smite", "Banishing Smite", 5, "1 bonus action", "Self"],
  [17, "mass-cure-wounds", "Mass Cure Wounds", 5, "1 action", "60 feet"],
];

function classEntry(character, classId) {
  return character.classLevels.find((entry) => entry.classId === classId);
}

function atLevel(entries, level, source) {
  return entries.filter((entry) => level >= entry.level).map((entry) => ({ ...entry, source: `${source} ${entry.level}`, granted: true }));
}

function generatedAtLevel(entries = [], level, source) {
  return entries.filter((entry) => level >= entry.level).map((entry) => ({ ...entry, source: `${source} ${entry.level}`, granted: true }));
}

export function getGrantedFeatures(character) {
  const granted = [];
  for (const entry of character.classLevels || []) {
    const classCatalog = classContent2014.classes[entry.classId];
    if (classCatalog) granted.push(...generatedAtLevel(classCatalog.features, Number(entry.level), classCatalog.name));
    const subclassNameId = String(entry.subclass || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const subclassEntries = classContent2014.subclasses[entry.classId] || {};
    const subclassCatalog = subclassEntries[entry.subclassId] || subclassEntries[subclassNameId];
    if (subclassCatalog) granted.push(...generatedAtLevel(subclassCatalog.features, Number(entry.level), subclassCatalog.name));
  }
  const artificer = classEntry(character, "artificer");
  if (artificer) {
    granted.push(...atLevel(ARTIFICER_FEATURES, Number(artificer.level), "Artificer"));
    if (artificer.subclassId === "battle-smith" || artificer.subclass === "Battle Smith") {
      granted.push(...atLevel(BATTLE_SMITH_FEATURES, Number(artificer.level), "Battle Smith"));
    }
  }
  if (character.ancestryId === "warforged" || String(character.ancestry || "").toLowerCase().startsWith("warforged")) {
    granted.push(...atLevel(WARFORGED_FEATURES, 1, "Warforged"));
  }
  return granted;
}

export function getCharacterFeatures(character) {
  const merged = new Map();
  [...getGrantedFeatures(character), ...(character.features || [])].forEach((entry) => {
    const key = String(entry.name).trim().toLowerCase();
    merged.set(key, { ...merged.get(key), ...entry });
  });
  return [...merged.values()].sort((a, b) => String(a.source).localeCompare(String(b.source)) || a.name.localeCompare(b.name));
}

export function getGrantedSpells(character) {
  const artificer = classEntry(character, "artificer");
  if (!artificer || !["battle-smith", "Battle Smith"].includes(artificer.subclassId || artificer.subclass)) return [];
  return battleSmithSpells.filter(([level]) => Number(artificer.level) >= level).map(([grantedLevel, id, name, level, castingTime, range]) => ({
    id: `granted-battle-smith-${id}`,
    canonicalId: id,
    name,
    level,
    castingTime,
    range,
    prepared: true,
    alwaysPrepared: true,
    granted: true,
    source: `Battle Smith ${grantedLevel}`,
  }));
}

export function getCharacterSpells(character) {
  const merged = new Map();
  [...(character.spells || []), ...getGrantedSpells(character)].forEach((entry) => {
    const key = String(entry.name).trim().toLowerCase();
    merged.set(key, { ...merged.get(key), ...entry });
  });
  return [...merged.values()].sort((a, b) => Number(a.level) - Number(b.level) || a.name.localeCompare(b.name));
}

function addedNames(before, after) {
  const known = new Set(before.map((entry) => entry.name));
  return after.filter((entry) => !known.has(entry.name)).map((entry) => entry.name);
}

export function grantedContentDelta(beforeCharacter, afterCharacter) {
  return {
    featuresAdded: addedNames(getCharacterFeatures(beforeCharacter), getCharacterFeatures(afterCharacter)),
    spellsAdded: addedNames(getCharacterSpells(beforeCharacter), getCharacterSpells(afterCharacter)),
  };
}
