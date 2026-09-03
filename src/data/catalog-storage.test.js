// Consolidated behavioral suite. Source comments retain the former test boundaries for review.

// src/data/ancestries.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { ANCESTRIES, ancestryDisplayName, findAncestry } = await import("./ancestries.js");
  const { ancestryCreationDetails } = await import("./creationCatalog2014.js");


  test("ancestry catalog has stable unique ids and valid options", () => {
    assert.ok(ANCESTRIES.length >= 50);
    assert.equal(new Set(ANCESTRIES.map((entry) => entry.id)).size, ANCESTRIES.length);
    ANCESTRIES.forEach((entry) => {
      assert.equal(new Set(entry.options.map((choice) => choice.id)).size, entry.options.length);
      assert.ok(entry.speed > 0);
    });
  });

  test("warforged and dependent lineage choices are available", () => {
    const warforged = findAncestry("warforged");
    assert.equal(warforged.armorClassBonus, 1);
    assert.deepEqual(warforged.options.map((entry) => entry.id), ["published", "envoy", "juggernaut", "skirmisher"]);
    assert.equal(ancestryDisplayName("elf", "wood"), "Elf — Wood Elf");
  });

  test("every ancestry option has authored creation guidance", () => {
    for (const ancestry of ANCESTRIES) {
      for (const option of ancestry.options) {
        const details = ancestryCreationDetails(ancestry, option);
        assert.ok(details.optionSummary, `${ancestry.id}:${option.id} has no option summary`);
        assert.doesNotMatch(details.optionSummary, /cataloged, but/i, `${ancestry.id}:${option.id} still uses the catalog fallback`);
        assert.ok(details.traits.length, `${ancestry.id}:${option.id} exposes no creation traits`);
      }
    }
  });
}

