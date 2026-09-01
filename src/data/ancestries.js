const option = (id, name, source = "Published") => ({ id, name, source });
const ancestry = (id, name, category, options = [], details = {}) => ({
  id, name, category, options, size: "Medium", speed: 30, source: "Published", ...details,
});

export const ANCESTRY_GROUPS = [
  {
    id: "common", label: "Common lineages", ancestries: [
      ancestry("dragonborn", "Dragonborn", "common", [option("standard", "Standard"), option("chromatic", "Chromatic"), option("gem", "Gem"), option("metallic", "Metallic"), option("draconblood", "Draconblood", "Setting-specific"), option("ravenite", "Ravenite", "Setting-specific")]),
      ancestry("dwarf", "Dwarf", "common", [option("hill", "Hill Dwarf"), option("mountain", "Mountain Dwarf"), option("duergar", "Duergar"), option("mark-warding", "Mark of Warding", "Eberron")], { speed: 25 }),
      ancestry("elf", "Elf", "common", [option("high", "High Elf"), option("wood", "Wood Elf"), option("drow", "Drow"), option("eladrin", "Eladrin"), option("sea", "Sea Elf"), option("shadar-kai", "Shadar-kai"), option("pallid", "Pallid Elf", "Setting-specific"), option("astral", "Astral Elf", "Spelljammer")]),
      ancestry("gnome", "Gnome", "common", [option("forest", "Forest Gnome"), option("rock", "Rock Gnome"), option("deep", "Deep Gnome"), option("mark-scribing", "Mark of Scribing", "Eberron")], { size: "Small", speed: 25 }),
      ancestry("half-elf", "Half-Elf", "common", [option("standard", "Standard"), option("aquatic", "Aquatic Heritage"), option("drow", "Drow Heritage"), option("high", "High Elf Heritage"), option("wood", "Wood Elf Heritage"), option("mark-detection", "Mark of Detection", "Eberron"), option("mark-storm", "Mark of Storm", "Eberron")]),
      ancestry("half-orc", "Half-Orc", "common"),
      ancestry("halfling", "Halfling", "common", [option("lightfoot", "Lightfoot"), option("stout", "Stout"), option("ghostwise", "Ghostwise"), option("lotusden", "Lotusden", "Setting-specific"), option("mark-healing", "Mark of Healing", "Eberron"), option("mark-hospitality", "Mark of Hospitality", "Eberron")], { size: "Small", speed: 25 }),
      ancestry("human", "Human", "common", [option("standard", "Standard"), option("variant", "Variant"), option("mark-finding", "Mark of Finding", "Eberron"), option("mark-handling", "Mark of Handling", "Eberron"), option("mark-making", "Mark of Making", "Eberron"), option("mark-passage", "Mark of Passage", "Eberron"), option("mark-sentinel", "Mark of Sentinel", "Eberron")]),
      ancestry("tiefling", "Tiefling", "common", [option("asmodeus", "Asmodeus"), option("baalzebul", "Baalzebul"), option("dispater", "Dispater"), option("fierna", "Fierna"), option("glasya", "Glasya"), option("levistus", "Levistus"), option("mammon", "Mammon"), option("mephistopheles", "Mephistopheles"), option("zariel", "Zariel"), option("feral", "Feral"), option("winged", "Winged"), option("devils-tongue", "Devil's Tongue")]),
    ],
  },
  {
    id: "exotic", label: "Exotic lineages", ancestries: [
      ancestry("aarakocra", "Aarakocra", "exotic"),
      ancestry("aasimar", "Aasimar", "exotic", [option("protector", "Protector", "Legacy"), option("scourge", "Scourge", "Legacy"), option("fallen", "Fallen", "Legacy"), option("multiverse", "Aasimar (Multiverse)")]),
      ancestry("changeling", "Changeling", "exotic"),
      ancestry("fairy", "Fairy", "exotic", [], { size: "Small" }),
      ancestry("firbolg", "Firbolg", "exotic"),
      ancestry("genasi", "Genasi", "exotic", [option("air", "Air Genasi"), option("earth", "Earth Genasi"), option("fire", "Fire Genasi"), option("water", "Water Genasi")]),
      ancestry("gith", "Gith", "exotic", [option("githyanki", "Githyanki"), option("githzerai", "Githzerai")]),
      ancestry("goliath", "Goliath", "exotic"),
      ancestry("harengon", "Harengon", "exotic", [], { size: "Small or Medium" }),
      ancestry("kenku", "Kenku", "exotic"),
      ancestry("locathah", "Locathah", "exotic"),
      ancestry("satyr", "Satyr", "exotic"),
      ancestry("tabaxi", "Tabaxi", "exotic"),
      ancestry("tortle", "Tortle", "exotic"),
      ancestry("triton", "Triton", "exotic"),
      ancestry("verdan", "Verdan", "exotic", [], { size: "Small, then Medium" }),
    ],
  },
  {
    id: "monstrous", label: "Monstrous lineages", ancestries: [
      ancestry("bugbear", "Bugbear", "monstrous"), ancestry("centaur", "Centaur", "monstrous"), ancestry("goblin", "Goblin", "monstrous", [], { size: "Small" }),
      ancestry("grung", "Grung", "monstrous", [], { size: "Small", speed: 25 }), ancestry("hobgoblin", "Hobgoblin", "monstrous"),
      ancestry("kobold", "Kobold", "monstrous", [option("legacy", "Legacy Kobold", "Legacy"), option("multiverse", "Kobold (Multiverse)")], { size: "Small" }),
      ancestry("lizardfolk", "Lizardfolk", "monstrous"), ancestry("minotaur", "Minotaur", "monstrous"), ancestry("orc", "Orc", "monstrous"),
      ancestry("shifter", "Shifter", "monstrous", [option("beasthide", "Beasthide"), option("longtooth", "Longtooth"), option("swiftstride", "Swiftstride"), option("wildhunt", "Wildhunt")]),
      ancestry("yuan-ti", "Yuan-ti", "monstrous", [option("pureblood", "Pureblood", "Legacy"), option("multiverse", "Yuan-ti (Multiverse)")]),
    ],
  },
  {
    id: "setting", label: "Setting-specific lineages", ancestries: [
      ancestry("warforged", "Warforged", "setting", [option("published", "Published (Eberron)", "Eberron"), option("envoy", "Envoy", "Legacy playtest"), option("juggernaut", "Juggernaut", "Legacy playtest"), option("skirmisher", "Skirmisher", "Legacy playtest")], { source: "Eberron", armorClassBonus: 1 }),
      ancestry("kalashtar", "Kalashtar", "setting", [], { source: "Eberron" }), ancestry("kender", "Kender", "setting", [], { source: "Dragonlance", size: "Small" }),
      ancestry("dhampir", "Dhampir", "setting", [], { source: "Ravenloft", size: "Small or Medium" }), ancestry("hexblood", "Hexblood", "setting", [], { source: "Ravenloft", size: "Small or Medium" }), ancestry("reborn", "Reborn", "setting", [], { source: "Ravenloft", size: "Small or Medium" }),
      ancestry("leonin", "Leonin", "setting", [], { source: "Theros" }), ancestry("loxodon", "Loxodon", "setting", [], { source: "Ravnica" }), ancestry("simic-hybrid", "Simic Hybrid", "setting", [], { source: "Ravnica" }), ancestry("vedalken", "Vedalken", "setting", [], { source: "Ravnica" }),
      ancestry("astral-elf", "Astral Elf", "setting", [], { source: "Spelljammer" }), ancestry("autognome", "Autognome", "setting", [], { source: "Spelljammer", size: "Small" }), ancestry("giff", "Giff", "setting", [], { source: "Spelljammer" }), ancestry("hadozee", "Hadozee", "setting", [], { source: "Spelljammer" }), ancestry("plasmoid", "Plasmoid", "setting", [], { source: "Spelljammer", size: "Small or Medium" }), ancestry("thri-kreen", "Thri-kreen", "setting", [], { source: "Spelljammer", size: "Small or Medium" }),
    ],
  },
  { id: "custom", label: "Custom", ancestries: [ancestry("custom-lineage", "Custom Lineage", "custom", [option("small", "Small"), option("medium", "Medium")], { size: "Small or Medium", source: "Optional rule" })] },
];

export const ANCESTRIES = ANCESTRY_GROUPS.flatMap((group) => group.ancestries);
export function findAncestry(id) { return ANCESTRIES.find((entry) => entry.id === id); }
export function ancestryDisplayName(ancestryId, optionId) {
  const entry = findAncestry(ancestryId);
  if (!entry) return "Unknown ancestry";
  const selected = entry.options.find((candidate) => candidate.id === optionId);
  return selected ? `${entry.name} — ${selected.name}` : entry.name;
}
