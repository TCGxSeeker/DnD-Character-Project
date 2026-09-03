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

export function createLatestContentPersistenceQueue(save) {
  let active = false;
  let pending = null;

  async function drain() {
    active = true;

    while (pending) {
      const current = pending;
      pending = null;

      try {
        const result = await save(current.repository, current.backend);
        current.resolve(result);
      } catch (error) {
        current.reject(error);
      }
    }

    active = false;
  }

  return function enqueue(repository, backend) {
    if (pending) {
      pending.repository = repository;
      pending.backend = backend;
      return pending.promise;
    }

    let resolve;
    let reject;
    const promise = new Promise((onResolve, onReject) => {
      resolve = onResolve;
      reject = onReject;
    });

    pending = { repository, backend, promise, resolve, reject };

    if (!active) void drain();

    return promise;
  };
}

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

async function saveContentPersistenceImmediately(
  repository,
  backend,
) {
  if (backend === CONTENT_STORAGE_FILESYSTEM) {
    return saveDesktopContentRepository(repository);
  }

  return saveContentRepository(repository);
}

export const saveContentPersistence = createLatestContentPersistenceQueue(
  saveContentPersistenceImmediately,
);
