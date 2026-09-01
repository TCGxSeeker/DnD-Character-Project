// Consolidated behavioral suite. Source comments retain the former test boundaries for review.

// src/domain/abilityHistory.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { reconcileAbilityHistory } = await import("./abilityHistory.js");


  test("recorded ASI targets repair a diverged sheet exactly once", () => {
    const character = { abilities: { strength: 17, constitution: 16 }, history: [{ abilityState: { before: { strength: 17, constitution: 16 }, after: { strength: 18, constitution: 17 } } }] };
    const repaired = reconcileAbilityHistory(character);
    assert.deepEqual(repaired.abilities, { strength: 18, constitution: 17 });
    assert.equal(reconcileAbilityHistory(repaired), repaired);
  });

  test("legacy human-readable ability changes can be reconciled", () => {
    const character = { abilities: { strength: 17, constitution: 16 }, history: [{ changes: { abilitiesChanged: ["Strength 17 → 18", "Constitution 16 → 17"] } }] };
    assert.deepEqual(reconcileAbilityHistory(character).abilities, { strength: 18, constitution: 17 });
  });

  test("a later ability value is never overwritten by an older history event", () => {
    const character = { abilities: { strength: 19 }, history: [{ changes: { abilitiesChanged: ["Strength 17 → 18"] } }] };
    assert.equal(reconcileAbilityHistory(character), character);
  });
}

// src/domain/companions.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { createFamiliar, createSpellCompanion, createSteed, createSubclassCompanion, deriveCompanionStats, patchCompanion } = await import("./companions.js");
  const { familiarForm } = await import("../data/familiarForms2014.js");
  const { steedForm } = await import("../data/steedForms2014.js");


  const battleSmith = {
    id: "mate",
    abilities: { intelligence: 18 },
    classLevels: [{ classId: "artificer", level: 4, subclass: "Battle Smith", subclassId: "battle-smith" }],
    companions: [],
  };

  test("Steel Defender statistics derive from its Battle Smith", () => {
    const companion = createSubclassCompanion(battleSmith, { companionType: "steel-defender" }, "Rivet");
    const stats = deriveCompanionStats(battleSmith, companion);
    assert.equal(companion.name, "Rivet");
    assert.equal(stats.maxHp, 26);
    assert.equal(stats.armorClass, 15);
    assert.equal(stats.rendAttack, "+6");
    assert.equal(stats.rendDamage, "1d8 + 2 force");
    assert.equal(stats.passivePerception, 14);
  });

  test("spell-created companions use the shared linked game-piece contract", () => {
    const familiar = createSpellCompanion({ id: "familiar-owl", name: "Orbit", spellId: "find-familiar", spellName: "Find Familiar", statBlock: { type: "beast", armorClass: 11, maxHp: 1, speed: 5, abilities: { strength: 3, dexterity: 13, constitution: 8, intelligence: 2, wisdom: 12, charisma: 7 } } });
    assert.equal(familiar.origin, "spell");
    assert.equal(familiar.dismissible, true);
    assert.equal(deriveCompanionStats(battleSmith, familiar).maxHp, 1);
  });

  test("companion controls preserve unrelated character and companion state", () => {
    const rivet = createSubclassCompanion(battleSmith, { companionType: "steel-defender" }, "Rivet");
    const withCompanion = { ...battleSmith, notes: "preserve me", companions: [rivet] };
    const collapsed = patchCompanion(withCompanion, rivet.id, { collapsed: true });
    const absent = patchCompanion(collapsed, rivet.id, { present: false });
    assert.equal(absent.notes, "preserve me");
    assert.equal(absent.companions[0].collapsed, true);
    assert.equal(absent.companions[0].present, false);
    assert.equal(absent.companions[0].name, "Rivet");
  });

  test("Find Familiar uses one stable replaceable sheet instance", () => {
    const owl = createFamiliar(battleSmith, { id: "find-familiar", name: "Find Familiar" }, familiarForm("owl"), "Orbit");
    const cat = createFamiliar(battleSmith, { id: "find-familiar", name: "Find Familiar" }, familiarForm("cat"), "Comet");
    assert.equal(owl.id, cat.id);
    assert.equal(owl.sourceSpellId, "find-familiar");
    assert.equal(deriveCompanionStats(battleSmith, cat).maxHp, 2);
  });

  test("familiar and steed use separate stable slots and coexist", () => {
    const familiar = createFamiliar(battleSmith, { id: "find-familiar" }, familiarForm("owl"), "Orbit");
    const steed = createSteed(battleSmith, { id: "find-steed" }, steedForm("warhorse"), "Comet");
    assert.notEqual(familiar.id, steed.id);
    assert.equal(steed.type, "spell-steed");
    assert.equal(deriveCompanionStats(battleSmith, steed).maxHp, 19);
  });
}

