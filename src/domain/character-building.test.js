// Consolidated behavioral suite. Source comments retain the former test boundaries for review.

// src/domain/character.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { commitLevelUp, createLevelUpPreview } = await import("./character.js");


  const character = {
    abilities: { strength: 10, dexterity: 14, constitution: 16, intelligence: 10, wisdom: 18, charisma: 12 },
    classLevels: [{ classId: "druid", level: 1 }],
    levelHistory: [{ level: 1, classId: "druid", baseHp: 8 }],
    hp: 11,
    maxHp: 11,
    history: [],
  };

  test("level-up preview uses average HP and does not mutate the character", () => {
    const preview = createLevelUpPreview(character, { classId: "druid", subclassId: "moon", hpMethod: "average" });
    assert.equal(preview.maxHp, 19);
    assert.equal(preview.classLevels[0].level, 2);
    assert.equal(character.classLevels[0].level, 1);
  });

  test("commit records one auditable level-up", () => {
    const result = commitLevelUp(character, { classId: "druid", subclassId: "moon", hpMethod: "roll", hpRoll: 7 });
    assert.equal(result.classLevels[0].level, 2);
    assert.equal(result.history.length, 1);
    assert.match(result.history[0].detail, /rolled 7/);
  });

  test("maximum HP and story notes are committed as separate structured history", () => {
    const result = commitLevelUp(character, { classId: "druid", subclassId: "moon", hpMethod: "maximum", note: "The moon answered." });
    assert.equal(result.maxHp, 22);
    assert.match(result.history[0].detail, /maximum HP/);
    assert.equal(result.history[0].detail.includes("moon answered"), false);
    assert.equal(result.history[0].note, "The moon answered.");
  });

  test("a missing subclass blocks advancement at and after its selection level", () => {
    assert.throws(() => createLevelUpPreview(character, { classId: "druid", hpMethod: "average" }), /druid circle/i);
  });

  test("Battle Smith selection creates one named Steel Defender", () => {
    const artificer = {
      ...character,
      id: "mate",
      abilities: { ...character.abilities, intelligence: 18 },
      classLevels: [{ classId: "artificer", level: 3 }],
      levelHistory: [
        { level: 1, classId: "artificer", baseHp: 8 },
        { level: 2, classId: "artificer", baseHp: 5 },
        { level: 3, classId: "artificer", baseHp: 5 },
      ],
      companions: [],
      features: [],
    };
    const result = commitLevelUp(artificer, { classId: "artificer", subclassId: "battle-smith", companionName: "Rivet", hpMethod: "average", advancementType: "feat", featId: "tough" });
    assert.equal(result.classLevels[0].subclass, "Battle Smith");
    assert.equal(result.companions.length, 1);
    assert.equal(result.companions[0].name, "Rivet");
    assert.equal(result.companions[0].currentHp, 26);
    assert.ok(result.features.some((feature) => feature.name === "Battle Smith"));
    assert.ok(result.features.some((feature) => feature.name === "Tough"));
    assert.ok(result.history[0].changes.spellsAdded.includes("Heroism"));
  });

  test("Artificer 4 requires and commits a mechanical ASI or feat choice", () => {
    const artificer = {
      ...character,
      abilities: { ...character.abilities, intelligence: 18 },
      classLevels: [{ classId: "artificer", level: 3, subclass: "Battle Smith", subclassId: "battle-smith" }],
      levelHistory: [{ level: 1, classId: "artificer", baseHp: 8 }, { level: 2, classId: "artificer", baseHp: 5 }, { level: 3, classId: "artificer", baseHp: 5 }],
      companions: [], features: [], spells: [], ancestry: "Warforged — Envoy",
    };
    assert.throws(() => createLevelUpPreview(artificer, { classId: "artificer", hpMethod: "average" }), /Ability Score Improvement or a feat/i);
    const result = commitLevelUp(artificer, { classId: "artificer", hpMethod: "average", advancementType: "asi", asiFirst: "intelligence", asiSecond: "intelligence" });
    assert.equal(result.abilities.intelligence, 20);
    assert.equal(result.features.at(-1).name, "Ability Score Improvement");
    assert.ok(result.history[0].changes.featuresAdded.includes("Ability Score Improvement"));
  });

  test("Fighter 4 commits split Strength and Constitution increases to the final sheet", () => {
    const fighter = {
      ...structuredClone(character),
      id: "fighter-asi",
      classLevels: [{ classId: "fighter", level: 3, subclassId: "champion", subclass: "Champion" }],
      abilities: { ...character.abilities, strength: 17, constitution: 16 },
      levelHistory: character.levelHistory.map((entry, index) => ({ ...entry, classId: "fighter", level: index + 1 })),
      features: [], history: [], classChoices: [{ id: "fighter-style", classId: "fighter", level: 1, label: "Fighting Style", selections: ["Defense"] }],
    };
    const result = commitLevelUp(fighter, { classId: "fighter", hpMethod: "average", hpRoll: 1, advancementType: "asi", asiFirst: "strength", asiSecond: "constitution", featId: "", featAbility: "", note: "" });
    assert.equal(result.abilities.strength, 18);
    assert.equal(result.abilities.constitution, 17);
    assert.deepEqual(result.history[0].abilityState.after, result.abilities);
  });

  test("Resilient stores the chosen saving throw proficiency", () => {
    const artificer = {
      ...character,
      abilities: { ...character.abilities, intelligence: 18 },
      classLevels: [{ classId: "artificer", level: 3, subclass: "Battle Smith", subclassId: "battle-smith" }],
      levelHistory: [{ level: 1, classId: "artificer", baseHp: 8 }, { level: 2, classId: "artificer", baseHp: 5 }, { level: 3, classId: "artificer", baseHp: 5 }],
      companions: [], features: [], spells: [], ancestry: "Warforged â€” Envoy",
    };
    const result = commitLevelUp(artificer, { classId: "artificer", hpMethod: "average", advancementType: "feat", featId: "resilient", featAbility: "wisdom" });
    const resilient = result.features.find((feature) => feature.id === "feat-resilient");
    assert.equal(resilient.savingThrowAbility, "wisdom");
    assert.equal(result.abilities.wisdom, 19);
  });
}

