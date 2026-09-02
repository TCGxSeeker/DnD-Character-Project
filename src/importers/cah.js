import { ANCESTRIES, ancestryDisplayName } from "../data/ancestries.js";
import { BACKGROUNDS_2014 } from "../data/backgrounds2014.js";
import { SKILL_DEFINITIONS } from "../domain/skills.js";
import { SUBCLASS_RULES } from "../domain/progression.js";
import { CLASS_RULES, abilityModifier, multiclassSpellSlots } from "../domain/rules.js";
import { pactMagicForClassLevels } from "../domain/classResources2014.js";
import {
  abilityScoreGenerationRecord,
  normalizeCharacterProvenance,
} from "../domain/provenance.js";

export const MAX_CAH_TEXT_LENGTH = 20 * 1024 * 1024;

const slotKeys = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"];
const abilityKeys = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const ancestryAliases = { palid_elf: "pallid", pallid_elf: "pallid" };
const resourceIds = { "sorcery points": "sorcery-points", ki: "ki", rage: "rage", "bardic inspiration": "bardic-inspiration", "channel divinity": "channel-divinity" };
const mappedTopLevelFields = new Set([
  "about", "advantages", "alignmentName", "allRequiredClasses", "armors", "background", "baseAc", "baseHp", "bonds", "bonusSpellSlots",
  "burrowSpeedModifier", "charisma", "climbSpeedModifier", "conditions", "constitution", "copper", "created", "dexterity", "disadvantages",
  "effectApplications", "electrum", "equipment", "exp", "extraAC", "feats", "flaws", "flySpeedModifier", "gold", "hasInspiration", "hp", "id",
  "ideals", "image", "imagePath", "imageUrl", "initiativeModifier", "intelligence", "jobs", "jsonType", "name", "notes", "passivePerceptionModifier",
  "personalityTraits", "platinum", "player", "preferences", "proficiencies", "proficiencyModifier", "race", "requiredBackground", "requiredRace",
  "selectableFeatures", "silver", "skills", "specialAbilities", "speedModifier", "spellAttackExtraBonus", "spellDCExtraBonus", "spellSlots", "spells",
  "strength", "successes", "failures", "swimSpeedModifier", "tempHp", "updated", "weapons", "wisdom",
]);

const list = (value) => Array.isArray(value) ? value : [];
const record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const text = (value) => String(value ?? "").trim();
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, number(value, minimum)));
const slug = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const titleCase = (value) => text(value).toLowerCase().replace(/(^|[_\s-])([a-z])/g, (_, space, letter) => `${space ? " " : ""}${letter.toUpperCase()}`);

function parseEmbedded(value, label, warnings) {
  if (value && typeof value === "object") return value;
  if (!text(value)) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    warnings.push(`${label} could not be decoded and was skipped.`);
    return null;
  }
}

