import { appendHistoryEvent } from "./history.js";
import { weaponRuleByName } from "./weapons.js";
import { normalizeRecordProvenance } from "./provenance.js";

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

const EDITABLE_ITEM_KINDS = new Set([
  "item",
  "weapon",
  "armor",
  "shield",
  "ammunition",
]);

const ABILITY_OVERRIDES = new Set([
  "auto",
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
]);

const PROFICIENCY_OVERRIDES = new Set([
  "auto",
  "proficient",
  "not-proficient",
]);

const ATTACK_TYPES = new Set([
  "melee",
  "ranged",
]);

const ARMOR_CATEGORIES = new Set([
  "",
  "light",
  "medium",
  "heavy",
]);

const WEAPON_PROPERTIES = new Set([
  "ammunition",
  "finesse",
  "heavy",
  "light",
  "loading",
  "reach",
  "special",
  "thrown",
  "two-handed",
  "versatile",
]);

function editableText(value, maximum = 10000) {
  const result = String(value ?? "");

  if (result.length > maximum) {
    throw new Error(
      `Editable text cannot exceed ${maximum} characters.`,
    );
  }

  return result;
}

function optionalNumber(
  value,
  {
    minimum = -999,
    maximum = 999,
    integer = false,
  } = {},
) {
  if (
    value == null
    || value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed)
    || parsed < minimum
    || parsed > maximum
    || (integer && !Number.isInteger(parsed))
  ) {
    throw new Error(
      `Numeric value must be between ${minimum} and ${maximum}${integer ? " and be a whole number" : ""}.`,
    );
  }

  return parsed;
}

function normalizedProperties(value) {
  const source = Array.isArray(value)
    ? value
    : [];

  return [
    ...new Set(
      source
        .map((entry) =>
          String(entry ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter((entry) =>
          WEAPON_PROPERTIES.has(entry),
        ),
    ),
  ];
}

function normalizedRange(value) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    return null;
  }

  const normal = optionalNumber(
    value.normal,
    {
      minimum: 0,
      maximum: 100000,
      integer: true,
    },
  );

  const long = optionalNumber(
    value.long,
    {
      minimum: 0,
      maximum: 100000,
      integer: true,
    },
  );

  if (
    normal == null
    && long == null
  ) {
    return null;
  }

  if (
    normal != null
    && long != null
    && long < normal
  ) {
    throw new Error(
      "Long range cannot be shorter than normal range.",
    );
  }

  return {
    normal: normal ?? 0,
    long: long ?? normal ?? 0,
    unit:
      editableText(
        value.unit || "feet",
        30,
      ).trim()
      || "feet",
  };
}

function normalizedSecondaryDamage(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.length > 12) {
    throw new Error(
      "An item cannot have more than 12 secondary damage packets.",
    );
  }

  return value.flatMap(
    (entry) => {
      if (
        !entry
        || typeof entry !== "object"
        || Array.isArray(entry)
      ) {
        return [];
      }

      const dice =
        editableText(
          entry.dice,
          40,
        ).trim();

      const type =
        editableText(
          entry.type,
          80,
        ).trim();

      const bonus =
        optionalNumber(
          entry.bonus,
          {
            minimum: -999,
            maximum: 999,
            integer: true,
          },
        ) ?? 0;

      if (
        !dice
        && !type
        && bonus === 0
      ) {
        return [];
      }

      return [{
        dice,
        type,
        bonus,
      }];
    },
  );
}