// src/domain/mutations.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { patchMechanicalCompanion, patchSpell, setCurrentHitPoints, setExperience, setHitDieCurrent, setInspiration, setPactSlotCurrent, setResourceCurrent, setSpellSlotUsed } = await import("./mutations.js");


  const base = {
    hp: 8, maxHp: 10, inspiration: false, experience: 0,
    resources: [{ id: "rage", name: "Rage", current: 2, max: 3 }],
    hitDicePools: { d8: { current: 2, max: 3 } }, hitDiceRemaining: 2,
    spellSlots: [2], usedSpellSlots: [0], pactSlots: { current: 1, max: 2 },
    spells: [{ id: "spell", name: "Shield", prepared: false }],
    companions: [{ id: "ally", name: "Ally", currentHp: 5, present: true }], history: [],
  };

  test("mechanical mutations are immutable, categorized, and serialization-safe", () => {
    const cases = [
      [() => setCurrentHitPoints(base, 7), "hit-points"], [() => setInspiration(base, true), "inspiration"],
      [() => setExperience(base, 50), "experience"], [() => setResourceCurrent(base, "rage", 1), "resource"],
      [() => setHitDieCurrent(base, "d8", 1), "hit-dice"], [() => setSpellSlotUsed(base, 0, 1), "spell-slot"],
      [() => setPactSlotCurrent(base, 0), "spell-slot"], [() => patchSpell(base, "spell", { prepared: true }), "spell"],
      [() => patchMechanicalCompanion(base, "ally", { currentHp: 4 }), "companion"],
    ];
    for (const [run, category] of cases) {
      const result = run();
      assert.notStrictEqual(result, base);
      assert.equal(result.history[0].stateChanges[0].category, category);
      assert.doesNotThrow(() => JSON.stringify(result));
    }
    assert.equal(base.history.length, 0);
  });

  test("no-op mechanical mutations preserve identity and create no History event", () => {
    assert.strictEqual(setCurrentHitPoints(base, 8), base);
    assert.strictEqual(setInspiration(base, false), base);
    assert.strictEqual(setResourceCurrent(base, "rage", 2), base);
    assert.strictEqual(setHitDieCurrent(base, "d8", 2), base);
    assert.strictEqual(setSpellSlotUsed(base, 0, 0), base);
    assert.strictEqual(patchSpell(base, "spell", { prepared: false }), base);
    assert.strictEqual(patchMechanicalCompanion(base, "ally", { currentHp: 5 }), base);
  });
}

// src/domain/notes.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { saveSessionNote, searchCharacterNotes } = await import("./notes.js");


  test("saved character notes can be searched across note fields", () => {
    const results = searchCharacterNotes({ notes: "Ask Rivet", sessionEntries: [{ text: "Met Rivet. Rivet repaired the door." }], bonds: "Protect Rivet.", flaws: "" }, "rivet");
    assert.deepEqual(results, [{ field: "notes", label: "Session draft", count: 1 }, { field: "sessionEntries", label: "Saved sessions", count: 2 }, { field: "bonds", label: "Bonds", count: 1 }]);
  });

  test("saving a dated session appends immutably, clears only the draft, and preserves profile notes", () => {
    const character = { notes: "  Found the moon key.  ", sessionEntries: [{ id: "older", sessionDate: "2026-08-20", text: "Older session" }], bonds: "Protect the party." };
    const saved = saveSessionNote(character, { text: character.notes, sessionDate: "2026-08-31" }, new Date("2026-09-01T01:02:03.000Z"));
    assert.notStrictEqual(saved, character);
    assert.equal(saved.notes, "");
    assert.equal(saved.bonds, character.bonds);
    assert.deepEqual(saved.sessionEntries.map((entry) => entry.text), ["Found the moon key.", "Older session"]);
    assert.equal(saved.sessionEntries[0].sessionDate, "2026-08-31");
    assert.throws(() => saveSessionNote(character, { text: " ", sessionDate: "2026-08-31" }), /Write a session note/);
  });
}