// Content persistence ordering and desktop-file recovery remain in the broad
// catalog/storage suite because both protect the same repository contract.
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { mkdtemp, readFile, rm, unlink, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { createLatestContentPersistenceQueue } = await import("./contentPersistence.js");
  const { createContentRepository } = await import("../importers/content/contentRepository.js");
  const {
    loadContentRepositoryFile,
    saveContentRepositoryFile,
  } = await import("../../desktop/contentRepositoryFile.mjs");

  function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => {
      resolve = onResolve;
      reject = onReject;
    });
    return { promise, resolve, reject };
  }

  test("content persistence serializes writes and coalesces to the latest logical state", async () => {
    const saves = [];
    const enqueue = createLatestContentPersistenceQueue(async (repository) => {
      const completion = deferred();
      saves.push({ repository, completion });
      await completion.promise;
      return repository;
    });

    const first = enqueue({ revision: 1 }, "indexeddb");
    const second = enqueue({ revision: 2 }, "indexeddb");
    const latest = enqueue({ revision: 3 }, "indexeddb");

    assert.deepEqual(saves.map(({ repository }) => repository.revision), [1]);
    saves[0].completion.resolve();
    await first;
    await Promise.resolve();
    assert.deepEqual(saves.map(({ repository }) => repository.revision), [1, 3]);
    saves[1].completion.resolve();
    await Promise.all([second, latest]);
  });

  test("content persistence surfaces a save failure and accepts a later update", async () => {
    let attempt = 0;
    const enqueue = createLatestContentPersistenceQueue(async (repository) => {
      attempt += 1;
      if (attempt === 1) throw new Error("storage unavailable");
      return repository;
    });

    await assert.rejects(enqueue({ revision: 1 }, "filesystem"), /storage unavailable/);
    assert.deepEqual(await enqueue({ revision: 2 }, "filesystem"), { revision: 2 });
  });

  test("desktop repository replacement keeps a readable backup and recovers from damage", async () => {
    const directory = await mkdtemp(join(tmpdir(), "arcane-content-"));
    const filePath = join(directory, "content", "repository.json");
    const original = JSON.stringify(createContentRepository());
    const updated = JSON.stringify({ ...createContentRepository(), updatedMarker: true });

    try {
      await saveContentRepositoryFile(filePath, original, { maxBytes: 1024 * 1024 });
      await saveContentRepositoryFile(filePath, updated, { maxBytes: 1024 * 1024 });

      assert.equal(await readFile(filePath, "utf8"), updated);
      assert.equal(await readFile(`${filePath}.bak`, "utf8"), original);

      await writeFile(filePath, "corrupt", "utf8");
      const recovered = await loadContentRepositoryFile(filePath);
      assert.equal(recovered.recoveredFromBackup, true);
      assert.equal(recovered.repositoryJson, original);

      await unlink(filePath);
      const recoveredMissing = await loadContentRepositoryFile(filePath);
      assert.equal(recoveredMissing.recoveredFromBackup, true);
      assert.equal(recoveredMissing.repositoryJson, original);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("desktop repository loading falls back when primary JSON fails schema validation", async () => {
    const previousWindow = globalThis.window;
    const repository = createContentRepository();

    globalThis.window = {
      arcaneObservatoryContent: {
        available: true,
        loadRepository: async () => ({
          exists: true,
          repositoryJson: JSON.stringify({ kind: "wrong-repository" }),
          backupRepositoryJson: JSON.stringify(repository),
        }),
        saveRepository: async () => ({ saved: true }),
        clearRepository: async () => ({ cleared: true }),
        getStorageInfo: async () => ({ kind: "filesystem" }),
      },
    };

    try {
      const { loadDesktopContentRepository } = await import("./desktopContentStorage.js");
      const loaded = await loadDesktopContentRepository();
      assert.deepEqual(loaded.repository, repository);
      assert.equal(loaded.recoveredFromBackup, true);
    } finally {
      if (previousWindow === undefined) {
        delete globalThis.window;
      } else {
        globalThis.window = previousWindow;
      }
    }
  });
}

// Third-party character ingestion stays in this broad catalog/storage suite so
// every supported file lane is verified against the same native state contract.
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { initialState } = await import("./seed.js");
  const { exportState } = await import("./store.js");
  const { prepareCharacterImport } = await import("../importers/characterImport.js");

  function cahFixture() {
    const subclass = {
      id: "Custom-test-origin",
      name: "Test Origin",
      features: [{ level: 1, feat: { id: "test-feature", name: "Imported Gift", descriptionModels: [{ level: 1, description: "Descriptive only." }] } }],
    };
    return {
      jsonType: "character",
      id: "source-character",
      name: "Imported Hero",
      alignmentName: "TRUE_NEUTRAL",
      created: "2026-01-02T03:04:05.000Z",
      updated: "2026-02-03T04:05:06.000Z",
      jobs: [{ jobId: "sorcerer", level: 3, dice: 2, archetypeId: subclass.id }],
      allRequiredClasses: { jobs: [JSON.stringify({ id: "sorcerer", name: "Sorcerer", archetypes: [subclass] })] },
      race: { raceId: "elf", subraceId: "palid_elf" },
      requiredRace: JSON.stringify({ id: "elf", name: "Elf", speed: { normal: 30 }, subraces: [{ id: "palid_elf", name: "Palid Elf" }] }),
      background: { backgroundId: "noble" },
      requiredBackground: JSON.stringify({ id: "noble", name: "Noble" }),
      strength: { score: 8, save: false }, dexterity: { score: 14, save: false }, constitution: { score: 14, save: true },
      intelligence: { score: 12, save: false }, wisdom: { score: 10, save: false }, charisma: { score: 18, save: true },
      baseHp: 20, hp: 23, tempHp: 2, baseAc: 10, extraAC: 0, speedModifier: 0, exp: 900, hasInspiration: true,
      skills: [{ typeName: "ARCANA", proficiencyName: "FULL" }, { typeName: "DECEPTION", proficiencyName: "EXPERTISE" }],
      proficiencies: [{ name: "Dagger", typeName: "WEAPON" }],
      spellSlots: { first: 1, second: 0 },
      spells: [{ name: "Minor Illusion", level: 0, components: "S, M (fleece)", castingTime: "1 action", range: "30 feet", duration: "1 minute", description: "An illusion.", prepared: false }],
      equipment: [{ id: "dagger", name: "Dagger", amount: 2, isEquipped: true, isAttuned: false, description: "Imported item." }],
      weapons: [], armors: [], feats: [], selectableFeatures: [],
      specialAbilities: [{ id: "points", name: "Sorcery Points", usesLeft: 1, amountsPerLevel: [{ level: 2, amount: 2 }, { level: 3, amount: 3 }] }],
      notes: [{ id: "note-one", createdString: "2026-02-01T10:00:00.000Z", text: "Imported recap." }],
      conditions: {}, effectApplications: [{ target: "unknown-rule", amount: 99 }], advantages: [], disadvantages: [],
      copper: 1, silver: 2, electrum: 3, gold: 4, platinum: 5, image: "/9j/test-image",
      personalityTraits: "Careful", ideals: "Truth", bonds: "House", flaws: "Proud",
    };
  }

  test("character import dispatcher preserves the native backup lane", () => {
    const prepared = prepareCharacterImport({ fileName: "arcane-backup.json", text: exportState(initialState) });
    assert.equal(prepared.kind, "native-backup");
    assert.equal(prepared.state.schemaVersion, initialState.schemaVersion);
    assert.equal(prepared.state.characters.length, initialState.characters.length);
  });

  test("CAH ingestion normalizes compatible state and quarantines unknown mechanics", () => {
    const prepared = prepareCharacterImport({
      fileName: "hero.cah",
      text: JSON.stringify(cahFixture()),
      now: "2026-09-02T00:00:00.000Z",
      idFactory: () => "imported-character-id",
    });
    const character = prepared.character;
    assert.equal(prepared.kind, "cah-character");
    assert.equal(character.id, "imported-character-id");
    assert.deepEqual(character.classLevels, [{ classId: "sorcerer", level: 3, subclass: "Test Origin", subclassId: "imported-test-origin" }]);
    assert.equal(character.ancestry, "Elf — Pallid Elf");
    assert.equal(character.background, "Noble");
    assert.deepEqual(character.abilities, { strength: 8, dexterity: 14, constitution: 14, intelligence: 12, wisdom: 10, charisma: 18 });
    assert.equal(character.maxHp, 26);
    assert.equal(character.hp, 23);
    assert.deepEqual(character.usedSpellSlots, [3, 2]);
    assert.deepEqual(character.skills, ["Arcana", "Deception"]);
    assert.deepEqual(character.expertise, ["Deception"]);
    assert.equal(character.spells[0].sourceClassId, "sorcerer");
    assert.equal(character.inventory[0].quantity, 2);
    assert.equal(character.resources[0].current, 1);
    assert.equal(character.resources[0].max, 3);
    assert.equal(character.sessionEntries[0].text, "Imported recap.");
    assert.equal(character.portraitDataUrl, "data:image/jpeg;base64,/9j/test-image");
    assert.deepEqual(character.effects, []);
    assert.equal(character.importMetadata.format, "5e-companion-cah");
    assert.ok(prepared.warnings.some((warning) => warning.includes("unregistered mechanics")));
  });

  test("CAH content validation rejects renamed or structurally invalid files", () => {
    assert.throws(() => prepareCharacterImport({ fileName: "renamed.cah", text: JSON.stringify({ schemaVersion: 3, characters: [] }) }), /not a 5e Companion/);
    assert.throws(() => prepareCharacterImport({ fileName: "broken.cah", text: "not json" }), /not valid JSON/);
    const missingAbilities = cahFixture(); delete missingAbilities.wisdom;
    assert.throws(() => prepareCharacterImport({ fileName: "missing.cah", text: JSON.stringify(missingAbilities) }), /ability scores/);
  });
}

// src/data/migrationFixtures.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { default: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { SCHEMA_VERSION, validateState } = await import("./store.js");


  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures");
  for (const version of [1, 2, 3]) {
    test(`schema v${version} fixture migrates and validates`, () => {
      const fixture = JSON.parse(fs.readFileSync(path.join(root, `schema-v${version}.json`), "utf8"));
      const result = validateState(fixture);
      assert.equal(result.schemaVersion, SCHEMA_VERSION);
      assert.equal(result.characters[0].id, "fixture");
      if (version === 1) assert.equal(result.unknownFixtureField, "preserve");
    });
  }
}

