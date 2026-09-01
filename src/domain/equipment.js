import { appendHistoryEvent } from "./history.js";
import { weaponRuleByName } from "./weapons.js";

const SIZE_MULTIPLIER = { tiny: 0.5, medium: 1, small: 1, large: 2, huge: 4, gargantuan: 8 };

function inventory(character) {
  return Array.isArray(character?.inventory) ? character.inventory : [];
}

function findItem(character, itemId) {
  const item = inventory(character).find((candidate) => candidate.id === itemId);
  if (!item) throw new Error(`Unknown inventory item: ${itemId}`);
  return item;
}

function itemKind(item) {
  return item?.equipment?.kind || "item";
}

function changedInventory(character, itemId, update) {
  return inventory(character).map((item) => item.id === itemId ? update(item) : item);
}

function withEquipmentHistory(character, title, detail, before = null, after = null) {
  return appendHistoryEvent(character, {
    type: "equipment-changed",
    title,
    detail,
    changes: { equipmentChanged: [detail] },
    ...(before == null || after == null ? {} : { stateChanges: [{ category: "equipment", before, after }] }),
  });
}

export function itemWeight(item) {
  const ARMOR_WEIGHTS = { padded: 8, leather: 10, "studded leather": 13, hide: 12, "chain shirt": 20, "scale mail": 45, breastplate: 20, "half plate": 40, "ring mail": 40, "chain mail": 55, splint: 60, plate: 65, shield: 6 };
  const name = String(item?.name || "").toLowerCase().replace(/\s+armor$/, "").trim();
  const ammunitionWeight = /arrows?/.test(name) ? 0.05 : /(?:crossbow )?bolts?/.test(name) ? 0.075 : 0;
  const fallback = weaponRuleByName(item?.name)?.weight ?? ARMOR_WEIGHTS[name] ?? ammunitionWeight;
  const weight = Number(item?.weight ?? item?.equipment?.weight ?? fallback ?? 0);
  return Number.isFinite(weight) && weight > 0 ? weight : 0;
}

export function carriedWeight(character) {
  return inventory(character).reduce((total, item) => {
    if (item.carried === false) return total;
    return total + itemWeight(item) * Math.max(0, Number(item.quantity || 0));
  }, 0);
}

export function carryingSummary(character) {
  const strength = Math.max(0, Number(character?.abilities?.strength || 0));
  const size = String(character?.size || "medium").toLowerCase();
  const multiplier = SIZE_MULTIPLIER[size] || 1;
  const capacity = strength * 15 * multiplier;
  const pushDragLift = strength * 30 * multiplier;
  const weight = carriedWeight(character);
  const encumberedAt = strength * 5 * multiplier;
  const heavilyEncumberedAt = strength * 10 * multiplier;
  const variantStatus = weight > capacity ? "over-capacity" : weight > heavilyEncumberedAt ? "heavily-encumbered" : weight > encumberedAt ? "encumbered" : "normal";
  const variantEnabled = Boolean(character?.rulesOptions?.variantEncumbrance);
  const speedPenalty = !variantEnabled || variantStatus === "normal" ? 0 : variantStatus === "encumbered" ? 10 : 20;
  const heavilyEncumbered = variantEnabled && ["heavily-encumbered", "over-capacity"].includes(variantStatus);
  return {
    weight, capacity, pushDragLift, encumberedAt, heavilyEncumberedAt, variantStatus, variantEnabled, speedPenalty,
    overCapacity: weight > capacity,
    disadvantages: {
      abilityChecks: heavilyEncumbered ? ["strength", "dexterity", "constitution"] : [],
      attackRolls: heavilyEncumbered ? ["strength", "dexterity", "constitution"] : [],
      savingThrows: heavilyEncumbered ? ["strength", "dexterity", "constitution"] : [],
    },
  };
}

export function setVariantEncumbrance(character, enabled) {
  const before = Boolean(character?.rulesOptions?.variantEncumbrance);
  const nextEnabled = Boolean(enabled);
  if (before === nextEnabled) return character;
  const state = { ...character, rulesOptions: { ...(character.rulesOptions || {}), variantEncumbrance: nextEnabled } };
  return withEquipmentHistory(state, `${nextEnabled ? "Enabled" : "Disabled"} variant encumbrance`, `Variant encumbrance: ${before ? "on" : "off"} → ${nextEnabled ? "on" : "off"}`, { variantEncumbrance: before }, { variantEncumbrance: nextEnabled });
}

export function attunementSummary(character) {
  const attuned = inventory(character).filter((item) => item.attuned && Number(item.quantity || 0) > 0);
  return { current: attuned.length, max: 3, itemIds: attuned.map((item) => item.id), available: Math.max(0, 3 - attuned.length) };
}