// Ability generation provenance stays with character-building coverage because
// it is committed as part of the creation transaction and rendered on Sheet.
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const {
    abilityScoreGenerationDisplay,
    abilityScoreGenerationRecord,
    creationAbilityScoreMethod,
    normalizeAbilityScoreGeneration,
  } = await import("./provenance.js");

  const scores = {
    strength: 15,
    dexterity: 14,
    constitution: 13,
    intelligence: 12,
    wisdom: 10,
    charisma: 8,
  };

  test("House Roll creation preserves rolled provenance and session metadata", () => {
    const rolled = {
      rule: "4d6-reroll-ones-drop-lowest",
      sets: [{ totals: [15, 14, 13, 12, 10, 9] }, { totals: [16, 14, 12, 11, 10, 8] }],
      selectedSetIndex: 1,
      dumpIndex: 5,
      assignment: { strength: 0, dexterity: 1, constitution: 2, intelligence: 3, wisdom: 4, charisma: 5 },
    };
    const record = abilityScoreGenerationRecord({
      method: creationAbilityScoreMethod("rolled"),
      baseScores: scores,
      finalScores: scores,
      rolled,
    });

    assert.equal(record.method, "rolled");
    assert.deepEqual(record.rolled, rolled);

    const normalized = normalizeAbilityScoreGeneration({
      abilities: scores,
      abilityScoreGeneration: record,
    });
    assert.equal(normalized.method, "rolled");
    assert.deepEqual(normalized.rolled, rolled);
    assert.equal(abilityScoreGenerationDisplay({ abilities: scores, abilityScoreGeneration: record }).label, "Rolled");
  });

  test("ability provenance display preserves established method labels and legacy fallback", () => {
    const cases = [
      ["manual", "Manual"],
      ["point-buy", "Point Buy"],
      ["imported", "Imported"],
      ["rolled", "Rolled"],
      ["unknown", "Unrecorded"],
    ];

    cases.forEach(([method, expected]) => {
      const character = method === "unknown"
        ? { abilities: scores, abilityScoreGeneration: { method } }
        : { abilities: scores, abilityScoreGeneration: abilityScoreGenerationRecord({ method, baseScores: scores }) };
      assert.equal(abilityScoreGenerationDisplay(character).label, expected, method);
    });

    assert.equal(creationAbilityScoreMethod("manual"), "manual");
    assert.equal(creationAbilityScoreMethod("point-buy"), "point-buy");
  });
}

