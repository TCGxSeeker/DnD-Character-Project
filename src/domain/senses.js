import { applyNumericEffects, collectCharacterEffects } from "./effects.js";

export function baseDarkvisionRange(character) {
  const stored = Number.isFinite(Number(character.senses?.darkvision)) ? Math.max(0, Number(character.senses.darkvision)) : 0;
  return stored;
}

export function darkvisionRange(character) {
  return applyNumericEffects(baseDarkvisionRange(character), "sense.darkvision", collectCharacterEffects(character)).value;
}

export function characterLanguages(character) {
  const languages = Array.isArray(character.languages) && character.languages.length ? character.languages : ["Common"];
  return [...new Set(languages.map((entry) => String(entry).trim()).filter(Boolean))];
}
