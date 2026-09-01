const API_ROOT = "https://api.open5e.com/v2";
const DEFAULT_SOURCE = "srd-2014";
const CACHE_PREFIX = "arcane-open5e-v1";
const MAX_AGE = 1000 * 60 * 60 * 24 * 7;
const SPELL_FIELDS = [
  "key", "name", "level", "school", "casting_time", "reaction_condition", "range_text", "duration", "concentration", "ritual",
  "verbal", "somatic", "material", "material_specified", "desc", "higher_level", "document",
];

function cacheKey(resource, query, source) {
  return `${CACHE_PREFIX}:${resource}:${source}:${query.trim().toLowerCase()}`;
}

export function buildOpen5eUrl(resource, { query = "", source = DEFAULT_SOURCE, limit = 30, fields = [] } = {}) {
  const url = new URL(`${API_ROOT}/${resource}/`);
  url.searchParams.set("document__key__in", source);
  url.searchParams.set("limit", String(limit));
  if (query.trim()) url.searchParams.set("name__icontains", query.trim());
  if (fields.length) url.searchParams.set("fields", fields.join(","));
  return url.toString();
}

export async function fetchOpen5e(resource, options = {}) {
  const source = options.source || DEFAULT_SOURCE;
  const query = options.query || "";
  const storage = options.storage ?? globalThis.localStorage;
  const key = cacheKey(resource, query, source);
  const cached = storage?.getItem(key);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.cachedAt < MAX_AGE) return { ...parsed, fromCache: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? 12000);
  try {
    const response = await fetch(buildOpen5eUrl(resource, options), { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Open5e returned ${response.status}.`);
    const payload = await response.json();
    const result = { results: payload.results || [], count: payload.count || 0, cachedAt: Date.now(), source };
    try { storage?.setItem(key, JSON.stringify(result)); } catch { /* cache failure is non-fatal */ }
    return result;
  } catch (error) {
    if (cached) return { ...JSON.parse(cached), fromCache: true, stale: true };
    if (error.name === "AbortError") throw new Error("Open5e took too long to respond.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function searchSpells(query, options = {}) {
  return fetchOpen5e("spells", {
    ...options,
    query,
    fields: SPELL_FIELDS,
  });
}

export async function getSpellByName(name, options = {}) {
  const payload = await searchSpells(name, { ...options, limit: 20 });
  const spell = payload.results.find((entry) => entry.name.toLowerCase() === String(name).trim().toLowerCase());
  if (!spell) throw new Error(`${name} was not found in the Open5e SRD 2014 spell catalog.`);
  return { ...spell, fromCache: payload.fromCache, stale: payload.stale };
}

export function spellRecordFromOpen5e(spell, overrides = {}) {
  return {
    id: spell.key,
    canonicalId: spell.key,
    name: spell.name,
    level: spell.level,
    school: spell.school?.name || "",
    castingTime: spell.casting_time,
    reactionCondition: spell.reaction_condition || "",
    range: spell.range_text,
    duration: spell.duration,
    concentration: Boolean(spell.concentration),
    ritual: Boolean(spell.ritual),
    verbal: Boolean(spell.verbal),
    somatic: Boolean(spell.somatic),
    material: Boolean(spell.material),
    materialSpecified: spell.material_specified || "",
    desc: spell.desc || "",
    higherLevel: spell.higher_level || "",
    prepared: false,
    source: spell.document?.display_name || "Open5e",
    sourceUrl: spell.document?.permalink || "",
    ...overrides,
  };
}

export function searchItems(query, options = {}) {
  return fetchOpen5e("items", {
    ...options,
    query,
    fields: ["key", "name", "desc", "category", "armor", "weapon", "cost", "weight", "requires_attunement", "document"],
  });
}