// src/domain/choices.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { applyChoiceRemovals, availableChoiceOptions, expandChoiceDefinitions, prerequisiteFailures, resolveChoiceDefinitions } = await import("./choices.js");


  const character = {
    classLevels: [{ classId: "wizard", level: 4 }],
    abilities: { intelligence: 16, wisdom: 10 },
    skills: ["Arcana"],
    proficiencies: { tools: ["Herbalism kit"] },
    classChoices: [{ id: "old-technique", selections: ["Ember"] }],
  };

  test("typed prerequisites use character, class, proficiency, and prior-choice state", () => {
    assert.deepEqual(prerequisiteFailures(character, [
      { type: "level", minimum: 5 },
      { type: "class-level", classId: "wizard", minimum: 5 },
      { type: "ability", ability: "wisdom", minimum: 13 },
      { type: "proficiency", group: "tools", value: "Thieves' tools" },
      { type: "choice", choiceId: "discipline", optionId: "Alchemy" },
    ], { selections: {} }).length, 5);
  });

  test("selected options reveal and require nested typed choices", () => {
    const choices = [{ id: "discipline", label: "Discipline", count: 1, options: [
      { id: "Alchemy", label: "Alchemy", choices: [{ id: "formula", label: "Formula", kind: "tool", count: 1, options: ["Fire", "Frost"] }] },
      "Warding",
    ] }];
    assert.deepEqual(expandChoiceDefinitions(character, choices, { discipline: ["Warding"] }).map((entry) => entry.id), ["discipline"]);
    assert.deepEqual(expandChoiceDefinitions(character, choices, { discipline: ["Alchemy"] }).map((entry) => entry.id), ["discipline", "formula"]);
    assert.throws(() => resolveChoiceDefinitions(character, choices, { discipline: ["Alchemy"] }), { code: "CHOICE_REQUIRED" });
    assert.deepEqual(resolveChoiceDefinitions(character, choices, { discipline: ["Alchemy"], formula: ["Fire"] }).resolved.map((entry) => entry.id), ["discipline", "formula"]);
  });

  test("option prerequisites and cross-level duplicate exclusions are declarative", () => {
    const choice = { id: "new-technique", label: "Technique", count: 1, excludeSelectionsFrom: ["old-technique"], options: [
      "Ember",
      { id: "Mind Palace", prerequisites: [{ type: "ability", ability: "intelligence", minimum: 15 }] },
      { id: "Oracle", prerequisites: [{ type: "ability", ability: "wisdom", minimum: 13 }] },
    ] };
    assert.deepEqual(availableChoiceOptions(character, choice).map((entry) => entry.id), ["Mind Palace"]);
    const currentTransaction = { id: "second", label: "Second", count: 1, options: ["Fire", "Frost"], excludeSelectionsFrom: ["first"] };
    assert.deepEqual(availableChoiceOptions(character, currentTransaction, { selections: { first: ["Fire"] } }).map((entry) => entry.id), ["Frost"]);
  });

  test("replacement rules validate an explicit prior selection and expose its removal", () => {
    const choice = { id: "replace-technique", label: "Replace technique", count: 1, options: ["Frost"], replacement: { fromChoiceIds: ["old-technique"], count: 1 } };
    assert.throws(() => resolveChoiceDefinitions(character, [choice], { "replace-technique": ["Frost"] }), { code: "CHOICE_REPLACEMENT_REQUIRED" });
    const result = resolveChoiceDefinitions(character, [choice], { "replace-technique": ["Frost"] }, { replacements: { "replace-technique": ["old-technique::Ember"] } });
    assert.deepEqual(result.removals, ["old-technique::Ember"]);
    assert.deepEqual(applyChoiceRemovals(character.classChoices, result.removals), []);
  });
}