function normalizedEquipmentProfile(
  existing,
  patch,
) {
  const before =
    existing
    && typeof existing === "object"
    && !Array.isArray(existing)
      ? existing
      : {};

  const requested =
    patch
    && typeof patch === "object"
    && !Array.isArray(patch)
      ? {
          ...before,
          ...patch,
        }
      : before;

  const kind =
    String(
      requested.kind
      || before.kind
      || "item",
    )
      .trim()
      .toLowerCase();

  if (!EDITABLE_ITEM_KINDS.has(kind)) {
    throw new Error(
      `Unsupported equipment kind: ${kind}.`,
    );
  }

  if (kind === "item") {
    return null;
  }

  if (kind === "weapon") {
    const attackType =
      String(
        requested.attackType
        || "melee",
      )
        .trim()
        .toLowerCase();

    if (!ATTACK_TYPES.has(attackType)) {
      throw new Error(
        "Weapon attack type must be melee or ranged.",
      );
    }

    return {
      ...requested,
      kind: "weapon",

      name:
        editableText(
          requested.name,
          200,
        ).trim(),

      damageDice:
        editableText(
          requested.damageDice,
          40,
        ).trim()
        || "1d4",

      damageType:
        editableText(
          requested.damageType,
          80,
        ).trim(),

      properties:
        normalizedProperties(
          requested.properties,
        ),

      versatileDamage:
        editableText(
          requested.versatileDamage,
          40,
        ).trim(),

      isSimple:
        Boolean(requested.isSimple),

      isMartial:
        Boolean(requested.isMartial),

      attackType,

      range:
        normalizedRange(
          requested.range,
        ),

      ammunitionType:
        editableText(
          requested.ammunitionType,
          80,
        )
          .trim()
          .toLowerCase(),

      weight:
        optionalNumber(
          requested.weight,
          {
            minimum: 0,
            maximum: 100000,
          },
        ) ?? 0,
    };
  }

  if (kind === "armor") {
    const category =
      String(
        requested.category
        || "",
      )
        .trim()
        .toLowerCase();

    if (!ARMOR_CATEGORIES.has(category)) {
      throw new Error(
        "Armor category must be light, medium, heavy, or blank.",
      );
    }

    const acBase =
      optionalNumber(
        requested.acBase,
        {
          minimum: 0,
          maximum: 100,
          integer: true,
        },
      );

    if (acBase == null) {
      throw new Error(
        "Armor requires a base Armor Class.",
      );
    }

    const dexterityCap =
      optionalNumber(
        requested.dexterityCap,
        {
          minimum: -20,
          maximum: 20,
          integer: true,
        },
      );

    const strengthRequirement =
      optionalNumber(
        requested.strengthRequirement,
        {
          minimum: 0,
          maximum: 30,
          integer: true,
        },
      );

    return {
      ...requested,
      kind: "armor",
      acBase,
      addDexterity:
        Boolean(requested.addDexterity),
      dexterityCap:
        requested.addDexterity
          ? dexterityCap
          : null,
      acBonus:
        optionalNumber(
          requested.acBonus,
          {
            minimum: -50,
            maximum: 50,
            integer: true,
          },
        ) ?? 0,
      category,
      strengthRequirement,
      stealthDisadvantage:
        Boolean(
          requested.stealthDisadvantage,
        ),
    };
  }

  if (kind === "shield") {
    return {
      ...requested,
      kind: "shield",
      acBonus:
        optionalNumber(
          requested.acBonus,
          {
            minimum: -50,
            maximum: 50,
            integer: true,
          },
        ) ?? 2,
      weight:
        optionalNumber(
          requested.weight,
          {
            minimum: 0,
            maximum: 100000,
          },
        ) ?? 0,
    };
  }

  if (kind === "ammunition") {
    return {
      ...requested,
      kind: "ammunition",
      ammunitionType:
        editableText(
          requested.ammunitionType,
          80,
        )
          .trim()
          .toLowerCase(),
      weight:
        optionalNumber(
          requested.weight,
          {
            minimum: 0,
            maximum: 100000,
          },
        ) ?? 0,
    };
  }

  return null;
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }

  return value;
}