function uniqueByName(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = text(entry?.name).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function classModelFor(raw, classId, warnings) {
  for (const candidate of list(raw.allRequiredClasses?.jobs)) {
    const model = parseEmbedded(candidate, `Embedded ${classId} class record`, warnings);
    if (text(model?.id).toLowerCase() === classId) return model;
  }
  return null;
}

function mapClassLevels(raw, warnings) {
  const models = new Map();
  const entries = [];
  for (const job of list(raw.jobs)) {
    const classId = text(job?.jobId).toLowerCase();
    const level = Math.trunc(number(job?.level));
    if (!CLASS_RULES[classId] || level < 1) {
      warnings.push(`Unsupported class record “${classId || "unnamed"}” was not activated.`);
      continue;
    }
    const model = classModelFor(raw, classId, warnings);
    models.set(classId, model);
    const selectedModel = list(model?.archetypes).find((candidate) => text(candidate?.id) === text(job?.archetypeId));
    const knownSubclass = SUBCLASS_RULES[classId]?.options.find((candidate) => candidate.id === job?.archetypeId || candidate.name.toLowerCase() === text(selectedModel?.name).toLowerCase());
    const subclass = text(selectedModel?.name);
    const entry = { classId, level };
    if (subclass) Object.assign(entry, { subclass, subclassId: knownSubclass?.id || `imported-${slug(subclass)}` });
    if (subclass && !knownSubclass) warnings.push(`${subclass} is not a built-in ${CLASS_RULES[classId].name} option. Its name and descriptive features were preserved without inventing mechanics.`);
    entries.push(entry);
  }
  if (!entries.length) throw new Error("CAH import has no class supported by this 2014 character engine.");
  if (entries.reduce((sum, entry) => sum + entry.level, 0) > 20) throw new Error("CAH character level exceeds 20.");
  return { entries, models };
}

function mapAncestry(raw, warnings) {
  const selected = record(raw.race);
  const embedded = parseEmbedded(raw.requiredRace, "Embedded ancestry record", warnings);
  const ancestry = ANCESTRIES.find((candidate) => candidate.id === text(selected.raceId).toLowerCase())
    || ANCESTRIES.find((candidate) => candidate.name.toLowerCase() === text(embedded?.name).toLowerCase());
  if (!ancestry) {
    const preserved = text(embedded?.name) || titleCase(selected.raceId) || "Imported ancestry";
    warnings.push(`${preserved} is not in the ancestry catalog. Its name was preserved without automatic ancestry mechanics.`);
    return { ancestry: preserved, ancestryId: "custom-lineage", ancestryOptionId: "medium" };
  }
  const sourceOptionId = text(selected.subraceId).toLowerCase();
  const sourceOption = list(embedded?.subraces).find((candidate) => text(candidate?.id).toLowerCase() === sourceOptionId);
  const alias = ancestryAliases[sourceOptionId] || sourceOptionId.replace(new RegExp(`^${ancestry.id}_?`), "").replace(/_/g, "-");
  const option = ancestry.options.find((candidate) => candidate.id === alias)
    || ancestry.options.find((candidate) => candidate.name.toLowerCase() === text(sourceOption?.name).replace(/^palid\b/i, "Pallid").toLowerCase());
  if (sourceOptionId && !option) warnings.push(`${text(sourceOption?.name) || sourceOptionId} was not matched to a built-in ancestry option; the base ${ancestry.name} mechanics will apply.`);
  return { ancestry: ancestryDisplayName(ancestry.id, option?.id), ancestryId: ancestry.id, ...(option ? { ancestryOptionId: option.id } : {}) };
}

function mapBackground(raw, warnings) {
  const selectedId = text(raw.background?.backgroundId).toLowerCase();
  const embedded = parseEmbedded(raw.requiredBackground, "Embedded background record", warnings);
  const background = BACKGROUNDS_2014.find((candidate) => candidate.id === selectedId)
    || BACKGROUNDS_2014.find((candidate) => candidate.name.toLowerCase() === text(embedded?.name).toLowerCase());
  if (!background) {
    const preserved = text(embedded?.name) || titleCase(selectedId) || "Imported background";
    warnings.push(`${preserved} is not in the 2014 background catalog. Its name was preserved without automatic background mechanics.`);
    return { background: preserved, backgroundId: `imported-${slug(preserved)}` };
  }
  return { background: background.name, backgroundId: background.id };
}

function mapAbilities(raw) {
  const abilities = Object.fromEntries(abilityKeys.map((ability) => [ability, Math.trunc(number(raw[ability]?.score, NaN))]));
  if (Object.values(abilities).some((score) => !Number.isInteger(score) || score < 1 || score > 30)) throw new Error("CAH ability scores are missing or outside the supported range.");
  return abilities;
}

function skillName(typeName) {
  const normalized = slug(typeName);
  return SKILL_DEFINITIONS.find((skill) => skill.id === normalized)?.name || "";
}

function mapSkills(raw) {
  const skills = [], expertise = [];
  for (const source of list(raw.skills)) {
    const name = skillName(source?.typeName);
    const proficiency = text(source?.proficiencyName).toUpperCase();
    if (!name || proficiency === "NONE") continue;
    skills.push(name);
    if (["EXPERT", "EXPERTISE", "DOUBLE"].includes(proficiency)) expertise.push(name);
  }
  return { skills: [...new Set(skills)], expertise: [...new Set(expertise)] };
}

function distributeLevelHistory(classLevels, baseHp, createdAt) {
  const levels = classLevels.flatMap((entry) => Array.from({ length: entry.level }, () => ({ classId: entry.classId, hitDie: CLASS_RULES[entry.classId].hitDie })));
  const defaults = levels.map((entry, index) => index === 0 ? entry.hitDie : Math.floor(entry.hitDie / 2) + 1);
  const target = Math.trunc(number(baseHp, defaults.reduce((sum, value) => sum + value, 0)));
  const values = levels.map((entry, index) => index === 0 ? Math.min(entry.hitDie, Math.max(1, target)) : 1);
  let remaining = Math.max(0, target - values.reduce((sum, value) => sum + value, 0));
  while (remaining > 0 && values.some((value, index) => value < levels[index].hitDie)) {
    for (let index = 0; index < values.length && remaining > 0; index += 1) {
      if (values[index] < levels[index].hitDie) { values[index] += 1; remaining -= 1; }
    }
  }
  // Preserve an explicit third-party HP total even when it includes a custom
  // bonus that cannot be reconstructed from ordinary class Hit Dice.
  if (remaining > 0 && values.length) values[values.length - 1] += remaining;
  return levels.map((entry, index) => ({ level: index + 1, classId: entry.classId, baseHp: values[index], hpMethod: "imported", createdAt }));
}

function mapSpellSlots(raw, classLevels) {
  const spellSlots = multiclassSpellSlots(classLevels);
  const usedSpellSlots = spellSlots.map((maximum, index) => {
    const remaining = clamp(raw.spellSlots?.[slotKeys[index]], 0, maximum);
    return maximum - remaining;
  });
  return { spellSlots, usedSpellSlots };
}

function mapSpells(raw, classLevels) {
  const owner = classLevels.filter((entry) => CLASS_RULES[entry.classId]?.caster !== "none");
  const sourceClassId = owner.length === 1 ? owner[0].classId : "";
  return uniqueByName(list(raw.spells).map((source, index) => {
    const components = text(source?.components);
    const materialMatch = components.match(/M\s*\((.*)\)/i);
    return {
      id: `cah-spell-${slug(source?.name)}-${index}`,
      canonicalId: slug(source?.name),
      name: text(source?.name),
      level: clamp(source?.level, 0, 9),
      castingTime: text(source?.castingTime) || "—",
      range: text(source?.range) || "—",
      duration: text(source?.duration),
      school: text(source?.school),
      verbal: /(^|,\s*)V(?:,|$)/i.test(components),
      somatic: /(^|,\s*)S(?:,|$)/i.test(components),
      material: /(^|,\s*)M(?:\s*\(|,|$)/i.test(components),
      materialSpecified: materialMatch?.[1] || "",
      concentration: /concentration/i.test(text(source?.duration)),
      ritual: Boolean(source?.isRitual),
      prepared: Boolean(source?.prepared),
      desc: text(source?.description),
      higherLevel: text(source?.higherLevels),
      source: "Imported from 5e Companion",
      ...(sourceClassId ? { sourceClassId } : {}),
      importedCustom: Boolean(source?.isCustom),
    };
  }));
}

function mapInventory(raw) {
  const sources = [...list(raw.equipment), ...list(raw.weapons), ...list(raw.armors)];
  return sources.flatMap((source, index) => {
    const model = source?.weaponModel || source?.armorModel || source;
    const name = text(model?.name || source?.name);
    if (!name) return [];
    return [{
      id: `cah-item-${slug(source?.id || name)}-${index}`,
      name,
      quantity: Math.max(0, Math.trunc(number(source?.amount ?? source?.quantity, 1))),
      equipped: Boolean(source?.isEquipped ?? source?.equipped),
      attuned: Boolean(source?.isAttuned ?? source?.attuned),
      detail: text(source?.description || model?.description || source?.notes),
      importedFrom: "5e Companion",
    }];
  });
}

function featureDetail(source, level) {
  const descriptions = list(source?.descriptionModels).filter((entry) => number(entry?.level, 1) <= level);
  return text(descriptions.at(-1)?.description || source?.description || source?.notes);
}

function mapFeatures(raw, classLevels, models) {
  const totalLevel = classLevels.reduce((sum, entry) => sum + entry.level, 0);
  const imported = [];
  for (const entry of classLevels) {
    const job = list(raw.jobs).find((candidate) => text(candidate?.jobId).toLowerCase() === entry.classId);
    const archetype = list(models.get(entry.classId)?.archetypes).find((candidate) => text(candidate?.id) === text(job?.archetypeId));
    for (const grant of list(archetype?.features).filter((candidate) => number(candidate?.level, 1) <= entry.level)) {
      const feat = grant?.feat || grant;
      imported.push({ id: `cah-feature-${slug(feat?.id || feat?.name)}`, name: text(feat?.name), source: `${entry.subclass || CLASS_RULES[entry.classId].name} ${number(grant?.level, 1)}`, detail: featureDetail(feat, entry.level), imported: true });
    }
  }
  for (const feat of list(raw.feats)) imported.push({ id: `cah-feat-${slug(feat?.id || feat?.name)}`, name: text(feat?.name), source: "Imported feat", detail: featureDetail(feat, totalLevel), imported: true });
  for (const group of list(raw.selectableFeatures)) {
    for (const selected of list(group?.selectedFeatures)) imported.push({ id: `cah-choice-${slug(selected?.id || selected?.name)}`, name: text(selected?.name), source: text(group?.name) || "Imported class choice", detail: featureDetail(selected, totalLevel), imported: true });
  }
  return uniqueByName(imported);
}

function mapResources(raw, totalLevel) {
  return list(raw.specialAbilities).flatMap((source) => {
    const name = text(source?.name);
    if (!name) return [];
    const scaling = list(source?.amountsPerLevel).filter((entry) => number(entry?.level) <= totalLevel).sort((a, b) => number(a.level) - number(b.level));
    const maximum = Math.max(0, number(scaling.at(-1)?.amount, source?.max ?? source?.usesLeft));
    return [{ id: resourceIds[name.toLowerCase()] || `cah-resource-${slug(name)}`, name, current: clamp(source?.usesLeft, 0, maximum), max: maximum, reset: /sorcery|ki/i.test(name) ? "Long rest" : text(source?.reset) || "Long rest", imported: true }];
  });
}

function mapPortrait(raw, warnings) {
  const encoded = text(raw.image);
  if (!encoded) return "";
  if (encoded.length > 8 * 1024 * 1024) { warnings.push("The CAH portrait exceeded the safe local import limit and was skipped."); return ""; }
  if (encoded.startsWith("/9j/")) return `data:image/jpeg;base64,${encoded}`;
  if (encoded.startsWith("iVBOR")) return `data:image/png;base64,${encoded}`;
  if (encoded.startsWith("UklGR")) return `data:image/webp;base64,${encoded}`;
  warnings.push("The CAH portrait encoding was not recognized and was skipped.");
  return "";
}

function isoDate(value, fallback) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function mapSessionEntries(raw, importedAt) {
  return list(raw.notes).flatMap((note, index) => {
    const noteText = text(note?.text);
    if (!noteText) return [];
    const createdAt = isoDate(note?.createdString, importedAt);
    return [{ id: `cah-note-${slug(note?.id || index)}-${index}`, sessionDate: createdAt.slice(0, 10), text: noteText, createdAt, imported: true }];
  });
}

function mapConditions(raw) {
  return Object.entries(record(raw.conditions)).filter(([, active]) => Boolean(active)).map(([name]) => titleCase(name));
}

export function parseCah(textValue) {
  if (typeof textValue !== "string" || textValue.length > MAX_CAH_TEXT_LENGTH) throw new Error("CAH file is empty or exceeds the 20 MB import limit.");
  let parsed;
  try { parsed = JSON.parse(textValue); } catch { throw new Error("CAH file is not valid JSON."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || text(parsed.jsonType).toLowerCase() !== "character") throw new Error("File is not a 5e Companion character export.");
  if (!text(parsed.name) || !Array.isArray(parsed.jobs)) throw new Error("CAH character payload is missing its name or class records.");
  return parsed;
}

export function normalizeCahCharacter(raw, { now = new Date().toISOString(), idFactory } = {}) {
  const warnings = [];
  const importedAt = isoDate(now, new Date().toISOString());
  const { entries: classLevels, models } = mapClassLevels(raw, warnings);
  const totalLevel = classLevels.reduce((sum, entry) => sum + entry.level, 0);
  const abilities = mapAbilities(raw);
  const levelHistory = distributeLevelHistory(classLevels, raw.baseHp, isoDate(raw.created, importedAt));
  const baseHp = levelHistory.reduce((sum, entry) => sum + entry.baseHp, 0);
  const maxHp = Math.max(1, baseHp + abilityModifier(abilities.constitution) * totalLevel);
  const { skills, expertise } = mapSkills(raw);
  const { spellSlots, usedSpellSlots } = mapSpellSlots(raw, classLevels);
  const ancestry = mapAncestry(raw, warnings);
  const background = mapBackground(raw, warnings);
  const spells = mapSpells(raw, classLevels);
  const inventory = mapInventory(raw);
  const features = mapFeatures(raw, classLevels, models);
  const resources = mapResources(raw, totalLevel);
  const sessionEntries = mapSessionEntries(raw, importedAt);
  const customSpellCount = spells.filter((spell) => spell.importedCustom).length;
  if (customSpellCount) warnings.push(`${customSpellCount} custom spell${customSpellCount === 1 ? " was" : "s were"} preserved as descriptive character content.`);
  if (inventory.length) warnings.push(`${inventory.length} inventory entr${inventory.length === 1 ? "y was" : "ies were"} imported descriptively; verify equipped armor and weapon mechanics.`);
  if (sessionEntries.length) warnings.push(`${sessionEntries.length} CAH note${sessionEntries.length === 1 ? " was" : "s were"} added to the session archive.`);
  if (list(raw.advantages).length || list(raw.disadvantages).length || list(raw.effectApplications).length) warnings.push("Third-party advantage, disadvantage, or effect-application records were preserved only in import metadata; no unregistered mechanics were activated.");
  const sourceId = text(raw.id) || "character";
  const generatedId = idFactory?.() || `cah-${slug(sourceId)}-${Date.parse(importedAt) || Date.now()}`;
  const normalSpeed = number(parseEmbedded(raw.requiredRace, "Embedded ancestry speed", warnings)?.speed?.normal, 30);
  const dexterityAc = number(raw.baseAc, 10) + abilityModifier(abilities.dexterity) + number(raw.extraAC);
  const saves = abilityKeys.filter((ability) => Boolean(raw[ability]?.save));
  const proficiencies = list(raw.proficiencies).map((entry) => text(entry?.name || entry)).filter(Boolean);
  const hitDicePools = classLevels.reduce((pools, entry) => {
    const source = list(raw.jobs).find((job) => text(job?.jobId).toLowerCase() === entry.classId);
    const die = `d${CLASS_RULES[entry.classId].hitDie}`;
    const prior = pools[die] || { current: 0, max: 0 };
    return { ...pools, [die]: { current: prior.current + clamp(source?.dice, 0, entry.level), max: prior.max + entry.level } };
  }, {});
  const pactSlots = pactMagicForClassLevels(classLevels);
  if (pactSlots) pactSlots.current = clamp(raw.spellSlots?.[slotKeys[pactSlots.level - 1]], 0, pactSlots.max);
  const character = {
    id: generatedId,
    name: text(raw.name),
    player: text(raw.player),
    ...ancestry,
    ...background,
    alignment: titleCase(raw.alignmentName),
    avatar: "",
    portraitDataUrl: mapPortrait(raw, warnings),
    advancement: number(raw.exp) > 0 ? "experience" : "milestone",
    experience: Math.max(0, Math.trunc(number(raw.exp))),
    classLevels,
    levelHistory,
abilities,
    abilityScoreGeneration: abilityScoreGenerationRecord({
      method: "imported",
      label: "Imported · 5e Companion",
      baseScores: abilities,
      finalScores: abilities,
    }),
    hp: clamp(raw.hp, 0, maxHp),
    maxHp,
    tempHp: Math.max(0, Math.trunc(number(raw.tempHp))),
    armorClass: Math.max(1, dexterityAc),
    speed: Math.max(0, normalSpeed + number(raw.speedModifier)),
    inspiration: Boolean(raw.hasInspiration),
    hitDiceRemaining: Object.values(hitDicePools).reduce((sum, pool) => sum + pool.current, 0),
    hitDicePools,
    spellSlots,
    usedSpellSlots,
    pactSlots,
    resources,
    skills,
    expertise,
    saves,
    proficiencies,
    spells,
    inventory,
    features,
    companions: [],
    conditions: mapConditions(raw),
    effects: [],
    ancestryEffects: [],
    backgroundEffects: [],
    notes: "",
    sessionEntries,
    personality: text(raw.personalityTraits),
    ideals: text(raw.ideals),
    bonds: text(raw.bonds),
    flaws: text(raw.flaws),
    currency: { copper: number(raw.copper), silver: number(raw.silver), electrum: number(raw.electrum), gold: number(raw.gold), platinum: number(raw.platinum) },
    importMetadata: {
      format: "5e-companion-cah",
      sourceId,
      sourceCreatedAt: isoDate(raw.created, ""),
      sourceUpdatedAt: isoDate(raw.updated, ""),
      importedAt,
      unmappedFields: Object.keys(raw).filter((key) => !mappedTopLevelFields.has(key)).sort(),
      preservedAdvantages: list(raw.advantages).map(String),
      preservedDisadvantages: list(raw.disadvantages).map(String),
    },
    history: [{ id: `history-cah-import-${Date.parse(importedAt) || Date.now()}`, type: "character-imported", title: "Character imported", detail: `5e Companion CAH · Level ${totalLevel} ${classLevels.map((entry) => CLASS_RULES[entry.classId].name).join(" / ")}`, changes: {}, createdAt: importedAt }],
    createdAt: isoDate(raw.created, importedAt),
    updatedAt: importedAt,
  };
  return {
    character: normalizeCharacterProvenance(character),
    warnings: [...new Set(warnings)],
    summary: {
      name: character.name,
      level: totalLevel,
      classes: classLevels.map((entry) => `${CLASS_RULES[entry.classId].name} ${entry.level}${entry.subclass ? ` · ${entry.subclass}` : ""}`).join(" / "),
      ancestry: character.ancestry,
      background: character.background,
      spells: spells.length,
      inventory: inventory.length,
      features: features.length,
      notes: sessionEntries.length,
    },
  };
}

export function importCahCharacter(textValue, options) {
  return normalizeCahCharacter(parseCah(textValue), options);
}
