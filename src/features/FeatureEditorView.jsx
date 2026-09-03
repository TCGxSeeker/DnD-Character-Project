import {
  CaretDown,
  CaretUp,
  LockSimple,
  PencilSimple,
  Sparkle,
} from "@phosphor-icons/react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getCharacterFeatures,
} from "../domain/grantedContent.js";
import {
  featureMechanicsEntries,
  featureProvenance,
  isCharacterFeatureEditable,
  ownedCharacterFeature,
  setCharacterFeatureReviewed,
  updateCharacterFeature,
} from "../domain/features.js";

const MECHANIC_FIELDS = [
  ["activation", "Activation / action type"],
  ["trigger", "Trigger"],
  ["range", "Range"],
  ["duration", "Duration"],
  ["target", "Target"],
  ["uses", "Uses"],
  ["reset", "Reset"],
  ["saveCheck", "Save / check"],
  ["notes", "Mechanical notes"],
];

const MECHANIC_LABELS =
  Object.fromEntries(
    MECHANIC_FIELDS,
  );

const SOURCE_LABELS = {
  canonical: "Arcane Observatory",
  "local-content": "Local Content",
  "cah-import": "Imported",
  custom: "Custom",
  legacy: "Legacy",
};

const REVIEW_LABELS = {
  trusted: "Trusted",
  "review-required": "Review required",
  reviewed: "Reviewed",
};

function emptyMechanics() {
  return Object.fromEntries(
    MECHANIC_FIELDS.map(
      ([field]) => [field, ""],
    ),
  );
}

function editorDraft(feature) {
  return {
    name:
      feature?.name || "",

    source:
      feature?.source || "",

    detail:
      feature?.detail || "",

    mechanics: {
      ...emptyMechanics(),
      ...(feature?.mechanics || {}),
    },
  };
}