// src/domain/classChoices.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { choiceOptionsForCharacter, dueResolvableClassChoices, resolveClassChoices } = await import("./classChoices.js");


  const fighter = { classLevels: [{ classId: "fighter", level: 1 }], classChoices: [], skills: ["Athletics", "Perception"] };

  test("repairs unresolved level-one fighting style on the next guided level", () => {
    assert.equal(dueResolvableClassChoices(fighter, "fighter")[0].id, "fighter-style");
    const result = resolveClassChoices(fighter, "fighter", { "fighter-style": ["Defense"] });
    assert.equal(result.features[0].detail, "Defense");
  });

  test("multiclass Fighting Style choices cannot duplicate an existing style", () => {
    const character = { classLevels: [{ classId: "fighter", level: 2 }, { classId: "paladin", level: 1 }], skills: [], classChoices: [{ id: "fighter-style", selections: ["Defense"] }] };
    const [choice] = dueResolvableClassChoices(character, "paladin");
    assert.equal(choiceOptionsForCharacter(character, choice).includes("Defense"), false);
    assert.throws(() => resolveClassChoices(character, "paladin", { "paladin-style": ["Defense"] }), { code: "CLASS_CHOICE_REQUIRED" });
  });

  test("expertise choices are limited to proficient character skills", () => {
    const rogue = { classLevels: [{ classId: "rogue", level: 2 }], classChoices: [], skills: ["Stealth", "Perception", "Acrobatics"] };
    const result = resolveClassChoices(rogue, "rogue", { "rogue-expertise-1": ["Stealth", "Perception"] });
    assert.deepEqual(result.expertise, ["Stealth", "Perception"]);
  });

  test("later ranger and sorcerer choices exclude options already selected", () => {
    const ranger = { classLevels: [{ classId: "ranger", level: 5 }], skills: [], classChoices: [{ id: "ranger-favored-enemy-1", selections: ["Beasts"] }] };
    const favoredEnemy = dueResolvableClassChoices(ranger, "ranger").find((choice) => choice.id === "ranger-favored-enemy-6");
    assert.equal(choiceOptionsForCharacter(ranger, favoredEnemy).includes("Beasts"), false);
    const sorcerer = { classLevels: [{ classId: "sorcerer", level: 9 }], skills: [], classChoices: [{ id: "sorcerer-metamagic-3", selections: ["Quickened Spell", "Subtle Spell"] }] };
    const metamagic = dueResolvableClassChoices(sorcerer, "sorcerer").find((choice) => choice.id === "sorcerer-metamagic-10");
    assert.equal(choiceOptionsForCharacter(sorcerer, metamagic).includes("Quickened Spell"), false);
  });
}

