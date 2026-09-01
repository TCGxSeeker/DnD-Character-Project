import { abilityModifier } from "./rules.js";
import { firstUnarmoredDefense } from "./multiclass.js";
import { carryingSummary } from "./equipment.js";
import { weaponEquipmentFromOpen5e } from "./weapons.js";
import { startingProficiencies } from "../data/startingProficiencies2014.js";
import { applyNumericEffects, collectCharacterEffects } from "./effects.js";

const SRD_ARMOR = {
  padded: { acBase: 11, addDexterity: true, dexterityCap: null, category: "light", strengthRequirement: null, stealthDisadvantage: true },
  leather: { acBase: 11, addDexterity: true, dexterityCap: null, category: "light", strengthRequirement: null, stealthDisadvantage: false },
  "studded leather": { acBase: 12, addDexterity: true, dexterityCap: null, category: "light", strengthRequirement: null, stealthDisadvantage: false },
  hide: { acBase: 12, addDexterity: true, dexterityCap: 2, category: "medium", strengthRequirement: null, stealthDisadvantage: false },
  "chain shirt": { acBase: 13, addDexterity: true, dexterityCap: 2, category: "medium", strengthRequirement: null, stealthDisadvantage: false },
  "scale mail": { acBase: 14, addDexterity: true, dexterityCap: 2, category: "medium", strengthRequirement: null, stealthDisadvantage: true },
  breastplate: { acBase: 14, addDexterity: true, dexterityCap: 2, category: "medium", strengthRequirement: null, stealthDisadvantage: false },
  "half plate": { acBase: 15, addDexterity: true, dexterityCap: 2, category: "medium", strengthRequirement: null, stealthDisadvantage: true },
  "ring mail": { acBase: 14, addDexterity: false, dexterityCap: null, category: "heavy", strengthRequirement: null, stealthDisadvantage: true },
  "chain mail": { acBase: 16, addDexterity: false, dexterityCap: null, category: "heavy", strengthRequirement: 13, stealthDisadvantage: true },
  splint: { acBase: 17, addDexterity: false, dexterityCap: null, category: "heavy", strengthRequirement: 15, stealthDisadvantage: true },
  plate: { acBase: 18, addDexterity: false, dexterityCap: null, category: "heavy", strengthRequirement: 15, stealthDisadvantage: true },
};

function normalizedArmorName(item) {
  return String(item?.armor?.name || item?.name || "").toLowerCase().replace(/\s+armor$/, "").trim();
}

function parseLegacyArmorDetail(detail) {
  const match = String(detail || "").match(/(?:armor class|ac)\s*(\d+)(?:\s*\+\s*dex(?:terity)?(?: modifier)?)?(?:\s*\(max\s*(\d+)\))?/i);
  if (!match) return null;
  return { acBase: Number(match[1]), addDexterity: /\+\s*dex/i.test(match[0]), dexterityCap: match[2] == null ? null : Number(match[2]) };
}

export function equipmentProfile(item) {
  const stored = item?.equipment;
  if (stored?.kind === "armor") {
    const inferred = SRD_ARMOR[normalizedArmorName(item)] || {};
    return { kind: "armor", acBase: Number(stored.acBase ?? inferred.acBase), addDexterity: stored.addDexterity == null ? Boolean(inferred.addDexterity) : Boolean(stored.addDexterity), dexterityCap: stored.dexterityCap == null ? (inferred.dexterityCap ?? null) : Number(stored.dexterityCap), acBonus: Number(stored.acBonus || 0), category: String(stored.category || inferred.category || ""), strengthRequirement: stored.strengthRequirement == null ? (inferred.strengthRequirement ?? null) : Number(stored.strengthRequirement), stealthDisadvantage: stored.stealthDisadvantage == null ? Boolean(inferred.stealthDisadvantage) : Boolean(stored.stealthDisadvantage) };
  }
  if (stored?.kind === "shield") return { kind: "shield", acBonus: Number(stored.acBonus || 2) };
  if (item?.armor) {
    const inferred = SRD_ARMOR[normalizedArmorName(item)] || {};
    return { kind: "armor", acBase: Number(item.armor.ac_base), addDexterity: Boolean(item.armor.ac_add_dexmod), dexterityCap: item.armor.ac_cap_dexmod == null ? null : Number(item.armor.ac_cap_dexmod), acBonus: Number(item.acBonus || 0), category: String(item.armor.category || inferred.category || "").toLowerCase(), strengthRequirement: item.armor.strength_score == null ? (inferred.strengthRequirement ?? null) : Number(item.armor.strength_score), stealthDisadvantage: item.armor.grants_stealth_disadvantage == null ? Boolean(inferred.stealthDisadvantage) : Boolean(item.armor.grants_stealth_disadvantage) };
  }
  const category = String(item?.category?.key || item?.category || "").toLowerCase();
  if (category === "shield" || normalizedArmorName(item) === "shield") return { kind: "shield", acBonus: Number(item.acBonus || 2) };
  const rule = SRD_ARMOR[normalizedArmorName(item)] || parseLegacyArmorDetail(item?.detail);
  return rule ? { kind: "armor", ...rule, acBonus: Number(item.acBonus || 0) } : null;
}

