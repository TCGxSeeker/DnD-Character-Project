import { totalCharacterLevel } from "./rules.js";

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

export function normalizeChoiceOption(option) {
  if (typeof option === "string") return { id: option, label: option };
  return { ...option, id: option.id || option.value || option.label, label: option.label || option.name || option.id || option.value };
}

function classLevel(character, classId) {
  return Number(character.classLevels?.find((entry) => entry.classId === classId)?.level || 0);
}

export function prerequisiteFailures(character, prerequisites = [], context = {}) {
  const selections = context.selections || {};
  return prerequisites.flatMap((rule) => {
    if (rule.type === "level" && totalCharacterLevel(character.classLevels || []) < rule.minimum) return [rule.message || `Requires character level ${rule.minimum}.`];
    if (rule.type === "class-level" && classLevel(character, rule.classId || context.classId) < rule.minimum) return [rule.message || `Requires ${rule.classId || context.classId} level ${rule.minimum}.`];
    if (rule.type === "ability" && Number(character.abilities?.[rule.ability] || 0) < rule.minimum) return [rule.message || `Requires ${rule.ability} ${rule.minimum}.`];
    if (rule.type === "proficiency") {
      const values = character.proficiencies?.[rule.group] || character[rule.group] || [];
      if (!values.includes(rule.value)) return [rule.message || `Requires proficiency with ${rule.value}.`];
    }
    if (rule.type === "choice" && !(selections[rule.choiceId] || []).includes(rule.optionId)) return [rule.message || `Requires ${rule.optionId}.`];
    return [];
  });
}

export function availableChoiceOptions(character, choice, context = {}) {
  const priorSelections = (character.classChoices || []).filter((entry) => (choice.excludeSelectionsFrom || []).includes(entry.id)).flatMap((entry) => entry.selections || []);
  const transactionSelections = (choice.excludeSelectionsFrom || []).flatMap((choiceId) => context.selections?.[choiceId] || []);
  const excluded = new Set([...(choice.excludeSelections || []), ...priorSelections, ...transactionSelections]);
  const raw = context.optionResolver?.(character, choice) ?? choice.options ?? [];
  return raw.map(normalizeChoiceOption).filter((option) => !excluded.has(option.id) && prerequisiteFailures(character, option.prerequisites, context).length === 0);
}

export function expandChoiceDefinitions(character, choices, selections = {}, context = {}) {
  const visible = [];
  const visit = (choice, parentId = "") => {
    if (prerequisiteFailures(character, choice.prerequisites, { ...context, selections }).length) return;
    const normalized = { ...choice, parentId };
    visible.push(normalized);
    const selected = new Set(selections[choice.id] || []);
    availableChoiceOptions(character, choice, { ...context, selections }).forEach((option) => {
      if (!selected.has(option.id)) return;
      (option.choices || option.children || []).forEach((child) => visit(child, choice.id));
    });
  };
  choices.forEach((choice) => visit(choice));
  return visible;
}

export function replacementTargets(character, choice) {
  const from = choice.replacement?.fromChoiceIds || [];
  return (character.classChoices || []).filter((entry) => from.includes(entry.id)).flatMap((entry) => (entry.selections || []).map((selection) => `${entry.id}::${selection}`));
}

export function applyChoiceRemovals(existingChoices = [], removals = []) {
  const byChoice = new Map();
  removals.forEach((token) => {
    const separator = token.indexOf("::");
    if (separator < 0) return;
    const choiceId = token.slice(0, separator);
    const selection = token.slice(separator + 2);
    byChoice.set(choiceId, new Set([...(byChoice.get(choiceId) || []), selection]));
  });
  return existingChoices.flatMap((choice) => {
    const removed = byChoice.get(choice.id);
    if (!removed) return [choice];
    const selections = (choice.selections || []).filter((selection) => !removed.has(selection));
    return selections.length ? [{ ...choice, selections }] : [];
  });
}

export function resolveChoiceDefinitions(character, choices, selections = {}, context = {}) {
  const visible = expandChoiceDefinitions(character, choices, selections, context);
  const resolved = visible.map((choice) => {
    const allowed = new Set(availableChoiceOptions(character, choice, { ...context, selections }).map((option) => option.id));
    const selected = unique(selections[choice.id]);
    const required = choice.optional ? 0 : Number(choice.count || 1);
    if ((!choice.optional && selected.length !== required) || selected.length > Number(choice.count || 1) || selected.some((entry) => !allowed.has(entry))) {
      const error = new Error(`Choose ${choice.count || 1} ${(choice.count || 1) === 1 ? "option" : "options"} for ${choice.label}.`);
      error.code = "CHOICE_REQUIRED";
      error.choiceId = choice.id;
      throw error;
    }
    const replacementCount = Number(choice.replacement?.count || 0);
    const replacements = unique(context.replacements?.[choice.id]);
    const targets = new Set(replacementTargets(character, choice));
    if (replacementCount && (replacements.length !== replacementCount || replacements.some((entry) => !targets.has(entry)))) {
      const error = new Error(`Choose ${replacementCount} existing selection to replace for ${choice.label}.`);
      error.code = "CHOICE_REPLACEMENT_REQUIRED";
      error.choiceId = choice.id;
      throw error;
    }
    return { id: choice.id, label: choice.label, kind: choice.kind || "option", level: choice.level, selections: selected, replacements, parentId: choice.parentId || "" };
  });
  return { resolved, removals: resolved.flatMap((entry) => entry.replacements) };
}
