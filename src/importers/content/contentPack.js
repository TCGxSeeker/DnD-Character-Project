import { validateEffect } from "../../domain/effects.js";

export const CONTENT_PACK_KIND = "arcane-observatory-content-pack";
export const CONTENT_PACK_SCHEMA_VERSION = 1;
export const CONTENT_PACK_RULESET = "5e-2014";

export const CONTENT_COLLECTIONS = Object.freeze([
  "subclasses",
  "features",
  "spells",
  "feats",
  "items",
  "ancestries",
  "ancestryOptions",
  "backgrounds",
]);

export const MECHANICS_STATUSES = Object.freeze([
  "descriptive-only",
  "review-required",
  "reviewed",
  "mechanically-active",
]);

const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/;
const MECHANICS_STATUS_SET = new Set(MECHANICS_STATUSES);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function optionalText(value) {
  return String(value ?? "").trim();
}

function validId(value, label) {
  const id = requiredText(value, label);
  if (!ID_PATTERN.test(id)) {
    throw new Error(
      `${label} must use lowercase letters, numbers, dots, underscores, colons, or hyphens.`,
    );
  }
  return id;
}

function normalizePackSource(source) {
  if (source == null) {
    return {
      title: "",
      reference: "",
      notes: "",
    };
  }

  if (!isObject(source)) {
    throw new Error("Content pack source must be an object.");
  }

  return {
    ...clone(source),
    title: optionalText(source.title),
    reference: optionalText(source.reference),
    notes: optionalText(source.notes),
  };
}

function normalizeRecordSource(source, packId) {
  if (source == null) {
    return { packId };
  }

  if (!isObject(source)) {
    throw new Error("Content record source must be an object.");
  }

  return {
    ...clone(source),
    packId: optionalText(source.packId) || packId,
    page: source.page == null ? null : source.page,
    reference: optionalText(source.reference),
  };
}

function normalizeEffects(effects, label) {
  if (effects == null) return [];

  if (!Array.isArray(effects)) {
    throw new Error(`${label} effects must be an array.`);
  }

  return effects.map((effect, index) => {
    const result = validateEffect(effect, CONTENT_PACK_RULESET);

    if (!result.valid) {
      throw new Error(`${label} effect ${index + 1}: ${result.error}`);
    }

    return clone(effect);
  });
}

function normalizeRecord(collection, record, packId, seenIds) {
  if (!isObject(record)) {
    throw new Error(`${collection} entries must be objects.`);
  }

  const id = validId(record.id, `${collection} record id`);

  if (seenIds.has(id)) {
    throw new Error(`Duplicate ${collection} record id: ${id}.`);
  }

  seenIds.add(id);

  const name = requiredText(record.name, `${collection} record ${id} name`);
  const mechanicsStatus = optionalText(record.mechanicsStatus) || "descriptive-only";

  if (!MECHANICS_STATUS_SET.has(mechanicsStatus)) {
    throw new Error(
      `${collection} record ${id} has unsupported mechanicsStatus: ${mechanicsStatus}.`,
    );
  }

  if (collection === "subclasses") {
    requiredText(record.classId, `Subclass ${id} classId`);
  }

  if (collection === "ancestryOptions") {
    requiredText(record.ancestryId, `Ancestry option ${id} ancestryId`);
  }

  return {
    ...clone(record),
    id,
    name,
    mechanicsStatus,
    source: normalizeRecordSource(record.source, packId),
    effects: normalizeEffects(record.effects, `${collection} record ${id}`),
  };
}

function normalizeCollection(candidate, collection, packId) {
  const records = candidate[collection];

  if (records == null) return [];

  if (!Array.isArray(records)) {
    throw new Error(`${collection} must be an array.`);
  }

  const seenIds = new Set();

  return records.map((record) =>
    normalizeRecord(collection, record, packId, seenIds)
  );
}

function normalizePackMetadata(pack) {
  if (!isObject(pack)) {
    throw new Error("Content pack metadata is missing or malformed.");
  }

  const id = validId(pack.id, "Content pack id");
  const name = requiredText(pack.name, "Content pack name");
  const ruleset = optionalText(pack.ruleset) || CONTENT_PACK_RULESET;
  const version = optionalText(pack.version) || "1.0.0";
  const scope = optionalText(pack.scope) || "local";

  if (ruleset !== CONTENT_PACK_RULESET) {
    throw new Error(
      `Unsupported content pack ruleset: ${ruleset}. Expected ${CONTENT_PACK_RULESET}.`,
    );
  }

  if (scope !== "local") {
    throw new Error(`Unsupported content pack scope: ${scope}. Expected local.`);
  }

  return {
    ...clone(pack),
    id,
    name,
    ruleset,
    version,
    scope,
    source: normalizePackSource(pack.source),
  };
}

export function validateContentPack(candidate) {
  if (!isObject(candidate)) {
    throw new Error("Content pack must be a JSON object.");
  }

  if (candidate.kind !== CONTENT_PACK_KIND) {
    throw new Error(
      `Unsupported content pack kind: ${candidate.kind ?? "missing"}.`,
    );
  }

  const schemaVersion = Number(candidate.schemaVersion);

  if (!Number.isInteger(schemaVersion)) {
    throw new Error("Content pack schemaVersion is missing or malformed.");
  }

  if (schemaVersion !== CONTENT_PACK_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported content pack schema version: ${candidate.schemaVersion}.`,
    );
  }

  const pack = normalizePackMetadata(candidate.pack);

  const normalized = {
    ...clone(candidate),
    schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
    kind: CONTENT_PACK_KIND,
    pack,
  };

  for (const collection of CONTENT_COLLECTIONS) {
    normalized[collection] = normalizeCollection(candidate, collection, pack.id);
  }

  return normalized;
}

export function parseContentPack(text) {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Content pack is not valid JSON.");
  }

  return validateContentPack(parsed);
}

export function exportContentPack(candidate) {
  return JSON.stringify(validateContentPack(candidate), null, 2);
}

export function isContentPackCandidate(candidate) {
  return Boolean(
    isObject(candidate)
    && candidate.kind === CONTENT_PACK_KIND
    && Number(candidate.schemaVersion) === CONTENT_PACK_SCHEMA_VERSION
  );
}