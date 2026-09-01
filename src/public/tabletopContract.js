import { calculateCharacterGraph } from "../domain/calculationGraph.js";
import { deriveCompanionStats } from "../domain/companions.js";
import { getCharacterFeatures, getCharacterSpells } from "../domain/grantedContent.js";
import { appendHistoryEvent } from "../domain/history.js";
import { takeLongRest, takeShortRest } from "../domain/rests.js";
import { carryingSummary, consumeAmmunition } from "../domain/equipment.js";
import { evaluateAttackContext2014 } from "../domain/attackContext2014.js";

export const TABLETOP_CONTRACT_VERSION = 1;

const clone = (value) => structuredClone(value);
const integer = (value, label) => {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new Error(`${label} must be a non-negative integer.`);
  return result;
};
const serializable = (value) => JSON.parse(JSON.stringify(value));
const portraitReference = (entity) => entity.portraitDataUrl
  ? { kind: "data-url", value: entity.portraitDataUrl }
  : entity.avatar ? { kind: "preset", value: entity.avatar } : null;

function publicSpells(character) {
  return getCharacterSpells(character).map((spell) => ({
    id: String(spell.canonicalId || spell.id), name: String(spell.name), level: Number(spell.level || 0),
    castingTime: String(spell.castingTime || ""), range: String(spell.range || ""), duration: String(spell.duration || ""),
    prepared: Boolean(spell.prepared || spell.alwaysPrepared), concentration: Boolean(spell.concentration), ritual: Boolean(spell.ritual),
  }));
}

function publicConditions(character) {
  return (character.conditions || []).map((condition) => typeof condition === "string"
    ? { id: condition.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: condition }
    : { id: String(condition.id), name: String(condition.name || condition.id), ...(condition.source ? { source: String(condition.source) } : {}), ...(condition.duration ? { duration: String(condition.duration) } : {}) });
}

function publicResources(character) {
  const spellSlots = (character.spellSlots || []).map((maximum, index) => ({ id: `spell-slot-${index + 1}`, name: `Level ${index + 1} spell slots`, current: Math.max(0, Number(maximum) - Number(character.usedSpellSlots?.[index] || 0)), maximum: Number(maximum), reset: "long" }));
  const pact = character.pactSlots ? [{ id: "pact-magic", name: "Pact Magic", current: Number(character.pactSlots.current || 0), maximum: Number(character.pactSlots.max || 0), reset: "short", level: Number(character.pactSlots.level || 0) }] : [];
  return [...(character.resources || []).map((resource) => ({ id: String(resource.id), name: String(resource.name || resource.id), current: Number(resource.current || 0), maximum: Number(resource.max || 0), reset: String(resource.reset || "") })), ...spellSlots, ...pact];
}

