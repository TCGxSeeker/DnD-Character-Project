import { importState } from "../data/store.js";
import { importCahCharacter } from "./cah.js";

function extensionOf(fileName) {
  const parts = String(fileName || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) : "";
}

function parsedKind(text) {
  try {
    const parsed = JSON.parse(text);
    if (String(parsed?.jsonType || "").toLowerCase() === "character") return "cah";
    if (Number.isInteger(Number(parsed?.schemaVersion))) return "native";
  } catch { return "unknown"; }
  return "unknown";
}

export function prepareCharacterImport({ fileName, text, now, idFactory }) {
  const extension = extensionOf(fileName);
  const contentKind = parsedKind(text);
  if (extension === "cah" || contentKind === "cah") {
    const prepared = importCahCharacter(text, { now, idFactory });
    return { kind: "cah-character", sourceLabel: "5e Companion CAH", ...prepared };
  }
  if (extension && extension !== "json" && contentKind !== "native") throw new Error("Choose an Arcane Observatory JSON backup or a 5e Companion .cah character file.");
  return { kind: "native-backup", sourceLabel: "Arcane Observatory backup", state: importState(text), warnings: [] };
}