function armorValue(profile, dexterityModifier) {
  if (!profile.addDexterity) return profile.acBase + profile.acBonus;
  const dexterity = profile.dexterityCap == null ? dexterityModifier : Math.min(dexterityModifier, profile.dexterityCap);
  return profile.acBase + dexterity + profile.acBonus;
}

function isEquipped(item) {
  return item?.equipped && Number(item.quantity ?? 1) > 0;
}

function classLevel(character, classId) {
  return Number(character?.classLevels?.find((entry) => entry.classId === classId)?.level || 0);
}

function hasChoice(character, choiceId, selection) {
  return (character?.classChoices || []).some((choice) => choice.id === choiceId && choice.selections?.includes(selection));
}

function hasSubclass(character, classId, subclassId) {
  const entry = character?.classLevels?.find((candidate) => candidate.classId === classId);
  return entry?.subclassId === subclassId || String(entry?.subclass || "").toLowerCase().includes(subclassId.replaceAll("-", " "));
}

export function calculateBaseArmorClass(character) {
  const dexterityModifier = abilityModifier(character?.abilities?.dexterity ?? 10);
  const equipped = (character?.inventory || []).filter(isEquipped);
  const profiles = equipped.map((item) => ({ item, profile: equipmentProfile(item) })).filter(({ profile }) => profile);
  const armorValues = profiles.filter(({ profile }) => profile.kind === "armor").map(({ profile }) => armorValue(profile, dexterityModifier));
  const bonuses = character?.armorClassBonuses || {};
  const persistentBonus = Number(bonuses.ancestry || 0) + Number(bonuses.misc || 0);
  const shieldEquipped = profiles.some(({ profile }) => profile.kind === "shield");
  const unarmoredCandidates = [Number(character?.unarmoredArmorClass ?? character?.armorClass ?? 10 + dexterityModifier) + Number(bonuses.misc || 0)];
  const unarmoredDefense = firstUnarmoredDefense(character);
  if (unarmoredDefense === "barbarian") unarmoredCandidates.push(10 + dexterityModifier + abilityModifier(character.abilities.constitution) + persistentBonus);
  if (unarmoredDefense === "monk" && !shieldEquipped) unarmoredCandidates.push(10 + dexterityModifier + abilityModifier(character.abilities.wisdom) + persistentBonus);
  const base = armorValues.length
    ? Math.max(...armorValues) + persistentBonus
    : Math.max(...unarmoredCandidates);
  const shieldBonus = Math.max(0, ...profiles.filter(({ profile }) => profile.kind === "shield").map(({ profile }) => profile.acBonus));
  const otherBonus = equipped.filter((item) => !equipmentProfile(item) && Number.isFinite(Number(item.acBonus))).reduce((sum, item) => sum + Number(item.acBonus), 0);
  return base + shieldBonus + otherBonus;
}

export function calculateArmorClass(character) {
  return applyNumericEffects(calculateBaseArmorClass(character), "armorClass", collectCharacterEffects(character)).value;
}

export function calculateBaseSpeed(character) {
  let speed = Number(character?.speed || 30);
  const equipped = (character?.inventory || []).filter(isEquipped);
  const armorNames = equipped.filter((item) => equipmentProfile(item)?.kind === "armor").map(normalizedArmorName);
  const hasArmor = armorNames.length > 0;
  const hasShield = equipped.some((item) => equipmentProfile(item)?.kind === "shield");
  const heavy = armorNames.some((name) => ["ring mail", "chain mail", "splint", "plate"].includes(name));
  const carrying = carryingSummary(character);
  const requirements = equippedArmorRequirements(character);
  const armorPenalty = carrying.variantEnabled ? 0 : requirements.speedPenalty;
  return Math.max(0, speed - armorPenalty - carrying.speedPenalty);
}

export function calculateSpeed(character) {
  return applyNumericEffects(calculateBaseSpeed(character), "speed", collectCharacterEffects(character)).value;
}

function knownAncestryArmorBonus(character) {
  if (Number.isFinite(Number(character?.armorClassBonuses?.ancestry))) return Number(character.armorClassBonuses.ancestry);
  return /^warforged\b/i.test(String(character?.ancestry || "")) ? 1 : 0;
}

