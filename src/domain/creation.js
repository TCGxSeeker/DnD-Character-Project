import { ABILITIES, abilityModifier } from "./rules.js";

const POINT_BUY_COSTS = Object.freeze({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 });

export function pointBuyCost(score) {
  return POINT_BUY_COSTS[Number(score)] ?? Number.POSITIVE_INFINITY;
}

export function pointBuySpent(abilities) {
  return ABILITIES.reduce((total, ability) => total + pointBuyCost(abilities[ability]), 0);
}

export function pointBuyRemaining(abilities, budget = 27) {
  return Number(budget) - pointBuySpent(abilities);
}

export function validatePointBuy(abilities, budget = 27) {
  return ABILITIES.every((ability) => Number(abilities[ability]) >= 8 && Number(abilities[ability]) <= 15)
    && pointBuyRemaining(abilities, budget) >= 0;
}

export function applyFixedAbilityAdjustments(baseAbilities, fixedAdjustments = {}) {
  return Object.fromEntries(ABILITIES.map((ability) => [ability, Number(baseAbilities[ability]) + Number(fixedAdjustments[ability] || 0)]));
}

export function validateCreationAbilities(baseAbilities, fixedAdjustments = {}) {
  const final = applyFixedAbilityAdjustments(baseAbilities, fixedAdjustments);
  return ABILITIES.every((ability) => Number.isFinite(final[ability]) && final[ability] >= 3 && final[ability] <= 20);
}

export function levelOneHitPoints(hitDie, constitutionScore) {
  return Number(hitDie) + abilityModifier(constitutionScore);
}