// src/data/open5e.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { buildOpen5eUrl, spellRecordFromOpen5e } = await import("./open5e.js");


  test("Open5e URLs are v2, source-filtered, and field-limited", () => {
    const url = new URL(buildOpen5eUrl("spells", { query: "moon", fields: ["key", "name"] }));
    assert.equal(url.pathname, "/v2/spells/");
    assert.equal(url.searchParams.get("document__key__in"), "srd-2014");
    assert.equal(url.searchParams.get("name__icontains"), "moon");
    assert.equal(url.searchParams.get("fields"), "key,name");
  });

  test("Open5e spells retain complete playable detail fields", () => {
    const spell = spellRecordFromOpen5e({ key: "srd_heroism", name: "Heroism", level: 1, school: { name: "Enchantment" }, casting_time: "action", range_text: "Touch", duration: "1 minute", concentration: true, verbal: true, somatic: true, material: false, desc: "Full licensed description", higher_level: "Scales", document: { display_name: "5e 2014 Rules", permalink: "https://example.test/srd" } });
    assert.equal(spell.desc, "Full licensed description");
    assert.equal(spell.concentration, true);
    assert.equal(spell.school, "Enchantment");
    assert.equal(spell.higherLevel, "Scales");
  });
}

// src/data/startingProficiencies2014.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { startingProficiencies } = await import("./startingProficiencies2014.js");


  test("starting class proficiencies are canonical and include background tools", () => {
    const fighter = startingProficiencies("fighter", { tools: ["Gaming set"] });
    assert.deepEqual(fighter.armor, ["Light armor", "Medium armor", "Heavy armor", "Shields"]);
    assert.deepEqual(fighter.weapons, ["Simple weapons", "Martial weapons"]);
    assert.deepEqual(fighter.tools, ["Gaming set"]);
  });

  test("Artificer creation and multiclass foundations agree on fixed training", () => {
    assert.deepEqual(startingProficiencies("artificer").armor, ["Light armor", "Medium armor", "Shields"]);
    assert.deepEqual(startingProficiencies("artificer").tools, ["Thieves' tools", "Tinker's tools"]);
  });
}

