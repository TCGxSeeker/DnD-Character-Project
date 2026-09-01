const changeLabels = {
  featuresAdded: "Features gained",
  featsAdded: "Feats gained",
  spellsAdded: "Spells added",
  spellsRemoved: "Spells removed",
  itemsAdded: "Items obtained",
  itemsRemoved: "Items removed",
  companionsAdded: "Companions linked",
  abilitiesChanged: "Ability changes",
  hitPointsChanged: "Hit points",
  hitDiceSpent: "Hit Dice spent",
  hitDiceRestored: "Hit Dice restored",
  resourcesRestored: "Resources restored",
  resourcesSpent: "Resources spent",
  conditionsAdded: "Conditions applied",
  conditionsRemoved: "Conditions removed",
  spellSlotsRestored: "Spell slots restored",
  spellSlotsSpent: "Spell slots spent",
  equipmentChanged: "Equipment changes",
  ammunitionSpent: "Ammunition spent",
  inspirationChanged: "Inspiration",
  experienceChanged: "Experience",
  spellsChanged: "Spell configuration",
  companionsChanged: "Companion state",
  proficienciesChanged: "Proficiencies",
};

export function compactChanges(changes = {}) {
  return Object.fromEntries(Object.entries(changes).filter(([, values]) => Array.isArray(values) && values.length));
}

export function appendHistoryEvent(character, event) {
  const now = event.createdAt || new Date().toISOString();
  return {
    ...character,
    history: [{
      id: event.id || `history-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: event.type || "change",
      title: event.title,
      detail: event.detail || "",
      ...(event.note ? { note: event.note } : {}),
      changes: compactChanges(event.changes),
      createdAt: now,
      ...(event.classId ? { classId: event.classId } : {}),
      ...(event.classLevel ? { classLevel: event.classLevel } : {}),
      ...(event.abilityState ? { abilityState: structuredClone(event.abilityState) } : {}),
      ...(event.stateChanges?.length ? { stateChanges: structuredClone(event.stateChanges) } : {}),
    }, ...(character.history || [])],
  };
}

export function historyChangeGroups(event) {
  return Object.entries(compactChanges(event.changes)).map(([key, values]) => ({
    key,
    label: changeLabels[key] || key,
    values,
  }));
}
