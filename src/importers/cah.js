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

function firstDefined(...values) {
  return values.find(
    (value) =>
      value !== undefined
      && value !== null
      && value !== "",
  );
}

function booleanOrUndefined(...values) {
  const value =
    firstDefined(...values);

  if (
    value === undefined
    || value === null
    || value === ""
  ) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized =
    text(value).toLowerCase();

  if (
    ["true", "yes", "1"].includes(normalized)
  ) {
    return true;
  }

  if (
    ["false", "no", "0"].includes(normalized)
  ) {
    return false;
  }

  return undefined;
}

function optionalNumber(...values) {
  const value =
    firstDefined(...values);

  if (
    value === undefined
    || value === null
    || value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function normalizedAbilityName(value) {
  const normalized =
    text(value)
      .toLowerCase()
      .replace(/[^a-z]/g, "");

  const aliases = {
    str: "strength",
    strength: "strength",

    dex: "dexterity",
    dexterity: "dexterity",

    con: "constitution",
    constitution: "constitution",

    int: "intelligence",
    intelligence: "intelligence",

    wis: "wisdom",
    wisdom: "wisdom",

    cha: "charisma",
    charisma: "charisma",
  };

  return aliases[normalized] || "";
}

function normalizedDamageType(value) {
  const source =
    typeof value === "object"
      ? firstDefined(
          value?.name,
          value?.typeName,
          value?.damageType,
          value?.id,
        )
      : value;

  return titleCase(source);
}

function diceExpression(value) {
  if (
    value == null
    || value === ""
  ) {
    return "";
  }

  if (typeof value === "string") {
    const match =
      value.match(
        /(\d+)\s*d\s*(\d+)/i,
      );

    return match
      ? `${match[1]}d${match[2]}`
      : text(value);
  }

  if (
    typeof value !== "object"
    || Array.isArray(value)
  ) {
    return "";
  }

  const explicit =
    firstDefined(
      value.dice,
      value.damageDice,
      value.die,
      value.expression,
      value.notation,
    );

  if (explicit) {
    return diceExpression(explicit);
  }

  const count =
    optionalNumber(
      value.count,
      value.amount,
      value.diceAmount,
      value.damageDiceAmount,
      value.numberOfDice,
    );

  const namedDie =
    text(
      firstDefined(
        value.damageDiceName,
        value.dieName,
      ),
    );

  const namedDieMatch =
    namedDie.match(
      /^d?(\d+)$/i,
    );

  const sides =
    optionalNumber(
      value.sides,
      value.diceSides,
      value.dieSize,
      value.diceType,
      namedDieMatch?.[1],
    );

  if (
    count != null
    && sides != null
  ) {
    return `${Math.trunc(count)}d${Math.trunc(sides)}`;
  }

  return "";
}

function propertyNames(...values) {
  const entries =
    values.flatMap(
      (value) => {
        if (Array.isArray(value)) {
          return value;
        }

        if (
          typeof value === "string"
          && value.trim()
        ) {
          return value
            .split(/[,;|]+/)
            .map(
              (entry) =>
                entry.trim(),
            )
            .filter(Boolean);
        }

        return value
          ? [value]
          : [];
      },
    );

  return [
    ...new Set(
      entries
        .map(
          (entry) =>
            typeof entry === "object"
              ? text(
                  firstDefined(
                    entry.name,
                    entry.id,
                    entry.typeName,
                    entry.property,
                  ),
                )
              : text(entry),
        )
        .filter(Boolean)
        .map(
          (entry) =>
            entry
              .toLowerCase()
              .replace(/[_\s]+/g, "-"),
        ),
    ),
  ];
}

function safeStructuredSnapshot(
  value,
  warnings,
  label,
  maximumLength = 250000,
) {
  if (
    !value
    || typeof value !== "object"
  ) {
    return null;
  }

  try {
    const serialized =
      JSON.stringify(value);

    if (
      serialized.length > maximumLength
    ) {
      warnings?.push(
        `${label} was too large to preserve as an editable import snapshot.`,
      );

      return {
        truncated: true,
        keys:
          Object.keys(value).sort(),
      };
    }

    return JSON.parse(serialized);
  } catch {
    warnings?.push(
      `${label} could not be preserved as a structured snapshot.`,
    );

    return {
      keys:
        Object.keys(record(value)).sort(),
    };
  }
}

function rangeProfile(source, model) {
  const range =
    firstDefined(
      model?.range,
      source?.range,
    );

  if (
    range
    && typeof range === "object"
  ) {
    const normal =
      optionalNumber(
        range.normal,
        range.minimum,
        range.short,
        range.first,
      );

    const long =
      optionalNumber(
        range.long,
        range.maximum,
        range.second,
      );

    if (
      normal != null
      || long != null
    ) {
      return {
        normal:
          normal ?? 0,
        long:
          long ?? normal ?? 0,
        unit:
          text(range.unit)
          || "feet",
      };
    }
  }

  const normal =
    optionalNumber(
      model?.rangeNormal,
      model?.normalRange,
      source?.rangeNormal,
      source?.normalRange,
    );

  const long =
    optionalNumber(
      model?.rangeLong,
      model?.longRange,
      source?.rangeLong,
      source?.longRange,
    );

  if (
    normal == null
    && long == null
  ) {
    return null;
  }

  return {
    normal:
      normal ?? 0,
    long:
      long ?? normal ?? 0,
    unit: "feet",
  };
}

function damagePacketFrom(value) {
  if (
    !value
    || typeof value !== "object"
  ) {
    return null;
  }

  const dice =
    diceExpression(
      firstDefined(
        value.dice,
        value.damageDice,
        value.damage,
        value.damageModel,
        value,
      ),
    );

  const type =
    normalizedDamageType(
      firstDefined(
        value.damageType,
        value.type,
        value.typeName,
        value.damageTypeName,
      ),
    );

  const bonus =
    optionalNumber(
      value.bonus,
      value.damageBonus,
      value.extraBonus,
    ) ?? 0;

  if (
    !dice
    && !type
    && bonus === 0
  ) {
    return null;
  }

  return {
    dice,
    type,
    bonus,
  };
}

function secondaryDamagePackets(
  source,
  model,
) {
  const candidates = [
    ...list(source?.extraDamage),
    ...list(source?.extraDamages),
    ...list(source?.extraDamageDice),
    ...list(source?.additionalDamage),
    ...list(source?.additionalDamages),
    ...list(source?.bonusDamage),
    ...list(source?.bonusDamages),

    ...list(model?.extraDamage),
    ...list(model?.extraDamages),
    ...list(model?.extraDamageDice),
    ...list(model?.additionalDamage),
    ...list(model?.additionalDamages),
    ...list(model?.bonusDamage),
    ...list(model?.bonusDamages),
  ];

  const packets =
    candidates
      .map(damagePacketFrom)
      .filter(Boolean);

  const seen =
    new Set();

  return packets.filter(
    (packet) => {
      const key =
        [
          packet.dice || "",
          packet.type || "",
          Number(packet.bonus || 0),
        ].join("|");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    },
  );
}

function armorCategory(value) {
  const normalized =
    text(
      typeof value === "object"
        ? firstDefined(
            value.name,
            value.id,
            value.typeName,
          )
        : value,
    ).toLowerCase();

  if (normalized.includes("heavy")) {
    return "heavy";
  }

  if (normalized.includes("medium")) {
    return "medium";
  }

  if (normalized.includes("light")) {
    return "light";
  }

  return "";
}

function weaponCategory(model, source) {
  const explicitSimple =
    booleanOrUndefined(
      source?.isSimple,
      model?.isSimple,
      source?.simple,
      model?.simple,
    );

  const explicitMartial =
    booleanOrUndefined(
      source?.isMartial,
      model?.isMartial,
      source?.martial,
      model?.martial,
    );

  if (
    explicitSimple === true
  ) {
    return {
      isSimple: true,
      isMartial: false,
    };
  }

  if (
    explicitMartial === true
  ) {
    return {
      isSimple: false,
      isMartial: true,
    };
  }

  const category =
    text(
      firstDefined(
        model?.category,
        source?.category,
        model?.weaponCategory,
        source?.weaponCategory,
        model?.type,
        source?.type,
      ),
    ).toLowerCase();

  return {
    isSimple:
      category.includes("simple"),

    isMartial:
      category.includes("martial"),
  };
}

function attackType(model, source) {
  const explicit =
    text(
      firstDefined(
        source?.attackType,
        model?.attackType,
        source?.rangeType,
        model?.rangeType,
      ),
    ).toLowerCase();

  if (
    explicit.includes("range")
  ) {
    return "ranged";
  }

  if (
    explicit.includes("melee")
  ) {
    return "melee";
  }

  if (
    booleanOrUndefined(
      source?.isRanged,
      model?.isRanged,
    ) === true
  ) {
    return "ranged";
  }

  return "melee";
}

function explicitAbilityModifiers(value) {
  const result = {};

  const visit =
    (candidate, depth = 0) => {
      if (
        !candidate
        || typeof candidate !== "object"
        || depth > 4
      ) {
        return;
      }

      if (Array.isArray(candidate)) {
        candidate.forEach(
          (entry) =>
            visit(
              entry,
              depth + 1,
            ),
        );

        return;
      }

      const ability =
        normalizedAbilityName(
          firstDefined(
            candidate.ability,
            candidate.abilityName,
            candidate.typeName,
            candidate.name,
            candidate.id,
          ),
        );

      const amount =
        optionalNumber(
          candidate.amount,
          candidate.value,
          candidate.modifier,
          candidate.bonus,
          candidate.increase,
        );

      if (
        ability
        && amount != null
        && amount !== 0
      ) {
        result[ability] =
          (result[ability] || 0)
          + amount;
      }

      for (
        const [key, nested]
        of Object.entries(candidate)
      ) {
        if (
          /ability|score|modifier|increase/i.test(key)
        ) {
          visit(
            nested,
            depth + 1,
          );
        }
      }
    };

  visit(value);

  return result;
}

function objectCandidates(value, depth = 0) {
  if (
    !value
    || typeof value !== "object"
    || depth > 5
  ) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(
      (entry) =>
        objectCandidates(
          entry,
          depth + 1,
        ),
    );
  }

  return [
    value,
    ...Object.values(value)
      .flatMap(
        (entry) =>
          objectCandidates(
            entry,
            depth + 1,
          ),
      ),
  ];
}

function featureRichness(value, level) {
  if (
    !value
    || typeof value !== "object"
  ) {
    return 0;
  }

  const detail =
    featureDetail(
      value,
      level,
    );

  return (
    detail.length
    + list(value.descriptionModels).length * 100
    + Object.keys(value).length
  );
}

function resolveRichFeature(
  selected,
  container,
  level,
) {
  const selectedId =
    text(selected?.id).toLowerCase();

  const selectedName =
    text(selected?.name).toLowerCase();

  const matches =
    objectCandidates(container)
      .filter(
        (candidate) => {
          if (candidate === selected) {
            return true;
          }

          const candidateId =
            text(candidate?.id).toLowerCase();

          const candidateName =
            text(candidate?.name).toLowerCase();

          return Boolean(
            (
              selectedId
              && candidateId === selectedId
            )
            || (
              selectedName
              && candidateName === selectedName
            ),
          );
        },
      )
      .sort(
        (a, b) =>
          featureRichness(b, level)
          - featureRichness(a, level),
      );

  return matches[0]
    || selected;
}
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
  const selected =
    record(raw.race);

  const embedded =
    parseEmbedded(
      raw.requiredRace,
      "Embedded ancestry record",
      warnings,
    );

  const sourceOptionId =
    text(
      selected.subraceId,
    ).toLowerCase();

  const sourceOption =
    list(embedded?.subraces)
      .find(
        (candidate) =>
          text(candidate?.id)
            .toLowerCase()
          === sourceOptionId,
      );

  const ancestry =
    ANCESTRIES.find(
      (candidate) =>
        candidate.id
        === text(selected.raceId)
          .toLowerCase(),
    )
    || ANCESTRIES.find(
      (candidate) =>
        candidate.name.toLowerCase()
        === text(embedded?.name)
          .toLowerCase(),
    );

  const preservedName =
    text(sourceOption?.name)
    || text(embedded?.name)
    || titleCase(selected.raceId)
    || "Imported ancestry";

  /*
   * CAH ability scores are imported as final values.
   * These modifiers are provenance/reference only and MUST
   * never be applied to the imported scores a second time.
   */
  const ancestrySnapshot = {
    sourceRaceId:
      text(
        selected.raceId
        || embedded?.id,
      ),

    sourceSubraceId:
      text(
        selected.subraceId,
      ),

    name:
      text(embedded?.name)
      || preservedName,

    optionName:
      text(sourceOption?.name),

    explicitAbilityModifiers:
      explicitAbilityModifiers([
        embedded,
        sourceOption,
      ]),

    finalScoresAlreadyIncludeModifiers:
      true,

    sourceModel:
      safeStructuredSnapshot(
        embedded,
        warnings,
        `${preservedName} ancestry model`,
      ),

    sourceOptionModel:
      safeStructuredSnapshot(
        sourceOption,
        warnings,
        `${preservedName} ancestry option`,
      ),
  };

  if (!ancestry) {
    warnings.push(
      `${preservedName} is not in the ancestry catalog. Its name and explicit source data were preserved without automatically reapplying ancestry mechanics.`,
    );

    return {
      ancestry:
        preservedName,

      ancestryId:
        "custom-lineage",

      ancestryOptionId:
        "medium",

      importedAncestry:
        ancestrySnapshot,
    };
  }

  const alias =
    ancestryAliases[sourceOptionId]
    || sourceOptionId
      .replace(
        new RegExp(
          `^${ancestry.id}_?`,
        ),
        "",
      )
      .replace(/_/g, "-");

  const option =
    ancestry.options.find(
      (candidate) =>
        candidate.id === alias,
    )
    || ancestry.options.find(
      (candidate) =>
        candidate.name.toLowerCase()
        === text(sourceOption?.name)
          .replace(
            /^palid\b/i,
            "Pallid",
          )
          .toLowerCase(),
    );

  if (
    sourceOptionId
    && !option
  ) {
    warnings.push(
      `${text(sourceOption?.name) || sourceOptionId} was not matched to a built-in ancestry option. The imported source ancestry data was preserved for review.`,
    );
  }

  return {
    ancestry:
      ancestryDisplayName(
        ancestry.id,
        option?.id,
      ),

    ancestryId:
      ancestry.id,

    ...(option
      ? {
          ancestryOptionId:
            option.id,
        }
      : {}),

    importedAncestry:
      ancestrySnapshot,
  };
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
  const owner =
    classLevels.filter(
      (entry) =>
        CLASS_RULES[entry.classId]
          ?.caster !== "none",
    );

  const sourceClassId =
    owner.length === 1
      ? owner[0].classId
      : "";

  return uniqueByName(
    list(raw.spells)
      .map(
        (container, index) => {
          const source =
            container?.spellModel
            || container;

          const components =
            text(source?.components);

          const materialMatch =
            components.match(
              /M\s*\((.*)\)/i,
            );

          const custom =
            Boolean(
              source?.isCustom
              ?? container?.isCustom,
            );

          return {
            id:
              `cah-spell-${slug(source?.id || source?.name)}-${index}`,

            canonicalId:
              slug(source?.name),

            name:
              text(source?.name),

            level:
              clamp(
                firstDefined(
                  source?.level,
                  container?.level,
                ),
                0,
                9,
              ),

            castingTime:
              text(source?.castingTime)
              || "—",

            range:
              text(source?.range)
              || "—",

            duration:
              text(source?.duration),

            school:
              text(
                firstDefined(
                  source?.school,
                  source?.schoolName,
                ),
              ),

            verbal:
              /(^|,\s*)V(?:,|$)/i
                .test(components),

            somatic:
              /(^|,\s*)S(?:,|$)/i
                .test(components),

            material:
              /(^|,\s*)M(?:\s*\(|,|$)/i
                .test(components),

            materialSpecified:
              materialMatch?.[1]
              || text(
                source?.materialSpecified,
              ),

            concentration:
              Boolean(
                source?.concentration
                ?? /concentration/i.test(
                  text(source?.duration),
                ),
              ),

            ritual:
              Boolean(
                source?.isRitual
                ?? source?.ritual,
              ),

            prepared:
              Boolean(
                container?.prepared
                ?? source?.prepared,
              ),

            desc:
              text(
                firstDefined(
                  source?.description,
                  source?.desc,
                  source?.notes,
                ),
              ),

            higherLevel:
              text(
                firstDefined(
                  source?.higherLevels,
                  source?.higherLevel,
                  source?.atHigherLevels,
                ),
              ),

            source:
              "Imported from 5e Companion",

            ...(sourceClassId
              ? {
                  sourceClassId,
                }
              : {}),

            importedCustom:
              custom,

            imported:
              true,

            provenance: {
              type: "cah-import",
              source:
                "5e Companion",
              reviewStatus:
                custom
                  ? "review-required"
                  : "review-required",
              reviewed: false,
            },

            importedSpellSnapshot:
              safeStructuredSnapshot(
                {
                  container,
                  model: source,
                },
                null,
                `${text(source?.name) || "Spell"} import`,
                125000,
              ),
          };
        },
      ),
  );
}

function mapInventory(raw) {
  const sources = [
    ...list(raw.equipment)
      .map(
        (source) => ({
          source,
          kindHint: "",
        }),
      ),

    ...list(raw.weapons)
      .map(
        (source) => ({
          source,
          kindHint: "weapon",
        }),
      ),

    ...list(raw.armors)
      .map(
        (source) => ({
          source,
          kindHint: "armor",
        }),
      ),
  ];

  return sources.flatMap(
    ({ source, kindHint }, index) => {
      const weaponModel =
        source?.weaponModel;

      const armorModel =
        source?.armorModel;

      const model =
        weaponModel
        || armorModel
        || source;

      const name =
        text(
          firstDefined(
            model?.name,
            source?.name,
          ),
        );

      if (!name) {
        return [];
      }

      const inferredKind =
        weaponModel
        || kindHint === "weapon"
          ? "weapon"
          : armorModel
            || kindHint === "armor"
            ? "armor"
            : /shield/i.test(
                text(
                  firstDefined(
                    model?.type,
                    model?.category,
                    source?.type,
                    name,
                  ),
                ),
              )
              ? "shield"
              : /ammunition|arrow|bolt/i.test(
                  text(
                    firstDefined(
                      model?.type,
                      model?.category,
                      source?.type,
                    ),
                  ),
                )
                ? "ammunition"
                : "item";

      const quantity =
        Math.max(
          0,
          Math.trunc(
            number(
              firstDefined(
                source?.amount,
                source?.quantity,
                source?.count,
              ),
              1,
            ),
          ),
        );

      const weight =
        optionalNumber(
          source?.weight,
          model?.weight,
        ) ?? 0;

      const detail =
        text(
          firstDefined(
            source?.description,
            model?.description,
            source?.notes,
            model?.notes,
          ),
        );

      const base = {
        id:
          `cah-item-${slug(source?.id || model?.id || name)}-${index}`,

        name,
        quantity,

        equipped:
          Boolean(
            source?.isEquipped
            ?? source?.equipped,
          ),

        attuned:
          Boolean(
            source?.isAttuned
            ?? source?.attuned,
          ),

        detail,
        weight,

        importedFrom:
          "5e Companion",

        imported:
          true,

        provenance: {
          type:
            "cah-import",

          source:
            "5e Companion",

          reviewStatus:
            "review-required",

          reviewed:
            false,
        },

        importedItemSnapshot:
          safeStructuredSnapshot(
            {
              source,
              model,
            },
            null,
            `${name} import`,
            125000,
          ),
      };

      if (inferredKind === "weapon") {
        const category =
          weaponCategory(
            model,
            source,
          );

        const primaryPacket =
          damagePacketFrom(
            firstDefined(
              model?.damageModel,
              source?.damageModel,
              model?.damage,
              source?.damage,
              {
                dice:
                  firstDefined(
                    model?.damageDice,
                    source?.damageDice,
                    model?.dice,
                    source?.dice,
                    {
                      damageDiceAmount:
                        firstDefined(
                          model?.damageDiceAmount,
                          source?.damageDiceAmount,
                        ),

                      damageDiceName:
                        firstDefined(
                          model?.damageDiceName,
                          source?.damageDiceName,
                        ),
                    },
                  ),

                damageType:
                  firstDefined(
                    model?.damageType,
                    source?.damageType,
                    model?.damageTypeName,
                    source?.damageTypeName,
                  ),
              },
            ),
          ) || {};

        const ability =
          normalizedAbilityName(
            firstDefined(
              source?.attackAbility,
              source?.attackAbilityName,
              source?.ability,
              source?.abilityName,
              model?.attackAbility,
              model?.abilityName,
            ),
          );

        const explicitProficiency =
          booleanOrUndefined(
            source?.isProficient,
            source?.proficient,
            model?.isProficient,
            model?.proficient,
          );

        const properties =
          propertyNames(
            source?.properties,
            model?.properties,
            source?.weaponProperties,
            model?.weaponProperties,
          );

        for (const [field, property] of [
          ["finesse", "finesse"],
          ["light", "light"],
          ["heavy", "heavy"],
          ["loading", "loading"],
          ["reach", "reach"],
          ["thrown", "thrown"],
          ["twoHanded", "two-handed"],
          ["twoHandedWeapon", "two-handed"],
          ["versatile", "versatile"],
          ["special", "special"],
          ["ammunition", "ammunition"],
        ]) {
          if (
            booleanOrUndefined(
              source?.[field],
              model?.[field],
            ) === true
            && !properties.includes(property)
          ) {
            properties.push(property);
          }
        }

        return [{
          ...base,

          attackAbility:
            ability
            || "auto",

          proficiencyOverride:
            explicitProficiency === true
              ? "proficient"
              : explicitProficiency === false
                ? "not-proficient"
                : "auto",

          attackBonus:
            optionalNumber(
              source?.attackBonus,
              source?.extraAttackBonus,
              model?.attackBonus,
              model?.extraAttackBonus,
            ) ?? 0,

          damageBonus:
            optionalNumber(
              source?.damageBonus,
              source?.extraDamageBonus,
              model?.damageBonus,
              model?.extraDamageBonus,
            ) ?? 0,

          magicBonus:
            optionalNumber(
              source?.magicBonus,
              model?.magicBonus,
            ) ?? 0,

          secondaryDamage:
            secondaryDamagePackets(
              source,
              model,
            ),

          equipment: {
            kind: "weapon",

            name,

            damageDice:
              primaryPacket.dice
              || "1d4",

            damageType:
              primaryPacket.type
              || "",

            properties,

            versatileDamage:
              diceExpression(
                firstDefined(
                  source?.versatileDamage,
                  model?.versatileDamage,
                  source?.twoHandedDamage,
                  model?.twoHandedDamage,
                ),
              ),

            ...category,

            attackType:
              attackType(
                model,
                source,
              ),

            range:
              rangeProfile(
                source,
                model,
              ),

            ammunitionType:
              text(
                firstDefined(
                  source?.ammunitionType,
                  model?.ammunitionType,
                  source?.ammoType,
                  model?.ammoType,
                ),
              ).toLowerCase(),

            weight,
          },
        }];
      }

      if (inferredKind === "armor") {
        const category =
          armorCategory(
            firstDefined(
              model?.category,
              model?.armorCategory,
              source?.category,
              source?.armorCategory,
              model?.type,
              source?.type,
            ),
          );

        const acBase =
          optionalNumber(
            model?.acBase,
            model?.baseAc,
            model?.armorClass,
            model?.ac,
            model?.armor,
            source?.acBase,
            source?.baseAc,
            source?.armorClass,
            source?.ac,
            source?.armor,
          );

        const addDexterityExplicit =
          booleanOrUndefined(
            model?.addDexterity,
            model?.addDex,
            source?.addDexterity,
            source?.addDex,
          );

        const dexterityCap =
          optionalNumber(
            model?.dexterityCap,
            model?.maxDexterityBonus,
            model?.maxDexBonus,
            source?.dexterityCap,
            source?.maxDexterityBonus,
            source?.maxDexBonus,
          );

        const addDexterity =
          addDexterityExplicit
          ?? (
            category === "light"
            || category === "medium"
          );

        return [{
          ...base,

          equipment: {
            kind: "armor",

            acBase:
              acBase ?? 10,

            addDexterity,

            dexterityCap:
              addDexterity
                ? dexterityCap
                : null,

            acBonus:
              optionalNumber(
                model?.acBonus,
                model?.extraAc,
                source?.acBonus,
                source?.extraAc,
              ) ?? 0,

            category,

            strengthRequirement:
              optionalNumber(
                model?.strengthRequirement,
                model?.requiredStrength,
                source?.strengthRequirement,
                source?.requiredStrength,
              ),

            stealthDisadvantage:
              Boolean(
                firstDefined(
                  booleanOrUndefined(
                    model?.stealthDisadvantage,
                    source?.stealthDisadvantage,
                  ),
                  booleanOrUndefined(
                    model?.disadvantageStealth,
                    source?.disadvantageStealth,
                  ),
                  false,
                ),
              ),
          },
        }];
      }

      if (inferredKind === "shield") {
        return [{
          ...base,

          equipment: {
            kind: "shield",

            acBonus:
              optionalNumber(
                model?.acBonus,
                source?.acBonus,
                model?.armorClassBonus,
                source?.armorClassBonus,
              ) ?? 2,

            weight,
          },
        }];
      }

      if (inferredKind === "ammunition") {
        return [{
          ...base,

          equipment: {
            kind: "ammunition",

            ammunitionType:
              text(
                firstDefined(
                  model?.ammunitionType,
                  source?.ammunitionType,
                  model?.type,
                  source?.type,
                  name,
                ),
              ).toLowerCase(),

            weight,
          },
        }];
      }

      return [{
        ...base,

        equipment:
          undefined,
      }];
    },
  );
}

function featureDetail(source, level) {
  const descriptions = list(source?.descriptionModels).filter((entry) => number(entry?.level, 1) <= level);
  return text(descriptions.at(-1)?.description || source?.description || source?.notes);
}

function mapFeatures(raw, classLevels, models) {
  const totalLevel =
    classLevels.reduce(
      (sum, entry) =>
        sum + entry.level,
      0,
    );

  const imported = [];

  function importedFeature(
    feature,
    {
      idPrefix,
      source,
      level,
      container,
    },
  ) {
    const resolved =
      resolveRichFeature(
        feature,
        container || feature,
        level,
      );

    const name =
      text(
        resolved?.name
        || feature?.name,
      );

    if (!name) {
      return null;
    }

    const detail =
      featureDetail(
        resolved,
        level,
      )
      || featureDetail(
        feature,
        level,
      );

    return {
      id:
        `${idPrefix}-${slug(resolved?.id || feature?.id || name)}`,

      name,

      source,

      detail,

      rawImportedDetail:
        detail,

      imported:
        true,

      provenance: {
        type:
          "cah-import",

        source:
          "5e Companion",

        reviewStatus:
          "review-required",

        reviewed:
          false,
      },

      importedFeatureSnapshot:
        safeStructuredSnapshot(
          {
            selected: feature,
            resolved,
          },
          null,
          `${name} feature import`,
          125000,
        ),
    };
  }

  for (
    const entry
    of classLevels
  ) {
    const job =
      list(raw.jobs)
        .find(
          (candidate) =>
            text(candidate?.jobId)
              .toLowerCase()
            === entry.classId,
        );

    const model =
      models.get(
        entry.classId,
      );

    const archetype =
      list(model?.archetypes)
        .find(
          (candidate) =>
            text(candidate?.id)
            === text(job?.archetypeId),
        );

    for (
      const grant
      of list(archetype?.features)
        .filter(
          (candidate) =>
            number(
              candidate?.level,
              1,
            )
            <= entry.level,
        )
    ) {
      const feat =
        grant?.feat
        || grant;

      const mapped =
        importedFeature(
          feat,
          {
            idPrefix:
              "cah-feature",

            source:
              `${entry.subclass || CLASS_RULES[entry.classId].name} ${number(grant?.level, 1)}`,

            level:
              entry.level,

            container:
              archetype,
          },
        );

      if (mapped) {
        imported.push(mapped);
      }
    }
  }

  for (
    const feat
    of list(raw.feats)
  ) {
    const mapped =
      importedFeature(
        feat,
        {
          idPrefix:
            "cah-feat",

          source:
            "Imported feat",

          level:
            totalLevel,

          container:
            raw.feats,
        },
      );

    if (mapped) {
      imported.push(mapped);
    }
  }

  for (
    const group
    of list(raw.selectableFeatures)
  ) {
    for (
      const selected
      of list(group?.selectedFeatures)
    ) {
      const mapped =
        importedFeature(
          selected,
          {
            idPrefix:
              "cah-choice",

            source:
              text(group?.name)
              || "Imported class choice",

            level:
              totalLevel,

            /*
             * Search the entire selectable-feature group so
             * thin selected references can resolve back to
             * richer option/feature definitions.
             */
            container:
              group,
          },
        );

      if (mapped) {
        imported.push(mapped);
      }
    }
  }

  return uniqueByName(
    imported,
  );
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
  if (inventory.length) {
    const structuredItems =
      inventory.filter(
        (item) =>
          item?.equipment?.kind
          && item.equipment.kind !== "item",
      ).length;

    const descriptiveItems =
      inventory.length
      - structuredItems;

    warnings.push(
      `${inventory.length} inventory entr${inventory.length === 1 ? "y was" : "ies were"} imported. ${structuredItems} retained structured equipment mechanics${descriptiveItems ? `; ${descriptiveItems} remain descriptive-only` : ""}. Imported equipment is marked for review.`,
    );
  }
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
