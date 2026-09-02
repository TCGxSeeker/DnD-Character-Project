import {
  CLASS_RULES,
  averageHitDie,
  calculateMaxHp,
  multiclassSpellSlots,
  totalCharacterLevel,
  validateMulticlassPrerequisites,
} from "./rules.js";
import { createSubclassCompanion, deriveCompanionStats } from "./companions.js";
import { abilityScoreChoiceForLevel } from "./progression.js";
import {
  findSubclassOptionWithContent,
  localSubclassFeaturesForLevel,
  subclassChoiceForLevelWithContent,
} from "../data/contentCatalog.js";
import { featEligibility, findFeat } from "./feats.js";
import { grantedContentDelta } from "./grantedContent.js";
import { appendHistoryEvent } from "./history.js";
import { syncPactMagic, syncGrantedClassResources } from "./classResources2014.js";
import { resolveClassChoices } from "./classChoices.js";
import { applyChoiceRemovals } from "./choices.js";
import { calculateCharacterMaxHp } from "./derivedMechanics.js";
import { applyMulticlassProficiencies, isNewClass, legacyHitDicePools, syncHitDicePools } from "./multiclass.js";

function choiceError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function titleCase(value) {
  return value[0].toUpperCase() + value.slice(1);
}

function applyAbilityScoreChoice(character, draft, choice, targetClassName) {
  if (!choice) return { abilities: { ...character.abilities }, feature: null, feat: null, summary: "No ability choice due" };
  if (!draft.advancementType) throw choiceError("Choose an Ability Score Improvement or a feat.", "ADVANCEMENT_CHOICE_REQUIRED");
  const abilities = { ...character.abilities };

  if (draft.advancementType === "asi") {
    const selected = [draft.asiFirst, draft.asiSecond];
    if (selected.some((ability) => !Object.hasOwn(abilities, ability))) throw choiceError("Choose both ability increases.", "ABILITY_SCORES_REQUIRED");
    const increases = selected.reduce((counts, ability) => ({ ...counts, [ability]: (counts[ability] || 0) + 1 }), {});
    Object.entries(increases).forEach(([ability, amount]) => {
      if (Number(abilities[ability]) + amount > 20) throw choiceError(`${titleCase(ability)} cannot exceed 20 with this improvement.`, "ABILITY_SCORE_LIMIT");
      abilities[ability] = Number(abilities[ability]) + amount;
    });
    const detail = Object.entries(increases).map(([ability, amount]) => `${titleCase(ability)} +${amount}`).join(", ");
    return {
      abilities,
      feat: null,
      summary: detail,
      feature: { id: `asi-${choice.classId}-${choice.classLevel}`, name: "Ability Score Improvement", source: `${targetClassName} ${choice.classLevel}`, detail, classId: choice.classId, classLevel: choice.classLevel },
    };
  }

  if (draft.advancementType !== "feat") throw choiceError("Choose a valid advancement option.", "ADVANCEMENT_CHOICE_REQUIRED");
  const selectedFeat = findFeat(draft.featId);
  if (!selectedFeat) throw choiceError("Choose a feat from the available list.", "FEAT_REQUIRED");
  const eligibility = featEligibility(character, selectedFeat);
  if (!eligibility.eligible) throw choiceError(`${selectedFeat.name} is not currently eligible: ${eligibility.reasons.join(", ")}.`, "FEAT_INELIGIBLE");
  let abilityDetail = "";
  let selectedAbility = null;
  if (selectedFeat.abilityChoices?.length) {
    selectedAbility = selectedFeat.abilityChoices.length === 1 ? selectedFeat.abilityChoices[0] : draft.featAbility;
    if (!selectedFeat.abilityChoices.includes(selectedAbility)) throw choiceError(`Choose the ability increased by ${selectedFeat.name}.`, "FEAT_ABILITY_REQUIRED");
    if (Number(abilities[selectedAbility]) >= 20) throw choiceError(`${titleCase(selectedAbility)} is already 20.`, "ABILITY_SCORE_LIMIT");
    abilities[selectedAbility] += 1;
    abilityDetail = ` ${titleCase(selectedAbility)} +1.`;
  }
  return {
    abilities,
    feat: selectedFeat,
    summary: `${selectedFeat.name}${abilityDetail}`,
    feature: {
      id: `feat-${selectedFeat.id}`,
      name: selectedFeat.name,
      source: `Feat · ${targetClassName} ${choice.classLevel}`,
      detail: `Selected instead of an Ability Score Improvement.${abilityDetail} Consult the licensed source for complete feat rules.`,
      classId: choice.classId,
      classLevel: choice.classLevel,
      ...(selectedFeat.id === "resilient" ? { savingThrowAbility: selectedAbility } : {}),
    },
  };
}

