import { appendHistoryEvent } from "./history.js";
import { armorProficiencyRestrictions } from "./armor.js";

function ordinal(level) {
  return ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"][level] || `${level}th`;
}

export function availableCastingOptions(character, spellLevel = 1) {
  if (!spellcastingStatus(character).allowed) return [];
  const required = Math.max(1, Number(spellLevel || 0));
  const standard = (character.spellSlots || []).flatMap((maximum, index) => {
    const level = index + 1;
    const available = Math.max(0, Number(maximum) - Number(character.usedSpellSlots?.[index] || 0));
    return level >= required && available > 0 ? [{ pool: "spellcasting", level, available, label: `${ordinal(level)}-level Spellcasting slot` }] : [];
  });
  const pact = character.pactSlots;
  if (pact && Number(pact.level) >= required && Number(pact.current) > 0) {
    standard.push({ pool: "pact", level: Number(pact.level), available: Number(pact.current), label: `${ordinal(pact.level)}-level Pact Magic slot` });
  }
  return standard;
}

export function spellcastingStatus(character) {
  const armor = armorProficiencyRestrictions(character);
  return { allowed: armor.spellcastingAllowed, reasons: armor.active ? [armor.reason] : [] };
}

export function spendCastingSlot(character, option, spellName = "Spell") {
  const status = spellcastingStatus(character);
  if (!status.allowed) {
    const error = new Error(`Spellcasting is blocked: ${status.reasons.join("; ")}.`);
    error.code = "SPELLCASTING_BLOCKED_ARMOR";
    throw error;
  }
  const valid = availableCastingOptions(character, option?.spellLevel || 1).find((candidate) => candidate.pool === option?.pool && candidate.level === Number(option?.level));
  if (!valid) {
    const error = new Error("That spell slot is not currently available.");
    error.code = "SPELL_SLOT_UNAVAILABLE";
    throw error;
  }
  let result;
  if (valid.pool === "pact") {
    result = { ...character, pactSlots: { ...character.pactSlots, current: Number(character.pactSlots.current) - 1 } };
  } else {
    const usedSpellSlots = (character.spellSlots || []).map((maximum, index) => Math.min(Number(maximum), Math.max(0, Number(character.usedSpellSlots?.[index] || 0))));
    usedSpellSlots[valid.level - 1] += 1;
    result = { ...character, usedSpellSlots };
  }
  return appendHistoryEvent(result, {
    type: "spell-cast",
    title: `Cast ${spellName}`,
    detail: valid.label,
    changes: { spellSlotsSpent: [valid.label] },
  });
}
