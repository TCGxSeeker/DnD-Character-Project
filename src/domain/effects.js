import { ownerEffects2014 } from "./effectCatalog2014.js";

export const NUMERIC_EFFECT_OPERATIONS = new Set(["bonus", "minimum", "maximum", "override"]);
export const REGISTRY_EFFECT_OPERATIONS = new Set(["proficiency", "resistance", "grant", "resource", "companion"]);
export const EFFECT_RULESET = "5e-2014";
const ABILITIES = "strength|dexterity|constitution|intelligence|wisdom|charisma";
const SKILLS = "acrobatics|animal-handling|arcana|athletics|deception|history|insight|intimidation|investigation|medicine|nature|perception|performance|persuasion|religion|sleight-of-hand|stealth|survival";
const NUMERIC_TARGETS = [
  new RegExp(`^ability\\.(${ABILITIES})$`), new RegExp(`^save\\.(${ABILITIES})$`), new RegExp(`^skill\\.(${SKILLS})$`),
  /^(proficiencyBonus|armorClass|speed|maxHp|initiative|passivePerception|sense\.darkvision)$/,
];
const REGISTRY_TARGETS = {
  proficiency: [new RegExp(`^(skill|expertise)\\.(${SKILLS})$`), new RegExp(`^save\\.(${ABILITIES})$`), /^(armor|weapon|tool|language)\.[a-z0-9][a-z0-9-]*$/],
  resistance: [/^(?:damage\.)?(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)$/],
  grant: [/^(feature|spell)\.[a-z0-9][a-z0-9-]*$/],
  resource: [/^[a-z0-9][a-z0-9-]*$/],
  companion: [/^[a-z0-9][a-z0-9-]*$/],
};

function list(value) { return Array.isArray(value) ? value : []; }

function activeItemEffects(item) {
  if (Number(item?.quantity ?? 1) < 1) return [];
  if ((item.requiresAttunement || item.equipment?.requiresAttunement) && !item.attuned) return [];
  return list(item.effects).filter((effect) => (!effect.requiresEquipped || item.equipped) && (!effect.requiresAttunement || item.attuned));
}

function activeFeatureEffects(feature) {
  const mechanicsStatus = String(feature?.mechanicsStatus || "")
    .trim()
    .toLowerCase();

  const provenanceType = String(feature?.provenance?.type || "")
    .trim()
    .toLowerCase();

  const requiresMechanicalAuthorization = Boolean(mechanicsStatus)
    || feature?.localContent === true
    || feature?.imported === true
    || feature?.custom === true
    || ["local-content", "cah-import", "custom"].includes(provenanceType);

  if (requiresMechanicalAuthorization && mechanicsStatus !== "mechanically-active") {
    return [];
  }

  return list(feature?.effects);
}

function equippedState(character) {
  const equipped = list(character?.inventory).filter((item) => item?.equipped && Number(item.quantity ?? 1) > 0);
  const armor = equipped.filter((item) => item?.equipment?.kind === "armor" || /armor|mail|plate/i.test(String(item?.name || "")));
  const heavy = armor.some((item) => item?.equipment?.category === "heavy" || /ring mail|chain mail|splint|plate/i.test(String(item?.name || "")));
  const shield = equipped.some((item) => item?.equipment?.kind === "shield" || /^shield$/i.test(String(item?.name || "")));
  return { armor: armor.length > 0, heavy, shield };
}

function requirementsMet(effect, character) {
  const requirements = effect?.requirements || {};
  const state = equippedState(character);
  if (requirements.unarmored && state.armor) return false;
  if (requirements.wearingArmor && !state.armor) return false;
  if (requirements.noHeavyArmor && state.heavy) return false;
  if (requirements.noShield && state.shield) return false;
  return true;
}

export function collectCharacterEffects(character) {
  return [
    ...ownerEffects2014(character || {}),
    ...list(character.effects),
    ...list(character.ancestryEffects),
    ...list(character.backgroundEffects),
    ...list(character.features).flatMap((entry) => activeFeatureEffects(entry).map((effect) => ({ source: entry.name, ...effect }))),
    ...list(character.inventory).flatMap((entry) => activeItemEffects(entry).map((effect) => ({ source: entry.name, ...effect }))),
    ...list(character.conditions).flatMap((entry) => list(entry.effects).map((effect) => ({ source: entry.name, ...effect }))),
  ].filter((effect) => effect && effect.enabled !== false && requirementsMet(effect, character || {}) && (!effect.ruleset || effect.ruleset === EFFECT_RULESET));
}

export function validateEffect(effect, ruleset = EFFECT_RULESET) {
  if (!effect || typeof effect !== "object") return { valid: false, error: "Effect must be an object." };
  if (![...NUMERIC_EFFECT_OPERATIONS, ...REGISTRY_EFFECT_OPERATIONS].includes(effect.operation)) return { valid: false, error: `Unknown operation: ${effect.operation}` };
  if (!String(effect.target || "").trim()) return { valid: false, error: "Effect target is required." };
  if (effect.ruleset && effect.ruleset !== ruleset) return { valid: false, error: `Effect ruleset ${effect.ruleset} does not match ${ruleset}.` };
  const patterns = NUMERIC_EFFECT_OPERATIONS.has(effect.operation) ? NUMERIC_TARGETS : REGISTRY_TARGETS[effect.operation] || [];
  if (!patterns.some((pattern) => pattern.test(String(effect.target)))) return { valid: false, error: `Unknown ${effect.operation} target: ${effect.target}` };
  if (NUMERIC_EFFECT_OPERATIONS.has(effect.operation) && !Number.isFinite(Number(effect.value))) return { valid: false, error: "Numeric effects require a numeric value." };
  return { valid: true };
}

export function effectsForTarget(effects, target) {
  return list(effects).filter((effect) => effect.target === target && validateEffect(effect).valid);
}

export function applyNumericEffects(baseValue, target, effects) {
  const applied = effectsForTarget(effects, target).filter((effect) => NUMERIC_EFFECT_OPERATIONS.has(effect.operation));
  let value = Number(baseValue || 0);
  applied.filter((effect) => effect.operation === "override").forEach((effect) => { value = Number(effect.value); });
  applied.filter((effect) => effect.operation === "minimum").forEach((effect) => { value = Math.max(value, Number(effect.value)); });
  applied.filter((effect) => effect.operation === "maximum").forEach((effect) => { value = Math.min(value, Number(effect.value)); });
  value += applied.filter((effect) => effect.operation === "bonus").reduce((sum, effect) => sum + Number(effect.value), 0);
  return { value, contributions: applied.map((effect) => ({ source: effect.source || "Custom effect", operation: effect.operation, value: Number(effect.value) })) };
}

export function effectRegistry(effects, operation) {
  return list(effects).filter((effect) => effect.operation === operation && validateEffect(effect).valid);
}
