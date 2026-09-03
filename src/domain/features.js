import { appendHistoryEvent } from "./history.js";
import { normalizeRecordProvenance } from "./provenance.js";

const MECHANIC_FIELDS = [
  "activation",
  "trigger",
  "range",
  "duration",
  "target",
  "uses",
  "reset",
  "saveCheck",
  "notes",
];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function editableText(
  value,
  maximum = 20000,
) {
  const text = String(value ?? "");

  if (text.length > maximum) {
    throw new Error(
      `Feature text cannot exceed ${maximum} characters.`,
    );
  }

  return text;
}

function ownedFeatureIndex(
  character,
  featureOrId,
) {
  const features = list(character?.features);

  const requestedId =
    typeof featureOrId === "object"
      ? featureOrId?.id
      : featureOrId;

  if (requestedId) {
    const byId = features.findIndex(
      (entry) =>
        entry?.id === requestedId,
    );

    if (byId >= 0) {
      return byId;
    }
  }

  const requestedName =
    normalizedName(
      typeof featureOrId === "object"
        ? featureOrId?.name
        : "",
    );

  if (!requestedName) {
    return -1;
  }

  return features.findIndex(
    (entry) =>
      normalizedName(entry?.name)
      === requestedName,
  );
}

export function ownedCharacterFeature(
  character,
  featureOrId,
) {
  const index =
    ownedFeatureIndex(
      character,
      featureOrId,
    );

  return index >= 0
    ? character.features[index]
    : null;
}

export function featureProvenance(
  feature,
) {
  return normalizeRecordProvenance(
    feature || {},
  );
}

export function isCharacterFeatureEditable(
  character,
  feature,
) {
  const owned =
    ownedCharacterFeature(
      character,
      feature,
    );

  if (!owned) {
    return false;
  }

  return (
    featureProvenance(owned).type
    !== "canonical"
  );
}

export function normalizeFeatureMechanics(
  value,
) {
  const source =
    value
    && typeof value === "object"
    && !Array.isArray(value)
      ? value
      : {};

  return Object.fromEntries(
    MECHANIC_FIELDS.map(
      (field) => [
        field,
        editableText(
          source[field],
          field === "notes"
            ? 20000
            : 1000,
        ).trim(),
      ],
    ),
  );
}

export function featureMechanicsEntries(
  feature,
) {
  const mechanics =
    normalizeFeatureMechanics(
      feature?.mechanics,
    );

  return MECHANIC_FIELDS
    .map(
      (field) => ({
        field,
        value: mechanics[field],
      }),
    )
    .filter(
      (entry) =>
        Boolean(entry.value),
    );
}

function comparableFeature(feature) {
  const provenance = featureProvenance(feature);

  return JSON.stringify({
    name: String(feature?.name || "").trim(),
    source: String(feature?.source || "").trim(),
    detail: String(feature?.detail || ""),
    mechanics: normalizeFeatureMechanics(feature?.mechanics),
    provenance,
    rawImportedDetail:
      provenance.type === "cah-import"
        ? String(
            feature?.rawImportedDetail
            ?? feature?.rawDetail
            ?? feature?.detail
            ?? "",
          )
        : feature?.rawImportedDetail,
  });
}

