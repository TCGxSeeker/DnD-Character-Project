import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname } from "node:path";

export const CONTENT_REPOSITORY_BACKUP_SUFFIX = ".bak";

async function readJsonCandidate(filePath) {
  try {
    const repositoryJson = await readFile(filePath, "utf8");

    try {
      JSON.parse(repositoryJson);
      return { exists: true, valid: true, repositoryJson };
    } catch (error) {
      return { exists: true, valid: false, repositoryJson: null, error };
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { exists: false, valid: false, repositoryJson: null, error: null };
    }

    throw error;
  }
}

export async function loadContentRepositoryFile(filePath) {
  const primary = await readJsonCandidate(filePath);
  const backupPath = `${filePath}${CONTENT_REPOSITORY_BACKUP_SUFFIX}`;

  if (primary.valid) {
    const backup = await readJsonCandidate(backupPath).catch(() => null);

    return {
      exists: true,
      repositoryJson: primary.repositoryJson,
      backupRepositoryJson: backup?.valid ? backup.repositoryJson : null,
      recoveredFromBackup: false,
    };
  }

  const backup = await readJsonCandidate(backupPath);

  if (backup.valid) {
    return {
      exists: true,
      repositoryJson: backup.repositoryJson,
      backupRepositoryJson: null,
      recoveredFromBackup: true,
    };
  }

  if (!primary.exists && !backup.exists) {
    return {
      exists: false,
      repositoryJson: null,
      backupRepositoryJson: null,
      recoveredFromBackup: false,
    };
  }

  throw new Error(
    "Desktop content repository and recovery backup are unreadable.",
    { cause: primary.error || backup.error },
  );
}

export async function saveContentRepositoryFile(
  filePath,
  repositoryJson,
  { maxBytes } = {},
) {
  if (typeof repositoryJson !== "string") {
    throw new TypeError(
      "Desktop content repository must be serialized JSON.",
    );
  }

  const byteLength = Buffer.byteLength(repositoryJson, "utf8");

  if (Number.isFinite(maxBytes) && byteLength > maxBytes) {
    throw new Error(
      `Desktop content repository exceeds the ${Math.floor(maxBytes / 1024 / 1024)} MB safety limit.`,
    );
  }

  JSON.parse(repositoryJson);

  const directory = dirname(filePath);
  const backupPath = `${filePath}${CONTENT_REPOSITORY_BACKUP_SUFFIX}`;
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;

  await mkdir(directory, { recursive: true });

  try {
    await writeFile(temporaryPath, repositoryJson, "utf8");

    const verifiedTemporary = await readFile(temporaryPath, "utf8");
    JSON.parse(verifiedTemporary);

    const current = await readJsonCandidate(filePath);

    if (current.valid) {
      await copyFile(filePath, backupPath);
    }

    try {
      await rename(temporaryPath, filePath);
    } catch (renameError) {
      if (!current.exists) throw renameError;

      try {
        await copyFile(temporaryPath, filePath);
      } catch (copyError) {
        copyError.cause = renameError;
        throw copyError;
      }
    }

    await rm(temporaryPath, { force: true });

    return {
      saved: true,
      byteLength,
      backupCreated: current.valid,
    };
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

export async function clearContentRepositoryFiles(filePath) {
  await Promise.all([
    rm(filePath, { force: true }),
    rm(`${filePath}${CONTENT_REPOSITORY_BACKUP_SUFFIX}`, { force: true }),
  ]);

  return { cleared: true };
}
