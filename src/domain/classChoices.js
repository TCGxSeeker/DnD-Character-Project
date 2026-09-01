import { levelChoicesDue } from "../data/classChoices2014.js";
import { availableChoiceOptions, expandChoiceDefinitions, replacementTargets, resolveChoiceDefinitions } from "./choices.js";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function optionResolver(character, choice) {
  if (choice.kind === "expertise") return unique([...(character.skills || []), ...(choice.includeThievesTools ? ["Thieves' tools"] : [])]);
  if (["fighter-style", "paladin-style", "ranger-style"].includes(choice.id)) {
    const known = new Set((character.classChoices || []).filter((entry) => ["fighter-style", "paladin-style", "ranger-style"].includes(entry.id)).flatMap((entry) => entry.selections || []));
    return (choice.options || []).filter((option) => !known.has(option));
  }
  return choice.options || [];
}

export function choiceOptionsForCharacter(character, choice, selections = {}) {
  return availableChoiceOptions(character, choice, { selections, classId: choice.classId, optionResolver }).map((option) => option.id);
}

function resolvableChoices(character, choices, selections = {}, classId = "") {
  return expandChoiceDefinitions(character, choices, selections, { classId, optionResolver })
    .filter((choice) => choiceOptionsForCharacter(character, choice, selections).length >= choice.count);
}

export function dueResolvableClassChoices(character, classId, selections = {}) {
  return resolvableChoices(character, levelChoicesDue(character, classId), selections, classId);
}

export function resolveClassChoices(character, classId, selections = {}, replacements = {}) {
  const due = levelChoicesDue(character, classId).filter((choice) => choiceOptionsForCharacter(character, choice, selections).length >= choice.count);
  let resolved;
  try {
    const result = resolveChoiceDefinitions(character, due, selections, { classId, optionResolver, replacements });
    resolved = result.resolved.map((entry) => ({ ...entry, classId }));
    var removals = result.removals;
  } catch (error) {
    if (error.code === "CHOICE_REQUIRED") error.code = "CLASS_CHOICE_REQUIRED";
    if (error.code === "CHOICE_REPLACEMENT_REQUIRED") error.code = "CLASS_CHOICE_REPLACEMENT_REQUIRED";
    throw error;
  }
  const removedSelections = new Set((removals || []).map((token) => token.slice(token.indexOf("::") + 2)));
  const expertise = unique([
    ...(character.expertise || []).filter((selection) => !removedSelections.has(selection)),
    ...resolved.filter((entry) => entry.kind === "expertise").flatMap((entry) => entry.selections),
  ]);
  const features = resolved.filter((entry) => entry.kind !== "expertise").map((entry) => ({
    id: `class-choice-${entry.id}`,
    name: entry.label,
    source: `${classId[0].toUpperCase()}${classId.slice(1)} ${entry.level}`,
    detail: entry.selections.join(", "),
    benefits: entry.selections.map((selection) => `Selected: ${selection}.`),
    classId,
    classLevel: entry.level,
  }));
  return { resolved, expertise, features, removals: removals || [] };
}

export function replacementOptionsForChoice(character, choice) {
  return replacementTargets(character, choice).map((token) => ({ token, label: token.slice(token.indexOf("::") + 2) }));
}

export function creationResolvableClassChoices(classId, skills, selections = {}) {
  const character = { classLevels: [{ classId, level: 0 }], classChoices: [], skills };
  const choices = levelChoicesDue(character, classId).filter((choice) => !choice.catalogPending && choice.kind !== "spell");
  return resolvableChoices(character, choices, selections, classId);
}

export function resolveCreationClassChoices(classId, skills, selections = {}) {
  const character = { classLevels: [{ classId, level: 0 }], classChoices: [], skills };
  const choices = levelChoicesDue(character, classId).filter((choice) => !choice.catalogPending && choice.kind !== "spell");
  return resolveChoiceDefinitions(character, choices, selections, { classId, optionResolver }).resolved.map((entry) => ({ ...entry, classId }));
}