export function updateCharacterFeature(
  character,
  featureOrId,
  patchValue,
) {
  if (
    !patchValue
    || typeof patchValue !== "object"
    || Array.isArray(patchValue)
  ) {
    throw new Error(
      "Feature edit must be an object.",
    );
  }

  const index =
    ownedFeatureIndex(
      character,
      featureOrId,
    );

  if (index < 0) {
    throw new Error(
      "Generated Arcane Observatory features are read-only.",
    );
  }

  const existing =
    character.features[index];

  const provenance =
    featureProvenance(existing);

  if (provenance.type === "canonical") {
    throw new Error(
      "Canonical Arcane Observatory features are read-only.",
    );
  }

  const nextName =
    patchValue.name == null
      ? String(existing.name || "")
      : editableText(
          patchValue.name,
          300,
        ).trim();

  if (!nextName) {
    throw new Error(
      "Features require a name.",
    );
  }

  const nextSource =
    patchValue.source == null
      ? String(existing.source || "")
      : editableText(
          patchValue.source,
          300,
        ).trim();

  const nextDetail =
    patchValue.detail == null
      ? String(existing.detail || "")
      : editableText(
          patchValue.detail,
          30000,
        );

  const originalImportedDetail =
    provenance.type === "cah-import"
      ? (
          existing.rawImportedDetail
          ?? existing.rawDetail
          ?? existing.detail
          ?? ""
        )
      : existing.rawImportedDetail;

  /*
   * Effects are deliberately never accepted from this editor.
   * Typed AO effects remain a separate validated mechanics lane.
   */
  const nextFeature = {
    ...existing,

    name:
      nextName,

    source:
      nextSource,

    detail:
      nextDetail,

    mechanics:
      patchValue.mechanics == null
        ? normalizeFeatureMechanics(
            existing.mechanics,
          )
        : normalizeFeatureMechanics(
            patchValue.mechanics,
          ),

    provenance:
      normalizeRecordProvenance({
        ...existing,
        ...patchValue,
        name: nextName,
        source: nextSource,
        detail: nextDetail,
        provenance:
          patchValue.provenance
          || existing.provenance,
      }),

    /*
     * Preserve the executable effect collection exactly.
     */
    effects:
      existing.effects,

    ...(originalImportedDetail == null
      ? {}
      : {
          rawImportedDetail:
            String(
              originalImportedDetail,
            ),
        }),
  };

  if (comparableFeature(existing) === comparableFeature(nextFeature)) {
    return character;
  }

  const features =
    character.features.map(
      (entry, currentIndex) =>
        currentIndex === index
          ? nextFeature
          : entry,
    );

  const state = {
    ...character,
    features,
  };

  return appendHistoryEvent(
    state,
    {
      type: "feature-changed",

      title:
        `Edited ${nextFeature.name}`,

      detail:
        `${existing.name} → ${nextFeature.name}`,

      changes: {
        featuresChanged: [
          nextFeature.name,
        ],
      },

      stateChanges: [{
        category: "feature",
        before: {
          featureId: existing.id,
          name: existing.name,
          source: existing.source,
          detail: existing.detail,
          mechanics:
            existing.mechanics || {},
        },
        after: {
          featureId: nextFeature.id,
          name: nextFeature.name,
          source: nextFeature.source,
          detail: nextFeature.detail,
          mechanics:
            nextFeature.mechanics,
        },
      }],
    },
  );
}

export function setCharacterFeatureReviewed(
  character,
  featureOrId,
  reviewed = true,
) {
  const index =
    ownedFeatureIndex(
      character,
      featureOrId,
    );

  if (index < 0) {
    throw new Error(
      "Generated Arcane Observatory features do not require review.",
    );
  }

  const feature =
    character.features[index];

  const current =
    featureProvenance(feature);

  if (current.type === "canonical") {
    throw new Error(
      "Canonical Arcane Observatory features do not require review.",
    );
  }

  const nextReviewed =
    Boolean(reviewed);

  const nextProvenance = {
    ...current,

    reviewStatus:
      nextReviewed
        ? "reviewed"
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

  const features =
    character.features.map(
      (entry, currentIndex) =>
        currentIndex === index
          ? {
              ...entry,
              provenance:
                nextProvenance,
            }
          : entry,
    );

  return appendHistoryEvent(
    {
      ...character,
      features,
    },
    {
      type: "feature-changed",

      title:
        `${nextReviewed ? "Reviewed" : "Reopened"} ${feature.name}`,

      detail:
        `${feature.name}: ${current.reviewStatus} → ${nextProvenance.reviewStatus}`,

      changes: {
        featuresChanged: [
          feature.name,
        ],
      },
    },
  );
}
