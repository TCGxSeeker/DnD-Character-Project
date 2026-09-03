export const RECORD_PROVENANCE_TYPES = Object.freeze([
  "canonical",
  "local-content",
  "cah-import",
  "custom",
  "legacy",
]);

export const RECORD_REVIEW_STATUSES = Object.freeze([
  "trusted",
  "review-required",
  "reviewed",
]);

export const ABILITY_SCORE_METHODS = Object.freeze([
  "manual",
  "point-buy",
  "rolled",
  "imported",
  "legacy",
]);

const ABILITY_SCORE_DISPLAY_LABELS = Object.freeze({
  manual: "Manual",
  "point-buy": "Point Buy",
  rolled: "Rolled",
  imported: "Imported",
  legacy: "Unrecorded",
});

const record = (value) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};

const text = (value) =>
  String(value ?? "").trim();

const cloneScores = (scores) => {
  const source = record(scores);
  const result = {};

  for (const ability of [
    "strength",
    "dexterity",
    "constitution",
    "intelligence",
    "wisdom",
    "charisma",
  ]) {
    const value = Number(source[ability]);

    if (Number.isFinite(value)) {
      result[ability] = value;
    }
  }

  return result;
};

function detectedRecordType(source) {
  if (
    source.localContent === true
    || text(source.packId)
  ) {
    return "local-content";
  }

  if (
    source.imported === true
    || text(source.importedFrom)
      .toLowerCase()
      .includes("5e companion")
    || text(source.source)
      .toLowerCase()
      .includes("imported")
  ) {
    return "cah-import";
  }

  if (
    source.custom === true
    || source.isCustom === true
  ) {
    return "custom";
  }

  if (
    source.granted === true
    || text(source.id).startsWith("class-choice-")
    || text(source.id).startsWith("starting-")
  ) {
    return "canonical";
  }

  return "legacy";
}

function defaultSourceLabel(type, source) {
  if (type === "local-content") {
    return text(source.packId)
      ? `Local content · ${source.packId}`
      : "Local content";
  }

  if (type === "cah-import") {
    return "5e Companion";
  }

  if (type === "custom") {
    return "Custom";
  }

  if (type === "canonical") {
    return "Arcane Observatory";
  }

  return "Legacy character data";
}

function defaultReviewStatus(type) {
  if (
    type === "cah-import"
    || type === "custom"
    || type === "local-content"
  ) {
    return "review-required";
  }

  return "trusted";
}

export function normalizeRecordProvenance(sourceValue) {
  const source = record(sourceValue);
  const existing = record(source.provenance);

  const detected = detectedRecordType(source);

  const type = RECORD_PROVENANCE_TYPES.includes(
    existing.type,
  )
    ? existing.type
    : detected;

  let reviewStatus =
    RECORD_REVIEW_STATUSES.includes(
      existing.reviewStatus,
    )
      ? existing.reviewStatus
      : defaultReviewStatus(type);

  if (existing.reviewed === true) {
    reviewStatus = "reviewed";
  }

  return {
    type,
    source:
      text(existing.source)
      || defaultSourceLabel(type, source),
    reviewStatus,
    reviewed:
      reviewStatus === "reviewed"
      || existing.reviewed === true,
  };
}

export function normalizeAbilityScoreGeneration(
  characterValue,
) {
  const character = record(characterValue);

  const existing = record(
    character.abilityScoreGeneration,
  );

  let method = ABILITY_SCORE_METHODS.includes(
    existing.method,
  )
    ? existing.method
    : "";

  if (!method) {
    method =
      text(character.importMetadata?.format)
        .toLowerCase() === "5e-companion-cah"
        ? "imported"
        : "legacy";
  }

  const label =
    text(existing.label)
    || (
      method === "manual"
        ? "Manual"
        : method === "point-buy"
          ? "2014 Point Buy"
          : method === "rolled"
            ? "Rolled"
            : method === "imported"
              ? "Imported"
              : "Unrecorded"
    );

  return {
    ...existing,
    method,
    label,

    baseScores: cloneScores(
      Object.keys(
        record(existing.baseScores),
      ).length
        ? existing.baseScores
        : character.abilities,
    ),

    finalScores: cloneScores(
      Object.keys(
        record(existing.finalScores),
      ).length
        ? existing.finalScores
        : character.abilities,
    ),
  };
}

export function abilityScoreGenerationDisplay(characterValue) {
  const normalized = normalizeAbilityScoreGeneration(characterValue);

  return {
    ...normalized,
    label:
      ABILITY_SCORE_DISPLAY_LABELS[normalized.method]
      || ABILITY_SCORE_DISPLAY_LABELS.legacy,
  };
}

export function creationAbilityScoreMethod(method) {
  if (method === "point-buy" || method === "rolled") {
    return method;
  }

  return "manual";
}

export function normalizeCharacterProvenance(
  characterValue,
) {
  const character = record(characterValue);

  return {
    ...character,

    abilityScoreGeneration:
      normalizeAbilityScoreGeneration(character),

    inventory: Array.isArray(character.inventory)
      ? character.inventory.map((item) => ({
          ...item,
          provenance:
            normalizeRecordProvenance(item),
        }))
      : [],

    features: Array.isArray(character.features)
      ? character.features.map((feature) => ({
          ...feature,
          provenance:
            normalizeRecordProvenance(feature),
        }))
      : [],
  };
}

export function abilityScoreGenerationRecord({
  method,
  baseScores,
  finalScores,
  label = "",
  rolled,
} = {}) {
  if (!ABILITY_SCORE_METHODS.includes(method)) {
    throw new Error(
      `Unsupported ability score generation method: ${method}.`,
    );
  }

  return {
    method,

    label:
      text(label)
      || (
        method === "manual"
          ? "Manual"
          : method === "point-buy"
            ? "2014 Point Buy"
            : method === "rolled"
              ? "Rolled"
              : method === "imported"
                ? "Imported"
                : "Unrecorded"
      ),

    baseScores: cloneScores(baseScores),

    finalScores: cloneScores(
      finalScores || baseScores,
    ),

    ...(
      method === "rolled"
      && rolled
      && typeof rolled === "object"
      && !Array.isArray(rolled)
        ? {
            rolled: {
              ...rolled,
            },
          }
        : {}
    ),
  };
}