export function getTabletopEntitySnapshot(character) {
  if (!character?.id || !character?.name) throw new Error("A tabletop entity requires a stable id and name.");
  const graph = calculateCharacterGraph(character);
  const carrying = carryingSummary(character);
  return serializable({
    contractVersion: TABLETOP_CONTRACT_VERSION,
    entityType: "character",
    id: String(character.id),
    name: String(character.name),
    portrait: portraitReference(character),
    ruleset: "5e-2014",
    level: Number(graph.level.value),
    size: character.size ? String(character.size) : null,
    hp: { current: Number(character.hp || 0), maximum: Number(graph.maxHp.value), temporary: Number(character.tempHp || 0) },
    armorClass: Number(graph.armorClass.value),
    initiativeModifier: Number(graph.initiative.value),
    initiativeDisadvantageReasons: clone(graph.initiative.disadvantageReasons || []),
    movement: { walk: Number(graph.speed.value) },
    senses: { darkvision: Number(graph.senses.darkvision.value || 0), passivePerception: Number(graph.passivePerception.value) },
    abilities: Object.fromEntries(Object.entries(graph.abilities).map(([id, entry]) => [id, Number(entry.value)])),
    savingThrows: Object.fromEntries(Object.entries(graph.saves).map(([id, entry]) => [id, { bonus: Number(entry.value), proficient: Boolean(entry.proficient), disadvantageReasons: clone(entry.disadvantageReasons || []) }])),
    skills: Object.fromEntries(Object.entries(graph.skills).map(([id, entry]) => [id, { bonus: Number(entry.value), proficiency: Number(entry.proficiency || 0), disadvantageReasons: clone(entry.disadvantageReasons || []) }])),
    conditions: publicConditions(character),
    attacks: graph.attacks.attacks.map((attack) => ({ id: String(attack.id), name: String(attack.name), attackBonus: Number(attack.attackBonus), damage: String(attack.damage), damageType: String(attack.damageType || ""), ability: String(attack.ability), proficient: Boolean(attack.proficient), available: attack.available !== false, actionType: String(attack.actionType), maximumAttacks: Number(attack.maximumAttacks), use: clone(attack.use), range: clone(attack.range), reach: attack.reach == null ? null : Number(attack.reach), special: clone(attack.special), disadvantageReasons: clone(attack.disadvantageReasons), rules: clone(attack.rules), ...(attack.ammunition?.required ? { ammunition: { type: String(attack.ammunition.ammunitionType), available: Number(attack.ammunition.available) } } : {}) })),
    attacksPerAction: Number(graph.attacks.attacksPerAction),
    reactions: clone(graph.attacks.reactions || []),
    carrying: { weight: Number(carrying.weight), capacity: Number(carrying.capacity), pushDragLift: Number(carrying.pushDragLift), variantEnabled: Boolean(carrying.variantEnabled), variantStatus: String(carrying.variantStatus), speedPenalty: Number(carrying.speedPenalty), overCapacity: Boolean(carrying.overCapacity), disadvantages: clone(carrying.disadvantages) },
    restrictions: { armor: clone(graph.restrictions.armor) },
    spells: publicSpells(character),
    actions: getCharacterFeatures(character).map((feature) => ({ id: String(feature.id), name: String(feature.name), source: String(feature.source || ""), summary: String(feature.detail || feature.summary || "") })),
    resources: publicResources(character),
    linkedEntityIds: (character.companions || []).filter((companion) => companion.present !== false).map((companion) => `${character.id}:${companion.id}`),
  });
}

export function evaluateTabletopAttackContext(character, attackId, context = {}) {
  const attack = calculateCharacterGraph(character).attacks.attacks.find((entry) => entry.id === attackId);
  if (!attack) throw new Error(`Unknown calculated attack: ${attackId}.`);
  return serializable(evaluateAttackContext2014(character, attack, context));
}

export function getTabletopCompanionSnapshot(character, companion) {
  const stats = deriveCompanionStats(character, companion);
  return serializable({
    contractVersion: TABLETOP_CONTRACT_VERSION,
    entityType: "companion",
    id: `${character.id}:${companion.id}`, ownerEntityId: String(character.id), name: String(companion.name), portrait: portraitReference(companion),
    size: stats.size ? String(stats.size) : null,
    hp: { current: Number(companion.currentHp ?? stats.maxHp), maximum: Number(stats.maxHp), temporary: Number(companion.tempHp || 0) },
    armorClass: Number(stats.armorClass), movement: { walk: Number(stats.speed || 0) }, abilities: clone(stats.abilities || {}),
    savingThrows: clone(stats.savingThrows || {}), skills: clone(stats.skills || {}), senses: { passivePerception: Number(stats.passivePerception || 10) },
    conditions: publicConditions(companion), present: companion.present !== false, source: String(companion.source || ""), duration: String(companion.duration || ""),
  });
}

function history(character, title, detail, changes) {
  return appendHistoryEvent(character, { type: "tabletop-command", title, detail, changes });
}

