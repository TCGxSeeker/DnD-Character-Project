import { abilityModifier, totalCharacterLevel } from "./rules.js";
import { legacyHitDicePools } from "./multiclass.js";
import { appendHistoryEvent } from "./history.js";
import { applySpecialRecoveries, songOfRestDie } from "./restRecovery2014.js";

const resetMatches = (resource, rest) => String(resource.reset || "").toLowerCase().includes(rest);
const poolsFor = (character) => character.hitDicePools && Object.keys(character.hitDicePools).length
  ? character.hitDicePools
  : legacyHitDicePools(character.classLevels, character.hitDiceRemaining);
const currentDice = (pools) => Object.values(pools).reduce((sum, pool) => sum + Number(pool.current || 0), 0);
const restoredResources = (before = [], after = []) => after.filter((entry) => Number(entry.current) > Number(before.find((current) => current.id === entry.id)?.current || 0)).map((entry) => entry.name || entry.id);

export function spendHitDie(character, die, roll) {
  const pools = poolsFor(character);
  const pool = pools[die];
  const dieSize = Number(String(die).replace(/^d/, ""));
  const result = Number(roll);
  if (!pool || Number(pool.current) < 1 || !Number.isInteger(result) || result < 1 || result > dieSize) {
    const error = new Error(`Enter a valid ${die} result and ensure one die remains.`);
    error.code = "INVALID_HIT_DIE_SPEND";
    throw error;
  }
  const healing = Math.max(0, result + abilityModifier(character.abilities?.constitution || 10));
  const hitDicePools = { ...pools, [die]: { ...pool, current: Number(pool.current) - 1 } };
  return {
    ...character,
    hp: Math.min(Number(character.maxHp || 0), Number(character.hp || 0) + healing),
    hitDicePools,
    hitDiceRemaining: currentDice(hitDicePools),
  };
}

export function takeShortRest(character, context = {}) {
  const special = applySpecialRecoveries(character, context.specialRecoveries || []);
  const songDie = songOfRestDie(special.character);
  const songRoll = Number(context.songOfRestRoll || 0);
  if (songRoll && (!context.hitDiceSpent?.length || !Number.isInteger(songRoll) || songRoll < 1 || songRoll > songDie)) {
    const error = new Error(`Song of Rest requires a d${songDie} result after spending at least one Hit Die.`);
    error.code = "INVALID_SONG_OF_REST";
    throw error;
  }
  const songHealing = songRoll ? Math.min(songRoll, Math.max(0, Number(special.character.maxHp) - Number(special.character.hp))) : 0;
  const restedCharacter = { ...special.character, hp: Number(special.character.hp) + songHealing };
  const result = {
    ...restedCharacter,
    pactSlots: restedCharacter.pactSlots ? { ...restedCharacter.pactSlots, current: restedCharacter.pactSlots.max } : restedCharacter.pactSlots,
    resources: (restedCharacter.resources || []).map((entry) => resetMatches(entry, "short") ? { ...entry, current: entry.max } : entry),
  };
  return appendHistoryEvent(result, {
    type: "rest", title: "Completed a short rest", detail: "Eligible class resources and Pact Magic restored.",
    changes: {
      hitPointsChanged: context.hpBefore != null && Number(context.hpBefore) !== Number(result.hp) ? [`${context.hpBefore} → ${result.hp}${songHealing ? ` (includes ${songHealing} Song of Rest)` : ""}`] : [],
      hitDiceSpent: context.hitDiceSpent || [],
      resourcesRestored: restoredResources(character.resources, result.resources),
      resourcesSpent: special.resourcesSpent,
      spellSlotsRestored: [...special.restored, ...(character.pactSlots && Number(character.pactSlots.current) < Number(result.pactSlots.current) ? ["Pact Magic"] : [])],
    },
  });
}

export function takeLongRest(character, hitDieRecoveryOrder = []) {
  const pools = poolsFor(character);
  let recovery = Math.max(1, Math.floor(totalCharacterLevel(character.classLevels) / 2));
  const orderedDice = [...new Set([...hitDieRecoveryOrder, ...Object.keys(pools)])];
  const hitDicePools = { ...pools };
  orderedDice.forEach((die) => {
    if (!hitDicePools[die] || recovery <= 0) return;
    const missing = Number(hitDicePools[die].max) - Number(hitDicePools[die].current);
    const restored = Math.min(missing, recovery);
    hitDicePools[die] = { ...hitDicePools[die], current: Number(hitDicePools[die].current) + restored };
    recovery -= restored;
  });
  const result = {
    ...character,
    hp: character.maxHp,
    tempHp: 0,
    usedSpellSlots: (character.spellSlots || []).map(() => 0),
    pactSlots: character.pactSlots ? { ...character.pactSlots, current: character.pactSlots.max } : character.pactSlots,
    resources: (character.resources || []).map((entry) => resetMatches(entry, "short") || resetMatches(entry, "long") ? { ...entry, current: entry.max } : entry),
    hitDicePools,
    hitDiceRemaining: currentDice(hitDicePools),
  };
  const restoredDice = Object.entries(hitDicePools).filter(([die, pool]) => Number(pool.current) > Number(pools[die]?.current || 0)).map(([die, pool]) => `${die} ${pools[die].current} → ${pool.current}`);
  return appendHistoryEvent(result, {
    type: "rest", title: "Completed a long rest", detail: "Hit points, spell slots, eligible resources, and Hit Dice restored.",
    changes: {
      hitPointsChanged: Number(character.hp) !== Number(result.hp) ? [`${character.hp} → ${result.hp}`] : [],
      hitDiceRestored: restoredDice,
      resourcesRestored: restoredResources(character.resources, result.resources),
      spellSlotsRestored: (character.usedSpellSlots || []).some(Number) ? ["Spellcasting"] : [],
    },
  });
}
