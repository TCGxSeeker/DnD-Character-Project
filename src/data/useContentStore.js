import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createContentRepository,
  enabledContentPacks,
  installContentPack,
  listInstalledContentPacks,
  removeContentPack,
  setContentPackEnabled,
} from "../importers/content/contentRepository.js";

import {
  loadContentPersistence,
  saveContentPersistence,
} from "./contentPersistence.js";

export function useContentStore() {
  const [repository, setRepository] = useState(
    () => createContentRepository(),
  );

  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [storageBackend, setStorageBackend] = useState(null);
  const [migratedToFilesystem, setMigratedToFilesystem] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const loaded = await loadContentPersistence();

        if (cancelled) return;

        setRepository(loaded.repository);
        setStorageBackend(loaded.backend);
        setMigratedToFilesystem(
          loaded.migrated === true,
        );
        setStorageError("");
      } catch (error) {
        if (cancelled) return;

        setStorageError(
          error?.message
          || "Local content could not be loaded.",
        );
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !storageBackend) {
      return;
    }

    let cancelled = false;

    async function persist() {
      try {
        await saveContentPersistence(
          repository,
          storageBackend,
        );

        if (!cancelled) {
          setStorageError("");
        }
      } catch (error) {
        if (!cancelled) {
          setStorageError(
            error?.message
            || "Local content could not be saved.",
          );
        }
      }
    }

    void persist();

    return () => {
      cancelled = true;
    };
  }, [
    repository,
    ready,
    storageBackend,
  ]);

  const installedPacks = useMemo(
    () => listInstalledContentPacks(repository),
    [repository],
  );

  const activePacks = useMemo(
    () => enabledContentPacks(repository),
    [repository],
  );

  function installPack(pack, options = {}) {
    let result = null;

    setRepository((current) => {
      result = installContentPack(
        current,
        pack,
        options,
      );

      return result.repository;
    });

    return result;
  }

  function removePack(packId) {
    let result = null;

    setRepository((current) => {
      result = removeContentPack(
        current,
        packId,
      );

      return result.repository;
    });

    return result;
  }

  function setPackEnabled(packId, enabled) {
    setRepository((current) =>
      setContentPackEnabled(
        current,
        packId,
        enabled,
      ),
    );
  }

  return {
    repository,
    ready,
    storageError,
    storageBackend,
    migratedToFilesystem,
    installedPacks,
    activePacks,
    installPack,
    removePack,
    setPackEnabled,
  };
}