// src/domain/creation.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { applyFixedAbilityAdjustments, levelOneHitPoints, pointBuyCost, pointBuyRemaining, validateCreationAbilities, validatePointBuy } = await import("./creation.js");
  const { findAncestry } = await import("../data/ancestries.js");
  const { ancestryCreationDetails } = await import("../data/creationCatalog2014.js");
  const { equipmentChoicesForClass, startingEquipmentForClass, startingWeaponSubstitutionSlots } = await import("../data/creationCatalog2014.js");


  test("fixed ancestry adjustments produce final scores without mutating the base scores", () => {
    const base = { strength: 10, dexterity: 14, constitution: 14, intelligence: 12, wisdom: 16, charisma: 10 };
    assert.deepEqual(applyFixedAbilityAdjustments(base, { constitution: 2, intelligence: 1 }), { strength: 10, dexterity: 14, constitution: 16, intelligence: 13, wisdom: 16, charisma: 10 });
    assert.equal(base.constitution, 14);
  });

  test("creation validation evaluates final scores and level one HP uses the final Constitution", () => {
    const base = { strength: 10, dexterity: 10, constitution: 19, intelligence: 10, wisdom: 10, charisma: 10 };
    assert.equal(validateCreationAbilities(base, { constitution: 2 }), false);
    assert.equal(levelOneHitPoints(8, 16), 11);
  });

  test("2014 point buy enforces the 27-point nonlinear cost table", () => {
    const standardArray = { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 };
    assert.equal(pointBuyCost(14), 7);
    assert.equal(pointBuyRemaining(standardArray), 0);
    assert.equal(validatePointBuy(standardArray), true);
    assert.equal(validatePointBuy({ ...standardArray, charisma: 7 }), false);
    assert.equal(validatePointBuy({ ...standardArray, charisma: 9 }), false);
  });

  test("starting equipment choices resolve into the inventory package", () => {
    const choices = equipmentChoicesForClass("druid");
    assert.deepEqual(choices.map((choice) => choice.id), ["first-item", "melee-weapon"]);
    const equipment = startingEquipmentForClass("druid", { "first-item": "simple-weapon", "melee-weapon": "simple-melee" });
    assert.equal(equipment.some((entry) => entry.name === "Shield"), false);
    assert.equal(equipment.some((entry) => entry.name === "Scimitar"), false);
    assert.equal(equipment.some((entry) => entry.name === "Simple weapon"), false);
    assert.equal(equipment.some((entry) => entry.equipment?.kind === "weapon"), true);
  });

  test("generic starting weapon slots resolve independently to canonical profiles", () => {
    const equipmentSelections = { weapons: "two-weapons" };
    const slots = startingWeaponSubstitutionSlots("fighter", equipmentSelections);
    assert.deepEqual(slots.map((slot) => slot.label), ["Martial weapon", "Martial weapon"]);
    assert.equal(slots.every((slot) => slot.options.some((option) => option.id === "lance")), true);
    const equipment = startingEquipmentForClass("fighter", equipmentSelections, { [slots[0].id]: "lance", [slots[1].id]: "net" });
    const lance = equipment.find((entry) => entry.name === "Lance");
    const net = equipment.find((entry) => entry.name === "Net");
    assert.equal(lance.equipment.specialRuleId, "lance");
    assert.equal(net.equipment.specialRuleId, "net");
    assert.notEqual(lance.id, net.id);
    assert.equal(equipment.some((entry) => /^(Simple|Martial)( melee)? weapon$/.test(entry.name)), false);
  });

  test("quantity-based generic weapon packages create one selectable slot per weapon", () => {
    const slots = startingWeaponSubstitutionSlots("artificer", { "simple-weapons": "daggers" });
    assert.equal(slots.length, 0);
    const genericSlots = startingWeaponSubstitutionSlots("warlock", { ranged: "simple" });
    assert.equal(genericSlots.length, 2);
    const equipment = startingEquipmentForClass("warlock", { ranged: "simple" }, { [genericSlots[0].id]: "dagger", [genericSlots[1].id]: "sling" });
    assert.equal(equipment.filter((entry) => entry.name === "Dagger").length >= 1, true);
    assert.equal(equipment.some((entry) => entry.name === "Sling"), true);
  });

  test("concrete starting weapons and ammunition carry canonical combat metadata", () => {
    const equipment = startingEquipmentForClass("ranger", { melee: "shortswords" });
    const shortsword = equipment.find((entry) => entry.name === "Shortsword");
    const arrows = equipment.find((entry) => entry.name === "Arrows");
    assert.equal(shortsword.equipment.kind, "weapon");
    assert.equal(shortsword.equipment.light, true);
    assert.equal(arrows.equipment.ammunitionType, "arrow");
    assert.equal(arrows.weight, 0.05);
  });

  test("dragonmarked humans replace standard human adjustments", () => {
    const human = findAncestry("human");
    const sentinel = ancestryCreationDetails(human, human.options.find((option) => option.id === "mark-sentinel"));
    assert.deepEqual(sentinel.fixedAdjustments, { constitution: 2, wisdom: 1 });
    assert.equal(sentinel.traits.includes("Extra language"), false);
    const passage = ancestryCreationDetails(human, human.options.find((option) => option.id === "mark-passage"));
    assert.equal(passage.speed, 35);
  });

  test("replacement lineages do not inherit obsolete base ability adjustments", () => {
    const dragonborn = findAncestry("dragonborn");
    const chromatic = ancestryCreationDetails(dragonborn, dragonborn.options.find((option) => option.id === "chromatic"));
    assert.deepEqual(chromatic.fixedAdjustments, {});
    assert.match(chromatic.flexible, /\+2 to one ability/);
    assert.equal(chromatic.traits.includes("Chromatic Warding"), true);

    const aasimar = findAncestry("aasimar");
    const multiverse = ancestryCreationDetails(aasimar, aasimar.options.find((option) => option.id === "multiverse"));
    assert.deepEqual(multiverse.fixedAdjustments, {});
    assert.equal(multiverse.traits.includes("Celestial Revelation"), true);
  });

  test("legacy ancestry variants combine or replace their base adjustments correctly", () => {
    const aasimar = findAncestry("aasimar");
    const protector = ancestryCreationDetails(aasimar, aasimar.options.find((option) => option.id === "protector"));
    assert.deepEqual(protector.fixedAdjustments, { charisma: 2, wisdom: 1 });

    const tiefling = findAncestry("tiefling");
    const levistus = ancestryCreationDetails(tiefling, tiefling.options.find((option) => option.id === "levistus"));
    assert.deepEqual(levistus.fixedAdjustments, { charisma: 2, constitution: 1 });
    const feral = ancestryCreationDetails(tiefling, tiefling.options.find((option) => option.id === "feral"));
    assert.deepEqual(feral.fixedAdjustments, { dexterity: 2, intelligence: 1 });
    assert.equal(feral.fixedAdjustments.charisma, undefined);
  });

  test("common heritage choices preserve the correct base and replacement traits", () => {
    const halfElf = findAncestry("half-elf");
    const storm = ancestryCreationDetails(halfElf, halfElf.options.find((option) => option.id === "mark-storm"));
    assert.deepEqual(storm.fixedAdjustments, { charisma: 2, dexterity: 1 });
    assert.equal(storm.traits.includes("Fey Ancestry"), true);
    assert.equal(storm.traits.includes("Skill Versatility"), false);

    const elf = findAncestry("elf");
    const astral = ancestryCreationDetails(elf, elf.options.find((option) => option.id === "astral"));
    assert.deepEqual(astral.fixedAdjustments, {});
    assert.equal(astral.traits.includes("Astral Trance"), true);

    const halfling = findAncestry("halfling");
    const healing = ancestryCreationDetails(halfling, halfling.options.find((option) => option.id === "mark-healing"));
    assert.deepEqual(healing.fixedAdjustments, { dexterity: 2, wisdom: 1 });
  });
}

