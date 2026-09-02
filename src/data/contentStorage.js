import {
  createContentRepository,
  validateContentRepository,
} from "../importers/content/contentRepository.js";

export const CONTENT_DATABASE_NAME = "arcane-observatory-content";
export const CONTENT_DATABASE_VERSION = 1;
export const CONTENT_OBJECT_STORE = "repositories";
export const CONTENT_REPOSITORY_KEY = "active";

function indexedDbApi() {
  const api = globalThis.indexedDB;

  if (!api) {
    throw new Error(
      "This environment does not provide IndexedDB content storage.",
    );
  }

  return api;
}

function requestResult(request, errorMessage) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });

    request.addEventListener(
      "error",
      () => reject(request.error || new Error(errorMessage)),
      { once: true },
    );
  });
}

function transactionComplete(transaction, errorMessage) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), {
      once: true,
    });

    transaction.addEventListener(
      "abort",
      () => reject(transaction.error || new Error(errorMessage)),
      { once: true },
    );

    transaction.addEventListener(
      "error",
      () => reject(transaction.error || new Error(errorMessage)),
      { once: true },
    );
  });
}

export function openContentDatabase() {
  const request = indexedDbApi().open(
    CONTENT_DATABASE_NAME,
    CONTENT_DATABASE_VERSION,
  );

  request.addEventListener("upgradeneeded", () => {
    const database = request.result;

    if (!database.objectStoreNames.contains(CONTENT_OBJECT_STORE)) {
      database.createObjectStore(CONTENT_OBJECT_STORE);
    }
  });

  return requestResult(
    request,
    "Arcane Observatory could not open local content storage.",
  );
}

export async function loadContentRepository() {
  const database = await openContentDatabase();

  try {
    const transaction = database.transaction(
      CONTENT_OBJECT_STORE,
      "readonly",
    );

    const store = transaction.objectStore(CONTENT_OBJECT_STORE);
    const stored = await requestResult(
      store.get(CONTENT_REPOSITORY_KEY),
      "Arcane Observatory could not read local content.",
    );

    await transactionComplete(
      transaction,
      "Arcane Observatory could not finish reading local content.",
    );

    if (stored == null) {
      return createContentRepository();
    }

    return validateContentRepository(stored);
  } finally {
    database.close();
  }
}

export async function saveContentRepository(repository) {
  const validated = validateContentRepository(repository);
  const database = await openContentDatabase();

  try {
    const transaction = database.transaction(
      CONTENT_OBJECT_STORE,
      "readwrite",
    );

    const store = transaction.objectStore(CONTENT_OBJECT_STORE);

    store.put(
      structuredClone(validated),
      CONTENT_REPOSITORY_KEY,
    );

    await transactionComplete(
      transaction,
      "Arcane Observatory could not save local content.",
    );

    return validated;
  } finally {
    database.close();
  }
}

export async function replaceContentRepository(repository) {
  return saveContentRepository(repository);
}

export async function clearContentRepository() {
  const database = await openContentDatabase();

  try {
    const transaction = database.transaction(
      CONTENT_OBJECT_STORE,
      "readwrite",
    );

    transaction
      .objectStore(CONTENT_OBJECT_STORE)
      .delete(CONTENT_REPOSITORY_KEY);

    await transactionComplete(
      transaction,
      "Arcane Observatory could not clear local content.",
    );

    return createContentRepository();
  } finally {
    database.close();
  }
}