// src/domain/portraits.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { portraitPatch, resolveCharacterPortrait, validPortraitDataUrl } = await import("./portraits.js");


  test("custom portraits override presets only when they are safe image data", () => {
    const map = { vaelithra: "/preset.png" };
    assert.equal(resolveCharacterPortrait({ avatar: "vaelithra", portraitDataUrl: "data:text/html;base64,bad" }, map), "/preset.png");
    assert.equal(resolveCharacterPortrait({ avatar: "vaelithra", portraitDataUrl: "data:image/jpeg;base64,abc" }, map), "data:image/jpeg;base64,abc");
    assert.equal(validPortraitDataUrl("https://example.com/photo.jpg"), false);
  });

  test("selecting a preset clears the previous uploaded portrait", () => {
    assert.deepEqual(portraitPatch({ avatar: "borin" }), { avatar: "borin", portraitDataUrl: "" });
  });
}

// src/public/tabletopContract.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { applyTabletopCommand, evaluateTabletopAttackContext, getTabletopCompanionSnapshot, getTabletopEntitySnapshot, TABLETOP_CONTRACT_VERSION } = await import("../public/tabletopContract.js");


  const character = {
    id: "boundary-test", name: "Boundary Test", avatar: "vaelithra", classLevels: [{ classId: "fighter", level: 2 }],
    levelHistory: [{ level: 1, classId: "fighter", baseHp: 10 }, { level: 2, classId: "fighter", baseHp: 6 }],
    abilities: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
    hp: 17, maxHp: 20, tempHp: 3, armorClass: 12, speed: 30, skills: ["Athletics"], saves: ["strength", "constitution"],
    inventory: [], features: [], spells: [], resources: [{ id: "second-wind", name: "Second Wind", current: 1, max: 1, reset: "Short rest" }], history: [], companions: [],
  };

  test("public snapshots are versioned, calculated, serializable, and hide internal rule structures", () => {
    const snapshot = getTabletopEntitySnapshot(character);
    assert.equal(snapshot.contractVersion, TABLETOP_CONTRACT_VERSION);
    assert.equal(snapshot.id, character.id);
    assert.equal(snapshot.hp.current, 17);
    assert.equal(snapshot.initiativeModifier, 2);
    assert.doesNotThrow(() => JSON.stringify(snapshot));
    ["classLevels", "features", "effects", "inventory", "history"].forEach((field) => assert.equal(Object.hasOwn(snapshot, field), false));
  });

  test("validated commands are immutable and append structured history", () => {
    const damaged = applyTabletopCommand(character, { type: "applyDamage", payload: { amount: 5 } });
    assert.equal(character.hp, 17);
    assert.deepEqual({ hp: damaged.hp, tempHp: damaged.tempHp }, { hp: 15, tempHp: 0 });
    assert.equal(damaged.history[0].type, "tabletop-command");
    const spent = applyTabletopCommand(damaged, { type: "consumeResource", payload: { resourceId: "second-wind" } });
    assert.equal(spent.resources[0].current, 0);
    assert.throws(() => applyTabletopCommand(spent, { type: "consumeResource", payload: { resourceId: "second-wind" } }));
  });

  test("conditions and rest commands remain engine-owned", () => {
    const conditioned = applyTabletopCommand(character, { type: "applyCondition", payload: { condition: { id: "prone", name: "Prone" } } });
    assert.equal(conditioned.conditions[0].id, "prone");
    const cleared = applyTabletopCommand(conditioned, { type: "removeCondition", payload: { conditionId: "prone" } });
    assert.deepEqual(cleared.conditions, []);
    const rested = applyTabletopCommand({ ...character, resources: [{ ...character.resources[0], current: 0 }] }, { type: "performRest", payload: { kind: "short" } });
    assert.equal(rested.resources[0].current, 1);
  });

  test("companion snapshots calculate owner-derived statistics without exposing their source model", () => {
    const artificer = { ...character, classLevels: [{ classId: "artificer", level: 3 }], abilities: { ...character.abilities, intelligence: 18 } };
    const snapshot = getTabletopCompanionSnapshot(artificer, { id: "steel-defender", type: "steel-defender", name: "Bolt", source: "Battle Smith 3", currentHp: 21 });
    assert.equal(snapshot.ownerEntityId, character.id);
    assert.equal(snapshot.id, `${character.id}:steel-defender`);
    assert.equal(snapshot.hp.maximum, 21);
    assert.equal(Object.hasOwn(snapshot, "statBlock"), false);
  });

  test("equipment capacity and ammunition remain engine-owned at the public boundary", () => {
    const armed = { ...character, inventory: [
      { id: "bow", name: "Longbow", quantity: 1, equipped: true, weight: 2, equipment: { kind: "weapon", name: "Longbow", damageDice: "1d8", damageType: "Piercing", ranged: true, ammunitionType: "arrow", isMartial: true } },
      { id: "arrows", name: "Arrows", quantity: 2, weight: 0.05 },
    ] };
    const snapshot = getTabletopEntitySnapshot(armed);
    assert.equal(snapshot.carrying.weight, 2.1);
    assert.deepEqual(snapshot.attacks[0].ammunition, { type: "arrow", available: 2 });
    const fired = applyTabletopCommand(armed, { type: "useAmmunition", payload: { weaponId: "bow" } });
    assert.equal(fired.inventory[1].quantity, 1);
    assert.equal(fired.history[0].changes.ammunitionSpent[0], "Arrows ×1");
  });

  test("target context is calculated on demand without entering the persistent snapshot", () => {
    const armed = { ...character, inventory: [{ id: "javelin", name: "Javelin", quantity: 1, equipped: true, equipment: { kind: "weapon", name: "Javelin", damageDice: "1d6", damageType: "Piercing", thrown: true, range: { normal: 30, long: 120 }, isSimple: true }, weaponUse: { attackMode: "thrown" } }] };
    const snapshot = getTabletopEntitySnapshot(armed);
    assert.equal(Object.hasOwn(snapshot.attacks[0], "targetContext"), false);
    const result = evaluateTabletopAttackContext(armed, "javelin", { distance: 60, cover: "half" });
    assert.equal(result.rollState, "disadvantage");
    assert.equal(result.coverArmorClassBonus, 2);
    assert.doesNotThrow(() => JSON.stringify(result));
    assert.throws(() => evaluateTabletopAttackContext(armed, "missing", {}), /Unknown calculated attack/);
  });

  test("public snapshots expose armor-caused roll and spellcasting restrictions", () => {
    const wizard = { ...character, classLevels: [{ classId: "wizard", level: 2 }], levelHistory: [{ level: 1, classId: "wizard", baseHp: 6 }, { level: 2, classId: "wizard", baseHp: 4 }], inventory: [{ id: "shield", name: "Shield", quantity: 1, equipped: true }] };
    const snapshot = getTabletopEntitySnapshot(wizard);
    assert.equal(snapshot.restrictions.armor.active, true);
    assert.equal(snapshot.restrictions.armor.spellcastingAllowed, false);
    assert.equal(snapshot.savingThrows.dexterity.disadvantageReasons.length, 1);
    assert.equal(snapshot.skills.acrobatics.disadvantageReasons.length, 1);
    assert.equal(snapshot.skills.arcana.disadvantageReasons.length, 0);
    assert.equal(snapshot.initiativeDisadvantageReasons.length, 1);
  });
}