function patchResource(character, id, amount, direction) {
  const resources = character.resources || [];
  const index = resources.findIndex((resource) => resource.id === id);
  if (index < 0) throw new Error(`Unknown resource: ${id}.`);
  const resource = resources[index];
  const current = Number(resource.current || 0);
  const maximum = Number(resource.max || 0);
  const next = direction === "consume" ? Math.max(0, current - amount) : Math.min(maximum, current + amount);
  if (direction === "consume" && amount > current) throw new Error(`${resource.name || id} does not have enough uses remaining.`);
  const updated = resources.map((entry, resourceIndex) => resourceIndex === index ? { ...entry, current: next } : entry);
  const label = `${resource.name || id} ${current} → ${next}`;
  return history({ ...character, resources: updated }, direction === "consume" ? "Consumed a resource" : "Restored a resource", label, direction === "consume" ? { resourcesSpent: [label] } : { resourcesRestored: [label] });
}

export function applyTabletopCommand(character, command) {
  if (!command || typeof command !== "object") throw new Error("A tabletop command object is required.");
  const payload = command.payload || {};
  if (command.type === "applyDamage") {
    const amount = integer(payload.amount, "Damage");
    const tempBefore = Number(character.tempHp || 0), absorbed = Math.min(tempBefore, amount), hpBefore = Number(character.hp || 0);
    const result = { ...character, tempHp: tempBefore - absorbed, hp: Math.max(0, hpBefore - (amount - absorbed)) };
    return history(result, "Damage applied", `${amount} damage`, { hitPointsChanged: [`HP ${hpBefore} → ${result.hp}`, `Temporary HP ${tempBefore} → ${result.tempHp}`] });
  }
  if (command.type === "applyHealing") {
    const amount = integer(payload.amount, "Healing"), before = Number(character.hp || 0), hp = Math.min(Number(character.maxHp || 0), before + amount);
    return history({ ...character, hp }, "Healing applied", `${amount} healing`, { hitPointsChanged: [`${before} → ${hp}`] });
  }
  if (command.type === "setTemporaryHp") {
    const temporary = integer(payload.amount, "Temporary HP"), before = Number(character.tempHp || 0);
    return history({ ...character, tempHp: temporary }, "Temporary HP changed", `${before} → ${temporary}`, { hitPointsChanged: [`Temporary HP ${before} → ${temporary}`] });
  }
  if (command.type === "consumeResource") return patchResource(character, String(payload.resourceId), Math.max(1, integer(payload.amount ?? 1, "Resource amount")), "consume");
  if (command.type === "restoreResource") return patchResource(character, String(payload.resourceId), Math.max(1, integer(payload.amount ?? 1, "Resource amount")), "restore");
  if (command.type === "applyCondition") {
    const condition = payload.condition;
    if (!condition?.id || !condition?.name) throw new Error("A condition requires an id and name.");
    if ((character.conditions || []).some((entry) => (typeof entry === "string" ? entry : entry.id) === condition.id)) return character;
    return history({ ...character, conditions: [...(character.conditions || []), clone(condition)] }, "Condition applied", condition.name, { conditionsAdded: [condition.name] });
  }
  if (command.type === "removeCondition") {
    const before = character.conditions || [], removed = before.find((entry) => (typeof entry === "string" ? entry : entry.id) === payload.conditionId);
    if (!removed) throw new Error(`Unknown condition: ${payload.conditionId}.`);
    const name = typeof removed === "string" ? removed : removed.name;
    return history({ ...character, conditions: before.filter((entry) => (typeof entry === "string" ? entry : entry.id) !== payload.conditionId) }, "Condition removed", name, { conditionsRemoved: [name] });
  }
  if (command.type === "performRest") {
    if (payload.kind === "short") return takeShortRest(character, payload.context || {});
    if (payload.kind === "long") return takeLongRest(character, payload.hitDieRecoveryOrder || []);
    throw new Error("Rest kind must be short or long.");
  }
  if (command.type === "useAmmunition") return consumeAmmunition(character, String(payload.weaponId), Math.max(1, integer(payload.amount ?? 1, "Ammunition amount")));
  throw new Error(`Unsupported tabletop command: ${command.type}.`);
}