// src/domain/feats.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { FEATS_2014, availableFeats, featEligibility } = await import("./feats.js");


  const character = { abilities: { strength: 8, dexterity: 14, constitution: 14, intelligence: 16, wisdom: 12, charisma: 10 }, classLevels: [{ classId: "artificer", level: 3 }], features: [] };

  test("the 2014 feat picker exposes the complete core name catalog", () => {
    assert.equal(FEATS_2014.length, 42);
    assert.ok(FEATS_2014.some((feat) => feat.name === "Tough"));
    assert.ok(FEATS_2014.some((feat) => feat.name === "War Caster"));
    assert.ok(FEATS_2014.every((feat) => feat.summary && feat.benefits.length > 0));
    assert.deepEqual(FEATS_2014.find((feat) => feat.id === "weapon-master").benefits, [
      "Increase Strength or Dexterity by 1, to a maximum of 20.",
      "Choose four simple or martial weapon types and gain proficiency with each.",
    ]);
  });

  test("feat prerequisites and duplicate selection are filtered", () => {
    const grappler = FEATS_2014.find((feat) => feat.id === "grappler");
    assert.equal(featEligibility(character, grappler).eligible, false);
    const withTough = { ...character, features: [{ id: "feat-tough", name: "Tough" }] };
    assert.equal(availableFeats(withTough).find((feat) => feat.id === "tough").eligibility.eligible, false);
  });
}

