import { appendHistoryEvent } from "./history.js";

export const CHANGE_CATEGORIES = Object.freeze({
  HIT_POINTS: "hit-points", HIT_DICE: "hit-dice", INSPIRATION: "inspiration", EXPERIENCE: "experience",
  RESOURCE: "resource", SPELL_SLOT: "spell-slot", SPELL: "spell", PROFICIENCY: "proficiency",
  EQUIPMENT: "equipment", CONDITION: "condition", COMPANION: "companion", IDENTITY: "identity",
});

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function recordMutation(character, { type = "character-mutation", title, detail = "", category, before, after, changes = {} }, apply) {
  if (!category || !Object.values(CHANGE_CATEGORIES).includes(category)) throw new Error(`Unknown change category: ${category}.`);
  if (same(before, after)) return character;
  const result = apply(character);
  return appendHistoryEvent(result, { type, title, detail, changes, stateChanges: [{ category, before: structuredClone(before), after: structuredClone(after) }] });
}

export function setCurrentHitPoints(character, hp) {
  const before = Number(character.hp || 0), after = Math.min(Number(character.maxHp || 0), Math.max(0, Number(hp)));
  return recordMutation(character, { title: "Hit points changed", detail: `${before} → ${after}`, category: CHANGE_CATEGORIES.HIT_POINTS, before, after, changes: { hitPointsChanged: [`HP ${before} → ${after}`] } }, (current) => ({ ...current, hp: after }));
}

export function setInspiration(character, inspiration) {
  const before = Boolean(character.inspiration), after = Boolean(inspiration);
  return recordMutation(character, { title: `${after ? "Gained" : "Spent"} inspiration`, category: CHANGE_CATEGORIES.INSPIRATION, before, after, changes: { inspirationChanged: [`${before ? "inspired" : "not inspired"} → ${after ? "inspired" : "not inspired"}`] } }, (current) => ({ ...current, inspiration: after }));
}

export function setExperience(character, experience) {
  const before = Number(character.experience || 0), after = Math.min(355000, Math.max(0, Number(experience) || 0));
  return recordMutation(character, { title: "Experience changed", detail: `${before} → ${after}`, category: CHANGE_CATEGORIES.EXPERIENCE, before, after, changes: { experienceChanged: [`${before} → ${after}`] } }, (current) => ({ ...current, experience: after }));
}

export function setResourceCurrent(character, resourceId, value) {
  const resource = (character.resources || []).find((entry) => entry.id === resourceId);
  if (!resource) throw new Error(`Unknown resource: ${resourceId}.`);
  const before = Number(resource.current || 0), after = Math.min(Number(resource.max || 0), Math.max(0, Number(value)));
  const detail = `${resource.name || resourceId} ${before} → ${after}`;
  return recordMutation(character, { title: "Resource changed", detail, category: CHANGE_CATEGORIES.RESOURCE, before: { id: resourceId, current: before }, after: { id: resourceId, current: after }, changes: after < before ? { resourcesSpent: [detail] } : { resourcesRestored: [detail] } }, (current) => ({ ...current, resources: current.resources.map((entry) => entry.id === resourceId ? { ...entry, current: after } : entry) }));
}

export function setHitDieCurrent(character, die, value) {
  const pool = character.hitDicePools?.[die];
  if (!pool) throw new Error(`Unknown Hit Die pool: ${die}.`);
  const before = Number(pool.current || 0), after = Math.min(Number(pool.max || 0), Math.max(0, Number(value)));
  const pools = { ...character.hitDicePools, [die]: { ...pool, current: after } };
  const total = Object.values(pools).reduce((sum, entry) => sum + Number(entry.current || 0), 0);
  const detail = `${die} ${before} → ${after}`;
  return recordMutation(character, { title: "Hit Dice changed", detail, category: CHANGE_CATEGORIES.HIT_DICE, before: { die, current: before }, after: { die, current: after }, changes: after < before ? { hitDiceSpent: [detail] } : { hitDiceRestored: [detail] } }, (current) => ({ ...current, hitDicePools: pools, hitDiceRemaining: total }));
}

export function setPactSlotCurrent(character, value) {
  if (!character.pactSlots) throw new Error("This character has no Pact Magic slots.");
  const before = Number(character.pactSlots.current || 0), after = Math.min(Number(character.pactSlots.max || 0), Math.max(0, Number(value)));
  const detail = `Pact Magic ${before} → ${after}`;
  return recordMutation(character, { title: "Pact Magic slots changed", detail, category: CHANGE_CATEGORIES.SPELL_SLOT, before: { pool: "pact", current: before }, after: { pool: "pact", current: after }, changes: after < before ? { spellSlotsSpent: [detail] } : { spellSlotsRestored: [detail] } }, (current) => ({ ...current, pactSlots: { ...current.pactSlots, current: after } }));
}

export function setSpellSlotUsed(character, levelIndex, usedValue) {
  const maximum = Number(character.spellSlots?.[levelIndex] || 0);
  if (!maximum) throw new Error(`This character has no level ${levelIndex + 1} spell slots.`);
  const used = (character.spellSlots || []).map((total, index) => Math.min(Number(total), Math.max(0, Number(character.usedSpellSlots?.[index] || 0))));
  const before = used[levelIndex], after = Math.min(maximum, Math.max(0, Number(usedValue)));
  const detail = `Level ${levelIndex + 1} used slots ${before} → ${after}`;
  return recordMutation(character, { title: "Spell slots changed", detail, category: CHANGE_CATEGORIES.SPELL_SLOT, before: { level: levelIndex + 1, used: before }, after: { level: levelIndex + 1, used: after }, changes: after > before ? { spellSlotsSpent: [detail] } : { spellSlotsRestored: [detail] } }, (current) => { const next = [...used]; next[levelIndex] = after; return { ...current, usedSpellSlots: next }; });
}

export function patchSpell(character, spellId, patch, title = "Spell configuration changed") {
  const spell = (character.spells || []).find((entry) => entry.id === spellId);
  if (!spell) throw new Error(`Unknown spell: ${spellId}.`);
  const before = Object.fromEntries(Object.keys(patch).map((key) => [key, spell[key] ?? null]));
  const after = { ...before, ...patch };
  return recordMutation(character, { title, detail: spell.name, category: CHANGE_CATEGORIES.SPELL, before: { id: spellId, ...before }, after: { id: spellId, ...after }, changes: { spellsChanged: [spell.name] } }, (current) => ({ ...current, spells: current.spells.map((entry) => entry.id === spellId ? { ...entry, ...patch } : entry) }));
}

export function patchMechanicalCompanion(character, companionId, patch) {
  const companion = (character.companions || []).find((entry) => entry.id === companionId);
  if (!companion) throw new Error(`Unknown companion: ${companionId}.`);
  const before = Object.fromEntries(Object.keys(patch).map((key) => [key, companion[key] ?? null]));
  const after = { ...before, ...patch };
  return recordMutation(character, { title: `${companion.name} changed`, category: CHANGE_CATEGORIES.COMPANION, before: { id: companionId, ...before }, after: { id: companionId, ...after }, changes: { companionsChanged: [companion.name] } }, (current) => ({ ...current, companions: current.companions.map((entry) => entry.id === companionId ? { ...entry, ...patch } : entry) }));
}
