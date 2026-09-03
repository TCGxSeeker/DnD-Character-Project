import { abilityModifier, proficiencyBonus, totalCharacterLevel } from "./rules.js";
import { effectiveExtraAttacks } from "./multiclass.js";
import { ammunitionSummary } from "./equipment.js";
import { appendHistoryEvent } from "./history.js";
import { armorProficiencyRestrictions } from "./armor.js";
import { weaponProfile } from "./weapons.js";
import { startingProficiencies } from "../data/startingProficiencies2014.js";
import { specialWeaponRule2014 } from "./specialWeapons2014.js";

const hasChoice = (character, selection) => (character.classChoices || []).some((choice) => ["fighter-style", "paladin-style", "ranger-style"].includes(choice.id) && choice.selections?.includes(selection));
export { weaponProfile } from "./weapons.js";

function proficient(character, weapon, item = null) {
  const override =
    String(
      item?.proficiencyOverride
      || "auto",
    )
      .trim()
      .toLowerCase();

  if (override === "proficient") {
    return true;
  }

  if (override === "not-proficient") {
    return false;
  }

  const saved =
    character.proficiencies?.weapons
    || [];

  const classId =
    character.levelHistory?.[0]?.classId
    || character.classLevels?.[0]?.classId;

  const values = (
    saved.length
      ? saved
      : startingProficiencies(classId).weapons
  ).map(
    (entry) =>
      String(entry).toLowerCase(),
  );

  const name =
    String(weapon.name).toLowerCase();

  return (
    values.includes(name)
    || values.includes(`${name}s`)
    || (
      weapon.isSimple
      && values.includes("simple weapons")
    )
    || (
      weapon.isMartial
      && values.includes("martial weapons")
    )
  );
}

function attackAbilityFor(
  character,
  item,
  weapon,
) {
  const requested =
    String(
      item?.attackAbility
      || "auto",
    )
      .trim()
      .toLowerCase();

  const supported = [
    "strength",
    "dexterity",
    "constitution",
    "intelligence",
    "wisdom",
    "charisma",
  ];

  if (supported.includes(requested)) {
    return requested;
  }

  const strength =
    abilityModifier(
      character.abilities?.strength
      ?? 10,
    );

  const dexterity =
    abilityModifier(
      character.abilities?.dexterity
      ?? 10,
    );

  return (
    weapon.attackType === "ranged"
    || (
      weapon.finesse
      && dexterity > strength
    )
  )
    ? "dexterity"
    : "strength";
}

function secondaryDamagePackets(item) {
  return (
    Array.isArray(item?.secondaryDamage)
      ? item.secondaryDamage
      : []
  )
    .filter(
      (packet) =>
        packet
        && typeof packet === "object",
    )
    .map(
      (packet) => ({
        dice:
          String(
            packet.dice
            || "",
          ).trim(),

        type:
          String(
            packet.type
            || "",
          ).trim(),

        bonus:
          Number.isFinite(
            Number(packet.bonus),
          )
            ? Number(packet.bonus)
            : 0,
      }),
    )
    .filter(
      (packet) =>
        packet.dice
        || packet.type
        || packet.bonus,
    );
}

function numericBonus(value) {
  const bonus = Number(value);
  return Number.isFinite(bonus) ? bonus : 0;
}

export function attackRows(character) {
  const pb = proficiencyBonus(totalCharacterLevel(character.classLevels));
  const equippedWeapons = (character.inventory || []).filter((item) => item.equipped && Number(item.quantity ?? 1) > 0).map((item) => ({ item, weapon: weaponProfile(item) })).filter(({ weapon }) => weapon);
  const armorRestrictions = armorProficiencyRestrictions(character);
  return equippedWeapons.map(({ item, weapon }) => {
    const ability =
      attackAbilityFor(
        character,
        item,
        weapon,
      );

    const modifier =
      abilityModifier(
        character.abilities?.[ability]
        ?? 10,
      );
    const use = weaponUse(item, weapon);
    const otherWeapons = equippedWeapons.filter((entry) => entry.item.id !== item.id);
    const offhandPartner = otherWeapons.some((entry) => entry.weapon.attackType === "melee" && entry.weapon.light && weaponUse(entry.item, entry.weapon).wieldMode === "one-handed" && weaponUse(entry.item, entry.weapon).role !== "offhand");
    const offhandLegal = use.role !== "offhand" || (weapon.attackType === "melee" && weapon.light && use.wieldMode === "one-handed" && offhandPartner);
    const isProficient = proficient(character, weapon, item), archery = weapon.attackType === "ranged" && hasChoice(character, "Archery") ? 2 : 0;
    const dueling = weapon.attackType === "melee" && use.wieldMode === "one-handed" && use.role !== "offhand" && otherWeapons.length === 0 && hasChoice(character, "Dueling") ? 2 : 0;
    const offhandModifier = use.role === "offhand" && modifier > 0 && !hasChoice(character, "Two-Weapon Fighting") ? 0 : modifier;
    const magicBonus = numericBonus(item.magicBonus);
    const attackItemBonus = numericBonus(item.attackBonus) + magicBonus;
    const damageBonus = offhandModifier + dueling + numericBonus(item.damageBonus) + magicBonus;
    const ammunition = ammunitionSummary(character, item);
    const special = specialWeaponRule2014(weapon);
    const damageDice = use.wieldMode === "two-handed" && weapon.versatileDamage ? weapon.versatileDamage : weapon.damageDice;
    const disadvantageReasons = [
      ...(weapon.heavy && ["small", "tiny"].includes(String(character.size || "medium").toLowerCase()) ? ["Heavy weapon used by a Small or Tiny creature"] : []),
      ...(armorRestrictions.active && armorRestrictions.disadvantagedAbilities.includes(ability) ? [armorRestrictions.reason] : []),
    ];
    const rules = [
      ...(weapon.loading ? ["Loading limits this weapon to one shot per action, bonus action, or reaction"] : []),
      ...(weapon.reach ? ["Reach extends attacks and opportunity attacks by 5 feet"] : []),
      ...(special ? [special.summary] : weapon.special ? ["Special weapon rules apply"] : []),
      ...(hasChoice(character, "Great Weapon Fighting") && weapon.attackType === "melee" && use.wieldMode === "two-handed" && (weapon.twoHanded || weapon.versatile) ? ["Great Weapon Fighting: reroll weapon damage dice showing 1 or 2 once"] : []),
      ...(!offhandLegal ? ["Off-hand attacks require another light one-handed melee weapon"] : []),
    ];
    return {
      id: item.id, name: item.name, ability, proficient: isProficient, use,
      attackBonus: modifier + (isProficient ? pb : 0) + archery + attackItemBonus,
      damage: special?.dealsDamage === false ? "—" : `${damageDice}${damageBonus ? ` ${damageBonus > 0 ? "+" : "−"} ${Math.abs(damageBonus)}` : ""}`,
      damageType: weapon.damageType,
      versatileDamage: weapon.versatileDamage,
      secondaryDamage:
        secondaryDamagePackets(item),
      ammunition,
      special,
      actionType: use.role === "offhand" ? "bonus action" : "attack action",
      maximumAttacks: Math.min(weapon.loading ? 1 : effectiveExtraAttacks(character), special?.attackLimit ?? Infinity),
      range: weapon.attackType === "ranged" || use.attackMode === "thrown" ? weapon.range : null,
      reach: weapon.attackType === "melee" && use.attackMode !== "thrown" ? (weapon.reach ? 10 : 5) : null,
      disadvantageReasons, rules,
      available: offhandLegal && (!ammunition.required || ammunition.available > 0),
      sources: [{ source: `${ability} modifier`, value: modifier }, ...(isProficient ? [{ source: "Proficiency bonus", value: pb }] : []), ...(archery ? [{ source: "Archery fighting style", value: archery }] : []), ...(dueling ? [{ source: "Dueling fighting style damage", value: dueling }] : []), ...(attackItemBonus ? [{ source: item.name, value: attackItemBonus }] : [])],
    };
  });
}