export function setEquipmentEquipped(character, itemId, equipped) {
  const item = findItem(character, itemId);
  if (equipped && Number(item.quantity || 0) < 1) throw new Error(`${item.name} has no available quantity to equip.`);
  const kind = itemKind(item);
  const next = inventory(character).map((candidate) => {
    if (candidate.id === itemId) return { ...candidate, equipped: Boolean(equipped) };
    if (equipped && ["armor", "shield"].includes(kind) && itemKind(candidate) === kind) return { ...candidate, equipped: false };
    return candidate;
  });
  const state = { ...character, inventory: next };
  return withEquipmentHistory(state, `${equipped ? "Equipped" : "Unequipped"} ${item.name}`, `${item.name}: ${equipped ? "equipped" : "unequipped"}`, { itemId, equipped: Boolean(item.equipped) }, { itemId, equipped: Boolean(equipped) });
}

export function setEquipmentQuantity(character, itemId, quantity) {
  const item = findItem(character, itemId);
  const nextQuantity = Number(quantity);
  if (!Number.isInteger(nextQuantity) || nextQuantity < 0 || nextQuantity > 9999) throw new Error("Item quantity must be a whole number from 0 to 9999.");
  if (nextQuantity === Number(item.quantity || 0)) return character;
  const next = changedInventory(character, itemId, (candidate) => ({ ...candidate, quantity: nextQuantity, ...(nextQuantity === 0 ? { equipped: false, attuned: false } : {}) }));
  const state = { ...character, inventory: next };
  return withEquipmentHistory(state, `Updated ${item.name}`, `${item.name}: ${Number(item.quantity || 0)} → ${nextQuantity}`, { itemId, quantity: Number(item.quantity || 0) }, { itemId, quantity: nextQuantity });
}

export function setEquipmentAttuned(character, itemId, attuned) {
  const item = findItem(character, itemId);
  if (attuned && !item.requiresAttunement && !item.equipment?.requiresAttunement) throw new Error(`${item.name} does not require attunement.`);
  if (attuned && Number(item.quantity || 0) < 1) throw new Error(`${item.name} has no available quantity to attune.`);
  if (attuned && !item.attuned && attunementSummary(character).current >= 3) throw new Error("A character cannot be attuned to more than three items.");
  const next = changedInventory(character, itemId, (candidate) => ({ ...candidate, attuned: Boolean(attuned) }));
  const state = { ...character, inventory: next };
  return withEquipmentHistory(state, `${attuned ? "Attuned to" : "Ended attunement to"} ${item.name}`, `${item.name}: ${attuned ? "attuned" : "not attuned"}`, { itemId, attuned: Boolean(item.attuned) }, { itemId, attuned: Boolean(attuned) });
}

export function ammunitionTypeForWeapon(item) {
  const explicit = item?.equipment?.ammunitionType;
  if (explicit) return String(explicit).toLowerCase();
  const name = String(item?.equipment?.name || item?.weapon?.name || item?.name || "").toLowerCase();
  if (name.includes("crossbow")) return "bolt";
  if (name.includes("sling")) return "sling bullet";
  if (name.includes("blowgun")) return "needle";
  if (name.includes("bow")) return "arrow";
  return "";
}

export function ammunitionTypeForItem(item) {
  const explicit = item?.equipment?.ammunitionType;
  if (item?.equipment?.kind === "ammunition" && explicit) return String(explicit).toLowerCase();
  const name = String(item?.name || "").toLowerCase();
  if (/\bbolts?\b/.test(name)) return "bolt";
  if (/\barrows?\b/.test(name)) return "arrow";
  if (/sling bullets?/.test(name)) return "sling bullet";
  if (/\bneedles?\b/.test(name)) return "needle";
  return "";
}

export function ammunitionSummary(character, weaponItem) {
  const ammunitionType = ammunitionTypeForWeapon(weaponItem);
  const requiresAmmunition = Boolean(ammunitionType);
  const matching = inventory(character).filter((item) => ammunitionTypeForItem(item) === ammunitionType);
  const available = matching.reduce((total, item) => total + Math.max(0, Number(item.quantity || 0)), 0);
  return { required: requiresAmmunition, ammunitionType, available, itemIds: matching.map((item) => item.id) };
}

export function consumeAmmunition(character, weaponId, amount = 1) {
  const weapon = findItem(character, weaponId);
  const requested = Number(amount);
  if (!Number.isInteger(requested) || requested < 1) throw new Error("Ammunition use must be a positive whole number.");
  const summary = ammunitionSummary(character, weapon);
  if (!summary.required) throw new Error(`${weapon.name} does not use tracked ammunition.`);
  if (summary.available < requested) throw new Error(`${weapon.name} needs ${requested} ${summary.ammunitionType}${requested === 1 ? "" : "s"}, but only ${summary.available} remain.`);
  let remaining = requested;
  const spent = [];
  const nextInventory = inventory(character).map((item) => {
    if (!remaining || ammunitionTypeForItem(item) !== summary.ammunitionType) return item;
    const used = Math.min(remaining, Math.max(0, Number(item.quantity || 0)));
    if (!used) return item;
    remaining -= used;
    spent.push(`${item.name} ×${used}`);
    return { ...item, quantity: Number(item.quantity || 0) - used };
  });
  return appendHistoryEvent({ ...character, inventory: nextInventory }, {
    type: "ammunition-spent",
    title: `Used ammunition for ${weapon.name}`,
    detail: spent.join(" · "),
    changes: { ammunitionSpent: spent },
  });
}
