import { getCharacterSpells } from "./grantedContent.js";

function slug(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"); }

export function companionSpellKey(spell) {
  const value = slug(spell.canonicalId || spell.id || spell.name);
  return ["find-familiar", "find-steed"].find((key) => value.includes(key)) || "";
}

export function availableCompanionSpellRecords(character) {
  return getCharacterSpells(character).filter((spell) => companionSpellKey(spell)).map((spell) => ({ spell, key: companionSpellKey(spell) }));
}