export function equippedArmorRequirements(character) {
  const strength = Number(character?.abilities?.strength || 0);
  const dwarf = character?.ancestryId === "dwarf" || /^dwarf\b/i.test(String(character?.ancestry || ""));
  const variantEnabled = Boolean(character?.rulesOptions?.variantEncumbrance);
  const savedProficiencies = character?.proficiencies?.armor || [];
  const originalClassId = character?.levelHistory?.[0]?.classId || character?.classLevels?.[0]?.classId;
  const derivedProficiencies = originalClassId ? startingProficiencies(originalClassId).armor : [];
  const proficiencies = (savedProficiencies.length ? savedProficiencies : derivedProficiencies).map((entry) => String(entry).toLowerCase());
  const proficiencyStateKnown = savedProficiencies.length > 0 || Boolean(originalClassId);
  const entries = (character?.inventory || []).filter(isEquipped).map((item) => ({ item, profile: equipmentProfile(item) })).filter(({ profile }) => ["armor", "shield"].includes(profile?.kind)).map(({ item, profile }) => {
    const required = profile.strengthRequirement;
    const armorName = normalizedArmorName(item);
    const proficient = proficiencyStateKnown ? profile.kind === "shield"
      ? proficiencies.includes("shields") || proficiencies.includes("shield")
      : proficiencies.includes(`${profile.category} armor`) || proficiencies.includes(armorName) || proficiencies.includes(`${armorName} armor`)
      : null;
    const strengthMet = required == null || strength >= required || dwarf || variantEnabled;
    return { itemId: item.id, name: item.name, kind: profile.kind, category: profile.kind === "shield" ? "shield" : profile.category, strengthRequirement: required, strengthMet, proficient, stealthDisadvantage: Boolean(profile.stealthDisadvantage) };
  });
  return {
    entries,
    speedPenalty: entries.some((entry) => !entry.strengthMet) ? 10 : 0,
    armorStrengthIgnored: variantEnabled,
    hasProficiencyViolation: entries.some((entry) => entry.proficient === false),
    hasStealthDisadvantage: entries.some((entry) => entry.stealthDisadvantage),
  };
}

export function armorProficiencyRestrictions(character) {
  const requirements = equippedArmorRequirements(character);
  const violatingItems = requirements.entries.filter((entry) => entry.proficient === false).map((entry) => entry.name);
  const active = violatingItems.length > 0;
  const reason = active ? `Not proficient with equipped ${violatingItems.join(" and ")}` : "";
  return {
    active,
    violatingItems,
    reason,
    disadvantagedAbilities: active ? ["strength", "dexterity"] : [],
    spellcastingAllowed: !active,
    hasStealthDisadvantage: requirements.hasStealthDisadvantage,
  };
}

export function normalizeArmorCharacter(character) {
  if (Number.isFinite(Number(character?.unarmoredArmorClass))) return character;
  const dexterityModifier = abilityModifier(character?.abilities?.dexterity ?? 10);
  const ancestry = knownAncestryArmorBonus(character);
  const equippedProfiles = (character?.inventory || []).filter(isEquipped).map(equipmentProfile).filter(Boolean);
  const armorValues = equippedProfiles.filter((profile) => profile.kind === "armor").map((profile) => armorValue(profile, dexterityModifier));
  const shield = Math.max(0, ...equippedProfiles.filter((profile) => profile.kind === "shield").map((profile) => profile.acBonus));
  const storedArmorClass = Number(character?.armorClass ?? 10 + dexterityModifier + ancestry);
  const misc = armorValues.length ? Math.max(0, storedArmorClass - Math.max(...armorValues) - ancestry - shield) : Number(character?.armorClassBonuses?.misc || 0);
  return { ...character, unarmoredArmorClass: armorValues.length ? 10 + dexterityModifier + ancestry : storedArmorClass - misc, armorClassBonuses: { ...character.armorClassBonuses, ancestry, misc } };
}

export function equipmentFromOpen5e(item) {
  const categoryKey = String(item?.category?.key || "").toLowerCase();
  let equipment;
  if (item?.armor) {
    const inferred = SRD_ARMOR[normalizedArmorName(item)] || {};
    equipment = { kind: "armor", acBase: Number(item.armor.ac_base), addDexterity: Boolean(item.armor.ac_add_dexmod), dexterityCap: item.armor.ac_cap_dexmod == null ? null : Number(item.armor.ac_cap_dexmod), acBonus: 0, category: String(item.armor.category || inferred.category || "").toLowerCase(), strengthRequirement: item.armor.strength_score == null ? (inferred.strengthRequirement ?? null) : Number(item.armor.strength_score), stealthDisadvantage: item.armor.grants_stealth_disadvantage == null ? Boolean(inferred.stealthDisadvantage) : Boolean(item.armor.grants_stealth_disadvantage) };
  } else if (categoryKey === "shield" || /^shield$/i.test(String(item?.name || ""))) {
    equipment = { kind: "shield", acBonus: 2 };
  }
  if (item?.weapon) {
    equipment = weaponEquipmentFromOpen5e(item);
  }
  const detail = item?.armor?.ac_display ? `AC ${item.armor.ac_display}` : item?.weapon ? `${item.weapon.damage_dice || "1d4"} ${item.weapon.damage_type?.name || "damage"}` : [item?.category?.name, item?.cost ? `${item.cost} gp` : ""].filter(Boolean).join(" · ");
  return { id: item.key, name: item.name, quantity: 1, equipped: false, detail, weight: Math.max(0, Number(item?.weight || 0)), ...(equipment ? { equipment } : {}), ...(item?.weapon ? { weapon: item.weapon } : {}), ...(item?.requires_attunement != null ? { requiresAttunement: Boolean(item.requires_attunement) } : {}) };
}
