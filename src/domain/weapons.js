const RANGED_WEAPONS = new Set([
  "blowgun", "crossbow, hand", "hand crossbow", "crossbow, heavy", "heavy crossbow", "crossbow, light", "light crossbow",
  "dart", "longbow", "net", "shortbow", "sling",
]);

const SRD_RANGES = {
  dagger: [20, 60], handaxe: [20, 60], javelin: [30, 120], "light hammer": [20, 60], spear: [20, 60],
  "crossbow, light": [80, 320], "light crossbow": [80, 320], dart: [20, 60], shortbow: [80, 320], sling: [30, 120],
  trident: [20, 60], net: [5, 15], blowgun: [25, 100], "crossbow, hand": [30, 120], "hand crossbow": [30, 120],
  "crossbow, heavy": [100, 400], "heavy crossbow": [100, 400], longbow: [150, 600],
};

const rule = (damageDice, damageType, category, properties = [], extra = {}) => ({
  kind: "weapon", damageDice, damageType, isSimple: category === "simple", isMartial: category === "martial", properties, ...extra,
});

export const SRD_WEAPONS_2014 = {
  club: rule("1d4", "Bludgeoning", "simple", ["light"], { weight: 2 }),
  dagger: rule("1d4", "Piercing", "simple", ["finesse", "light", "thrown"], { weight: 1, range: { normal: 20, long: 60, unit: "feet" } }),
  greatclub: rule("1d8", "Bludgeoning", "simple", ["two-handed"], { weight: 10 }),
  handaxe: rule("1d6", "Slashing", "simple", ["light", "thrown"], { weight: 2, range: { normal: 20, long: 60, unit: "feet" } }),
  javelin: rule("1d6", "Piercing", "simple", ["thrown"], { weight: 2, range: { normal: 30, long: 120, unit: "feet" } }),
  "light hammer": rule("1d4", "Bludgeoning", "simple", ["light", "thrown"], { weight: 2, range: { normal: 20, long: 60, unit: "feet" } }),
  mace: rule("1d6", "Bludgeoning", "simple", [], { weight: 4 }),
  quarterstaff: rule("1d6", "Bludgeoning", "simple", ["versatile"], { weight: 4, versatileDamage: "1d8" }),
  sickle: rule("1d4", "Slashing", "simple", ["light"], { weight: 2 }),
  spear: rule("1d6", "Piercing", "simple", ["thrown", "versatile"], { weight: 3, versatileDamage: "1d8", range: { normal: 20, long: 60, unit: "feet" } }),
  "light crossbow": rule("1d8", "Piercing", "simple", ["ammunition", "loading", "two-handed"], { attackType: "ranged", weight: 5, range: { normal: 80, long: 320, unit: "feet" }, ammunitionType: "bolt" }),
  dart: rule("1d4", "Piercing", "simple", ["finesse", "thrown"], { attackType: "ranged", weight: 0.25, range: { normal: 20, long: 60, unit: "feet" } }),
  shortbow: rule("1d6", "Piercing", "simple", ["ammunition", "two-handed"], { attackType: "ranged", weight: 2, range: { normal: 80, long: 320, unit: "feet" }, ammunitionType: "arrow" }),
  sling: rule("1d4", "Bludgeoning", "simple", ["ammunition"], { attackType: "ranged", weight: 0, range: { normal: 30, long: 120, unit: "feet" }, ammunitionType: "sling bullet" }),
  battleaxe: rule("1d8", "Slashing", "martial", ["versatile"], { weight: 4, versatileDamage: "1d10" }),
  flail: rule("1d8", "Bludgeoning", "martial", [], { weight: 2 }),
  glaive: rule("1d10", "Slashing", "martial", ["heavy", "reach", "two-handed"], { weight: 6 }),
  greataxe: rule("1d12", "Slashing", "martial", ["heavy", "two-handed"], { weight: 7 }),
  greatsword: rule("2d6", "Slashing", "martial", ["heavy", "two-handed"], { weight: 6 }),
  halberd: rule("1d10", "Slashing", "martial", ["heavy", "reach", "two-handed"], { weight: 6 }),
  lance: rule("1d12", "Piercing", "martial", ["reach", "special"], { weight: 6 }),
  longsword: rule("1d8", "Slashing", "martial", ["versatile"], { weight: 3, versatileDamage: "1d10" }),
  maul: rule("2d6", "Bludgeoning", "martial", ["heavy", "two-handed"], { weight: 10 }),
  morningstar: rule("1d8", "Piercing", "martial", [], { weight: 4 }),
  pike: rule("1d10", "Piercing", "martial", ["heavy", "reach", "two-handed"], { weight: 18 }),
  rapier: rule("1d8", "Piercing", "martial", ["finesse"], { weight: 2 }),
  scimitar: rule("1d6", "Slashing", "martial", ["finesse", "light"], { weight: 3 }),
  shortsword: rule("1d6", "Piercing", "martial", ["finesse", "light"], { weight: 2 }),
  trident: rule("1d6", "Piercing", "martial", ["thrown", "versatile"], { weight: 4, versatileDamage: "1d8", range: { normal: 20, long: 60, unit: "feet" } }),
  "war pick": rule("1d8", "Piercing", "martial", [], { weight: 2 }),
  warhammer: rule("1d8", "Bludgeoning", "martial", ["versatile"], { weight: 2, versatileDamage: "1d10" }),
  whip: rule("1d4", "Slashing", "martial", ["finesse", "reach"], { weight: 3 }),
  blowgun: rule("1", "Piercing", "martial", ["ammunition", "loading"], { attackType: "ranged", weight: 1, range: { normal: 25, long: 100, unit: "feet" }, ammunitionType: "needle" }),
  "hand crossbow": rule("1d6", "Piercing", "martial", ["ammunition", "light", "loading"], { attackType: "ranged", weight: 3, range: { normal: 30, long: 120, unit: "feet" }, ammunitionType: "bolt" }),
  "heavy crossbow": rule("1d10", "Piercing", "martial", ["ammunition", "heavy", "loading", "two-handed"], { attackType: "ranged", weight: 18, range: { normal: 100, long: 400, unit: "feet" }, ammunitionType: "bolt" }),
  longbow: rule("1d8", "Piercing", "martial", ["ammunition", "heavy", "two-handed"], { attackType: "ranged", weight: 2, range: { normal: 150, long: 600, unit: "feet" }, ammunitionType: "arrow" }),
  net: rule("—", "", "martial", ["special", "thrown"], { attackType: "ranged", weight: 3, range: { normal: 5, long: 15, unit: "feet" } }),
};