function editableEquipmentSnapshot(item) {
  const name = editableText(item?.name, 200).trim();
  const quantity = Math.max(
    0,
    Math.trunc(optionalNumber(item?.quantity ?? 1, {
      minimum: 0,
      maximum: 9999,
      integer: true,
    }) ?? 0),
  );
  const requestedKind = item?.equipment?.kind ?? "item";
  const equipment = normalizedEquipmentProfile(
    item?.equipment,
    {
      ...(item?.equipment || {}),
      kind: requestedKind,
      ...(String(requestedKind).toLowerCase() === "weapon"
        ? { name: item?.equipment?.name || name }
        : {}),
    },
  );

  return stableValue({
    ...item,
    name,
    quantity,
    detail: editableText(item?.detail, 20000),
    weight: optionalNumber(item?.weight, { minimum: 0, maximum: 100000 }) ?? 0,
    attackBonus: optionalNumber(item?.attackBonus, { minimum: -99, maximum: 99, integer: true }) ?? 0,
    damageBonus: optionalNumber(item?.damageBonus, { minimum: -99, maximum: 99, integer: true }) ?? 0,
    magicBonus: optionalNumber(item?.magicBonus, { minimum: -99, maximum: 99, integer: true }) ?? 0,
    attackAbility: String(item?.attackAbility || "auto").trim().toLowerCase(),
    proficiencyOverride: String(item?.proficiencyOverride || "auto").trim().toLowerCase(),
    secondaryDamage: normalizedSecondaryDamage(item?.secondaryDamage),
    provenance: normalizeRecordProvenance(item),
    equipment: equipment || undefined,
    equipped: quantity === 0 ? false : Boolean(item?.equipped),
    attuned: quantity === 0 ? false : Boolean(item?.attuned),
  });
}

export function updateEquipmentItem(
  character,
  itemId,
  patchValue,
  options = {},
) {
  const item = findItem(
    character,
    itemId,
  );

  if (
    !patchValue
    || typeof patchValue !== "object"
    || Array.isArray(patchValue)
  ) {
    throw new Error(
      "Equipment edit must be an object.",
    );
  }

  const patch = {
    ...patchValue,
  };

  const nextName =
    patch.name == null
      ? item.name
      : editableText(
          patch.name,
          200,
        ).trim();

  if (!nextName) {
    throw new Error(
      "Inventory items require a name.",
    );
  }

  const requestedKind =
    patch.equipment?.kind
    ?? item.equipment?.kind
    ?? "item";

  const normalizedEquipment =
    normalizedEquipmentProfile(
      item.equipment,
      {
        ...(patch.equipment || {}),
        kind: requestedKind,
        ...(String(requestedKind).toLowerCase() === "weapon"
          ? {
              name:
                patch.equipment?.name
                || nextName,
            }
          : {}),
      },
    );

  const attackAbility =
    String(
      patch.attackAbility
      ?? item.attackAbility
      ?? "auto",
    )
      .trim()
      .toLowerCase();

  if (!ABILITY_OVERRIDES.has(attackAbility)) {
    throw new Error(
      "Attack ability override is not supported.",
    );
  }

  const proficiencyOverride =
    String(
      patch.proficiencyOverride
      ?? item.proficiencyOverride
      ?? "auto",
    )
      .trim()
      .toLowerCase();

  if (
    !PROFICIENCY_OVERRIDES.has(
      proficiencyOverride,
    )
  ) {
    throw new Error(
      "Proficiency override is not supported.",
    );
  }

  const nextItem = {
    ...item,
    ...patch,

    id: item.id,

    name: nextName,

    quantity:
      patch.quantity == null
        ? item.quantity
        : Math.max(
            0,
            Math.trunc(
              optionalNumber(
                patch.quantity,
                {
                  minimum: 0,
                  maximum: 9999,
                  integer: true,
                },
              ) ?? 0,
            ),
          ),

    detail:
      patch.detail == null
        ? item.detail
        : editableText(
            patch.detail,
            20000,
          ),

    weight:
      patch.weight == null
        ? item.weight
        : optionalNumber(
            patch.weight,
            {
              minimum: 0,
              maximum: 100000,
            },
          ) ?? 0,

    attackBonus:
      patch.attackBonus == null
        ? item.attackBonus
        : optionalNumber(
            patch.attackBonus,
            {
              minimum: -99,
              maximum: 99,
              integer: true,
            },
          ) ?? 0,

    damageBonus:
      patch.damageBonus == null
        ? item.damageBonus
        : optionalNumber(
            patch.damageBonus,
            {
              minimum: -99,
              maximum: 99,
              integer: true,
            },
          ) ?? 0,

    magicBonus:
      patch.magicBonus == null
        ? item.magicBonus
        : optionalNumber(
            patch.magicBonus,
            {
              minimum: -99,
              maximum: 99,
              integer: true,
            },
          ) ?? 0,

    attackAbility,

    proficiencyOverride,

    secondaryDamage:
      patch.secondaryDamage == null
        ? normalizedSecondaryDamage(
            item.secondaryDamage,
          )
        : normalizedSecondaryDamage(
            patch.secondaryDamage,
          ),

    provenance:
      normalizeRecordProvenance({
        ...item,
        ...patch,
        provenance:
          patch.provenance
          || item.provenance,
      }),

    ...(normalizedEquipment
      ? {
          equipment:
            normalizedEquipment,
        }
      : {
          equipment: undefined,
        }),
  };

  if (
    Number(nextItem.quantity || 0) === 0
  ) {
    nextItem.equipped = false;
    nextItem.attuned = false;
  }

  if (
    JSON.stringify(editableEquipmentSnapshot(item))
      === JSON.stringify(editableEquipmentSnapshot(nextItem))
  ) {
    return character;
  }

  const nextInventory =
    changedInventory(
      character,
      itemId,
      () => nextItem,
    );

  const state = {
    ...character,
    inventory: nextInventory,
  };

  const beforeSummary =
    `${item.name} · ${item.equipment?.kind || "item"}`;

  const afterSummary =
    `${nextItem.name} · ${nextItem.equipment?.kind || "item"}`;

  if (options.recordHistory === false) {
    return state;
  }

  return withEquipmentHistory(
    state,
    `Edited ${nextItem.name}`,
    `${beforeSummary} → ${afterSummary}`,
    {
      itemId,
      item,
    },
    {
      itemId,
      item: nextItem,
    },
  );
}