export function createLevelUpPreview(character, draft, activePacks = []) {
  const targetClass = CLASS_RULES[draft.classId];
  if (!targetClass) throw new Error("Choose a valid class.");
  if (totalCharacterLevel(character.classLevels) >= 20) throw new Error("This character is already level 20.");

  const currentClassIds = character.classLevels.map((entry) => entry.classId);
  const addingNewClass = isNewClass(character, draft.classId);
  if (addingNewClass) {
    const prerequisite = validateMulticlassPrerequisites(character.abilities, currentClassIds, draft.classId);
    if (!prerequisite.valid) {
      const error = new Error("Multiclass prerequisites are not met.");
      error.failures = prerequisite.failures;
      throw error;
    }
  }

  const subclassChoice = subclassChoiceForLevelWithContent(character, draft.classId, activePacks);
  const subclassOption = subclassChoice ? findSubclassOptionWithContent(draft.classId, draft.subclassId, activePacks) : null;
  if (subclassChoice && !subclassOption) throw choiceError(`Choose a ${subclassChoice.label.toLowerCase()} before continuing.`, "SUBCLASS_REQUIRED");
  if (subclassOption?.companionType && !String(draft.companionName || "").trim()) throw choiceError("Name the companion before continuing.", "COMPANION_NAME_REQUIRED");

  const abilityChoice = abilityScoreChoiceForLevel(character, draft.classId);
  const advancement = applyAbilityScoreChoice(character, draft, abilityChoice, targetClass.name);
  const classChoiceResult = resolveClassChoices(character, draft.classId, draft.classChoiceSelections || {}, draft.classChoiceReplacements || {});
  const multiclassResult = applyMulticlassProficiencies(character, draft.classId, draft.multiclassChoiceSelections || {});
  const baseHp = draft.hpMethod === "roll"
    ? Math.max(1, Math.min(targetClass.hitDie, Number(draft.hpRoll || 1)))
    : draft.hpMethod === "maximum" ? targetClass.hitDie : averageHitDie(targetClass.hitDie);

  const classLevels = character.classLevels.map((entry) => ({ ...entry }));
  const existing = classLevels.find((entry) => entry.classId === draft.classId);
  if (existing) {
    existing.level += 1;
    if (subclassOption) Object.assign(existing, { subclassId: subclassOption.id, subclass: subclassOption.name, ...(subclassOption.casterOverride ? { casterOverride: subclassOption.casterOverride } : {}) });
  } else {
    classLevels.push({ classId: draft.classId, level: 1, ...(subclassOption ? { subclassId: subclassOption.id, subclass: subclassOption.name, ...(subclassOption.casterOverride ? { casterOverride: subclassOption.casterOverride } : {}) } : {}) });
  }

  const levelHistory = [...character.levelHistory, {
    level: totalCharacterLevel(character.classLevels) + 1,
    classId: draft.classId,
    baseHp,
    hpMethod: draft.hpMethod,
    createdAt: new Date().toISOString(),
  }];
  const nextCharacter = { ...character, classLevels, abilities: advancement.abilities };
  const companions = [...(character.companions || [])];
  if (subclassOption?.companionType && !companions.some((companion) => companion.type === subclassOption.companionType)) {
    companions.push(createSubclassCompanion(nextCharacter, subclassOption, draft.companionName));
  }
  const features = [...(character.features || [])];
  if (subclassOption && !features.some((feature) => feature.id === `${draft.classId}-${subclassOption.id}`)) {
    features.push({ id: `${draft.classId}-${subclassOption.id}`, name: subclassOption.name, source: `${targetClass.name} ${subclassChoice.level}`, detail: `${subclassChoice.label} selected during guided level-up.` });
  }

  const resultingClassEntry = classLevels.find(
    (entry) => entry.classId === draft.classId,
  );

  const localSubclassFeatures = resultingClassEntry?.subclassId
    ? localSubclassFeaturesForLevel(
        draft.classId,
        resultingClassEntry.subclassId,
        resultingClassEntry.level,
        activePacks,
      )
    : [];

  localSubclassFeatures.forEach((feature) => {
    if (!features.some((current) => current.id === feature.id)) {
      features.push(feature);
    }
  });
  if (advancement.feature && !features.some((feature) => feature.id === advancement.feature.id)) features.push(advancement.feature);
  classChoiceResult.features.forEach((feature) => {
    if (!features.some((current) => current.id === feature.id)) features.push(feature);
  });
  const maxHp = calculateCharacterMaxHp({ ...character, features }, levelHistory, advancement.abilities, classLevels);

  const preview = {
    classLevels,
    levelHistory,
    abilities: advancement.abilities,
    maxHp,
    hp: Math.min(maxHp, Number(character.hp) + (maxHp - Number(character.maxHp))),
    spellSlots: multiclassSpellSlots(classLevels),
    pactSlots: syncPactMagic(character.pactSlots, classLevels),
    resources: syncGrantedClassResources(character.resources || [], classLevels, advancement.abilities),
    hitDicePools: syncHitDicePools(
      character.hitDicePools && Object.keys(character.hitDicePools).length
        ? character.hitDicePools
        : legacyHitDicePools(character.classLevels, character.hitDiceRemaining),
      classLevels,
    ),
    companions,
    features,
    classChoices: [...applyChoiceRemovals(character.classChoices || [], classChoiceResult.removals), ...classChoiceResult.resolved],
    expertise: classChoiceResult.expertise,
    skills: multiclassResult.skills,
    proficiencies: multiclassResult.proficiencies,
    multiclassChoices: [...(character.multiclassChoices || []), ...multiclassResult.choices],
    abilityChoice,
    choiceSummary: advancement.summary,
  };
  const afterCharacter = { ...character, ...preview };
  const abilityChanges = Object.keys(character.abilities).flatMap((ability) => Number(character.abilities[ability]) === Number(advancement.abilities[ability])
    ? []
    : [`${titleCase(ability)} ${character.abilities[ability]} → ${advancement.abilities[ability]}`]);
  preview.changes = {
    ...grantedContentDelta(character, afterCharacter),
    featsAdded: advancement.feat ? [advancement.feat.name] : [],
    classChoicesAdded: classChoiceResult.resolved.flatMap((choice) => choice.selections.map((selection) => `${choice.label}: ${selection}`)),
    classChoicesRemoved: classChoiceResult.removals.map((token) => token.slice(token.indexOf("::") + 2)),
    proficienciesAdded: multiclassResult.choices.flatMap((choice) => choice.selections),
    companionsAdded: companions.filter((companion) => !(character.companions || []).some((current) => current.id === companion.id)).map((companion) => companion.name),
    abilitiesChanged: abilityChanges,
  };
  return preview;
}

