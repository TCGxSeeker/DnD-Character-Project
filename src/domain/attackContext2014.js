const COVER = new Set(["none", "half", "three-quarters", "total"]);
import { normalizeTargetSize2014, resolveSpecialWeaponContext2014 } from "./specialWeapons2014.js";

const hasFeat = (character, id) => (character?.features || []).some((feature) => feature.id === `feat-${id}`);
const finiteDistance = (value) => {
  if (value === "" || value == null) return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : null;
};

export function normalizeAttackContext(context = {}) {
  return {
    distance: finiteDistance(context.distance),
    cover: COVER.has(context.cover) ? context.cover : "none",
    hostileWithin5: Boolean(context.hostileWithin5),
    hostileCanSeeAttacker: context.hostileCanSeeAttacker !== false,
    hostileIncapacitated: Boolean(context.hostileIncapacitated),
    attackerCanSeeTarget: context.attackerCanSeeTarget !== false,
    targetCanSeeAttacker: context.targetCanSeeAttacker !== false,
    targetProne: Boolean(context.targetProne),
    attackerMounted: Boolean(context.attackerMounted),
    targetSize: normalizeTargetSize2014(context.targetSize),
    targetFormless: Boolean(context.targetFormless),
  };
}

function distanceBand(attack, distance) {
  if (distance == null) return "unknown";
  if (attack.range) {
    if (distance > Number(attack.range.long || attack.range.normal || 0)) return "out-of-range";
    if (distance > Number(attack.range.normal || 0)) return "long";
    return "normal";
  }
  if (distance > Number(attack.reach || 5)) return "out-of-range";
  return "melee";
}

export function evaluateAttackContext2014(character, attack, rawContext = {}) {
  if (!attack?.id) throw new Error("A calculated attack is required.");
  const context = normalizeAttackContext(rawContext);
  const rangeBand = distanceBand(attack, context.distance);
  const rangedAttack = Boolean(attack.range);
  const sharpshooter = rangedAttack && hasFeat(character, "sharpshooter");
  const crossbowExpert = rangedAttack && hasFeat(character, "crossbow-expert");
  const ignoredCover = sharpshooter && ["half", "three-quarters"].includes(context.cover);
  const coverArmorClassBonus = ignoredCover ? 0 : context.cover === "half" ? 2 : context.cover === "three-quarters" ? 5 : 0;
  const coverDexteritySaveBonus = coverArmorClassBonus;
  const advantageReasons = [];
  const disadvantageReasons = [...(attack.disadvantageReasons || [])];
  const unavailableReasons = [];
  const special = resolveSpecialWeaponContext2014(attack, context);
  disadvantageReasons.push(...special.disadvantageReasons);
  unavailableReasons.push(...special.unavailableReasons);

  if (attack.available === false) unavailableReasons.push("Attack is not currently available");
  if (rangeBand === "out-of-range") unavailableReasons.push(rangedAttack ? "Target is beyond long range" : "Target is beyond this attack's reach");
  if (context.cover === "total") unavailableReasons.push("Target has total cover");
  if (rangeBand === "long" && !sharpshooter) disadvantageReasons.push("Target is beyond normal range");
  if (rangedAttack && context.hostileWithin5 && context.hostileCanSeeAttacker && !context.hostileIncapacitated && !crossbowExpert) disadvantageReasons.push("A conscious hostile creature that can see you is within 5 feet");
  if (!context.attackerCanSeeTarget) disadvantageReasons.push("You cannot see the target");
  if (!context.targetCanSeeAttacker) advantageReasons.push("The target cannot see you");
  if (context.targetProne && context.distance != null) {
    if (context.distance <= 5) advantageReasons.push("The prone target is within 5 feet");
    else disadvantageReasons.push("The prone target is farther than 5 feet away");
  }

  const canAttack = unavailableReasons.length === 0;
  const rollState = advantageReasons.length && !disadvantageReasons.length
    ? "advantage"
    : disadvantageReasons.length && !advantageReasons.length ? "disadvantage" : "normal";
  return {
    context, canAttack, rangeBand, rollState,
    advantageReasons, disadvantageReasons, unavailableReasons,
    coverArmorClassBonus, coverDexteritySaveBonus,
    specialResolution: special.resolution,
    ignoredRules: [
      ...(sharpshooter && rangeBand === "long" ? ["Sharpshooter ignores long-range disadvantage"] : []),
      ...(ignoredCover ? ["Sharpshooter ignores partial cover"] : []),
      ...(crossbowExpert && context.hostileWithin5 ? ["Crossbow Expert ignores close-combat disadvantage"] : []),
    ],
  };
}
