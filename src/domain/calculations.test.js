// Consolidated behavioral suite. Source comments retain the former test boundaries for review.

// src/domain/calculationGraph.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { calculateCharacterGraph } = await import("./calculationGraph.js");
  const { collectCharacterEffects, validateEffect } = await import("./effects.js");


  const character = {
    abilities: { strength: 10, dexterity: 14, constitution: 14, intelligence: 12, wisdom: 12, charisma: 10 },
    classLevels: [{ classId: "fighter", level: 5 }], levelHistory: Array.from({ length: 5 }, (_, index) => ({ level: index + 1, classId: "fighter", baseHp: index ? 6 : 10 })),
    skills: ["Athletics"], saves: ["strength", "constitution"], inventory: [], features: [],
    speed: 30, armorClass: 12, unarmoredArmorClass: 12, armorClassBonuses: {},
  };

  test("the calculation graph resolves effects once and explains their sources", () => {
    const graph = calculateCharacterGraph({ ...character, effects: [
      { operation: "bonus", target: "ability.wisdom", value: 2, source: "Test blessing" },
      { operation: "minimum", target: "armorClass", value: 15, source: "Arcane shell" },
      { operation: "bonus", target: "speed", value: 10, source: "Fleet" },
      { operation: "proficiency", target: "skill.perception", source: "Training" },
      { operation: "resistance", target: "fire", source: "Ward" },
    ] });
    assert.equal(graph.abilities.wisdom.value, 14);
    assert.equal(graph.skills.perception.proficiency, 1);
    assert.equal(graph.skills.perception.value, 5);
    assert.equal(graph.passivePerception.value, 15);
    assert.equal(graph.armorClass.value, 15);
    assert.equal(graph.speed.value, 40);
    assert.equal(graph.registries.resistances[0].target, "fire");
    assert.deepEqual(graph.speed.sources[0], { source: "Fleet", operation: "bonus", value: 10 });
  });

  test("equipped requirements and malformed effects are handled deterministically", () => {
    const effects = collectCharacterEffects({ inventory: [{ name: "Ring", equipped: false, effects: [{ operation: "bonus", target: "armorClass", value: 1, requiresEquipped: true }] }] });
    assert.equal(effects.length, 0);
    assert.equal(validateEffect({ operation: "mystery", target: "speed" }).valid, false);
  });

  test("attunement-required item effects remain inactive until attuned", () => {
    const item = { id: "ring", name: "Ring", quantity: 1, requiresAttunement: true, effects: [{ operation: "bonus", target: "armorClass", value: 1 }] };
    assert.equal(calculateCharacterGraph({ ...character, inventory: [item] }).armorClass.value, 12);
    assert.equal(calculateCharacterGraph({ ...character, inventory: [{ ...item, attuned: true }] }).armorClass.value, 13);
  });

  test("armor restrictions annotate affected rolls without changing their numeric bonuses", () => {
    const restricted = calculateCharacterGraph({ ...character, classLevels: [{ classId: "wizard", level: 5 }], levelHistory: Array.from({ length: 5 }, (_, index) => ({ level: index + 1, classId: "wizard", baseHp: index ? 4 : 6 })), inventory: [{ id: "chain", name: "Chain Mail", quantity: 1, equipped: true }] });
    assert.equal(restricted.restrictions.armor.active, true);
    assert.equal(restricted.skills.athletics.disadvantageReasons.length, 1);
    assert.equal(restricted.skills.acrobatics.disadvantageReasons.length, 1);
    assert.equal(restricted.skills.arcana.disadvantageReasons.length, 0);
    assert.equal(restricted.saves.strength.disadvantageReasons.length, 1);
    assert.equal(restricted.saves.dexterity.disadvantageReasons.length, 1);
    assert.equal(restricted.saves.constitution.disadvantageReasons.length, 0);
    assert.equal(restricted.initiative.disadvantageReasons.length, 1);
  });

  test("armor Stealth disadvantage remains separate from proficiency restrictions", () => {
    const proficient = calculateCharacterGraph({ ...character, inventory: [{ id: "scale", name: "Scale Mail", quantity: 1, equipped: true }], proficiencies: { armor: ["Medium armor"] } });
    assert.equal(proficient.restrictions.armor.active, false);
    assert.deepEqual(proficient.skills.stealth.disadvantageReasons, ["Equipped armor imposes Stealth disadvantage"]);
  });

  test("the effect target registry rejects unknown and edition-mismatched targets", () => {
    const valid = [
      { operation: "bonus", target: "initiative", value: 5 },
      { operation: "proficiency", target: "skill.perception" },
      { operation: "resistance", target: "damage.fire" },
      { operation: "grant", target: "feature.darkvision" },
      { operation: "resource", target: "rage" },
      { operation: "companion", target: "steel-defender" },
    ];
    valid.forEach((effect) => assert.equal(validateEffect({ ruleset: "5e-2014", ...effect }).valid, true, effect.target));
    assert.match(validateEffect({ operation: "bonus", target: "mystery.value", value: 1 }).error, /Unknown bonus target/);
    assert.match(validateEffect({ ruleset: "5e-2024", operation: "bonus", target: "speed", value: 1 }).error, /does not match/);
  });

  test("typed owner effects compose and expose every applied source", () => {
    const graph = calculateCharacterGraph({
      ...character,
      ancestry: "Hill Dwarf", ancestryId: "dwarf", ancestryOptionId: "hill", backgroundId: "sailor",
      classLevels: [{ classId: "barbarian", level: 5 }],
      features: [{ id: "feat-alert", name: "Alert" }, { id: "feat-mobile", name: "Mobile" }, { id: "feat-tough", name: "Tough" }],
    });
    assert.equal(graph.speed.value, 50);
    assert.equal(graph.initiative.value, 7);
    assert.equal(graph.maxHp.value, 59);
    assert.ok(graph.skills.perception.sources.some((entry) => entry.source === "Sailor background"));
    assert.ok(graph.maxHp.sources.some((entry) => entry.source === "Dwarven Toughness"));
    assert.ok(graph.maxHp.sources.some((entry) => entry.source === "Tough"));
    assert.ok(graph.registries.resistances.some((entry) => entry.source === "Dwarven Resilience"));
  });

  test("typed condition and item requirements activate only in valid owner state", () => {
    const item = { id: "cloak", name: "Cloak", quantity: 1, equipped: true, requiresAttunement: true, effects: [{ ruleset: "5e-2014", operation: "bonus", target: "armorClass", value: 1 }] };
    assert.equal(calculateCharacterGraph({ ...character, inventory: [{ ...item, attuned: true }], conditions: [] }).armorClass.value, 13);
    assert.equal(calculateCharacterGraph({ ...character, inventory: [{ ...item, attuned: true }], conditions: [{ id: "restrained", name: "Restrained" }] }).speed.value, 0);
    assert.equal(calculateCharacterGraph({ ...character, inventory: [item], conditions: [] }).armorClass.value, 12);
  });
}

