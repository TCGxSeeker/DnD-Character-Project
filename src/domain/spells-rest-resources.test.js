// Consolidated behavioral suite. Source comments retain the former test boundaries for review.

// src/domain/classResources2014.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { grantedClassResources, pactMagicForClassLevels, syncGrantedClassResources, syncPactMagic } = await import("./classResources2014.js");


  test("class resources scale at their 2014 class levels", () => {
    const resources = grantedClassResources([{ classId: "fighter", level: 17 }, { classId: "monk", level: 3 }], {});
    assert.equal(resources.find((entry) => entry.id === "action-surge").max, 2);
    assert.equal(resources.find((entry) => entry.id === "indomitable").max, 3);
    assert.equal(resources.find((entry) => entry.id === "ki").max, 3);
  });

  test("resource scaling preserves spent uses across level up", () => {
    const existing = [{ id: "rage", name: "Rage", current: 1, max: 3, reset: "Long rest", granted: true }];
    const synced = syncGrantedClassResources(existing, [{ classId: "barbarian", level: 6 }], {});
    assert.deepEqual({ current: synced[0].current, max: synced[0].max }, { current: 2, max: 4 });
  });

  test("pact magic scales separately and does not refill spent slots", () => {
    assert.deepEqual(pactMagicForClassLevels([{ classId: "warlock", level: 5 }]), { level: 3, current: 2, max: 2, reset: "Short rest" });
    const synced = syncPactMagic({ level: 2, current: 1, max: 2 }, [{ classId: "warlock", level: 11 }]);
    assert.deepEqual({ level: synced.level, current: synced.current, max: synced.max }, { level: 5, current: 2, max: 3 });
  });

  test("cleric and paladin share Channel Divinity uses while retaining all granted options", () => {
    const resources = grantedClassResources([{ classId: "cleric", level: 2 }, { classId: "paladin", level: 3 }], {});
    const channel = resources.filter((entry) => entry.name === "Channel Divinity");
    assert.equal(channel.length, 1);
    assert.equal(channel[0].max, 1);
  });

  test("special spell-slot recovery resources use their owning class and subclass", () => {
    const wizard = grantedClassResources([{ classId: "fighter", level: 10 }, { classId: "wizard", level: 3 }], {});
    assert.match(wizard.find((entry) => entry.id === "arcane-recovery").detail, /2 combined/);
    const land = grantedClassResources([{ classId: "druid", level: 6, subclassId: "circle-of-the-land" }], {});
    assert.match(land.find((entry) => entry.id === "natural-recovery").detail, /3 combined/);
    const moon = grantedClassResources([{ classId: "druid", level: 6, subclassId: "circle-of-the-moon" }], {});
    assert.equal(moon.some((entry) => entry.id === "natural-recovery"), false);
  });
}

