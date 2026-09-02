import { initialState } from "./seed.js";
import { normalizeArmorCharacter } from "../domain/armor.js";
import { normalizeCharacterProvenance } from "../domain/provenance.js";
import { reconcileAbilityHistory } from "../domain/abilityHistory.js";

export const STORAGE_KEY = "arcane-observatory-v1";
export const TRANSACTION_KEY = `${STORAGE_KEY}-pending`;
export const RECOVERY_KEY = `${STORAGE_KEY}-recovery`;
export const SCHEMA_VERSION = 4;

const clone = (value) => structuredClone(value);
const list = (value) => Array.isArray(value) ? value : [];

function migrateV1ToV2(state) {
  return {
    ...state,
    schemaVersion: 2,
    settings: { ruleset: "srd-2014", ...(state.settings || {}) },
    characters: list(state.characters).map((character) => ({
      ...character,
      history: list(character.history), conditions: list(character.conditions), companions: list(character.companions),
      effects: list(character.effects), ancestryEffects: list(character.ancestryEffects), backgroundEffects: list(character.backgroundEffects),
    })),
  };
}

function migrateV2ToV3(state) {
  return {
    ...state,
    schemaVersion: 3,
    characters: list(state.characters).map((character) => {
      const existing = list(character.sessionEntries);
      const legacyNote = String(character.notes || "").trim();
      const storedDate = String(character.updatedAt || character.createdAt || "").slice(0, 10);
      const sessionEntries = existing.length || !legacyNote ? existing : [{
        id: `session-legacy-${character.id}`,
        sessionDate: /^\d{4}-\d{2}-\d{2}$/.test(storedDate) ? storedDate : "",
        text: legacyNote,
        createdAt: character.updatedAt || character.createdAt || "",
      }];
      return { ...character, notes: existing.length ? character.notes || "" : "", sessionEntries };
    }),
  };
}

function migrateV3ToV4(state) {
  return {
    ...state,
    schemaVersion: 4,
    characters: list(state.characters)
      .map(normalizeCharacterProvenance),
  };
}

export const MIGRATION_REGISTRY = Object.freeze({
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  3: migrateV3ToV4,
});

export function migrateState(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error("Backup is not a JSON object.");
  let state = clone(candidate);
  let version = Number(state.schemaVersion);
  if (!Number.isInteger(version)) throw new Error("Backup schema version is missing or malformed.");
  if (version > SCHEMA_VERSION || version < 1) throw new Error(`Unsupported backup version: ${state.schemaVersion}.`);
  while (version < SCHEMA_VERSION) {
    const migrate = MIGRATION_REGISTRY[version];
    if (!migrate) throw new Error(`No migration is registered from schema version ${version}.`);
    const next = migrate(state);
    if (Number(next.schemaVersion) !== version + 1) throw new Error(`Migration ${version} did not advance exactly one schema version.`);
    state = next;
    version = Number(state.schemaVersion);
  }
  return state;
}

function validateCurrentState(candidate) {
  if (candidate.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported backup version: ${candidate.schemaVersion ?? "missing"}.`);
  if (!Array.isArray(candidate.characters) || candidate.characters.length < 1) throw new Error("Backup has no character collection.");
  if (candidate.characters.some((character) => !character || typeof character !== "object" || !String(character.id || "").trim() || !String(character.name || "").trim() || !Array.isArray(character.classLevels))) {
    throw new Error("One or more characters are missing required fields.");
  }
  const ids = candidate.characters.map((character) => String(character.id));
  if (new Set(ids).size !== ids.length) throw new Error("Backup contains duplicate character ids.");
  const characters = candidate.characters.map((character) => ({ ...character, sessionEntries: list(character.sessionEntries) })).map(normalizeCharacterProvenance).map(reconcileAbilityHistory).map(normalizeArmorCharacter);
  const activeCharacterId = ids.includes(String(candidate.activeCharacterId)) ? candidate.activeCharacterId : characters[0].id;
  return { ...candidate, activeCharacterId, characters };
}

export function validateState(candidate) { return validateCurrentState(migrateState(candidate)); }
export function cloneInitialState() { return validateState(initialState); }

function parseRecord(raw, label) {
  try { return validateState(JSON.parse(raw)); }
  catch (error) { throw new Error(`${label}: ${error.message}`); }
}

function pendingState(raw) {
  if (!raw) return null;
  const record = JSON.parse(raw);
  if (!record || record.kind !== "arcane-observatory-save" || !record.state) throw new Error("Pending save record is malformed.");
  return validateState(record.state);
}

function clear(storage, key) { storage?.removeItem?.(key); }

export function loadState(storage = globalThis.localStorage) {
  const raw = storage?.getItem(STORAGE_KEY);
  const pending = storage?.getItem(TRANSACTION_KEY);
  try {
    if (raw) {
      const state = parseRecord(raw, "Stored character data is invalid");
      clear(storage, TRANSACTION_KEY);
      return state;
    }
    if (pending) {
      const recovered = pendingState(pending);
      storage?.setItem(STORAGE_KEY, JSON.stringify(recovered));
      clear(storage, TRANSACTION_KEY);
      return recovered;
    }
  } catch (primaryError) {
    try {
      if (pending) {
        const recovered = pendingState(pending);
        storage?.setItem(STORAGE_KEY, JSON.stringify(recovered));
        clear(storage, TRANSACTION_KEY);
        return recovered;
      }
      const recovery = storage?.getItem(RECOVERY_KEY);
      if (recovery) return parseRecord(recovery, "Recovery copy is invalid");
    } catch (recoveryError) { console.warn("Local character recovery failed.", recoveryError); }
    console.warn("Using the bundled character state after a local data read failure.", primaryError);
  }
  return cloneInitialState();
}

export function saveState(state, storage = globalThis.localStorage) {
  const validated = validateState(state);
  const serialized = JSON.stringify(validated);
  const previous = storage?.getItem(STORAGE_KEY);
  if (previous) storage?.setItem(RECOVERY_KEY, previous);
  storage?.setItem(TRANSACTION_KEY, JSON.stringify({ kind: "arcane-observatory-save", startedAt: new Date().toISOString(), state: validated }));
  storage?.setItem(STORAGE_KEY, serialized);
  clear(storage, TRANSACTION_KEY);
  return validated;
}

export function exportState(state) {
  const validated = validateState(state);
  return JSON.stringify({ ...validated, exportedAt: new Date().toISOString() }, null, 2);
}

export function importState(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error("Backup is not valid JSON."); }
  return validateState(parsed);
}

export function restoreStateSafely(text, existingState) {
  try { return { state: importState(text), error: null, restored: true }; }
  catch (error) { return { state: existingState, error, restored: false }; }
}