export function createCustomEquipmentItem(
  character,
  itemId,
  patchValue,
) {
  if (!String(itemId || "").trim()) {
    throw new Error("Custom inventory items require an id.");
  }

  if (inventory(character).some((item) => item.id === itemId)) {
    throw new Error(`Inventory item already exists: ${itemId}.`);
  }

  const baseItem = {
    id: itemId,
    name: "New Custom Item",
    quantity: 1,
    detail: "",
    weight: 0,
    equipped: false,
    attuned: false,
    attackAbility: "auto",
    proficiencyOverride: "auto",
    attackBonus: 0,
    damageBonus: 0,
    magicBonus: 0,
    secondaryDamage: [],
    equipment: { kind: "item" },
    provenance: {
      type: "custom",
      source: "Custom",
      reviewStatus: "reviewed",
      reviewed: true,
    },
  };

  const normalized = updateEquipmentItem(
    {
      ...character,
      inventory: [...inventory(character), baseItem],
    },
    itemId,
    patchValue,
    { recordHistory: false },
  );
  const created = findItem(normalized, itemId);

  return appendHistoryEvent(normalized, {
    type: "item-added",
    title: `Created ${created.name}`,
    detail: "Custom inventory item created",
    changes: { itemsAdded: [created.name] },
    stateChanges: [{
      category: "equipment",
      before: null,
      after: { itemId, item: created },
    }],
  });
}

export function setEquipmentReviewed(
  character,
  itemId,
  reviewed = true,
) {
  const item = findItem(
    character,
    itemId,
  );

  const current =
    normalizeRecordProvenance(item);

  const nextReviewed =
    Boolean(reviewed);

  const nextProvenance = {
    ...current,
    reviewStatus:
      nextReviewed
        ? "reviewed"
        : current.type === "canonical"
          ? "trusted"
          : "review-required",
    reviewed:
      nextReviewed,
  };

  if (
    current.reviewStatus
      === nextProvenance.reviewStatus
    && Boolean(current.reviewed)
      === nextReviewed
  ) {
    return character;
  }

  const nextInventory =
    changedInventory(
      character,
      itemId,
      (candidate) => ({
        ...candidate,
        provenance: nextProvenance,
      }),
    );

  const state = {
    ...character,
    inventory: nextInventory,
  };

  return withEquipmentHistory(
    state,
    `${nextReviewed ? "Reviewed" : "Reopened"} ${item.name}`,
    `${item.name}: ${current.reviewStatus} → ${nextProvenance.reviewStatus}`,
    {
      itemId,
      provenance: current,
    },
    {
      itemId,
      provenance: nextProvenance,
    },
  );
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