// src/domain/restRecovery2014.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { applySpecialRecoveries, availableSpecialRecoveries, songOfRestDie, validateSpecialRecovery } = await import("./restRecovery2014.js");


  const wizard = {
    classLevels: [{ classId: "fighter", level: 5 }, { classId: "wizard", level: 4 }],
    spellSlots: [4, 3, 3, 1, 1, 1], usedSpellSlots: [2, 1, 1, 0, 0, 1],
    resources: [{ id: "arcane-recovery", name: "Arcane Recovery", current: 1, max: 1, reset: "Long rest" }],
  };

  test("Arcane Recovery uses wizard class level and only restores levels 1 through 5", () => {
    const recovery = availableSpecialRecoveries(wizard)[0];
    assert.equal(recovery.budget, 2);
    assert.deepEqual(recovery.eligibleSlots.map((slot) => slot.level), [1, 2, 3]);
    assert.throws(() => validateSpecialRecovery(wizard, "arcane-recovery", { 3: 1 }), { code: "SPECIAL_RECOVERY_BUDGET" });
    const result = applySpecialRecoveries(wizard, [{ featureId: "arcane-recovery", selections: { 1: 2 } }]);
    assert.deepEqual(result.character.usedSpellSlots, [0, 1, 1, 0, 0, 1]);
    assert.equal(result.character.resources[0].current, 0);
  });

  test("Natural Recovery requires Circle of the Land and uses druid level", () => {
    const moon = { ...wizard, classLevels: [{ classId: "druid", level: 6, subclassId: "circle-of-the-moon" }], resources: [{ id: "natural-recovery", current: 1, max: 1 }] };
    assert.equal(availableSpecialRecoveries(moon).length, 0);
    const land = { ...moon, classLevels: [{ classId: "druid", level: 6, subclassId: "circle-of-the-land" }] };
    assert.equal(availableSpecialRecoveries(land)[0].budget, 3);
  });

  test("a spent recovery feature cannot be used again before a long rest", () => {
    const spent = { ...wizard, resources: [{ ...wizard.resources[0], current: 0 }] };
    assert.equal(availableSpecialRecoveries(spent)[0].available, false);
    assert.throws(() => applySpecialRecoveries(spent, [{ featureId: "arcane-recovery", selections: { 1: 1 } }]), { code: "SPECIAL_RECOVERY_UNAVAILABLE" });
  });

  test("Song of Rest scales from bard class level", () => {
    assert.equal(songOfRestDie({ classLevels: [{ classId: "bard", level: 2 }] }), 6);
    assert.equal(songOfRestDie({ classLevels: [{ classId: "bard", level: 9 }] }), 8);
    assert.equal(songOfRestDie({ classLevels: [{ classId: "bard", level: 13 }] }), 10);
    assert.equal(songOfRestDie({ classLevels: [{ classId: "bard", level: 17 }] }), 12);
  });
}

// src/domain/rests.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { spendHitDie, takeLongRest, takeShortRest } = await import("./rests.js");


  const character = {
    hp: 5, maxHp: 30, tempHp: 4, abilities: { constitution: 14 },
    classLevels: [{ classId: "fighter", level: 3 }, { classId: "warlock", level: 2 }],
    hitDicePools: { d10: { max: 3, current: 1 }, d8: { max: 2, current: 1 } }, hitDiceRemaining: 2,
    spellSlots: [4, 2], usedSpellSlots: [2, 1], pactSlots: { level: 1, current: 0, max: 2, reset: "Short rest" },
    resources: [{ id: "second-wind", current: 0, max: 1, reset: "Short rest" }, { id: "luck", current: 0, max: 3, reset: "Long rest" }], history: [],
  };

  test("spending a class Hit Die heals with Constitution and decrements only that pool", () => {
    const result = spendHitDie(character, "d10", 7);
    assert.equal(result.hp, 14);
    assert.deepEqual(result.hitDicePools, { d10: { max: 3, current: 0 }, d8: { max: 2, current: 1 } });
  });

  test("short rests restore short resources and Pact Magic but not long resources", () => {
    const result = takeShortRest(character, { hpBefore: 3, hitDiceSpent: ["d10 roll 7 (+2 Constitution)"] });
    assert.equal(result.pactSlots.current, 2);
    assert.deepEqual(result.resources.map((entry) => entry.current), [1, 0]);
    assert.equal(result.usedSpellSlots[0], 2);
    assert.deepEqual(result.history[0].changes.hitDiceSpent, ["d10 roll 7 (+2 Constitution)"]);
    assert.deepEqual(result.history[0].changes.resourcesRestored, ["second-wind"]);
  });

  test("long rests restore all pools and half total Hit Dice with selectable priority", () => {
    const result = takeLongRest(character, ["d8", "d10"]);
    assert.equal(result.hp, 30);
    assert.equal(result.tempHp, 0);
    assert.deepEqual(result.usedSpellSlots, [0, 0]);
    assert.deepEqual(result.resources.map((entry) => entry.current), [1, 3]);
    assert.deepEqual(result.hitDicePools, { d10: { max: 3, current: 2 }, d8: { max: 2, current: 2 } });
  });

  test("short rests atomically apply special slot recovery and Song of Rest", () => {
    const bardWizard = {
      ...character, hp: 10, tempHp: 0,
      classLevels: [{ classId: "bard", level: 2 }, { classId: "wizard", level: 4 }],
      usedSpellSlots: [2, 1],
      resources: [...character.resources, { id: "arcane-recovery", name: "Arcane Recovery", current: 1, max: 1, reset: "Long rest" }],
    };
    const result = takeShortRest(bardWizard, { hpBefore: 5, hitDiceSpent: ["d8 roll 3 (+2 Constitution)"], songOfRestRoll: 4, specialRecoveries: [{ featureId: "arcane-recovery", selections: { 2: 1 } }] });
    assert.equal(result.hp, 14);
    assert.deepEqual(result.usedSpellSlots, [2, 0]);
    assert.equal(result.resources.find((entry) => entry.id === "arcane-recovery").current, 0);
    assert.deepEqual(result.history[0].changes.spellSlotsRestored, ["Arcane Recovery: 1 × level 2", "Pact Magic"]);
    assert.deepEqual(result.history[0].changes.resourcesSpent, ["Arcane Recovery"]);
  });

  test("long rests restore spent special recovery features", () => {
    const spent = { ...character, resources: [...character.resources, { id: "arcane-recovery", name: "Arcane Recovery", current: 0, max: 1, reset: "Long rest" }] };
    assert.equal(takeLongRest(spent).resources.find((entry) => entry.id === "arcane-recovery").current, 1);
  });
}

