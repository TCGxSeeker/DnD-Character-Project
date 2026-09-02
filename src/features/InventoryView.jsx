import {
  Backpack,
  CaretDown,
  CaretUp,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  SpinnerGap,
  Trash,
  WifiHigh,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { searchItems } from "../data/open5e.js";
import {
  calculateArmorClass,
  calculateSpeed,
  equipmentFromOpen5e,
  equipmentProfile,
  equippedArmorRequirements,
} from "../domain/armor.js";
import {
  setWeaponUse,
  weaponProfile,
  weaponUse,
} from "../domain/attacks.js";
import {
  ammunitionSummary,
  attunementSummary,
  carryingSummary,
  consumeAmmunition,
  itemWeight,
  setEquipmentAttuned,
  setEquipmentEquipped,
  setEquipmentQuantity,
  setEquipmentReviewed,
  setVariantEncumbrance,
  updateEquipmentItem,
} from "../domain/equipment.js";
import { appendHistoryEvent } from "../domain/history.js";

const WEAPON_PROPERTIES = [
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
];

const ABILITY_OPTIONS = [
  ["auto", "Automatic"],
  ["strength", "Strength"],
  ["dexterity", "Dexterity"],
  ["constitution", "Constitution"],
  ["intelligence", "Intelligence"],
  ["wisdom", "Wisdom"],
  ["charisma", "Charisma"],
];

const PROFICIENCY_OPTIONS = [
  ["auto", "Automatic"],
  ["proficient", "Proficient"],
  ["not-proficient", "Not proficient"],
];

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

function numberOrBlank(value) {
  return value == null ? "" : String(value);
}

function inferredKind(item) {
  if (item?.equipment?.kind) return item.equipment.kind;
  if (weaponProfile(item)) return "weapon";
  const armor = equipmentProfile(item);
  if (armor?.kind) return armor.kind;
  return "item";
}

function compactItemMechanics(item) {
  const weapon =
    weaponProfile(item);

  if (weapon) {
    return `${weapon.damageDice || ""} ${weapon.damageType || ""}`.trim();
  }

  const equipment =
    item?.equipment;

  if (equipment?.kind === "armor") {
    const parts = [];

    const acBase =
      Number(equipment.acBase);

    const acBonus =
      Number(equipment.acBonus || 0);

    if (Number.isFinite(acBase)) {
      parts.push(
        `AC ${acBase}${acBonus ? `${acBonus >= 0 ? "+" : ""}${acBonus}` : ""}`,
      );
    }

    if (equipment.category) {
      parts.push(
        `${String(equipment.category).charAt(0).toUpperCase()}${String(equipment.category).slice(1)}`,
      );
    }

    if (equipment.strengthRequirement) {
      parts.push(
        `STR ${equipment.strengthRequirement}`,
      );
    }

    if (equipment.stealthDisadvantage) {
      parts.push(
        "Stealth disadvantage",
      );
    }

    return parts.join(" · ");
  }

  if (equipment?.kind === "shield") {
    const bonus =
      Number(
        equipment.acBonus ?? 2,
      );

    return Number.isFinite(bonus)
      ? `AC ${bonus >= 0 ? "+" : ""}${bonus}`
      : "Shield";
  }

  if (equipment?.kind === "ammunition") {
    return equipment.ammunitionType
      ? String(equipment.ammunitionType)
      : item.detail || "";
  }

  return item.detail || "";
}
function draftForItem(item) {
  const kind = inferredKind(item);
  const weapon = kind === "weapon" ? weaponProfile(item) : null;
  const armor = ["armor", "shield"].includes(kind)
    ? equipmentProfile(item)
    : null;

  return {
    name: item.name || "",
    quantity: numberOrBlank(item.quantity ?? 1),
    detail: item.detail || "",
    weight: numberOrBlank(item.weight ?? item.equipment?.weight ?? weapon?.weight ?? 0),
    kind,

    attackAbility: item.attackAbility || "auto",
    proficiencyOverride: item.proficiencyOverride || "auto",
    attackBonus: numberOrBlank(item.attackBonus ?? 0),
    damageBonus: numberOrBlank(item.damageBonus ?? 0),
    magicBonus: numberOrBlank(item.magicBonus ?? 0),

    damageDice: weapon?.damageDice || "",
    damageType: weapon?.damageType || "",
    attackType: weapon?.attackType || "melee",
    weaponCategory: weapon?.isMartial ? "martial" : "simple",
    properties: [...(weapon?.properties || [])],
    versatileDamage: weapon?.versatileDamage || "",
    rangeNormal: numberOrBlank(weapon?.range?.normal),
    rangeLong: numberOrBlank(weapon?.range?.long),
    ammunitionType: weapon?.ammunitionType || "",

    armorCategory: armor?.category || "",
    acBase: numberOrBlank(armor?.acBase),
    addDexterity: Boolean(armor?.addDexterity),
    dexterityCap: numberOrBlank(armor?.dexterityCap),
    acBonus: numberOrBlank(armor?.acBonus ?? 0),
    strengthRequirement: numberOrBlank(armor?.strengthRequirement),
    stealthDisadvantage: Boolean(armor?.stealthDisadvantage),

    secondaryDamage: Array.isArray(item.secondaryDamage)
      ? item.secondaryDamage.map((packet) => ({
          dice: packet.dice || "",
          type: packet.type || "",
          bonus: numberOrBlank(packet.bonus ?? 0),
        }))
      : [],
  };
}

function newCustomItemDraft() {
  return {
    id: "custom-item-draft",
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

    equipment: {
      kind: "item",
    },

    provenance: {
      type: "custom",
      source: "Custom",
      reviewStatus: "reviewed",
      reviewed: true,
    },
  };
}
function provenanceFor(item) {
  return item?.provenance || {
    type: "legacy",
    source: "Legacy character data",
    reviewStatus: "trusted",
    reviewed: false,
  };
}

function InventoryEditor({
  character,
  item,
  commit,
  onClose,
  mode = "edit",
  onCreate,
}) {
  const [draft, setDraft] = useState(() => draftForItem(item));
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setDraft(draftForItem(item));
  }, [item]);

  const provenance = provenanceFor(item);

  function setField(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleProperty(property) {
    setDraft((current) => ({
      ...current,
      properties: current.properties.includes(property)
        ? current.properties.filter((entry) => entry !== property)
        : [...current.properties, property],
    }));
  }

  function addSecondaryDamage() {
    setDraft((current) => ({
      ...current,
      secondaryDamage: [
        ...current.secondaryDamage,
        { dice: "", type: "", bonus: "0" },
      ],
    }));
  }

  function updateSecondaryDamage(index, field, value) {
    setDraft((current) => ({
      ...current,
      secondaryDamage: current.secondaryDamage.map((entry, currentIndex) =>
        currentIndex === index
          ? { ...entry, [field]: value }
          : entry
      ),
    }));
  }

  function removeSecondaryDamage(index) {
    setDraft((current) => ({
      ...current,
      secondaryDamage: current.secondaryDamage.filter(
        (_, currentIndex) => currentIndex !== index
      ),
    }));
  }

  function equipmentPatch() {
    if (draft.kind === "weapon") {
      return {
        kind: "weapon",
        name: draft.name.trim(),
        damageDice: draft.damageDice,
        damageType: draft.damageType,
        properties: draft.properties,
        versatileDamage: draft.versatileDamage,
        isSimple: draft.weaponCategory === "simple",
        isMartial: draft.weaponCategory === "martial",
        attackType: draft.attackType,
        range:
          draft.rangeNormal !== "" || draft.rangeLong !== ""
            ? {
                normal: draft.rangeNormal,
                long: draft.rangeLong,
                unit: "feet",
              }
            : null,
        ammunitionType: draft.ammunitionType,
        weight: draft.weight,
      };
    }

    if (draft.kind === "armor") {
      return {
        kind: "armor",
        acBase: draft.acBase,
        addDexterity: draft.addDexterity,
        dexterityCap: draft.addDexterity ? draft.dexterityCap : null,
        acBonus: draft.acBonus,
        category: draft.armorCategory,
        strengthRequirement: draft.strengthRequirement,
        stealthDisadvantage: draft.stealthDisadvantage,
      };
    }

    if (draft.kind === "shield") {
      return {
        kind: "shield",
        acBonus: draft.acBonus,
        weight: draft.weight,
      };
    }

    if (draft.kind === "ammunition") {
      return {
        kind: "ammunition",
        ammunitionType: draft.ammunitionType,
        weight: draft.weight,
      };
    }

    return {
      kind: "item",
    };
  }

  function save() {
    setSaveError("");

    const patch = {
      name: draft.name,
      quantity: draft.quantity,
      detail: draft.detail,
      weight: draft.weight,
      attackAbility: draft.attackAbility,
      proficiencyOverride: draft.proficiencyOverride,
      attackBonus: draft.attackBonus,
      damageBonus: draft.damageBonus,
      magicBonus: draft.magicBonus,
      secondaryDamage: draft.secondaryDamage,
      equipment: equipmentPatch(),
    };

    const saved = commit(() =>
      mode === "create"
        ? onCreate(patch)
        : updateEquipmentItem(
            character,
            item.id,
            patch
          )
    );

    if (saved) {
      onClose();
    } else {
      setSaveError(
        mode === "create"
          ? "The custom item could not be created. Check the highlighted mechanics."
          : "The item could not be saved. Check the highlighted mechanics."
      );
    }
  }

  return (
    <div className="inventory-inline-editor">
      <div className="inventory-editor-heading">
        <div>
          <strong>
            {mode === "create"
              ? "Create custom item"
              : item.name}
          </strong>

          <small>
            {mode === "create"
              ? "Native character content"
              : "Character instance"}
          </small>
        </div>

        <button
          type="button"
          className="inventory-editor-close"
          onClick={onClose}
          aria-label={
            mode === "create"
              ? "Cancel custom item creation"
              : `Collapse editor for ${item.name}`
          }
        >
          <CaretUp size={15} />
          {mode === "create"
            ? "Cancel"
            : "Collapse"}
        </button>
      </div>

      <section className="inventory-editor-section">
        <h4>General</h4>

        <div className="inventory-editor-grid">
          <label>
            <span>Name</span>
            <input
              value={draft.name}
              onChange={(event) => setField("name", event.target.value)}
            />
          </label>

          <label>
            <span>Type</span>
            <select
              value={draft.kind}
              onChange={(event) => setField("kind", event.target.value)}
            >
              <option value="item">Item</option>
              <option value="weapon">Weapon</option>
              <option value="armor">Armor</option>
              <option value="shield">Shield</option>
              <option value="ammunition">Ammunition</option>
            </select>
          </label>

          <label>
            <span>Quantity</span>
            <input
              type="number"
              min="0"
              max="9999"
              value={draft.quantity}
              onChange={(event) => setField("quantity", event.target.value)}
            />
          </label>

          <label>
            <span>Weight each (lb.)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.weight}
              onChange={(event) => setField("weight", event.target.value)}
            />
          </label>

          <label className="inventory-editor-wide">
            <span>Description / notes</span>
            <textarea
              rows="3"
              value={draft.detail}
              onChange={(event) => setField("detail", event.target.value)}
            />
          </label>
        </div>
      </section>

      {draft.kind === "weapon" && (
        <section className="inventory-editor-section">
          <h4>Weapon mechanics</h4>

          <div className="inventory-editor-grid">
            <label>
              <span>Damage dice</span>
              <input
                value={draft.damageDice}
                onChange={(event) => setField("damageDice", event.target.value)}
                placeholder="1d8"
              />
            </label>

            <label>
              <span>Damage type</span>
              <input
                value={draft.damageType}
                onChange={(event) => setField("damageType", event.target.value)}
                placeholder="Bludgeoning"
              />
            </label>

            <label>
              <span>Attack ability</span>
              <select
                value={draft.attackAbility}
                onChange={(event) =>
                  setField("attackAbility", event.target.value)
                }
              >
                {ABILITY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Proficiency</span>
              <select
                value={draft.proficiencyOverride}
                onChange={(event) =>
                  setField("proficiencyOverride", event.target.value)
                }
              >
                {PROFICIENCY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Attack bonus</span>
              <input
                type="number"
                value={draft.attackBonus}
                onChange={(event) => setField("attackBonus", event.target.value)}
              />
            </label>

            <label>
              <span>Damage bonus</span>
              <input
                type="number"
                value={draft.damageBonus}
                onChange={(event) => setField("damageBonus", event.target.value)}
              />
            </label>

            <label>
              <span>Magic bonus</span>
              <input
                type="number"
                value={draft.magicBonus}
                onChange={(event) => setField("magicBonus", event.target.value)}
              />
            </label>

            <label>
              <span>Weapon category</span>
              <select
                value={draft.weaponCategory}
                onChange={(event) =>
                  setField("weaponCategory", event.target.value)
                }
              >
                <option value="simple">Simple</option>
                <option value="martial">Martial</option>
              </select>
            </label>

            <label>
              <span>Attack type</span>
              <select
                value={draft.attackType}
                onChange={(event) => setField("attackType", event.target.value)}
              >
                <option value="melee">Melee</option>
                <option value="ranged">Ranged</option>
              </select>
            </label>

            {draft.properties.includes("versatile") && (
              <label>
                <span>Versatile damage</span>
                <input
                  value={draft.versatileDamage}
                  onChange={(event) =>
                    setField("versatileDamage", event.target.value)
                  }
                  placeholder="1d10"
                />
              </label>
            )}
          </div>

          <details className="inventory-mechanics-disclosure">
            <summary>Properties</summary>

            <div className="inventory-property-grid">
              {WEAPON_PROPERTIES.map((property) => (
                <label key={property}>
                  <input
                    type="checkbox"
                    checked={draft.properties.includes(property)}
                    onChange={() => toggleProperty(property)}
                  />
                  <span>{property.replaceAll("-", " ")}</span>
                </label>
              ))}
            </div>
          </details>

          <details className="inventory-mechanics-disclosure">
            <summary>Range & ammunition</summary>

            <div className="inventory-editor-grid inventory-editor-nested">
              <label>
                <span>Normal range</span>
                <input
                  type="number"
                  min="0"
                  value={draft.rangeNormal}
                  onChange={(event) =>
                    setField("rangeNormal", event.target.value)
                  }
                />
              </label>

              <label>
                <span>Long range</span>
                <input
                  type="number"
                  min="0"
                  value={draft.rangeLong}
                  onChange={(event) =>
                    setField("rangeLong", event.target.value)
                  }
                />
              </label>

              <label>
                <span>Ammunition type</span>
                <input
                  value={draft.ammunitionType}
                  onChange={(event) =>
                    setField("ammunitionType", event.target.value)
                  }
                  placeholder="bolt"
                />
              </label>
            </div>
          </details>

          <details className="inventory-mechanics-disclosure">
            <summary>
              Secondary damage
              {draft.secondaryDamage.length
                ? ` · ${draft.secondaryDamage.length}`
                : ""}
            </summary>

            <div className="secondary-damage-editor">
              {draft.secondaryDamage.map((packet, index) => (
                <div className="secondary-damage-row" key={index}>
                  <label>
                    <span>Dice</span>
                    <input
                      value={packet.dice}
                      onChange={(event) =>
                        updateSecondaryDamage(index, "dice", event.target.value)
                      }
                      placeholder="1d4"
                    />
                  </label>

                  <label>
                    <span>Type</span>
                    <input
                      value={packet.type}
                      onChange={(event) =>
                        updateSecondaryDamage(index, "type", event.target.value)
                      }
                      placeholder="Fire"
                    />
                  </label>

                  <label>
                    <span>Bonus</span>
                    <input
                      type="number"
                      value={packet.bonus}
                      onChange={(event) =>
                        updateSecondaryDamage(index, "bonus", event.target.value)
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className="icon-button subtle"
                    onClick={() => removeSecondaryDamage(index)}
                    aria-label={`Remove secondary damage ${index + 1}`}
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="subtle-action"
                onClick={addSecondaryDamage}
              >
                <Plus size={15} />
                Add damage packet
              </button>
            </div>
          </details>
        </section>
      )}

      {draft.kind === "armor" && (
        <section className="inventory-editor-section">
          <h4>Armor mechanics</h4>

          <div className="inventory-editor-grid">
            <label>
              <span>Armor category</span>
              <select
                value={draft.armorCategory}
                onChange={(event) =>
                  setField("armorCategory", event.target.value)
                }
              >
                <option value="">Unspecified</option>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
              </select>
            </label>

            <label>
              <span>Base AC</span>
              <input
                type="number"
                min="0"
                value={draft.acBase}
                onChange={(event) => setField("acBase", event.target.value)}
              />
            </label>

            <label>
              <span>AC bonus</span>
              <input
                type="number"
                value={draft.acBonus}
                onChange={(event) => setField("acBonus", event.target.value)}
              />
            </label>

            <label>
              <span>Strength requirement</span>
              <input
                type="number"
                min="0"
                max="30"
                value={draft.strengthRequirement}
                onChange={(event) =>
                  setField("strengthRequirement", event.target.value)
                }
              />
            </label>
          </div>

          <div className="inventory-toggle-grid inventory-themed-toggles">
            <label>
              <input
                type="checkbox"
                checked={draft.addDexterity}
                onChange={(event) =>
                  setField("addDexterity", event.target.checked)
                }
              />
              <span>Add Dexterity modifier</span>
            </label>

            {draft.addDexterity && (
              <label className="inventory-inline-number">
                <span>DEX cap</span>
                <input
                  type="number"
                  value={draft.dexterityCap}
                  onChange={(event) =>
                    setField("dexterityCap", event.target.value)
                  }
                  placeholder="No cap"
                />
              </label>
            )}

            <label>
              <input
                type="checkbox"
                checked={draft.stealthDisadvantage}
                onChange={(event) =>
                  setField("stealthDisadvantage", event.target.checked)
                }
              />
              <span>Stealth disadvantage</span>
            </label>
          </div>
        </section>
      )}

      {draft.kind === "shield" && (
        <section className="inventory-editor-section">
          <h4>Shield mechanics</h4>

          <div className="inventory-editor-grid">
            <label>
              <span>AC bonus</span>
              <input
                type="number"
                value={draft.acBonus}
                onChange={(event) => setField("acBonus", event.target.value)}
              />
            </label>
          </div>
        </section>
      )}

      {draft.kind === "ammunition" && (
        <section className="inventory-editor-section">
          <h4>Ammunition</h4>

          <div className="inventory-editor-grid">
            <label>
              <span>Ammunition type</span>
              <input
                value={draft.ammunitionType}
                onChange={(event) =>
                  setField("ammunitionType", event.target.value)
                }
                placeholder="arrow"
              />
            </label>
          </div>
        </section>
      )}

      <section className="inventory-editor-section inventory-provenance-panel">
        <div>
          <span className="section-kicker">Source & confidence</span>

          <strong>
            {provenance.source ||
              SOURCE_LABELS[provenance.type] ||
              provenance.type}
          </strong>

          <small>
            {REVIEW_LABELS[provenance.reviewStatus] ||
              provenance.reviewStatus}
          </small>
        </div>

        {provenance.type !== "canonical" && (
          <button
            type="button"
            className={
              provenance.reviewStatus === "reviewed"
                ? "subtle-action"
                : "primary-inline-action"
            }
            onClick={() =>
              commit(() =>
                setEquipmentReviewed(
                  character,
                  item.id,
                  provenance.reviewStatus !== "reviewed"
                )
              )
            }
          >
            {provenance.reviewStatus === "reviewed"
              ? "Reopen review"
              : "Mark reviewed"}
          </button>
        )}
      </section>

      {saveError && (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      )}

      <div className="inventory-editor-actions">
        <button
          type="button"
          className="subtle-action"
          onClick={onClose}
        >
          Cancel
        </button>

        <button
          type="button"
          className="primary-inline-action"
          onClick={save}
        >
          Save & close
        </button>
      </div>
    </div>
  );
}

function InventoryItemRow({
  character,
  item,
  commit,
  removeItem,
}) {
  const [quantity, setQuantity] = useState(
    String(item.quantity ?? 0)
  );
  const [editing, setEditing] = useState(false);

  useEffect(
    () => setQuantity(String(item.quantity ?? 0)),
    [item.quantity]
  );

  const weapon = weaponProfile(item);
  const use = weapon ? weaponUse(item, weapon) : null;
  const ammunition = weapon
    ? ammunitionSummary(character, item)
    : null;
  const requiresAttunement = Boolean(
    item.requiresAttunement ||
      item.equipment?.requiresAttunement
  );
  const weight = itemWeight(item);
  const provenance = provenanceFor(item);

  function saveQuantity() {
    if (
      Number(quantity) ===
      Number(item.quantity || 0)
    ) {
      return;
    }

    if (
      !commit(() =>
        setEquipmentQuantity(
          character,
          item.id,
          Number(quantity)
        )
      )
    ) {
      setQuantity(
        String(item.quantity ?? 0)
      );
    }
  }

  const statusLabel =
    provenance.type === "canonical"
      ? ""
      : SOURCE_LABELS[provenance.type] ||
        provenance.type;

  return (
    <article
      className={[
        item.equipped ? "equipped" : "",
        editing ? "editing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="inventory-row-main">
        <div className="inventory-primary-actions">
          <button
            className="prepared-toggle"
            onClick={() =>
              commit(() =>
                setEquipmentEquipped(
                  character,
                  item.id,
                  !item.equipped
                )
              )
            }
            disabled={
              !item.equipped &&
              Number(item.quantity || 0) < 1
            }
            aria-label={`${item.equipped ? "Unequip" : "Equip"} ${item.name}`}
          >
            {item.equipped
              ? "Equipped"
              : "Equip"}
          </button>

          {requiresAttunement && (
            <button
              className={`prepared-toggle ${item.attuned ? "active" : ""}`}
              onClick={() =>
                commit(() =>
                  setEquipmentAttuned(
                    character,
                    item.id,
                    !item.attuned
                  )
                )
              }
              disabled={
                !item.attuned &&
                Number(item.quantity || 0) < 1
              }
              aria-label={`${item.attuned ? "End attunement to" : "Attune to"} ${item.name}`}
            >
              {item.attuned
                ? "Attuned"
                : "Attune"}
            </button>
          )}

          {item.equipped &&
            ammunition?.required && (
              <button
                className="prepared-toggle"
                onClick={() =>
                  commit(() =>
                    consumeAmmunition(
                      character,
                      item.id
                    )
                  )
                }
                disabled={
                  ammunition.available < 1
                }
                aria-label={`Use one ${ammunition.ammunitionType} for ${item.name}`}
              >
                Use 1{" "}
                {ammunition.ammunitionType}
              </button>
            )}
        </div>

        <div className="inventory-item-copy">
          <div className="inventory-item-title-line">
            <strong>{item.name}</strong>

            {statusLabel && (
              <span
                className={`inventory-origin-badge ${provenance.reviewStatus}`}
              >
                {statusLabel}
                {provenance.reviewStatus === "review-required"
                  ? " · Review"
                  : provenance.reviewStatus === "reviewed"
                    ? " · Reviewed"
                    : ""}
              </span>
            )}
          </div>

          <span className="inventory-item-mechanics">
            {compactItemMechanics(item)}

            {weight
              ? ` · ${weight} lb.${Number(item.quantity || 0) > 1 ? " each" : ""}`
              : ""}

            {weapon?.properties.length
              ? ` · ${weapon.properties.join(", ")}`
              : ""}

            {item.secondaryDamage?.length
              ? ` · + ${item.secondaryDamage
                  .map(
                    (packet) =>
                      `${packet.dice || ""}${packet.bonus ? `${Number(packet.bonus) >= 0 ? "+" : ""}${packet.bonus}` : ""} ${packet.type || ""}`.trim()
                  )
                  .join(", ")}`
              : ""}

            {ammunition?.required
              ? ` · ${ammunition.available} ${ammunition.ammunitionType}${ammunition.available === 1 ? "" : "s"} ready`
              : ""}
          </span>

          {weapon && item.detail && (
            <small className="inventory-item-note">
              {item.detail}
            </small>
          )}

          {item.equipped &&
            weapon && (
              <div className="weapon-use-fields">
                {(weapon.versatile ||
                  weapon.specialRuleId ===
                    "lance") && (
                  <label>
                    Grip
                    <select
                      value={use.wieldMode}
                      onChange={(event) =>
                        commit(() =>
                          setWeaponUse(
                            character,
                            item.id,
                            {
                              wieldMode:
                                event.target
                                  .value,
                            }
                          )
                        )
                      }
                    >
                      <option value="one-handed">
                        One handed
                        {weapon.specialRuleId ===
                        "lance"
                          ? " (mounted)"
                          : ""}
                      </option>
                      <option value="two-handed">
                        Two handed
                        {weapon.versatileDamage
                          ? ` (${weapon.versatileDamage})`
                          : ""}
                      </option>
                    </select>
                  </label>
                )}

                {weapon.light &&
                  weapon.attackType ===
                    "melee" && (
                    <label>
                      Role
                      <select
                        value={use.role}
                        onChange={(event) =>
                          commit(() =>
                            setWeaponUse(
                              character,
                              item.id,
                              {
                                role:
                                  event.target
                                    .value,
                              }
                            )
                          )
                        }
                      >
                        <option value="main">
                          Main hand
                        </option>
                        <option value="offhand">
                          Off hand
                        </option>
                      </select>
                    </label>
                  )}

                {weapon.thrown &&
                  weapon.attackType ===
                    "melee" && (
                    <label>
                      Attack
                      <select
                        value={
                          use.attackMode
                        }
                        onChange={(event) =>
                          commit(() =>
                            setWeaponUse(
                              character,
                              item.id,
                              {
                                attackMode:
                                  event.target
                                    .value,
                              }
                            )
                          )
                        }
                      >
                        <option value="melee">
                          Melee
                        </option>
                        <option value="thrown">
                          Thrown
                        </option>
                      </select>
                    </label>
                  )}
              </div>
            )}
        </div>

        <label className="inventory-quantity-field">
          Qty
          <input
            type="number"
            min="0"
            max="9999"
            value={quantity}
            onChange={(event) =>
              setQuantity(event.target.value)
            }
            onBlur={saveQuantity}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
        </label>

        <button
          type="button"
          className={`icon-button subtle inventory-edit-toggle ${editing ? "active" : ""}`}
          onClick={() =>
            setEditing((current) => !current)
          }
          aria-expanded={editing}
          aria-label={`${editing ? "Close editor for" : "Edit"} ${item.name}`}
        >
          {editing ? (
            <CaretUp size={17} />
          ) : (
            <>
              <PencilSimple size={15} />
              <CaretDown size={13} />
            </>
          )}
        </button>

        <button
          className="icon-button subtle"
          onClick={() => removeItem(item)}
          aria-label={`Remove ${item.name}`}
        >
          <Trash size={17} />
        </button>
      </div>

      {editing && (
        <InventoryEditor
          character={character}
          item={item}
          commit={commit}
          onClose={() => setEditing(false)}
        />
      )}
    </article>
  );
}

export function InventoryView({
  character,
  updateCharacter,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [inventoryError, setInventoryError] =
    useState("");
  const [creatingCustomItem, setCreatingCustomItem] =
    useState(false);

  const carrying = carryingSummary(character);
  const attunement = attunementSummary(character);
  const armorRequirements =
    equippedArmorRequirements(character);

  const structuredEquipmentKinds =
    new Set([
      "weapon",
      "armor",
      "shield",
      "ammunition",
    ]);

  const equipmentItems =
    character.inventory.filter(
      (item) =>
        structuredEquipmentKinds.has(
          inferredKind(item)
        )
    );

  const carriedItems =
    character.inventory.filter(
      (item) =>
        !structuredEquipmentKinds.has(
          inferredKind(item)
        )
    );

  const itemIds = useMemo(
    () =>
      new Set(
        character.inventory.map(
          (entry) => entry.id
        )
      ),
    [character.inventory]
  );

  function commit(action) {
    try {
      const next = action();
      updateCharacter(next);
      setInventoryError("");
      return true;
    } catch (error) {
      setInventoryError(error.message);
      return false;
    }
  }

  async function runSearch(event) {
    event.preventDefault();

    if (!query.trim()) return;

    setStatus("loading");
    setMessage("");

    try {
      const payload = await searchItems(query);

      setResults(payload.results);
      setStatus("ready");

      setMessage(
        payload.fromCache
          ? "Showing cached SRD results."
          : `Found ${payload.count} SRD matches.`
      );
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  function addItem(item) {
    if (itemIds.has(item.key)) return;

    const next = {
      ...character,
      inventory: [
        ...character.inventory,
        equipmentFromOpen5e(item),
      ],
    };

    updateCharacter(
      appendHistoryEvent(next, {
        type: "item-added",
        title: `Obtained ${item.name}`,
        detail: "Inventory updated",
        changes: {
          itemsAdded: [item.name],
        },
      })
    );
  }

  function createCustomItem(patch) {
    const id =
      globalThis.crypto?.randomUUID
        ? `custom-item-${globalThis.crypto.randomUUID()}`
        : `custom-item-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 9)}`;

    const baseItem = {
      id,
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

      equipment: {
        kind: "item",
      },

      provenance: {
        type: "custom",
        source: "Custom",
        reviewStatus: "reviewed",
        reviewed: true,
      },
    };

    const withItem = {
      ...character,
      inventory: [
        ...character.inventory,
        baseItem,
      ],
    };

    const normalized =
      updateEquipmentItem(
        withItem,
        id,
        patch
      );

    return appendHistoryEvent(
      normalized,
      {
        type: "item-added",
        title: `Created ${patch.name.trim() || "custom item"}`,
        detail: "Custom inventory item created",
        changes: {
          itemsAdded: [
            patch.name.trim() || "Custom item",
          ],
        },
      }
    );
  }
  function removeItem(item) {
    const next = {
      ...character,
      inventory:
        character.inventory.filter(
          (entry) => entry.id !== item.id
        ),
    };

    updateCharacter(
      appendHistoryEvent(next, {
        type: "item-removed",
        title: `Removed ${item.name}`,
        detail: "Inventory updated",
        changes: {
          itemsRemoved: [item.name],
        },
      })
    );
  }

  return (
    <div className="collection-view">
      <header className="view-header">
        <div>
          <p className="eyebrow">
            Carried and equipped
          </p>
          <h1>Inventory</h1>
          <span>
            {character.inventory.length} distinct
            items
          </span>
        </div>

        <div className="inventory-view-actions">
          <button
            type="button"
            className="subtle-action inventory-add-custom"
            onClick={() =>
              setCreatingCustomItem(true)
            }
            disabled={creatingCustomItem}
          >
            <Plus size={16} />
            Custom item
          </button>

          <Backpack
            className="inventory-header-icon"
            size={34}
          />
        </div>
      </header>

      <div className="library-layout">
        <div className="inventory-panel-stack">
          {creatingCustomItem && (
            <section className="glass-panel material-primary collection-list inventory-custom-creator-panel">
              <InventoryEditor
                character={character}
                item={newCustomItemDraft()}
                commit={commit}
                mode="create"
                onCreate={createCustomItem}
                onClose={() =>
                  setCreatingCustomItem(false)
                }
              />
            </section>
          )}

          <section className="glass-panel material-primary collection-list">
          <div className="section-heading inventory-summary">
            <div>
              <h2>Equipment</h2>

              <span>
                AC{" "}
                {calculateArmorClass(character)}
                {" · "}
                Speed{" "}
                {calculateSpeed(character)} ft.
                {" · "}
                Carrying{" "}
                {carrying.weight
                  .toFixed(1)
                  .replace(".0", "")}
                {" / "}
                {carrying.capacity} lb.
                {" · "}
                Attunement{" "}
                {attunement.current}/
                {attunement.max}
              </span>

              <small>
                {carrying.variantEnabled
                  ? `Variant status: ${carrying.variantStatus.replaceAll("-", " ")}${carrying.speedPenalty ? ` · speed −${carrying.speedPenalty} ft.` : ""}`
                  : "Standard carrying rules. Armor Strength requirements apply."}
              </small>

              {armorRequirements.entries.map(
                (entry) => (
                  <small
                    key={entry.itemId}
                    className={
                      !entry.strengthMet ||
                      entry.proficient === false
                        ? "requirement-warning"
                        : ""
                    }
                  >
                    {entry.name}:{" "}
                    {entry.category ||
                      "armor"}
                    {entry.strengthRequirement
                      ? ` · STR ${entry.strengthRequirement}${armorRequirements.armorStrengthIgnored ? " ignored by variant encumbrance" : entry.strengthMet ? " met" : " not met · speed −10 ft."}`
                      : ""}
                    {entry.proficient === false
                      ? " · not proficient"
                      : ""}
                    {entry.stealthDisadvantage
                      ? " · Stealth disadvantage"
                      : ""}
                  </small>
                )
              )}
            </div>

            <button
              type="button"
              className={`rule-option-toggle ${carrying.variantEnabled ? "active" : ""}`}
              aria-pressed={
                carrying.variantEnabled
              }
              onClick={() =>
                commit(() =>
                  setVariantEncumbrance(
                    character,
                    !carrying.variantEnabled
                  )
                )
              }
            >
              <span>
                Variant encumbrance
              </span>
              <strong>
                {carrying.variantEnabled
                  ? "On"
                  : "Off"}
              </strong>
            </button>
          </div>

          {inventoryError && (
            <p
              className="form-error"
              role="alert"
            >
              {inventoryError}
            </p>
          )}

          <div className="inventory-table">
            {equipmentItems.length ? (
              equipmentItems.map(
                (item) => (
                  <InventoryItemRow
                    key={item.id}
                    character={character}
                    item={item}
                    commit={commit}
                    removeItem={removeItem}
                  />
                )
              )
            ) : (
              <div className="inventory-empty-group">
                No weapons, armor, shields, or ammunition.
              </div>
            )}
          </div>
        </section>


        <section className="glass-panel material-primary collection-list carried-items-panel">
          <div className="section-heading inventory-summary">
            <div>
              <p className="section-kicker">
                Packs · tools · valuables · miscellaneous
              </p>

              <h2>Carried Items</h2>

              <span>
                {carriedItems.length} ordinary{" "}
                {carriedItems.length === 1
                  ? "item"
                  : "items"}
              </span>

              <small>
                General inventory that does not participate
                directly in weapon, armor, shield, or
                ammunition mechanics.
              </small>
            </div>
          </div>

          <div className="inventory-table">
            {carriedItems.length ? (
              carriedItems.map(
                (item) => (
                  <InventoryItemRow
                    key={item.id}
                    character={character}
                    item={item}
                    commit={commit}
                    removeItem={removeItem}
                  />
                )
              )
            ) : (
              <div className="inventory-empty-group">
                No general carried items.
              </div>
            )}
          </div>
        </section>
        </div>

        <aside className="glass-panel material-primary reference-panel">
          <p className="section-kicker">
            Open5e · SRD 2014
          </p>
          <h2>Find equipment</h2>
          <p>
            Search the SRD item catalog and add
            entries to this character.
          </p>

          <form
            className="reference-search"
            onSubmit={runSearch}
          >
            <MagnifyingGlass size={17} />

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search item names"
            />

            <button type="submit">
              Search
            </button>
          </form>

          {status === "loading" && (
            <div className="reference-status">
              <SpinnerGap
                className="spin"
                size={20}
              />
              Contacting Open5e…
            </div>
          )}

          {message && (
            <div
              className={`reference-status ${status}`}
            >
              <WifiHigh size={18} />
              {message}
            </div>
          )}

          <div className="reference-results">
            {results.map((item) => (
              <article key={item.key}>
                <div>
                  <strong>
                    {item.name}
                  </strong>

                  <span>
                    {item.category?.name ||
                      "Item"}
                    {item.cost
                      ? ` · ${item.cost} gp`
                      : ""}
                  </span>
                </div>

                <button
                  onClick={() =>
                    addItem(item)
                  }
                  disabled={itemIds.has(
                    item.key
                  )}
                >
                  <Plus size={16} />
                  Add
                </button>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}