// src/domain/derivedMechanics.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { calculateCharacterMaxHp, hitPointBonuses } = await import("./derivedMechanics.js");


  const history = [{ level: 1, classId: "sorcerer", baseHp: 6 }, { level: 2, classId: "sorcerer", baseHp: 4 }, { level: 3, classId: "sorcerer", baseHp: 4 }];

  test("ancestry, subclass, and feat HP bonuses compose from the same owner state", () => {
    const character = { ancestryId: "dwarf", ancestryOptionId: "hill", abilities: { constitution: 14 }, classLevels: [{ classId: "sorcerer", level: 3, subclassId: "draconic-bloodline" }], levelHistory: history, features: [{ id: "feat-tough" }] };
    assert.deepEqual(hitPointBonuses(character).map((entry) => entry.amount), [3, 3, 6]);
    assert.equal(calculateCharacterMaxHp(character), 32);
  });
}

// src/domain/rules.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { abilityModifier, CLASS_RULES, calculateMaxHp, hpAfterConstitutionChange, levelFromExperience, multiclassCasterLevel, multiclassSpellSlots, proficiencyBonus, totalCharacterLevel, validateMulticlassPrerequisites, xpToNextLevel, } = await import("./rules.js");


  test("ability modifiers and proficiency scale correctly", () => {
    assert.equal(abilityModifier(8), -1);
    assert.equal(abilityModifier(18), 4);
    assert.equal(proficiencyBonus(1), 2);
    assert.equal(proficiencyBonus(5), 3);
    assert.equal(proficiencyBonus(17), 6);
  });

  test("experience resolves current and next level", () => {
    assert.equal(levelFromExperience(0), 1);
    assert.equal(levelFromExperience(6500), 5);
    assert.equal(xpToNextLevel(6500), 7500);
    assert.equal(xpToNextLevel(355000), 0);
  });

  test("HP history and Constitution changes are retroactive", () => {
    const history = [{ baseHp: 8 }, { baseHp: 5 }, { baseHp: 5 }];
    assert.equal(calculateMaxHp(history, 14), 24);
    assert.equal(hpAfterConstitutionChange(24, 14, 16, 3), 27);
  });

  test("multiclass caster level combines full and partial casters", () => {
    const levels = [
      { classId: "sorcerer", level: 4 },
      { classId: "paladin", level: 3 },
    ];
    assert.equal(multiclassCasterLevel(levels), 5);
    assert.deepEqual(multiclassSpellSlots(levels), [4, 3, 2]);
  });

  test("partial casters do not contribute before gaining Spellcasting", () => {
    assert.equal(multiclassCasterLevel([{ classId: "paladin", level: 1 }]), 0);
    assert.equal(multiclassCasterLevel([{ classId: "ranger", level: 1 }]), 0);
    assert.equal(multiclassCasterLevel([
      { classId: "paladin", level: 1 },
      { classId: "ranger", level: 1 },
    ]), 0);
  });

  test("artificer uses Intelligence and rounds multiclass spellcasting up", () => {
    assert.equal(CLASS_RULES.artificer.hitDie, 8);
    assert.deepEqual(CLASS_RULES.artificer.prerequisites, { intelligence: 13 });
    assert.equal(multiclassCasterLevel([{ classId: "artificer", level: 3 }]), 2);
  });

  test("multiclass prerequisites include current and target classes", () => {
    const scores = { strength: 12, dexterity: 14, wisdom: 12, charisma: 16 };
    const result = validateMulticlassPrerequisites(scores, ["sorcerer"], "paladin");
    assert.equal(result.valid, false);
    assert.deepEqual(result.failures.map((failure) => failure.ability), ["strength"]);
  });

  test("multiclass total level drives proficiency while class levels drive prerequisites", () => {
    assert.equal(proficiencyBonus(totalCharacterLevel([{ classId: "fighter", level: 3 }, { classId: "rogue", level: 2 }])), 3);
    assert.equal(validateMulticlassPrerequisites({ strength: 12, dexterity: 13, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }, ["fighter"], "rogue").valid, true);
  });
}

