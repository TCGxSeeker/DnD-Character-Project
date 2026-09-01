import { armorProficiencyRestrictions, calculateBaseArmorClass, calculateBaseSpeed } from "./armor.js";
import { calculateBaseCharacterMaxHp } from "./derivedMechanics.js";
import { applyNumericEffects, collectCharacterEffects, effectRegistry } from "./effects.js";
import { abilityModifier, ABILITIES, proficiencyBonus, totalCharacterLevel } from "./rules.js";
import { characterSavingThrows } from "./savingThrows.js";
import { characterSkillRows } from "./skills.js";
import { spellCapacity } from "./spellCapacity.js";
import { attackSummary } from "./attacks.js";
import { baseDarkvisionRange, characterLanguages } from "./senses.js";
import { sharedFeatureSummary } from "./sharedFeatures.js";

function title(value) { return String(value).replace(/(^|[-.])([a-z])/g, (_, separator, letter) => `${separator ? " " : ""}${letter.toUpperCase()}`); }
function node(baseValue, target, effects, baseSource) {
  const resolved = applyNumericEffects(baseValue, target, effects);
  return { value: resolved.value, formula: baseSource, sources: resolved.contributions };
}

function withEffectProficiencies(character, effects) {
  const skills = new Set(character.skills || []);
  const expertise = new Set([...(character.expertise || []), ...(character.skillExpertise || [])]);
  const saves = new Set(character.saves || []);
  effectRegistry(effects, "proficiency").forEach((effect) => {
    if (effect.target.startsWith("skill.")) skills.add(title(effect.target.slice(6)));
    if (effect.target.startsWith("expertise.")) expertise.add(title(effect.target.slice(10)));
    if (effect.target.startsWith("save.")) saves.add(effect.target.slice(5));
  });
  return { ...character, skills: [...skills], expertise: [...expertise], saves: [...saves] };
}

function proficiencySources(effects, targets) {
  return effectRegistry(effects, "proficiency")
    .filter((effect) => targets.includes(effect.target))
    .map((effect) => ({ source: effect.source || "Custom effect", operation: effect.operation, target: effect.target }));
}

export function calculateCharacterGraph(character) {
  const effects = collectCharacterEffects(character);
  const abilities = Object.fromEntries(ABILITIES.map((ability) => [ability, node(character.abilities?.[ability] ?? 10, `ability.${ability}`, effects, "Stored ability score")]));
  const effective = withEffectProficiencies({ ...character, abilities: Object.fromEntries(ABILITIES.map((ability) => [ability, abilities[ability].value])) }, effects);
  const level = totalCharacterLevel(effective.classLevels);
  const proficiency = node(proficiencyBonus(level), "proficiencyBonus", effects, `2014 total level ${level}`);
  const armorRestrictions = armorProficiencyRestrictions(effective);
  const armorDisadvantage = (ability) => armorRestrictions.active && armorRestrictions.disadvantagedAbilities.includes(ability) ? [armorRestrictions.reason] : [];
  const skills = Object.fromEntries(characterSkillRows(effective).map((row) => { const resolved = node(row.bonus, `skill.${row.id}`, effects, `${title(row.ability)} modifier + proficiency`); resolved.sources.push(...proficiencySources(effects, [`skill.${row.id}`, `expertise.${row.id}`])); return [row.id, { ...row, ...resolved, disadvantageReasons: [...armorDisadvantage(row.ability), ...(row.id === "stealth" && armorRestrictions.hasStealthDisadvantage ? ["Equipped armor imposes Stealth disadvantage"] : [])] }]; }));
  const saves = Object.fromEntries(characterSavingThrows(effective).map((row) => { const resolved = node(row.bonus, `save.${row.ability}`, effects, `${title(row.ability)} modifier + proficiency`); resolved.sources.push(...proficiencySources(effects, [`save.${row.ability}`])); return [row.ability, { ...row, ...resolved, disadvantageReasons: armorDisadvantage(row.ability) }]; }));
  const armorClass = node(calculateBaseArmorClass(effective), "armorClass", effects, "Best equipped or unarmored formula");
  const speed = node(calculateBaseSpeed(effective), "speed", effects, "Ancestry speed + eligible class movement");
  const maxHp = node(calculateBaseCharacterMaxHp(effective), "maxHp", effects, "Level HP history + Constitution");
  return {
    level: { value: level, formula: "Sum of class levels", sources: [] }, proficiency,
    abilities, saves, skills, armorClass, speed, maxHp,
    initiative: { ...node(abilityModifier(effective.abilities.dexterity), "initiative", effects, "Dexterity modifier"), disadvantageReasons: armorDisadvantage("dexterity") },
    passivePerception: node(10 + skills.perception.value, "passivePerception", effects, "10 + Perception"),
    spellCapacity: spellCapacity(effective), attacks: attackSummary(effective), sharedFeatures: sharedFeatureSummary(effective),
    senses: { darkvision: node(baseDarkvisionRange(effective), "sense.darkvision", effects, "Explicit sense") },
    languages: characterLanguages(effective),
    registries: {
      resistances: effectRegistry(effects, "resistance"), grants: effectRegistry(effects, "grant"),
      resources: effectRegistry(effects, "resource"), companions: effectRegistry(effects, "companion"),
    },
    restrictions: { armor: armorRestrictions }, effects,
  };
}
