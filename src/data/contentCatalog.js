import { SUBCLASS_RULES } from "../domain/progression.js";
import { validateContentPack } from "../importers/content/contentPack.js";

function list(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return structuredClone(value);
}

function subclassOptionId(record) {
  const classId = String(record?.classId || "").trim();
  const recordId = String(record?.id || "").trim();
  const prefix = `${classId}:`;

  if (recordId.startsWith(prefix)) {
    return recordId.slice(prefix.length);
  }

  return recordId;
}

function builtInSubclassKeys() {
  const keys = new Set();

  for (const [classId, rule] of Object.entries(SUBCLASS_RULES)) {
    for (const option of list(rule?.options)) {
      keys.add(`${classId}:${option.id}`);
    }
  }

  return keys;
}

function localSubclassOption(record, pack) {
  const id = subclassOptionId(record);

  return {
    id,
    name: record.name,
    source:
      record.source?.reference
      || pack.pack.source?.title
      || pack.pack.name,
    localContent: true,
    packId: pack.pack.id,
    contentId: record.id,
    mechanicsStatus: record.mechanicsStatus,
    summary: record.summary || "",
    featureIds: list(record.featureIds),
    record: clone(record),
  };
}

export function buildSubclassCatalog(activePacks = []) {
  const builtInKeys = builtInSubclassKeys();
  const localKeys = new Set();
  const localByClass = new Map();
  const collisions = [];

  for (const candidatePack of list(activePacks)) {
    const pack = validateContentPack(candidatePack);

    for (const record of pack.subclasses) {
      const classId = String(record.classId || "").trim();
      const optionId = subclassOptionId(record);
      const key = `${classId}:${optionId}`;

      if (!SUBCLASS_RULES[classId]) {
        collisions.push({
          type: "unknown-class",
          key,
          classId,
          optionId,
          packId: pack.pack.id,
          contentId: record.id,
          message: `Local subclass ${record.name} targets unknown class ${classId}.`,
        });
        continue;
      }

      if (!optionId) {
        collisions.push({
          type: "invalid-local-id",
          key,
          classId,
          optionId,
          packId: pack.pack.id,
          contentId: record.id,
          message: `Local subclass ${record.name} does not provide a usable subclass id.`,
        });
        continue;
      }

      if (builtInKeys.has(key)) {
        collisions.push({
          type: "built-in-wins",
          key,
          classId,
          optionId,
          packId: pack.pack.id,
          contentId: record.id,
          message: `Built-in subclass ${key} overrides local content from ${pack.pack.name}.`,
        });
        continue;
      }

      if (localKeys.has(key)) {
        collisions.push({
          type: "local-collision",
          key,
          classId,
          optionId,
          packId: pack.pack.id,
          contentId: record.id,
          message: `Another enabled local pack already provides subclass ${key}.`,
        });
        continue;
      }

      localKeys.add(key);

      if (!localByClass.has(classId)) {
        localByClass.set(classId, []);
      }

      localByClass
        .get(classId)
        .push(localSubclassOption(record, pack));
    }
  }

  const rules = Object.fromEntries(
    Object.entries(SUBCLASS_RULES).map(([classId, builtInRule]) => [
      classId,
      {
        ...clone(builtInRule),
        options: [
          ...list(builtInRule.options).map((option) => ({
            ...clone(option),
            localContent: false,
          })),
          ...(localByClass.get(classId) || []),
        ],
      },
    ]),
  );

  return {
    rules,
    collisions,
  };
}

export function subclassRuleForClass(classId, activePacks = []) {
  return buildSubclassCatalog(activePacks).rules[classId] || null;
}

export function subclassChoiceForLevelWithContent(
  character,
  classId,
  activePacks = [],
) {
  const rule = subclassRuleForClass(classId, activePacks);

  if (!rule) return null;

  const current = list(character?.classLevels)
    .find((entry) => entry.classId === classId);

  if (current?.subclass || current?.subclassId) {
    return null;
  }

  const nextClassLevel = Number(current?.level || 0) + 1;

  return nextClassLevel >= rule.level
    ? {
        ...rule,
        classId,
        nextClassLevel,
      }
    : null;
}

export function findSubclassOptionWithContent(
  classId,
  subclassId,
  activePacks = [],
) {
  return (
    subclassRuleForClass(classId, activePacks)
      ?.options
      ?.find((option) => option.id === subclassId)
    || null
  );
}

export function subclassCatalogDiagnostics(activePacks = []) {
  return buildSubclassCatalog(activePacks).collisions;
}
function localPackById(activePacks, packId) {
  return list(activePacks).find((pack) => pack?.pack?.id === packId) || null;
}

function featureBelongsToSubclass(feature, classId, subclassOption) {
  const expectedContentId = subclassOption.contentId || `${classId}:${subclassOption.id}`;
  const featureSubclassId = String(feature?.subclassId || "").trim();

  return featureSubclassId === expectedContentId
    || featureSubclassId === `${classId}:${subclassOption.id}`
    || featureSubclassId === subclassOption.id;
}

function characterFeatureFromLocalRecord(record, subclassOption, pack) {
  const level = Number(record.level || 1);

  return {
    id: `local-content:${record.id}`,
    name: record.name,
    source: `${subclassOption.name} ${level} · ${pack.pack.name}`,
    detail: record.summary || "Imported local subclass feature.",
    benefits: Array.isArray(record.benefits) ? [...record.benefits] : [],
    granted: true,
    localContent: true,
    packId: pack.pack.id,
    contentId: record.id,
    classId: record.classId || "",
    subclassId: subclassOption.id,
    level,
    mechanicsStatus: record.mechanicsStatus || "descriptive-only",
    effects: clone(record.effects || []),
  };
}

export function localSubclassFeaturesForLevel(
  classId,
  subclassId,
  classLevel,
  activePacks = [],
) {
  const subclassOption = findSubclassOptionWithContent(
    classId,
    subclassId,
    activePacks,
  );

  if (!subclassOption?.localContent || !subclassOption.packId) {
    return [];
  }

  const pack = localPackById(activePacks, subclassOption.packId);

  if (!pack) return [];

  const validatedPack = validateContentPack(pack);
  const explicitFeatureIds = new Set(
    list(subclassOption.featureIds).filter(Boolean),
  );

  const candidates = explicitFeatureIds.size
    ? validatedPack.features.filter((feature) =>
        explicitFeatureIds.has(feature.id))
    : validatedPack.features.filter((feature) =>
        featureBelongsToSubclass(feature, classId, subclassOption));

  return candidates
    .filter((feature) =>
      Number(feature.level || 1) <= Number(classLevel || 0))
    .sort((a, b) =>
      Number(a.level || 1) - Number(b.level || 1)
      || String(a.name).localeCompare(String(b.name)))
    .map((feature) =>
      characterFeatureFromLocalRecord(
        feature,
        subclassOption,
        validatedPack,
      ));
}