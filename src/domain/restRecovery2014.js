function classEntry(character, classId) {
  return (character.classLevels || []).find((entry) => entry.classId === classId);
}

function recoveryFeature(character, id, name, classId, minimumLevel, subclassId = "") {
  const entry = classEntry(character, classId);
  const level = Number(entry?.level || 0);
  const subclassMatches = !subclassId || entry?.subclassId === subclassId || String(entry?.subclass || "").toLowerCase() === "circle of the land";
  const resource = (character.resources || []).find((candidate) => candidate.id === id);
  if (level < minimumLevel || !subclassMatches) return null;
  return { id, name, classId, classLevel: level, budget: Math.ceil(level / 2), available: resource ? Number(resource.current || 0) > 0 : true };
}

export function availableSpecialRecoveries(character) {
  return [
    recoveryFeature(character, "arcane-recovery", "Arcane Recovery", "wizard", 1),
    recoveryFeature(character, "natural-recovery", "Natural Recovery", "druid", 2, "circle-of-the-land"),
  ].filter(Boolean).map((feature) => ({
    ...feature,
    eligibleSlots: (character.usedSpellSlots || []).slice(0, 5).map((used, index) => ({ level: index + 1, expended: Math.max(0, Number(used || 0)) })).filter((slot) => slot.expended > 0),
  }));
}

export function songOfRestDie(character) {
  const level = Number(classEntry(character, "bard")?.level || 0);
  if (level < 2) return 0;
  return level >= 17 ? 12 : level >= 13 ? 10 : level >= 9 ? 8 : 6;
}

function normalizedSelections(selections = {}) {
  return Object.fromEntries(Object.entries(selections).map(([level, count]) => [Number(level), Number(count || 0)]).filter(([level, count]) => Number.isInteger(level) && level >= 1 && level <= 5 && Number.isInteger(count) && count > 0));
}

export function validateSpecialRecovery(character, featureId, selections = {}) {
  const feature = availableSpecialRecoveries(character).find((candidate) => candidate.id === featureId);
  if (!feature || !feature.available) {
    const error = new Error("That special recovery is not currently available.");
    error.code = "SPECIAL_RECOVERY_UNAVAILABLE";
    throw error;
  }
  const selected = normalizedSelections(selections);
  const totalLevels = Object.entries(selected).reduce((sum, [level, count]) => sum + (Number(level) * count), 0);
  if (!totalLevels || totalLevels > feature.budget) {
    const error = new Error(`${feature.name} can restore up to ${feature.budget} combined spell-slot levels.`);
    error.code = "SPECIAL_RECOVERY_BUDGET";
    throw error;
  }
  Object.entries(selected).forEach(([level, count]) => {
    if (count > Number(character.usedSpellSlots?.[Number(level) - 1] || 0)) {
      const error = new Error(`Not enough expended level ${level} spell slots are available.`);
      error.code = "SPECIAL_RECOVERY_SLOT_UNAVAILABLE";
      throw error;
    }
  });
  return { feature, selections: selected, totalLevels };
}

export function applySpecialRecoveries(character, requests = []) {
  let result = character;
  const restored = [];
  const resourcesSpent = [];
  const usedFeatures = new Set();
  requests.forEach((request) => {
    if (usedFeatures.has(request.featureId)) throw new Error("A special recovery feature can be used only once during this rest.");
    const resolved = validateSpecialRecovery(result, request.featureId, request.selections);
    const usedSpellSlots = [...(result.usedSpellSlots || [])];
    Object.entries(resolved.selections).forEach(([level, count]) => {
      usedSpellSlots[Number(level) - 1] = Number(usedSpellSlots[Number(level) - 1] || 0) - count;
      restored.push(`${resolved.feature.name}: ${count} × level ${level}`);
    });
    const hasResource = (result.resources || []).some((resource) => resource.id === resolved.feature.id);
    const resources = hasResource
      ? (result.resources || []).map((resource) => resource.id === resolved.feature.id ? { ...resource, current: Number(resource.current) - 1 } : resource)
      : [...(result.resources || []), { id: resolved.feature.id, name: resolved.feature.name, current: 0, max: 1, reset: "Long rest", granted: true }];
    resourcesSpent.push(resolved.feature.name);
    result = { ...result, usedSpellSlots, resources };
    usedFeatures.add(request.featureId);
  });
  return { character: result, restored, resourcesSpent };
}
