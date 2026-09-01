import { calculateMaxHp } from "./rules.js";
import { applyNumericEffects, collectCharacterEffects } from "./effects.js";

export function hitPointBonuses(character, classLevels = character.classLevels) {
  const effective = classLevels === character.classLevels ? character : { ...character, classLevels };
  return applyNumericEffects(0, "maxHp", collectCharacterEffects(effective)).contributions
    .filter((entry) => entry.operation === "bonus")
    .map((entry) => ({ source: entry.source, amount: entry.value }));
}

export function calculateBaseCharacterMaxHp(character, levelHistory = character.levelHistory, abilities = character.abilities) {
  return calculateMaxHp(levelHistory || [], abilities?.constitution || 10);
}

export function calculateCharacterMaxHp(character, levelHistory = character.levelHistory, abilities = character.abilities, classLevels = character.classLevels) {
  const effective = { ...character, levelHistory, abilities, classLevels };
  return applyNumericEffects(calculateBaseCharacterMaxHp(effective), "maxHp", collectCharacterEffects(effective)).value;
}
