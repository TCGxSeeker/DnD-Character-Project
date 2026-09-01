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
    assert.equal(migrated.schemaVersion, 3);
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
