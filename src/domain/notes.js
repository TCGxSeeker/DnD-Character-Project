export const NOTE_FIELDS = [
  ["personality", "Personality traits"],
  ["ideals", "Ideals"],
  ["bonds", "Bonds"],
  ["flaws", "Flaws"],
];

const countMatches = (text, needle) => {
  const normalized = String(text || "").toLocaleLowerCase();
  let from = 0;
  let count = 0;
  while ((from = normalized.indexOf(needle, from)) !== -1) {
    count += 1;
    from += Math.max(needle.length, 1);
  }
  return count;
};

export function saveSessionNote(character, { text, sessionDate }, now = new Date()) {
  const note = String(text || "").trim();
  if (!note) throw new Error("Write a session note before saving.");
  const date = String(sessionDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a valid session date.");
  const createdAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const entry = { id: `session-${createdAt.replace(/[^0-9]/g, "")}`, sessionDate: date, text: note, createdAt };
  return { ...character, notes: "", sessionEntries: [entry, ...(character.sessionEntries || [])] };
}

export function searchCharacterNotes(character, query) {
  const needle = String(query || "").trim().toLocaleLowerCase();
  if (!needle) return [];
  const draftCount = countMatches(character.notes, needle);
  const sessionCount = (character.sessionEntries || []).reduce((sum, entry) => sum + countMatches(entry.text, needle), 0);
  return [
    ...(draftCount ? [{ field: "notes", label: "Session draft", count: draftCount }] : []),
    ...(sessionCount ? [{ field: "sessionEntries", label: "Saved sessions", count: sessionCount }] : []),
    ...NOTE_FIELDS.flatMap(([field, label]) => { const count = countMatches(character[field], needle); return count ? [{ field, label, count }] : []; }),
  ];
}
