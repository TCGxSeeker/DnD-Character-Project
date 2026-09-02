import { validateContentPack } from "./contentPack.js";

export const CONTENT_REPOSITORY_KIND = "arcane-observatory-content-repository";
export const CONTENT_REPOSITORY_SCHEMA_VERSION = 1;

function clone(value) {
  return structuredClone(value);
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function isoNow(now) {
  const value = typeof now === "function" ? now() : now;
  const text = String(value || new Date().toISOString()).trim();

  if (Number.isNaN(Date.parse(text))) {
    throw new Error("Content repository timestamp is malformed.");
  }

  return text;
}

function normalizeEntry(entry, seenPackIds) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("Content repository entries must be objects.");
  }

  const pack = validateContentPack(entry.pack);
  const packId = requiredText(entry.packId || pack.pack.id, "Content repository packId");

  if (packId !== pack.pack.id) {
    throw new Error(
      `Content repository packId ${packId} does not match content pack id ${pack.pack.id}.`,
    );
  }

  if (seenPackIds.has(packId)) {
    throw new Error(`Duplicate installed content pack id: ${packId}.`);
  }

  seenPackIds.add(packId);

  const installedAt = String(entry.installedAt || "").trim();
  const updatedAt = String(entry.updatedAt || installedAt || "").trim();

  if (installedAt && Number.isNaN(Date.parse(installedAt))) {
    throw new Error(`Installed timestamp for ${packId} is malformed.`);
  }

  if (updatedAt && Number.isNaN(Date.parse(updatedAt))) {
    throw new Error(`Updated timestamp for ${packId} is malformed.`);
  }

  return {
    packId,
    enabled: entry.enabled !== false,
    installedAt,
    updatedAt,
    pack,
  };
}

export function createContentRepository() {
  return {
    schemaVersion: CONTENT_REPOSITORY_SCHEMA_VERSION,
    kind: CONTENT_REPOSITORY_KIND,
    entries: [],
  };
}

export function validateContentRepository(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("Content repository must be an object.");
  }

  if (candidate.kind !== CONTENT_REPOSITORY_KIND) {
    throw new Error(
      `Unsupported content repository kind: ${candidate.kind ?? "missing"}.`,
    );
  }

  const schemaVersion = Number(candidate.schemaVersion);

  if (!Number.isInteger(schemaVersion)) {
    throw new Error("Content repository schemaVersion is missing or malformed.");
  }

  if (schemaVersion !== CONTENT_REPOSITORY_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported content repository schema version: ${candidate.schemaVersion}.`,
    );
  }

  const seenPackIds = new Set();
  const entries = list(candidate.entries).map((entry) =>
    normalizeEntry(entry, seenPackIds)
  );

  return {
    schemaVersion: CONTENT_REPOSITORY_SCHEMA_VERSION,
    kind: CONTENT_REPOSITORY_KIND,
    entries,
  };
}

export function installContentPack(repository, candidatePack, options = {}) {
  const current = validateContentRepository(repository);
  const pack = validateContentPack(candidatePack);
  const timestamp = isoNow(options.now);
  const existingIndex = current.entries.findIndex(
    (entry) => entry.packId === pack.pack.id,
  );

  if (existingIndex < 0) {
    const entry = {
      packId: pack.pack.id,
      enabled: options.enabled !== false,
      installedAt: timestamp,
      updatedAt: timestamp,
      pack,
    };

    return {
      repository: {
        ...current,
        entries: [...current.entries, entry],
      },
      action: "installed",
      entry: clone(entry),
    };
  }

  const existing = current.entries[existingIndex];
  const replacement = {
    packId: pack.pack.id,
    enabled:
      typeof options.enabled === "boolean"
        ? options.enabled
        : existing.enabled,
    installedAt: existing.installedAt || timestamp,
    updatedAt: timestamp,
    pack,
  };

  const entries = current.entries.map((entry, index) =>
    index === existingIndex ? replacement : entry
  );

  return {
    repository: {
      ...current,
      entries,
    },
    action: "updated",
    entry: clone(replacement),
  };
}

export function removeContentPack(repository, packId) {
  const current = validateContentRepository(repository);
  const id = requiredText(packId, "Content pack id");

  const exists = current.entries.some((entry) => entry.packId === id);

  if (!exists) {
    return {
      repository: current,
      removed: false,
    };
  }

  return {
    repository: {
      ...current,
      entries: current.entries.filter((entry) => entry.packId !== id),
    },
    removed: true,
  };
}

export function setContentPackEnabled(repository, packId, enabled) {
  const current = validateContentRepository(repository);
  const id = requiredText(packId, "Content pack id");
  const existingIndex = current.entries.findIndex(
    (entry) => entry.packId === id,
  );

  if (existingIndex < 0) {
    throw new Error(`Installed content pack not found: ${id}.`);
  }

  const entries = current.entries.map((entry, index) =>
    index === existingIndex
      ? { ...entry, enabled: Boolean(enabled) }
      : entry
  );

  return {
    ...current,
    entries,
  };
}

export function contentPackEntry(repository, packId) {
  const current = validateContentRepository(repository);
  const id = requiredText(packId, "Content pack id");
  const entry = current.entries.find((candidate) => candidate.packId === id);

  return entry ? clone(entry) : null;
}

export function listInstalledContentPacks(repository) {
  return validateContentRepository(repository).entries.map((entry) => ({
    packId: entry.packId,
    name: entry.pack.pack.name,
    version: entry.pack.pack.version,
    ruleset: entry.pack.pack.ruleset,
    enabled: entry.enabled,
    installedAt: entry.installedAt,
    updatedAt: entry.updatedAt,
  }));
}

export function enabledContentPacks(repository) {
  return validateContentRepository(repository).entries
    .filter((entry) => entry.enabled)
    .map((entry) => clone(entry.pack));
}