const TARGET_SIZES = ["tiny", "small", "medium", "large", "huge", "gargantuan"];

const RULES = {
  lance: {
    id: "lance",
    summary: "Disadvantage against a target within 5 feet; requires two hands while unmounted.",
    closeRangeDisadvantage: 5,
    requiresTwoHandsUnlessMounted: true,
  },
  net: {
    id: "net",
    summary: "A hit restrains an eligible target; attacking with a net permits only one attack.",
    attackLimit: 1,
    dealsDamage: false,
    onHit: {
      effect: "restrained",
      maximumTargetSize: "large",
      excludesFormless: true,
      escape: { action: "action", ability: "strength", dc: 10 },
      destroy: { armorClass: 10, damage: 5, damageType: "slashing" },
    },
  },
};

export function specialWeaponRule2014(weapon) {
  const id = weapon?.specialRuleId;
  const rule = RULES[id];
  return rule ? structuredClone(rule) : null;
}

export function normalizeTargetSize2014(value) {
  const size = String(value || "").toLowerCase();
  return TARGET_SIZES.includes(size) ? size : "unknown";
}

export function resolveSpecialWeaponContext2014(attack, context) {
  const rule = attack?.special;
  if (!rule) return { disadvantageReasons: [], unavailableReasons: [], resolution: null };
  const disadvantageReasons = [];
  const unavailableReasons = [];

  if (rule.id === "lance") {
    if (context.distance != null && context.distance <= rule.closeRangeDisadvantage) disadvantageReasons.push("Lance attack against a target within 5 feet");
    if (rule.requiresTwoHandsUnlessMounted && attack.use?.wieldMode === "one-handed" && !context.attackerMounted) unavailableReasons.push("A lance requires two hands while unmounted");
    return {
      disadvantageReasons,
      unavailableReasons,
      resolution: { id: "lance-grip", status: context.attackerMounted ? "mounted" : "unmounted", requiresTwoHands: !context.attackerMounted },
    };
  }

  if (rule.id === "net") {
    const targetSize = normalizeTargetSize2014(context.targetSize);
    const ineligibleReason = context.targetFormless
      ? "A net has no effect on a formless creature"
      : ["huge", "gargantuan"].includes(targetSize) ? "A net has no effect on a Huge or larger creature" : "";
    const status = ineligibleReason ? "no-effect" : targetSize === "unknown" ? "target-needed" : "applies";
    return {
      disadvantageReasons,
      unavailableReasons,
      resolution: { id: "net-restrain", status, effect: "restrained", targetSize, reason: ineligibleReason || null, escape: rule.onHit.escape, destroy: rule.onHit.destroy },
    };
  }

  return { disadvantageReasons, unavailableReasons, resolution: null };
}