// src/domain/savingThrows.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { characterSavingThrows, savingThrowBonus, savingThrowProficiencies, startingSavingThrows } = await import("./savingThrows.js");


  const artificer = {
    abilities: { strength: 8, dexterity: 14, constitution: 16, intelligence: 18, wisdom: 11, charisma: 11 },
    classLevels: [{ classId: "artificer", level: 4 }],
    saves: [],
    features: [],
  };

  test("empty legacy saves derive the original class proficiencies", () => {
    assert.deepEqual(startingSavingThrows("artificer"), ["constitution", "intelligence"]);
    assert.deepEqual(savingThrowProficiencies(artificer), ["constitution", "intelligence"]);
    assert.equal(savingThrowBonus(artificer, "strength"), -1);
    assert.equal(savingThrowBonus(artificer, "constitution"), 5);
    assert.equal(savingThrowBonus(artificer, "intelligence"), 6);
  });

  test("multiclassing does not grant the later class saving throws", () => {
    const multiclass = { ...artificer, classLevels: [{ classId: "artificer", level: 3 }, { classId: "fighter", level: 1 }] };
    assert.deepEqual(savingThrowProficiencies(multiclass), ["constitution", "intelligence"]);
  });

  test("explicit saves, Resilient, and fixed adjustments compose", () => {
    const character = {
      ...artificer,
      saves: ["wisdom", "charisma"],
      features: [{ id: "feat-resilient", savingThrowAbility: "dexterity" }],
      savingThrowBonuses: { charisma: 1 },
    };
    assert.deepEqual(savingThrowProficiencies(character), ["wisdom", "charisma", "dexterity"]);
    assert.equal(savingThrowBonus(character, "charisma"), 3);
    assert.equal(savingThrowBonus(character, "dexterity"), 4);
    assert.equal(characterSavingThrows(character).length, 6);
  });
}