// src/data/store.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { cloneInitialState, exportState, importState, loadState, migrateState, RECOVERY_KEY, restoreStateSafely, saveState, SCHEMA_VERSION, STORAGE_KEY, TRANSACTION_KEY } = await import("./store.js");
  const { abilityScoreGenerationRecord } = await import("../domain/provenance.js");


  function memoryStorage() {
    const data = new Map();
    return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key), data };
  }

  test("store round-trips versioned character state", () => {
    const storage = memoryStorage();
    const state = cloneInitialState();
    saveState(state, storage);
    assert.ok(storage.getItem(STORAGE_KEY));
    assert.equal(loadState(storage).characters[0].name, "Vaelithra");
  });

  test("rolled ability provenance survives native save and reload normalization", () => {
    const storage = memoryStorage();
    const state = cloneInitialState();
    const character = state.characters[0];
    const rolled = {
      rule: "4d6-reroll-ones-drop-lowest",
      sets: [{ totals: [15, 14, 13, 12, 10, 9] }, { totals: [16, 14, 12, 11, 10, 8] }],
      selectedSetIndex: 1,
      dumpIndex: 5,
      assignment: { strength: 0, dexterity: 1, constitution: 2, intelligence: 3, wisdom: 4, charisma: 5 },
    };
    const withRolled = {
      ...state,
      characters: [{
        ...character,
        abilityScoreGeneration: abilityScoreGenerationRecord({
          method: "rolled",
          baseScores: character.abilities,
          finalScores: character.abilities,
          rolled,
        }),
      }, ...state.characters.slice(1)],
    };

    saveState(withRolled, storage);
    const loaded = loadState(storage).characters[0].abilityScoreGeneration;
    assert.equal(loaded.method, "rolled");
    assert.deepEqual(loaded.rolled, rolled);
  });

  test("backup import validates the schema", () => {
    const state = cloneInitialState();
    assert.equal(importState(exportState(state)).schemaVersion, SCHEMA_VERSION);
    assert.throws(() => importState('{"schemaVersion":99,"characters":[]}'), /Unsupported/);
  });

  test("schema migrations are sequential and preserve unknown user-authored fields", () => {
    const current = cloneInitialState();
    const legacy = { ...current, schemaVersion: 1, customLibraryField: { campaign: "home" }, characters: current.characters.map((character) => ({ ...character, customCharacterField: "keep", effects: undefined })) };
    const migrated = migrateState(legacy);
    assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
    assert.deepEqual(migrated.customLibraryField, { campaign: "home" });
    assert.equal(migrated.characters[0].customCharacterField, "keep");
    assert.deepEqual(migrated.characters[0].effects, []);
  });

  test("v2 session prose migrates into a dated archive without data loss", () => {
    const migrated = migrateState({ schemaVersion: 2, activeCharacterId: "legacy", settings: {}, characters: [{ id: "legacy", name: "Legacy", classLevels: [], notes: "Recovered the moon key.", updatedAt: "2026-08-24T20:00:00.000Z", customField: "keep" }] });
    assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
    assert.equal(migrated.characters[0].notes, "");
    assert.deepEqual(migrated.characters[0].sessionEntries.map(({ sessionDate, text }) => ({ sessionDate, text })), [{ sessionDate: "2026-08-24", text: "Recovered the moon key." }]);
    assert.equal(migrated.characters[0].customField, "keep");
  });

  test("malformed imports preserve the existing in-memory state", () => {
    const existing = cloneInitialState();
    const result = restoreStateSafely('{"schemaVersion":2,"characters":[]}', existing);
    assert.equal(result.restored, false);
    assert.strictEqual(result.state, existing);
    assert.match(result.error.message, /character collection/);
  });

  test("an interrupted transaction recovers without discarding the pending state", () => {
    const storage = memoryStorage();
    const pending = { ...cloneInitialState(), settings: { ruleset: "srd-2014", recoveredMarker: true } };
    storage.setItem(TRANSACTION_KEY, JSON.stringify({ kind: "arcane-observatory-save", state: pending }));
    const recovered = loadState(storage);
    assert.equal(recovered.settings.recoveredMarker, true);
    assert.ok(storage.getItem(STORAGE_KEY));
    assert.equal(storage.getItem(TRANSACTION_KEY), null);
  });

  test("save keeps a recovery copy and commits through the pending record", () => {
    const storage = memoryStorage();
    const initial = cloneInitialState();
    saveState(initial, storage);
    const changed = { ...initial, settings: { ...initial.settings, motion: false } };
    saveState(changed, storage);
    assert.ok(storage.getItem(RECOVERY_KEY));
    assert.equal(storage.getItem(TRANSACTION_KEY), null);
    assert.equal(loadState(storage).settings.motion, false);
  });
}