// src/domain/spellCapacity.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { spellCapacity, spellUsageByClass } = await import("./spellCapacity.js");


  test("Artificer capacity uses Intelligence and half class level", () => {
    const character = { abilities: { intelligence: 18 }, classLevels: [{ classId: "artificer", level: 4 }] };
    assert.deepEqual(spellCapacity(character), { leveledLimit: 6, cantripLimit: 2, mode: "prepared", classes: [{ classId: "artificer", classLevel: 4, limit: 6, mode: "prepared", cantrips: 2 }] });
  });

  test("known-spell casters use their 2014 class progression", () => {
    const bard = { abilities: { charisma: 8 }, classLevels: [{ classId: "bard", level: 4 }] };
    assert.deepEqual(spellCapacity(bard), { leveledLimit: 7, cantripLimit: 3, mode: "known", classes: [{ classId: "bard", classLevel: 4, limit: 7, mode: "known", cantrips: 3 }] });
  });

  test("multiclass capacity keeps class spell preparation separate from slot combination", () => {
    const character = { abilities: { intelligence: 16, wisdom: 14 }, classLevels: [{ classId: "wizard", level: 3 }, { classId: "cleric", level: 2 }] };
    assert.deepEqual(spellCapacity(character), { leveledLimit: 10, cantripLimit: 5, mode: "prepared", classes: [
      { classId: "wizard", classLevel: 3, limit: 6, mode: "prepared", cantrips: 3 },
      { classId: "cleric", classLevel: 2, limit: 4, mode: "prepared", cantrips: 2 },
    ] });
  });

  test("capacity exposes independent class ownership for explanations", () => {
    const result = spellCapacity({ classLevels: [{ classId: "wizard", level: 3 }, { classId: "warlock", level: 2 }], abilities: { intelligence: 16, charisma: 14 } });
    assert.deepEqual(result.classes.map(({ classId, classLevel, limit, mode, cantrips }) => ({ classId, classLevel, limit, mode, cantrips })), [
      { classId: "wizard", classLevel: 3, limit: 6, mode: "prepared", cantrips: 3 },
      { classId: "warlock", classLevel: 2, limit: 3, mode: "known", cantrips: 2 },
    ]);
  });

  test("known and prepared usage is counted independently by owner class", () => {
    const character = { classLevels: [{ classId: "wizard", level: 3 }, { classId: "warlock", level: 2 }], abilities: { intelligence: 16, charisma: 14 } };
    const usage = spellUsageByClass(character, [
      { level: 1, sourceClassId: "wizard", prepared: true }, { level: 1, sourceClassId: "wizard", prepared: false },
      { level: 1, sourceClassId: "warlock", prepared: false }, { level: 0, sourceClassId: "warlock" },
    ]);
    assert.deepEqual(usage.map(({ classId, used, remaining }) => ({ classId, used, remaining })), [{ classId: "wizard", used: 1, remaining: 5 }, { classId: "warlock", used: 1, remaining: 2 }]);
  });
}