// src/domain/senses.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { characterLanguages, darkvisionRange } = await import("./senses.js");

  test("2014 ancestry senses do not grant universal darkvision", () => {
    assert.equal(darkvisionRange({ ancestryId: "human" }), 0);
    assert.equal(darkvisionRange({ ancestryId: "elf", ancestryOptionId: "high" }), 60);
    assert.equal(darkvisionRange({ ancestryId: "elf", ancestryOptionId: "drow" }), 120);
  });
  test("stored languages are canonical and legacy characters retain Common", () => {
    assert.deepEqual(characterLanguages({ languages: ["Common", "Elvish", "Common"] }), ["Common", "Elvish"]);
    assert.deepEqual(characterLanguages({}), ["Common"]);
  });
}

// src/domain/sharedFeatures.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { grantedClassResources } = await import("./classResources2014.js");
  const { sharedFeatureSummary } = await import("./sharedFeatures.js");


  test("shared features expose resolved values and non-stacking explanations", () => {
    const classLevels = [{ classId: "barbarian", level: 5 }, { classId: "fighter", level: 11 }];
    const summary = sharedFeatureSummary({ classLevels, levelHistory: [{ level: 1, classId: "barbarian" }], resources: [], features: [] });
    assert.equal(summary.extraAttack.value, 3);
    assert.match(summary.extraAttack.formula, /never stack/);
    assert.equal(summary.unarmoredDefense.value, "barbarian");
  });

  test("Channel Divinity has one shared pool and retains every option source", () => {
    const classLevels = [{ classId: "cleric", level: 6, subclassId: "life-domain" }, { classId: "paladin", level: 3, subclassId: "oath-of-devotion" }];
    const resources = grantedClassResources(classLevels, {});
    const summary = sharedFeatureSummary({ classLevels, resources, features: [] });
    assert.equal(summary.channelDivinity.value, 2);
    assert.ok(summary.channelDivinity.sources.some((entry) => entry.name.includes("Preserve Life")));
    assert.ok(summary.channelDivinity.sources.some((entry) => entry.source.includes("Devotion")));
  });
}

// src/domain/skills.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { characterSkillRows, setSkillProficiencies, skillBonus } = await import("./skills.js");


  const character = {
    abilities: { strength: 8, dexterity: 14, constitution: 16, intelligence: 18, wisdom: 11, charisma: 11 },
    classLevels: [{ classId: "artificer", level: 4 }],
    skills: ["Arcana", "Perception"],
    expertise: ["Arcana"],
  };

  test("player skill bonuses use their governing ability and proficiency level", () => {
    assert.equal(skillBonus(character, "Athletics"), -1);
    assert.equal(skillBonus(character, "Perception"), 2);
    assert.equal(skillBonus(character, "Arcana"), 8);
    assert.equal(characterSkillRows(character).length, 18);
  });

  test("saving skill proficiencies is canonical and preserves unrelated character state", () => {
    const result = setSkillProficiencies({ ...character, notes: "keep", skills: ["Arcana"] }, ["stealth", "Arcana", "Stealth", "not-a-skill"]);
    assert.deepEqual(result.skills, ["Arcana", "Stealth"]);
    assert.equal(result.notes, "keep");
    assert.deepEqual(result.expertise, ["Arcana"]);
  });
}
