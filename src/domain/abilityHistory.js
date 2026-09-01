import { ABILITIES } from "./rules.js";

const labels = Object.fromEntries(ABILITIES.map((ability) => [ability[0].toUpperCase() + ability.slice(1), ability]));

function eventAbilityTargets(event) {
  if (event?.abilityState?.after) return event.abilityState.after;
  const targets = {};
  (event?.changes?.abilitiesChanged || []).forEach((change) => {
    const match = String(change).match(/^([A-Za-z]+)\s+(-?\d+)\s+(?:→|->)\s+(-?\d+)$/);
    const ability = match ? labels[match[1]] : null;
    if (ability) targets[ability] = { before: Number(match[2]), after: Number(match[3]) };
  });
  return targets;
}

export function reconcileAbilityHistory(character) {
  const abilities = { ...(character.abilities || {}) };
  const resolved = new Set();
  let changed = false;
  for (const event of character.history || []) {
    const targets = eventAbilityTargets(event);
    for (const [ability, value] of Object.entries(targets || {})) {
      if (resolved.has(ability)) continue;
      const before = Number(value?.before ?? event?.abilityState?.before?.[ability]);
      const after = Number(value?.after ?? value);
      if (Number.isFinite(before) && Number.isFinite(after) && Number(abilities[ability]) === before) {
        abilities[ability] = after;
        changed = true;
      }
      resolved.add(ability);
    }
  }
  return changed ? { ...character, abilities } : character;
}