// src/domain/spellcasting.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { availableCastingOptions, spendCastingSlot, spellcastingStatus } = await import("./spellcasting.js");


  const mixedCaster = {
    spellSlots: [4, 3, 2], usedSpellSlots: [4, 1, 0],
    pactSlots: { level: 2, current: 1, max: 2, reset: "Short rest" }, history: [],
  };

  test("standard and Pact Magic slots can cast any eligible character spell", () => {
    assert.deepEqual(availableCastingOptions(mixedCaster, 2).map(({ pool, level }) => [pool, level]), [["spellcasting", 2], ["spellcasting", 3], ["pact", 2]]);
    assert.deepEqual(availableCastingOptions(mixedCaster, 3).map(({ pool, level }) => [pool, level]), [["spellcasting", 3]]);
  });

  test("casting spends only the selected pool and records History", () => {
    const pact = spendCastingSlot(mixedCaster, { pool: "pact", level: 2, spellLevel: 1 }, "Hex");
    assert.equal(pact.pactSlots.current, 0);
    assert.deepEqual(pact.usedSpellSlots, mixedCaster.usedSpellSlots);
    assert.deepEqual(pact.history[0].changes.spellSlotsSpent, ["2nd-level Pact Magic slot"]);

    const standard = spendCastingSlot(mixedCaster, { pool: "spellcasting", level: 3, spellLevel: 2 }, "Misty Step");
    assert.deepEqual(standard.usedSpellSlots, [4, 1, 1]);
    assert.equal(standard.pactSlots.current, 1);
  });

  test("an undersized or empty slot cannot be spent", () => {
    assert.throws(() => spendCastingSlot(mixedCaster, { pool: "pact", level: 2, spellLevel: 3 }, "Fireball"), { code: "SPELL_SLOT_UNAVAILABLE" });
  });

  test("armor or a shield worn without proficiency blocks every spell slot pool", () => {
    const armored = { ...mixedCaster, classLevels: [{ classId: "wizard", level: 5 }], inventory: [{ id: "shield", name: "Shield", quantity: 1, equipped: true, equipment: { kind: "shield", acBonus: 2 } }] };
    assert.equal(spellcastingStatus(armored).allowed, false);
    assert.deepEqual(availableCastingOptions(armored, 1), []);
    assert.throws(() => spendCastingSlot(armored, { pool: "spellcasting", level: 2, spellLevel: 1 }, "Magic Missile"), { code: "SPELLCASTING_BLOCKED_ARMOR" });
  });
}

// src/domain/spellCompanionAvailability.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { availableCompanionSpellRecords } = await import("./spellCompanionAvailability.js");


  test("known Find Familiar and Find Steed expose independent Sheet launchers", () => {
    const character = { classLevels: [{ classId: "wizard", level: 5 }], features: [], spells: [
      { id: "find-familiar", name: "Find Familiar", level: 1, prepared: true },
      { id: "find-steed", name: "Find Steed", level: 2, prepared: true },
      { id: "shield", name: "Shield", level: 1, prepared: true },
    ] };
    assert.deepEqual(availableCompanionSpellRecords(character).map((entry) => entry.key), ["find-familiar", "find-steed"]);
  });
}
