import { abilityModifier } from "./rules.js";

const resource = (id, name, max, reset, detail = "") => ({ id, name, current: max, max, reset, detail, granted: true });
const classLevel = (classLevels, classId) => Number(classLevels.find((entry) => entry.classId === classId)?.level || 0);

function rageUses(level) {
  if (level >= 20) return null;
  if (level >= 17) return 6;
  if (level >= 12) return 5;
  if (level >= 6) return 4;
  if (level >= 3) return 3;
  return 2;
}

export function pactMagicForClassLevels(classLevels = []) {
  const level = classLevel(classLevels, "warlock");
  if (!level) return null;
  const max = level >= 17 ? 4 : level >= 11 ? 3 : level >= 2 ? 2 : 1;
  const slotLevel = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1;
  return { level: slotLevel, current: max, max, reset: "Short rest" };
}

export function syncPactMagic(existing, classLevels = []) {
  const derived = pactMagicForClassLevels(classLevels);
  if (!derived) return null;
  if (!existing) return derived;
  const spent = Math.max(0, Number(existing.max || 0) - Number(existing.current || 0));
  return { ...derived, current: Math.max(0, derived.max - spent) };
}

export function grantedClassResources(classLevels = [], abilities = {}) {
  const result = [];
  const barbarian = classLevel(classLevels, "barbarian");
  if (barbarian) {
    const uses = rageUses(barbarian);
    if (uses) result.push(resource("rage", "Rage", uses, "Long rest", `Rage damage +${barbarian >= 16 ? 4 : barbarian >= 9 ? 3 : 2}`));
  }
  const bard = classLevel(classLevels, "bard");
  if (bard) result.push(resource("bardic-inspiration", "Bardic Inspiration", Math.max(1, abilityModifier(abilities.charisma)), bard >= 5 ? "Short rest" : "Long rest", `d${bard >= 15 ? 12 : bard >= 10 ? 10 : bard >= 5 ? 8 : 6}`));
  const cleric = classLevel(classLevels, "cleric");
  const paladin = classLevel(classLevels, "paladin");
  const channelDivinityUses = cleric >= 18 ? 3 : cleric >= 6 ? 2 : (cleric >= 2 || paladin >= 3) ? 1 : 0;
  if (channelDivinityUses) result.push(resource("channel-divinity", "Channel Divinity", channelDivinityUses, "Short rest", "Use any Channel Divinity option granted by your classes"));
  const druid = classLevel(classLevels, "druid");
  if (druid >= 2 && druid < 20) result.push(resource("wild-shape", "Wild Shape", 2, "Short rest"));
  const druidEntry = classLevels.find((entry) => entry.classId === "druid");
  if (druid >= 2 && (druidEntry?.subclassId === "circle-of-the-land" || String(druidEntry?.subclass || "").toLowerCase() === "circle of the land")) result.push(resource("natural-recovery", "Natural Recovery", 1, "Long rest", `Recover up to ${Math.ceil(druid / 2)} combined spell-slot levels on a short rest`));
  const fighter = classLevel(classLevels, "fighter");
  if (fighter) result.push(resource("second-wind", "Second Wind", 1, "Short rest"));
  if (fighter >= 2) result.push(resource("action-surge", "Action Surge", fighter >= 17 ? 2 : 1, "Short rest"));
  if (fighter >= 9) result.push(resource("indomitable", "Indomitable", fighter >= 17 ? 3 : fighter >= 13 ? 2 : 1, "Long rest"));
  const monk = classLevel(classLevels, "monk");
  if (monk >= 2) result.push(resource("ki", "Ki", monk, "Short rest"));
  if (paladin) result.push(resource("lay-on-hands", "Lay on Hands", paladin * 5, "Long rest", "Hit point pool"));
  const sorcerer = classLevel(classLevels, "sorcerer");
  if (sorcerer >= 2) result.push(resource("sorcery-points", "Sorcery Points", sorcerer, "Long rest"));
  const wizard = classLevel(classLevels, "wizard");
  if (wizard) result.push(resource("arcane-recovery", "Arcane Recovery", 1, "Long rest", `Recover up to ${Math.ceil(wizard / 2)} combined spell-slot levels on a short rest`));
  return result;
}

export function syncGrantedClassResources(existing = [], classLevels = [], abilities = {}) {
  const derived = grantedClassResources(classLevels, abilities);
  const derivedIds = new Set(derived.map((entry) => entry.id));
  const manual = existing.filter((entry) => !entry.granted && !derivedIds.has(entry.id));
  return [...derived.map((entry) => {
    const prior = existing.find((candidate) => candidate.id === entry.id);
    if (!prior) return entry;
    const spent = Math.max(0, Number(prior.max || 0) - Number(prior.current || 0));
    return { ...entry, current: Math.max(0, entry.max - spent) };
  }), ...manual];
}