const ALIASES = { "crossbow, light": "light crossbow", "crossbow, hand": "hand crossbow", "crossbow, heavy": "heavy crossbow" };

export function weaponRuleByName(name) {
  const normalized = normalizedName(name);
  const key = ALIASES[normalized] || normalized;
  const found = SRD_WEAPONS_2014[key];
  return found ? { name: String(name), ...found } : null;
}

const normalizedName = (value) => String(value || "").toLowerCase().trim();
const propertyEntries = (weapon) => Array.isArray(weapon?.properties) ? weapon.properties : [];
const propertyName = (entry) => normalizedName(entry?.property?.name || entry?.name || entry);
const propertyNames = (weapon) => propertyEntries(weapon).map(propertyName);

function propertyDetail(weapon, name) {
  return propertyEntries(weapon).find((entry) => propertyName(entry) === name)?.detail || "";
}

function parsedRange(weapon, name) {
  const detail = propertyDetail(weapon, "ammunition") || propertyDetail(weapon, "thrown") || String(weapon?.range || "");
  const match = String(detail).match(/(\d+)\s*\/\s*(\d+)/);
  if (match) return { normal: Number(match[1]), long: Number(match[2]), unit: "feet" };
  const fallback = SRD_RANGES[normalizedName(name)];
  return fallback ? { normal: fallback[0], long: fallback[1], unit: "feet" } : null;
}

function ammunitionType(name) {
  if (name.includes("crossbow")) return "bolt";
  if (name.includes("sling")) return "sling bullet";
  if (name.includes("blowgun")) return "needle";
  if (name.includes("bow")) return "arrow";
  return "";
}

export function weaponProfile(item) {
  const stored = item?.equipment?.kind === "weapon" ? item.equipment : null;
  const raw = stored || item?.weapon || weaponRuleByName(item?.name);
  if (!raw) return null;
  const name = String(raw.name || item?.weapon?.name || item?.name || "Weapon");
  const normalized = normalizedName(name);
  const canonicalName = ALIASES[normalized] || normalized;
  const properties = propertyNames(raw);
  const has = (property) => properties.includes(property);
  const attackType = String(raw.attackType || raw.attack_type || (RANGED_WEAPONS.has(normalized) ? "ranged" : "melee")).toLowerCase();
  const versatileDamage = raw.versatileDamage || propertyDetail(raw, "versatile") || "";
  return {
    kind: "weapon", name,
    damageDice: raw.damageDice || raw.damage_dice || "1d4",
    damageType: raw.damageType || raw.damage_type?.name || "",
    properties, versatileDamage,
    isSimple: Boolean(raw.isSimple ?? raw.is_simple), isMartial: Boolean(raw.isMartial ?? raw.is_martial),
    attackType, ranged: attackType === "ranged", finesse: Boolean(raw.finesse ?? has("finesse")),
    light: Boolean(raw.light ?? has("light")), heavy: Boolean(raw.heavy ?? has("heavy")), loading: Boolean(raw.loading ?? has("loading")),
    reach: Boolean(raw.reach ?? has("reach")), thrown: Boolean(raw.thrown ?? has("thrown")),
    twoHanded: Boolean(raw.twoHanded ?? has("two-handed")), versatile: Boolean(raw.versatile ?? has("versatile")), special: Boolean(raw.special ?? has("special")),
    specialRuleId: raw.specialRuleId || (canonicalName === "lance" || canonicalName === "net" ? canonicalName : null),
    range: raw.range || parsedRange(raw, name),
    ammunitionType: raw.ammunitionType || ammunitionType(normalized),
    weight: Number(raw.weight ?? item?.weight ?? 0),
  };
}

export function weaponEquipmentFromOpen5e(item) {
  if (!item?.weapon) return null;
  return weaponProfile({ ...item, equipment: null });
}

export function weaponEquipmentByName(name) {
  return weaponProfile({ name });
}
