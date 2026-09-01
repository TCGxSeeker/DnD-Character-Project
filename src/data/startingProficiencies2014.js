const SIMPLE = ["Simple weapons"];
const MARTIAL = ["Martial weapons"];
const LIGHT = ["Light armor"];
const MEDIUM = ["Medium armor"];
const HEAVY = ["Heavy armor"];
const SHIELDS = ["Shields"];

export const STARTING_PROFICIENCIES_2014 = {
  artificer: { armor: [...LIGHT, ...MEDIUM, ...SHIELDS], weapons: SIMPLE, tools: ["Thieves' tools", "Tinker's tools"] },
  barbarian: { armor: [...LIGHT, ...MEDIUM, ...SHIELDS], weapons: [...SIMPLE, ...MARTIAL], tools: [] },
  bard: { armor: LIGHT, weapons: [...SIMPLE, "Hand crossbows", "Longswords", "Rapiers", "Shortswords"], tools: [] },
  cleric: { armor: [...LIGHT, ...MEDIUM, ...SHIELDS], weapons: SIMPLE, tools: [] },
  druid: { armor: [...LIGHT, ...MEDIUM, ...SHIELDS], weapons: ["Clubs", "Daggers", "Darts", "Javelins", "Maces", "Quarterstaffs", "Scimitars", "Sickles", "Slings", "Spears"], tools: ["Herbalism kit"] },
  fighter: { armor: [...LIGHT, ...MEDIUM, ...HEAVY, ...SHIELDS], weapons: [...SIMPLE, ...MARTIAL], tools: [] },
  monk: { armor: [], weapons: [...SIMPLE, "Shortswords"], tools: [] },
  paladin: { armor: [...LIGHT, ...MEDIUM, ...HEAVY, ...SHIELDS], weapons: [...SIMPLE, ...MARTIAL], tools: [] },
  ranger: { armor: [...LIGHT, ...MEDIUM, ...SHIELDS], weapons: [...SIMPLE, ...MARTIAL], tools: [] },
  rogue: { armor: LIGHT, weapons: [...SIMPLE, "Hand crossbows", "Longswords", "Rapiers", "Shortswords"], tools: ["Thieves' tools"] },
  sorcerer: { armor: [], weapons: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"], tools: [] },
  warlock: { armor: LIGHT, weapons: SIMPLE, tools: [] },
  wizard: { armor: [], weapons: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"], tools: [] },
};

const unique = (values = []) => [...new Set(values.filter(Boolean))];

export function startingProficiencies(classId, background = {}) {
  const grants = STARTING_PROFICIENCIES_2014[classId] || {};
  return {
    armor: unique(grants.armor),
    weapons: unique(grants.weapons),
    tools: unique([...(grants.tools || []), ...(background.tools || [])]),
  };
}
