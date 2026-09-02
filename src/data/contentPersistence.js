import {
  loadContentRepository,
  saveContentRepository,
} from "./contentStorage.js";

import {
  desktopContentStorageAvailable,
  loadDesktopContentRepository,
  saveDesktopContentRepository,
} from "./desktopContentStorage.js";

export const CONTENT_STORAGE_INDEXEDDB = "indexeddb";
export const CONTENT_STORAGE_FILESYSTEM = "filesystem";

export async function loadContentPersistence() {
  if (!desktopContentStorageAvailable()) {
    return {
      backend: CONTENT_STORAGE_INDEXEDDB,
      repository: await loadContentRepository(),
      migrated: false,
    };
  }

  const desktop = await loadDesktopContentRepository();

  if (desktop.exists) {
    return {
      backend: CONTENT_STORAGE_FILESYSTEM,
      repository: desktop.repository,
      migrated: false,
    };
  }

  // First filesystem-backed desktop launch:
  // preserve the existing browser/Electron IndexedDB repository
  // by copying it into the desktop repository file.
  const legacyRepository = await loadContentRepository();

  await saveDesktopContentRepository(
    legacyRepository,
  );

  return {
    backend: CONTENT_STORAGE_FILESYSTEM,
    repository: legacyRepository,
    migrated: true,
  };
}

export async function saveContentPersistence(
  repository,
  backend,
) {
  if (backend === CONTENT_STORAGE_FILESYSTEM) {
    return saveDesktopContentRepository(repository);
  }

  return saveContentRepository(repository);
}