export function weaponUse(item, weapon = weaponProfile(item)) {
  const requestedMode = item?.weaponUse?.wieldMode;
  const lance = weapon?.specialRuleId === "lance";
  const wieldMode = weapon?.twoHanded ? "two-handed" : lance ? (requestedMode === "one-handed" ? "one-handed" : "two-handed") : requestedMode === "two-handed" && weapon?.versatile ? "two-handed" : "one-handed";
  const role = item?.weaponUse?.role === "offhand" ? "offhand" : "main";
  const attackMode = weapon?.attackType === "ranged" ? "ranged" : item?.weaponUse?.attackMode === "thrown" && weapon?.thrown ? "thrown" : "melee";
  return { wieldMode, role, attackMode };
}

export function setWeaponUse(character, itemId, patch) {
  const item = (character.inventory || []).find((entry) => entry.id === itemId);
  const weapon = weaponProfile(item);
  if (!item || !weapon) throw new Error(`Unknown weapon: ${itemId}.`);
  const current = weaponUse(item, weapon);
  const next = { ...current, ...patch };
  if (!['one-handed', 'two-handed'].includes(next.wieldMode)) throw new Error("Wield mode must be one-handed or two-handed.");
  if (next.wieldMode === "two-handed" && !weapon.twoHanded && !weapon.versatile && weapon.specialRuleId !== "lance") throw new Error(`${item.name} cannot be wielded with two hands for a different damage die.`);
  if (next.wieldMode === "one-handed" && weapon.twoHanded) throw new Error(`${item.name} requires two hands.`);
  if (!['main', 'offhand'].includes(next.role)) throw new Error("Weapon role must be main or offhand.");
  if (!['melee', 'ranged', 'thrown'].includes(next.attackMode)) throw new Error("Attack mode must be melee, ranged, or thrown.");
  if (next.attackMode === "thrown" && !weapon.thrown) throw new Error(`${item.name} does not have the thrown property.`);
  if (weapon.attackType === "ranged" && next.attackMode !== "ranged") throw new Error(`${item.name} is a ranged weapon.`);
  if (next.role === "offhand" && (!weapon.light || weapon.attackType !== "melee" || next.wieldMode !== "one-handed")) throw new Error("An off-hand weapon must be a light one-handed melee weapon.");
  if (next.wieldMode === current.wieldMode && next.role === current.role && next.attackMode === current.attackMode) return character;
  const inventory = character.inventory.map((entry) => entry.id === itemId ? { ...entry, weaponUse: next } : entry);
  const detail = `${item.name}: ${current.wieldMode}/${current.role}/${current.attackMode} → ${next.wieldMode}/${next.role}/${next.attackMode}`;
  return appendHistoryEvent({ ...character, inventory }, { type: "equipment-changed", title: `Changed ${item.name} use`, detail, changes: { equipmentChanged: [detail] }, stateChanges: [{ category: "equipment", before: { itemId, weaponUse: current }, after: { itemId, weaponUse: next } }] });
}

export const attackSummary = (character) => {
  const attacks = attackRows(character);
  const shield = (character.inventory || []).some((item) => item.equipped && item.equipment?.kind === "shield");
  return {
    attacksPerAction: effectiveExtraAttacks(character), attacks,
    reactions: shield && hasChoice(character, "Protection") ? [{ id: "protection", name: "Protection", detail: "Reaction: impose disadvantage when a visible creature attacks another target within 5 feet." }] : [],
  };
};
