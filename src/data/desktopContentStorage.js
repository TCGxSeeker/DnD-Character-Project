import {
  createContentRepository,
  validateContentRepository,
} from "../importers/content/contentRepository.js";

function bridge() {
  if (typeof window === "undefined") return null;

  const candidate = window.arcaneObservatoryContent;

  if (
    !candidate
    || candidate.available !== true
    || typeof candidate.loadRepository !== "function"
    || typeof candidate.saveRepository !== "function"
    || typeof candidate.clearRepository !== "function"
    || typeof candidate.getStorageInfo !== "function"
  ) {
    return null;
  }

  return candidate;
}

export function desktopContentStorageAvailable() {
  return Boolean(bridge());
}

export async function loadDesktopContentRepository() {
  const api = bridge();

  if (!api) {
    throw new Error(
      "Desktop content filesystem storage is not available.",
    );
  }

  const result = await api.loadRepository();

  if (!result?.exists) {
    return {
      exists: false,
      repository: createContentRepository(),
    };
  }

  if (typeof result.repositoryJson !== "string") {
    throw new Error(
      "Desktop content repository did not return valid serialized data.",
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(result.repositoryJson);
  } catch {
    throw new Error(
      "Desktop content repository contains invalid JSON.",
    );
  }

  return {
    exists: true,
    repository: validateContentRepository(parsed),
  };
}

export async function saveDesktopContentRepository(
  repository,
) {
  const api = bridge();

  if (!api) {
    throw new Error(
      "Desktop content filesystem storage is not available.",
    );
  }

  const validated = validateContentRepository(repository);

  const result = await api.saveRepository(
    JSON.stringify(validated, null, 2),
  );

  return {
    ...result,
    repository: validated,
  };
}

export async function replaceDesktopContentRepository(
  repository,
) {
  return saveDesktopContentRepository(repository);
}

export async function clearDesktopContentRepository() {
  const api = bridge();

  if (!api) {
    throw new Error(
      "Desktop content filesystem storage is not available.",
    );
  }

  return api.clearRepository();
}

export async function desktopContentStorageInfo() {
  const api = bridge();

  if (!api) {
    return {
      available: false,
      kind: "indexeddb",
      directory: null,
      repositoryFile: null,
    };
  }

  const info = await api.getStorageInfo();

  return {
    available: true,
    kind: info?.kind || "filesystem",
    directory: info?.directory || null,
    repositoryFile: info?.repositoryFile || null,
  };
}