// src/domain/grantedContent.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { getCharacterFeatures, getCharacterSpells } = await import("./grantedContent.js");


  const mate = { ancestryId: "warforged", classLevels: [{ classId: "artificer", level: 4, subclassId: "battle-smith", subclass: "Battle Smith" }], features: [], spells: [] };

  test("Battle Smith and Warforged grants auto-populate features", () => {
    const features = getCharacterFeatures(mate);
    const names = features.map((feature) => feature.name);
    assert.ok(names.includes("Battle Ready"));
    assert.ok(names.includes("Steel Defender"));
    assert.ok(names.includes("Integrated Protection"));
    assert.ok(features.every((feature) => feature.benefits.length > 0));
  });

  test("Battle Smith specialist spells are always prepared and de-duplicated", () => {
    const spells = getCharacterSpells({ ...mate, spells: [{ id: "shield", name: "Shield", level: 1, prepared: false }] });
    assert.deepEqual(spells.map((spell) => spell.name), ["Heroism", "Shield"]);
    assert.equal(spells.find((spell) => spell.name === "Shield").alwaysPrepared, true);
  });

  test("all core classes and their SRD subclasses grant level-appropriate features", () => {
    const builds = [
      ["barbarian", "berserker", "Path of the Berserker"], ["bard", "lore", "College of Lore"],
      ["cleric", "life", "Life Domain"], ["druid", "land", "Circle of the Land"],
      ["fighter", "champion", "Champion"], ["monk", "open-hand", "Way of the Open Hand"],
      ["paladin", "devotion", "Oath of Devotion"], ["ranger", "hunter", "Hunter"],
      ["rogue", "thief", "Thief"], ["sorcerer", "draconic-bloodline", "Draconic Bloodline"],
      ["warlock", "fiend", "The Fiend"], ["wizard", "evocation", "School of Evocation"],
    ];
    for (const [classId, subclassId, subclass] of builds) {
      const features = getCharacterFeatures({ classLevels: [{ classId, level: 20, subclassId, subclass }], features: [] });
      assert.ok(features.some((entry) => entry.source.startsWith(subclass)), `${subclass} features missing`);
      assert.ok(features.length >= 8, `${classId} class progression is unexpectedly shallow`);
      assert.ok(features.every((entry) => entry.detail && entry.benefits?.length), `${classId} has incomplete feature detail`);
    }
  });
}