function FeatureEditor({
  character,
  feature,
  updateCharacter,
  onClose,
}) {
  const owned =
    ownedCharacterFeature(
      character,
      feature,
    );

  const [draft, setDraft] =
    useState(
      () => editorDraft(owned || feature),
    );

  const [error, setError] =
    useState("");

  useEffect(() => {
    setDraft(
      editorDraft(
        owned || feature,
      ),
    );
  }, [
    feature,
    owned,
  ]);

  const provenance =
    featureProvenance(
      owned || feature,
    );

  function setField(
    field,
    value,
  ) {
    setDraft(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  }

  function setMechanic(
    field,
    value,
  ) {
    setDraft(
      (current) => ({
        ...current,
        mechanics: {
          ...current.mechanics,
          [field]: value,
        },
      }),
    );
  }

  function commit(action) {
    try {
      updateCharacter(
        action(),
      );

      setError("");
      return true;
    } catch (nextError) {
      setError(
        nextError.message
        || "Feature update failed.",
      );

      return false;
    }
  }

  function save() {
    const saved =
      commit(
        () =>
          updateCharacterFeature(
            character,
            feature,
            {
              name:
                draft.name,

              source:
                draft.source,

              detail:
                draft.detail,

              mechanics:
                draft.mechanics,
            },
          ),
      );

    if (saved) {
      onClose();
    }
  }

  const rawImportedDetail =
    owned?.rawImportedDetail;

  return (
    <div className="feature-inline-editor">
      <div className="feature-editor-actions editor-sticky-actions">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className="feature-subtle-action"
          onClick={onClose}
        >
          Cancel
        </button>

        <button
          type="button"
          className="feature-primary-action"
          onClick={save}
        >
          Save & close
        </button>
      </div>

      <div className="feature-editor-grid">
        <label>
          <span>Name</span>

          <input
            value={draft.name}
            onChange={(event) =>
              setField(
                "name",
                event.target.value,
              )
            }
          />
        </label>

        <label>
          <span>Source</span>

          <input
            value={draft.source}
            onChange={(event) =>
              setField(
                "source",
                event.target.value,
              )
            }
          />
        </label>

        <label className="feature-editor-wide">
          <span>Main description</span>

          <textarea
            rows="4"
            value={draft.detail}
            onChange={(event) =>
              setField(
                "detail",
                event.target.value,
              )
            }
          />
        </label>
      </div>

      <details
        className="feature-mechanics-editor"
        open
      >
        <summary>
          Complete mechanics
        </summary>

        <div className="feature-editor-grid feature-mechanics-grid">
          {MECHANIC_FIELDS.map(
            ([field, label]) => (
              <label
                key={field}
                className={
                  field === "notes"
                    ? "feature-editor-wide"
                    : ""
                }
              >
                <span>
                  {label}
                </span>

                {field === "notes" ? (
                  <textarea
                    rows="3"
                    value={
                      draft.mechanics[field]
                    }
                    onChange={(event) =>
                      setMechanic(
                        field,
                        event.target.value,
                      )
                    }
                  />
                ) : (
                  <input
                    value={
                      draft.mechanics[field]
                    }
                    onChange={(event) =>
                      setMechanic(
                        field,
                        event.target.value,
                      )
                    }
                  />
                )}
              </label>
            ),
          )}
        </div>
      </details>

      {Array.isArray(owned?.effects)
        && owned.effects.length > 0 && (
          <div className="feature-effects-preserved">
            <LockSimple size={16} />

            <div>
              <strong>
                Typed AO effects preserved separately
              </strong>

              <span>
                {owned.effects.length} executable effect
                {owned.effects.length === 1 ? "" : "s"} remain unchanged by this editor.
              </span>
            </div>
          </div>
        )}

      {rawImportedDetail != null && (
        <details className="feature-original-import">
          <summary>
            Original imported description
          </summary>

          <p>
            {rawImportedDetail
              || "The imported record contained no description."}
          </p>
        </details>
      )}

      <section className="feature-editor-provenance">
        <div>
          <span>
            Source & confidence
          </span>

          <strong>
            {provenance.source
              || SOURCE_LABELS[
                provenance.type
              ]
              || provenance.type}
          </strong>

          <small>
            {REVIEW_LABELS[
              provenance.reviewStatus
            ]
              || provenance.reviewStatus}
          </small>
        </div>

        {provenance.type
          !== "canonical" && (
            <button
              type="button"
              className={
                provenance.reviewStatus
                  === "reviewed"
                  ? "feature-subtle-action"
                  : "feature-primary-action"
              }
              onClick={() =>
                commit(
                  () =>
                    setCharacterFeatureReviewed(
                      character,
                      feature,
                      provenance.reviewStatus
                        !== "reviewed",
                    ),
                )
              }
            >
              {provenance.reviewStatus
                === "reviewed"
                ? "Reopen review"
                : "Mark reviewed"}
            </button>
          )}
      </section>

    </div>
  );
}

function FeatureCard({
  character,
  feature,
  updateCharacter,
}) {
  const [editing, setEditing] =
    useState(false);
  const recordRef = useRef(null);

  useEffect(() => {
    if (!editing || !window.matchMedia("(max-width: 700px)").matches) return undefined;

    const frame = window.requestAnimationFrame(() => {
      recordRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [editing]);

  const owned =
    ownedCharacterFeature(
      character,
      feature,
    );

  const provenance =
    featureProvenance(
      owned || feature,
    );

  const editable =
    isCharacterFeatureEditable(
      character,
      feature,
    );

  const mechanics =
    featureMechanicsEntries(
      owned || feature,
    );

  const benefits =
    Array.isArray(feature.benefits)
      ? feature.benefits
      : [];

  const hasCompleteMechanics =
    mechanics.length > 0
    || benefits.length > 0;

  return (
    <article
      ref={recordRef}
      className={[
        "feature-record",
        editing
          ? "editing"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="feature-record-header">
        <div>
          <div className="feature-source-line">
            <span>
              {feature.source}
            </span>

            <span
              className={[
                "feature-origin-badge",
                provenance.reviewStatus,
              ].join(" ")}
            >
              {SOURCE_LABELS[
                provenance.type
              ]
                || provenance.type}

              {provenance.reviewStatus
                === "review-required"
                ? " · Review"
                : provenance.reviewStatus
                    === "reviewed"
                  ? " · Reviewed"
                  : ""}
            </span>
          </div>

          <h2>
            {feature.name}
          </h2>
        </div>

        {editable ? (
          <button
            type="button"
            className={[
              "feature-edit-toggle",
              editing
                ? "active"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() =>
              setEditing(
                (current) =>
                  !current,
              )
            }
            aria-expanded={
              editing
            }
          >
            {editing ? (
              <>
                <CaretUp size={15} />
                Collapse
              </>
            ) : (
              <>
                <PencilSimple size={15} />
                Edit
                <CaretDown size={13} />
              </>
            )}
          </button>
        ) : (
          <span className="feature-readonly-chip">
            <LockSimple size={13} />
            Canonical
          </span>
        )}
      </header>

      <p className="feature-main-detail">
        {feature.detail}
      </p>

      {hasCompleteMechanics && (
        <details className="rules-details feature-complete-mechanics">
          <summary>
            Complete mechanics
          </summary>

          {mechanics.length > 0 && (
            <dl>
              {mechanics.map(
                ({ field, value }) => (
                  <div key={field}>
                    <dt>
                      {MECHANIC_LABELS[field]}
                    </dt>

                    <dd>
                      {value}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          )}

          {benefits.length > 0 && (
            <ul>
              {benefits.map(
                (benefit) => (
                  <li key={benefit}>
                    {benefit}
                  </li>
                ),
              )}
            </ul>
          )}
        </details>
      )}

      {editable
        && !hasCompleteMechanics
        && !editing && (
          <small className="feature-mechanics-empty">
            No structured mechanics recorded yet.
          </small>
        )}

      {editing && (
        <FeatureEditor
          character={
            character
          }
          feature={
            feature
          }
          updateCharacter={
            updateCharacter
          }
          onClose={() =>
            setEditing(false)
          }
        />
      )}
    </article>
  );
}

export function FeatureEditorView({
  character,
  updateCharacter,
}) {
  const features =
    getCharacterFeatures(
      character,
    );

  return (
    <div className="simple-view">
      <header className="view-header">
        <div>
          <p className="eyebrow">
            Rules and abilities
          </p>

          <h1>
            Features
          </h1>

          <span>
            {features.length} active features · class, subclass, ancestry, and feats
          </span>
        </div>

        <Sparkle size={34} />
      </header>

      <section className="glass-panel material-primary feature-record-list">
        {features.length ? (
          features.map(
            (feature) => (
              <FeatureCard
                key={feature.id || `${feature.source}-${feature.name}`}
                character={
                  character
                }
                feature={
                  feature
                }
                updateCharacter={
                  updateCharacter
                }
              />
            ),
          )
        ) : (
          <div className="empty-state">
            <Sparkle size={32} />

            <h2>
              No features recorded
            </h2>

            <p>
              Features earned during guided level-ups will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