export function commitLevelUp(character, draft, activePacks = []) {
  const preview = createLevelUpPreview(character, draft, activePacks);
  const now = new Date().toISOString();
  const subclassOption = findSubclassOptionWithContent(draft.classId, draft.subclassId, activePacks);
  let result = { ...character, ...preview, updatedAt: now };
  result.companions = (result.companions || []).map((companion) => {
    const stats = deriveCompanionStats(result, companion);
    return { ...companion, currentHp: Math.min(Number(companion.currentHp ?? stats.maxHp), stats.maxHp) };
  });
  const classLevel = result.classLevels.find((entry) => entry.classId === draft.classId)?.level;
  return appendHistoryEvent(result, {
    id: `history-${Date.now()}`,
    type: "level-up",
    title: `Advanced to level ${totalCharacterLevel(preview.classLevels)}`,
    detail: `${CLASS_RULES[draft.classId].name}${subclassOption ? ` · ${subclassOption.name}` : ""} · ${draft.hpMethod === "roll" ? `rolled ${draft.hpRoll}` : draft.hpMethod === "maximum" ? "maximum HP" : "average HP"}`,
    note: draft.note?.trim() || "",
    changes: preview.changes,
    abilityState: { before: { ...character.abilities }, after: { ...preview.abilities } },
    classId: draft.classId,
    classLevel,
    createdAt: now,
  });
}