// src/domain/multiclass.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { applyMulticlassProficiencies, effectiveExtraAttacks, firstUnarmoredDefense, hitDicePools, legacyHitDicePools, multiclassChoices, syncHitDicePools } = await import("./multiclass.js");


  const base = { classLevels: [{ classId: "fighter", level: 3 }], levelHistory: [{ level: 1, classId: "fighter" }, { level: 2, classId: "fighter" }, { level: 3, classId: "fighter" }], skills: ["Athletics"], proficiencies: { armor: ["Heavy armor"], weapons: ["Simple weapons", "Martial weapons"], tools: [] } };

  test("multiclass proficiency packages omit starting saves and equipment", () => {
    const result = applyMulticlassProficiencies(base, "cleric");
    assert.deepEqual(result.proficiencies.armor, ["Heavy armor", "Light armor", "Medium armor", "Shields"]);
    assert.equal(result.proficiencies.saves, undefined);
  });

  test("bard, ranger, and rogue multiclass skill choices are required and class-scoped where applicable", () => {
    assert.equal(multiclassChoices(base, "bard")[0].options.includes("Arcana"), true);
    assert.equal(multiclassChoices(base, "ranger")[0].options.includes("Arcana"), false);
    assert.throws(() => applyMulticlassProficiencies(base, "rogue", {}), /Choose 1 option/);
    assert.ok(applyMulticlassProficiencies(base, "rogue", { "multiclass-rogue-skills": ["Stealth"] }).skills.includes("Stealth"));
  });

  test("mixed Hit Dice stay separated and preserve spent dice as class levels change", () => {
    assert.deepEqual(hitDicePools([{ classId: "paladin", level: 2 }, { classId: "cleric", level: 3 }]), { d10: { max: 2, current: 2 }, d8: { max: 3, current: 3 } });
    assert.deepEqual(syncHitDicePools({ d10: { max: 2, current: 1 }, d8: { max: 3, current: 2 } }, [{ classId: "paladin", level: 3 }, { classId: "cleric", level: 3 }]), { d10: { max: 3, current: 2 }, d8: { max: 3, current: 2 } });
  });

  test("legacy Hit Dice migrate without restoring spent dice", () => {
    const migrated = legacyHitDicePools([{ classId: "fighter", level: 3 }], 1);
    assert.deepEqual(migrated, { d10: { max: 3, current: 1 } });
    assert.deepEqual(syncHitDicePools(migrated, [
      { classId: "fighter", level: 3 },
      { classId: "wizard", level: 1 },
    ]), { d10: { max: 3, current: 1 }, d6: { max: 1, current: 1 } });
  });

  test("Extra Attack uses the best class progression and never sums grants", () => {
    assert.equal(effectiveExtraAttacks({ classLevels: [{ classId: "paladin", level: 5 }, { classId: "fighter", level: 5 }] }), 2);
    assert.equal(effectiveExtraAttacks({ classLevels: [{ classId: "barbarian", level: 5 }, { classId: "fighter", level: 11 }] }), 3);
    assert.equal(effectiveExtraAttacks({ classLevels: [{ classId: "fighter", level: 20 }] }), 4);
  });

  test("only the first acquired Unarmored Defense formula applies", () => {
    const character = { classLevels: [{ classId: "barbarian", level: 2 }, { classId: "monk", level: 3 }], levelHistory: [{ level: 1, classId: "barbarian" }, { level: 2, classId: "barbarian" }, { level: 3, classId: "monk" }] };
    assert.equal(firstUnarmoredDefense(character), "barbarian");
  });
}

// src/domain/progression.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { abilityScoreChoiceForLevel, findSubclassOption, subclassChoiceForLevel } = await import("./progression.js");


  test("missing Artificer specialist remains required after level 3", () => {
    const character = { classLevels: [{ classId: "artificer", level: 3 }] };
    const choice = subclassChoiceForLevel(character, "artificer");
    assert.equal(choice.nextClassLevel, 4);
    assert.deepEqual(choice.options.map((option) => option.name), ["Alchemist", "Armorer", "Artillerist", "Battle Smith"]);
  });

  test("Artificer level 4 exposes an ASI or feat choice", () => {
    const character = { classLevels: [{ classId: "artificer", level: 3 }], features: [], history: [] };
    assert.deepEqual(abilityScoreChoiceForLevel(character, "artificer"), { classId: "artificer", classLevel: 4, repair: false });
  });

  test("an existing subclass is never requested again", () => {
    const character = { classLevels: [{ classId: "artificer", level: 3, subclass: "Alchemist" }] };
    assert.equal(subclassChoiceForLevel(character, "artificer"), null);
    assert.equal(findSubclassOption("artificer", "battle-smith").companionType, "steel-defender");
  });
}
