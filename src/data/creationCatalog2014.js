import { SRD_WEAPONS_2014, weaponEquipmentByName } from "../domain/weapons.js";

const fixed = (adjustments) => ({ fixedAdjustments: adjustments });

const ANCESTRY_DETAILS = {
  dragonborn: { summary: "Draconic humanoids with an elemental breath weapon and matching damage resistance.", traits: ["Draconic Ancestry", "Breath Weapon", "Damage Resistance"], ...fixed({ strength: 2, charisma: 1 }) },
  dwarf: { summary: "Stout folk with poison resilience, darkvision, and extensive weapon and artisan training.", traits: ["Darkvision", "Dwarven Resilience", "Dwarven Combat Training", "Stonecunning"], access: ["Battleaxe, handaxe, light hammer, and warhammer training", "One smith's, brewer's, or mason's tool"] , ...fixed({ constitution: 2 }) },
  elf: { summary: "Keen-sensed, long-lived folk with trance, charm resistance, and inherited magic or training.", traits: ["Darkvision", "Keen Senses", "Fey Ancestry", "Trance"], ...fixed({ dexterity: 2 }) },
  gnome: { summary: "Small, inventive folk with darkvision and exceptional mental defenses against magic.", traits: ["Darkvision", "Gnome Cunning"], ...fixed({ intelligence: 2 }) },
  "half-elf": { summary: "Versatile people combining elven senses and resilience with human adaptability.", traits: ["Darkvision", "Fey Ancestry", "Skill Versatility"], ...fixed({ charisma: 2 }), flexible: "+1 to two different abilities other than Charisma" },
  "half-orc": { summary: "Powerful survivors with darkvision, intimidating presence, and relentless endurance.", traits: ["Darkvision", "Menacing", "Relentless Endurance", "Savage Attacks"], ...fixed({ strength: 2, constitution: 1 }) },
  halfling: { summary: "Small, nimble folk whose luck, bravery, and agility carry them through danger.", traits: ["Lucky", "Brave", "Halfling Nimbleness"], ...fixed({ dexterity: 2 }) },
  human: { summary: "Adaptable and ambitious people whose rules vary between the standard and variant options.", traits: ["Extra language"], fixedAdjustments: {} },
  tiefling: { summary: "Fiend-touched people with darkvision, fire resistance, and an infernal magical legacy.", traits: ["Darkvision", "Hellish Resistance", "Infernal Legacy"], ...fixed({ charisma: 2 }) },
  aasimar: { summary: "Celestial-touched people with darkvision, radiant and necrotic resistance, healing, and inherited light.", traits: ["Darkvision", "Celestial Resistance", "Healing Hands", "Light Bearer"], access: ["Light cantrip"], ...fixed({ charisma: 2 }) },
  genasi: { summary: "Element-touched people whose inherited air, earth, fire, or water affinity shapes their magic and defenses.", traits: [], ...fixed({ constitution: 2 }) },
  gith: { summary: "Psionic people divided between martial astral travelers and disciplined monastic communities.", traits: [], ...fixed({ intelligence: 1 }) },
  kobold: { summary: "Small draconic folk whose published variants emphasize either coordinated tactics or an adaptable draconic legacy.", traits: ["Darkvision"], fixedAdjustments: {} },
  shifter: { summary: "People with a bestial heritage who can briefly shift into a heightened physical form.", traits: ["Darkvision", "Shifting"], ...fixed({ dexterity: 1 }) },
  "yuan-ti": { summary: "Serpentine folk with innate magic and unusual resistance to poison and hostile spells.", traits: ["Darkvision"], fixedAdjustments: {} },
  warforged: { summary: "Living constructs built for war, with resilient bodies and integrated protection.", traits: ["Constructed Resilience", "Sentry's Rest", "Integrated Protection", "Specialized Design"], access: ["One skill proficiency", "One tool proficiency"], fixedAdjustments: {} },
  "custom-lineage": { summary: "An optional framework for a player-defined lineage, size, appearance, and inherited talent.", traits: ["Variable Trait", "One feat", "Common plus one language"], fixedAdjustments: {}, flexible: "+2 to one ability" },
};

const OPTION_DETAILS = {
  "dragonborn:standard": { summary: "The original dragonborn uses a draconic damage type for its breath weapon and resistance.", traits: [] },
  "dragonborn:chromatic": { summary: "Fizban's chromatic dragonborn has a line breath weapon, matching resistance, and later elemental warding.", traits: ["Chromatic Ancestry", "Breath Weapon", "Draconic Resistance", "Chromatic Warding"], flexible: "+2 to one ability and +1 to another, or +1 to three different abilities", fixedAdjustments: {}, replaceBaseTraits: true, replaceBaseAdjustments: true },
  "dragonborn:metallic": { summary: "Fizban's metallic dragonborn has a cone breath weapon, matching resistance, and a later control breath.", traits: ["Metallic Ancestry", "Breath Weapon", "Draconic Resistance", "Metallic Breath Weapon"], flexible: "+2 to one ability and +1 to another, or +1 to three different abilities", fixedAdjustments: {}, replaceBaseTraits: true, replaceBaseAdjustments: true },
  "dragonborn:gem": { summary: "Fizban's gem dragonborn combines an unusual damage ancestry with telepathy and later spectral flight.", traits: ["Gem Ancestry", "Breath Weapon", "Draconic Resistance", "Psionic Mind", "Gem Flight"], flexible: "+2 to one ability and +1 to another, or +1 to three different abilities", fixedAdjustments: {}, replaceBaseTraits: true, replaceBaseAdjustments: true },
  "dragonborn:draconblood": { summary: "Draconblood replaces the original score increase and resistance with intellect, darkvision, and social force.", traits: ["Draconic Ancestry", "Breath Weapon", "Darkvision", "Forceful Presence"], ...fixed({ intelligence: 2, charisma: 1 }), replaceBaseTraits: true, replaceBaseAdjustments: true },
  "dragonborn:ravenite": { summary: "Ravenite replaces the original score increase and resistance with hardiness, darkvision, and a retaliatory attack.", traits: ["Draconic Ancestry", "Breath Weapon", "Darkvision", "Vengeful Assault"], ...fixed({ strength: 2, constitution: 1 }), replaceBaseTraits: true, replaceBaseAdjustments: true },
  "dwarf:hill": { summary: "Hill dwarves add keen intuition and exceptional toughness.", traits: ["Dwarven Toughness"], ...fixed({ wisdom: 1 }) },
  "dwarf:mountain": { summary: "Mountain dwarves add physical power and armor training.", traits: ["Dwarven Armor Training"], access: ["Light and medium armor training"], ...fixed({ strength: 2 }) },
  "dwarf:duergar": { summary: "Legacy duergar add superior darkvision, psionic resilience, and innate enlargement and invisibility magic.", traits: ["Superior Darkvision", "Duergar Resilience", "Duergar Magic", "Sunlight Sensitivity"], ...fixed({ strength: 1 }) },
  "dwarf:mark-warding": { summary: "The Mark of Warding adds intellect, security intuition, warding magic, and an expanded spell list.", traits: ["Warder's Intuition", "Wards and Seals", "Spells of the Mark"], access: ["Alarm, Mage Armor, and later Arcane Lock"], ...fixed({ intelligence: 1 }) },
  "elf:high": { summary: "High elves add formal weapon training and a wizard cantrip.", traits: ["Elf Weapon Training", "One wizard cantrip", "Extra language"], ...fixed({ intelligence: 1 }) },
  "elf:wood": { summary: "Wood elves are swift, perceptive, and adept at disappearing in natural cover.", traits: ["Elf Weapon Training", "Fleet of Foot", "Mask of the Wild"], ...fixed({ wisdom: 1 }) },
  "elf:drow": { summary: "Drow add superior darkvision, innate magic, and sunlight sensitivity.", traits: ["Superior Darkvision", "Sunlight Sensitivity", "Drow Magic", "Drow Weapon Training"], ...fixed({ charisma: 1 }) },
  "elf:eladrin": { summary: "Eladrin add a seasonal, short-range teleport and a charismatic fey presence.", traits: ["Fey Step"], ...fixed({ charisma: 1 }) },
  "elf:sea": { summary: "Sea elves add aquatic training, a swimming speed, and communication with water-breathing beasts.", traits: ["Sea Elf Training", "Child of the Sea", "Friend of the Sea"], access: ["30-foot swimming speed", "Aquan language"], ...fixed({ constitution: 1 }) },
  "elf:shadar-kai": { summary: "Shadar-kai add necrotic resilience and a shadowy teleport that later grants brief damage resistance.", traits: ["Necrotic Resistance", "Blessing of the Raven Queen"], ...fixed({ constitution: 1 }) },
  "elf:pallid": { summary: "Pallid elves add insight, investigation aptitude, and moon-themed innate magic.", traits: ["Incisive Sense", "Blessing of the Moonweaver"], access: ["Light, then Sleep and self-only Invisibility"], ...fixed({ wisdom: 1 }) },
  "elf:astral": { summary: "Astral elf is a flexible-origin elf with a chosen cantrip, teleportation, and adaptable trance training.", traits: ["Astral Fire", "Darkvision", "Fey Ancestry", "Keen Senses", "Starlight Step", "Astral Trance"], access: ["One Astral Fire cantrip", "One temporary skill and weapon or tool proficiency after each trance"], flexible: "+2 to one ability and +1 to another, or +1 to three different abilities", fixedAdjustments: {}, replaceBaseTraits: true, replaceBaseAdjustments: true },
  "gnome:forest": { summary: "Forest gnomes add natural illusion magic and communication with small beasts.", traits: ["Natural Illusionist", "Speak with Small Beasts"], ...fixed({ dexterity: 1 }) },
  "gnome:rock": { summary: "Rock gnomes add resilience, technical lore, and small clockwork inventions.", traits: ["Artificer's Lore", "Tinker"], access: ["Tinker's tools"], ...fixed({ constitution: 1 }) },
  "gnome:deep": { summary: "Legacy deep gnomes add superior darkvision and an exceptional ability to hide among stone.", traits: ["Superior Darkvision", "Stone Camouflage"], ...fixed({ dexterity: 1 }) },
  "gnome:mark-scribing": { summary: "The Mark of Scribing adds charisma, linguistic intuition, message magic, and an expanded spell list.", traits: ["Gifted Scribe", "Scribe's Insight", "Whispering Wind", "Spells of the Mark"], access: ["Message cantrip"], ...fixed({ charisma: 1 }) },
  "halfling:lightfoot": { summary: "Lightfoots are naturally sociable and can hide behind larger creatures.", traits: ["Naturally Stealthy"], ...fixed({ charisma: 1 }) },
  "halfling:stout": { summary: "Stouts gain unusual resistance to poison.", traits: ["Stout Resilience"], ...fixed({ constitution: 1 }) },
  "halfling:ghostwise": { summary: "Ghostwise halflings add wisdom and short-range telepathic speech.", traits: ["Silent Speech"], ...fixed({ wisdom: 1 }) },
  "halfling:lotusden": { summary: "Lotusden halflings add wisdom, plant-focused innate magic, and easy movement through natural growth.", traits: ["Children of the Woods", "Timberwalk"], access: ["Druidcraft, then Entangle and Spike Growth"], ...fixed({ wisdom: 1 }) },
  "halfling:mark-healing": { summary: "The Mark of Healing adds wisdom, medical intuition, healing magic, and an expanded spell list.", traits: ["Medical Intuition", "Healing Touch", "Spells of the Mark"], access: ["Cure Wounds and later Lesser Restoration"], ...fixed({ wisdom: 1 }) },
  "halfling:mark-hospitality": { summary: "The Mark of Hospitality adds charisma, hosting intuition, household magic, and an expanded spell list.", traits: ["Ever Hospitable", "Innkeeper's Magic", "Spells of the Mark"], access: ["Prestidigitation, Purify Food and Drink, and Unseen Servant"], ...fixed({ charisma: 1 }) },
  "half-elf:standard": { summary: "Standard half-elf versatility grants two chosen skill proficiencies.", traits: ["Skill Versatility"], access: ["Two skill proficiencies"], fixedAdjustments: {} },
  "half-elf:aquatic": { summary: "Aquatic heritage trades skill versatility for a swimming speed.", traits: ["Swim Speed"], access: ["30-foot swimming speed"], fixedAdjustments: {} },
  "half-elf:drow": { summary: "Drow heritage trades skill versatility for innate drow magic.", traits: ["Drow Magic"], access: ["Dancing Lights, then Faerie Fire and Darkness"], fixedAdjustments: {} },
  "half-elf:high": { summary: "High elf heritage trades skill versatility for weapon training or a wizard cantrip.", traits: ["High Elf Heritage"], access: ["Choose Elf Weapon Training or one wizard cantrip"], fixedAdjustments: {} },
  "half-elf:wood": { summary: "Wood elf heritage trades skill versatility for weapon training, speed, or natural concealment.", traits: ["Wood Elf Heritage"], access: ["Choose Elf Weapon Training, Fleet of Foot, or Mask of the Wild"], fixedAdjustments: {} },
  "half-elf:mark-detection": { summary: "The Mark of Detection replaces half-elf score and versatility choices with wisdom, deduction, and detection magic.", traits: ["Deductive Intuition", "Magical Detection", "Spells of the Mark"], ...fixed({ wisdom: 2 }), flexible: "+1 to one other ability", replaceBaseTraits: true, preserveBaseTraits: ["Darkvision", "Fey Ancestry"], replaceBaseAdjustments: true },
  "half-elf:mark-storm": { summary: "The Mark of Storm replaces half-elf score and versatility choices with agility, lightning resistance, and wind magic.", traits: ["Windwright's Intuition", "Storm's Boon", "Headwinds", "Spells of the Mark"], ...fixed({ charisma: 2, dexterity: 1 }), replaceBaseTraits: true, preserveBaseTraits: ["Darkvision", "Fey Ancestry"], replaceBaseAdjustments: true },
  "human:standard": { summary: "The standard human increases every ability score by 1.", traits: ["Extra language"], ...fixed({ strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 }) },
  "human:variant": { summary: "The optional variant human trades broad increases for focused talents.", traits: ["One skill proficiency", "One feat", "Extra language"], flexible: "+1 to two different abilities", fixedAdjustments: {} },
  "human:mark-finding": { summary: "The Mark of Finding sharpens perception, tracking, and divination magic.", traits: ["Darkvision", "Hunter's Intuition", "Finder's Magic", "Spells of the Mark"], access: ["Common and Goblin"], ...fixed({ wisdom: 2, constitution: 1 }), replaceHumanTraits: true },
  "human:mark-handling": { summary: "The Mark of Handling grants uncanny rapport with beasts and natural creatures.", traits: ["Wild Intuition", "Primal Connection", "The Bigger They Are", "Spells of the Mark"], ...fixed({ wisdom: 2 }), flexible: "+1 to one other ability", replaceHumanTraits: true },
  "human:mark-making": { summary: "The Mark of Making enhances craft, repair, and item-focused magic.", traits: ["Artisan's Intuition", "Artisan's Gift", "Spellsmith", "Spells of the Mark"], access: ["One artisan's tool proficiency", "Mending cantrip"], ...fixed({ intelligence: 2 }), flexible: "+1 to one other ability", replaceHumanTraits: true },
  "human:mark-passage": { summary: "The Mark of Passage grants exceptional speed and transportation magic.", traits: ["Courier's Speed", "Intuitive Motion", "Magical Passage", "Spells of the Mark"], ...fixed({ dexterity: 2 }), flexible: "+1 to one other ability", speedOverride: 35, replaceHumanTraits: true },
  "human:mark-sentinel": { summary: "The Mark of Sentinel protects allies through intuition, warding magic, and vigilant reactions.", traits: ["Sentinel's Intuition", "Guardian's Shield", "Vigilant Guardian", "Spells of the Mark"], access: ["Shield once per long rest; Wisdom is the spellcasting ability", "Insight and Perception checks gain the mark's intuition die"], ...fixed({ constitution: 2, wisdom: 1 }), replaceHumanTraits: true },
  "tiefling:asmodeus": { summary: "The classic infernal legacy emphasizes intellect and fire-based magic.", traits: ["Thaumaturgy", "Hellish Rebuke", "Darkness"], ...fixed({ intelligence: 1 }) },
  "tiefling:baalzebul": { summary: "Baalzebul's bloodline adds intellect and corrupting magic.", traits: ["Legacy of Maladomini"], ...fixed({ intelligence: 1 }) },
  "tiefling:dispater": { summary: "Dispater's bloodline adds dexterity and infiltration magic.", traits: ["Legacy of Dis"], ...fixed({ dexterity: 1 }) },
  "tiefling:fierna": { summary: "Fierna's bloodline adds wisdom and influence magic.", traits: ["Legacy of Phlegethos"], ...fixed({ wisdom: 1 }) },
  "tiefling:glasya": { summary: "Glasya's bloodline adds dexterity and illusion magic.", traits: ["Legacy of Malbolge"], ...fixed({ dexterity: 1 }) },
  "tiefling:levistus": { summary: "Levistus's bloodline adds constitution and cold defensive magic.", traits: ["Legacy of Stygia"], ...fixed({ constitution: 1 }) },
  "tiefling:mammon": { summary: "Mammon's bloodline adds intellect and utility magic.", traits: ["Legacy of Minauros"], ...fixed({ intelligence: 1 }) },
  "tiefling:mephistopheles": { summary: "Mephistopheles's bloodline adds intellect and fire magic.", traits: ["Legacy of Cania"], ...fixed({ intelligence: 1 }) },
  "tiefling:zariel": { summary: "Zariel's bloodline adds strength and smite magic.", traits: ["Legacy of Avernus"], ...fixed({ strength: 1 }) },
  "tiefling:feral": { summary: "Feral tiefling replaces the standard score increase with dexterity and intellect.", traits: ["Infernal Legacy"], ...fixed({ dexterity: 2, intelligence: 1 }), replaceBaseAdjustments: true },
  "tiefling:winged": { summary: "Winged tiefling replaces Infernal Legacy with flight while not wearing heavy armor.", traits: ["Winged: 30-foot flying speed without heavy armor"], ...fixed({ intelligence: 1 }), replaceBaseTraits: true, preserveBaseTraits: ["Darkvision", "Hellish Resistance"] },
  "tiefling:devils-tongue": { summary: "Devil's Tongue replaces Infernal Legacy with enchantment-focused innate magic.", traits: ["Devil's Tongue"], ...fixed({ intelligence: 1 }), replaceBaseTraits: true, preserveBaseTraits: ["Darkvision", "Hellish Resistance"] },
  "aasimar:protector": { summary: "Legacy protector aasimar adds wisdom and a radiant winged transformation at 3rd level.", traits: ["Radiant Soul"], ...fixed({ wisdom: 1 }) },
  "aasimar:scourge": { summary: "Legacy scourge aasimar adds constitution and a radiant consumption transformation at 3rd level.", traits: ["Radiant Consumption"], ...fixed({ constitution: 1 }) },
  "aasimar:fallen": { summary: "Legacy fallen aasimar adds strength and a frightening necrotic transformation at 3rd level.", traits: ["Necrotic Shroud"], ...fixed({ strength: 1 }) },
  "aasimar:multiverse": { summary: "The Multiverse aasimar is a flexible-origin lineage that chooses a celestial revelation at 3rd level.", traits: ["Darkvision", "Celestial Resistance", "Healing Hands", "Light Bearer", "Celestial Revelation"], access: ["Light cantrip"], flexible: "+2 to one ability and +1 to another, or +1 to three different abilities", fixedAdjustments: {}, replaceBaseTraits: true, replaceBaseAdjustments: true },
  "genasi:air": { summary: "Legacy air genasi add agility, unending breath, and innate levitation.", traits: ["Unending Breath", "Mingle with the Wind"], access: ["Levitate once per long rest"], ...fixed({ dexterity: 1 }) },
  "genasi:earth": { summary: "Legacy earth genasi add strength, sure movement over difficult ground, and innate concealment magic.", traits: ["Earth Walk", "Merge with Stone"], access: ["Pass without Trace once per long rest"], ...fixed({ strength: 1 }) },
  "genasi:fire": { summary: "Legacy fire genasi add intellect, darkvision, fire resistance, and flame-focused innate magic.", traits: ["Darkvision", "Fire Resistance", "Reach to the Blaze"], access: ["Produce Flame, then Burning Hands"], ...fixed({ intelligence: 1 }) },
  "genasi:water": { summary: "Legacy water genasi add wisdom, acid resistance, amphibious movement, and water-shaping magic.", traits: ["Acid Resistance", "Amphibious", "Swim", "Call to the Wave"], access: ["30-foot swimming speed", "Shape Water, then Create or Destroy Water"], ...fixed({ wisdom: 1 }) },
  "gith:githyanki": { summary: "Legacy githyanki add physical power, martial training, flexible lore, and movement-focused psionics.", traits: ["Decadent Mastery", "Martial Prodigy", "Githyanki Psionics"], access: ["Light and medium armor training", "Shortsword, longsword, and greatsword training"], ...fixed({ strength: 2 }) },
  "gith:githzerai": { summary: "Legacy githzerai add wisdom, mental discipline, and defensive psionics.", traits: ["Mental Discipline", "Githzerai Psionics"], ...fixed({ wisdom: 2 }) },
  "kobold:legacy": { summary: "Legacy kobolds rely on group tactics and distracting pleas but struggle in direct sunlight.", traits: ["Grovel, Cower, and Beg", "Pack Tactics", "Sunlight Sensitivity"], ...fixed({ dexterity: 2, strength: -2 }) },
  "kobold:multiverse": { summary: "The Multiverse kobold combines a flexible origin with a rallying draconic cry and one chosen legacy.", traits: ["Draconic Cry", "Kobold Legacy"], flexible: "+2 to one ability and +1 to another, or +1 to three different abilities", fixedAdjustments: {}, replaceBaseAdjustments: true },
  "shifter:beasthide": { summary: "Beasthide shifters add hardiness and become more durable while shifted.", traits: ["Shifting Feature: temporary durability and +1 AC"], ...fixed({ constitution: 2 }) },
  "shifter:longtooth": { summary: "Longtooth shifters add strength and can make a fanged unarmed strike while shifted.", traits: ["Shifting Feature: fanged strike"], ...fixed({ strength: 2 }) },
  "shifter:swiftstride": { summary: "Swiftstride shifters add agility, move faster while shifted, and can slip away when an enemy closes in.", traits: ["Shifting Feature: swift stride"], ...fixed({ dexterity: 2 }) },
  "shifter:wildhunt": { summary: "Wildhunt shifters add wisdom and become exceptionally alert while shifted.", traits: ["Shifting Feature: heightened awareness"], ...fixed({ wisdom: 2 }) },
  "yuan-ti:pureblood": { summary: "Legacy yuan-ti purebloods add charisma and intellect with poison immunity, innate magic, and broad magical resistance.", traits: ["Innate Spellcasting", "Magic Resistance", "Poison Immunity"], ...fixed({ charisma: 2, intelligence: 1 }) },
  "yuan-ti:multiverse": { summary: "The Multiverse yuan-ti uses flexible abilities with poison resilience, innate serpentine magic, and spell resistance.", traits: ["Magic Resistance", "Poison Resilience", "Serpentine Spellcasting"], flexible: "+2 to one ability and +1 to another, or +1 to three different abilities", fixedAdjustments: {}, replaceBaseAdjustments: true },
  "warforged:published": { summary: "The published Eberron warforged gains durable construction and a configurable specialty.", traits: ["Integrated Protection grants +1 AC", "Specialized Design"], access: ["One skill proficiency", "One tool proficiency"], ...fixed({ constitution: 2 }), flexible: "+1 to one other ability" },
  "warforged:envoy": { summary: "Legacy playtest envoy built for a specialized task, with an integrated tool.", traits: ["Specialized Design", "Integrated Tool"], access: ["One tool integrated into the body"], ...fixed({ constitution: 1 }), flexible: "+1 to two different abilities" },
  "warforged:juggernaut": { summary: "Legacy playtest warforged built for power and heavy labor.", traits: ["Powerful Build", "Iron Fists"], ...fixed({ constitution: 1, strength: 2 }) },
  "warforged:skirmisher": { summary: "Legacy playtest warforged built for speed and stealth.", traits: ["Swift", "Light Step"], ...fixed({ constitution: 1, dexterity: 2 }) },
  "custom-lineage:small": { summary: "A Small custom lineage using the same optional feature framework.", traits: [], fixedAdjustments: {} },
  "custom-lineage:medium": { summary: "A Medium custom lineage using the same optional feature framework.", traits: [], fixedAdjustments: {} },
};

export function ancestryCreationDetails(ancestry, option) {
  const base = ANCESTRY_DETAILS[ancestry.id] || {
    summary: `${ancestry.name} is available from ${option?.source || ancestry.source}; confirm source-specific traits with your table.`,
    traits: ["Source-specific ancestry traits require manual confirmation"], fixedAdjustments: {},
  };
  const selected = OPTION_DETAILS[`${ancestry.id}:${option?.id}`] || (option ? {
    summary: `${option.name} is cataloged, but its source-specific score adjustments are not automated yet.`,
    traits: ["Confirm this option's complete traits in its source"], fixedAdjustments: {},
  } : {});
  const replacesTraits = selected.replaceBaseTraits || selected.replaceHumanTraits;
  const replacesAdjustments = selected.replaceBaseAdjustments || selected.replaceHumanTraits;
  const fixedAdjustments = { ...(replacesAdjustments ? {} : base.fixedAdjustments || {}) };
  Object.entries(selected.fixedAdjustments || {}).forEach(([ability, amount]) => { fixedAdjustments[ability] = (fixedAdjustments[ability] || 0) + amount; });
  const baseTraits = replacesTraits ? (selected.preserveBaseTraits || []) : base.traits || [];
  const baseAccess = replacesTraits ? [] : base.access || [];
  return { ...base, optionSummary: selected.summary, traits: [...new Set([...baseTraits, ...(selected.traits || [])])], access: [...new Set([...baseAccess, ...(selected.access || [])])], fixedAdjustments, flexible: selected.flexible || (replacesAdjustments ? "" : base.flexible) || "", speed: selected.speedOverride || ancestry.speed };
}

const AMMUNITION = { arrows: { ammunitionType: "arrow", weight: 0.05 }, bolts: { ammunitionType: "bolt", weight: 0.075 } };
const item = (id, name, quantity = 1, detail = "Starting equipment", extra = {}) => {
  const weapon = weaponEquipmentByName(name);
  const ammunition = AMMUNITION[id];
  return { id: `starting-${id}`, name, quantity, equipped: false, detail, ...(weapon ? { equipment: weapon, weight: weapon.weight } : {}), ...(ammunition ? { equipment: { kind: "ammunition", ammunitionType: ammunition.ammunitionType }, weight: ammunition.weight } : {}), ...extra };
};
const armor = (id, name, acBase, addDexterity, dexterityCap = null) => item(id, name, 1, `Starting armor · AC ${acBase}${addDexterity ? " + Dexterity" : ""}${dexterityCap == null ? "" : ` (max ${dexterityCap})`}`, { equipment: { kind: "armor", acBase, addDexterity, dexterityCap, acBonus: 0 } });
const shield = item("shield", "Shield", 1, "Starting shield · +2 AC", { equipment: { kind: "shield", acBonus: 2 } });

export const CLASS_CREATION_DETAILS = {
  artificer: { summary: "A prepared Intelligence caster and magical inventor.", primary: "Intelligence", saves: "Constitution, Intelligence", package: [armor("scale-mail", "Scale Mail", 14, true, 2), item("simple-weapon", "Simple weapon", 2), item("light-crossbow", "Light crossbow"), item("bolts", "Crossbow bolts", 20), item("thieves-tools", "Thieves' tools"), item("dungeoneers-pack", "Dungeoneer's pack")] },
  barbarian: { summary: "A durable martial combatant powered by rage.", primary: "Strength", saves: "Strength, Constitution", package: [item("greataxe", "Greataxe"), item("handaxe", "Handaxe", 2), item("explorers-pack", "Explorer's pack"), item("javelin", "Javelin", 4)] },
  bard: { summary: "A versatile Charisma caster, performer, and skill expert.", primary: "Charisma", saves: "Dexterity, Charisma", package: [armor("leather", "Leather Armor", 11, true), item("rapier", "Rapier"), item("entertainers-pack", "Entertainer's pack"), item("lute", "Lute")] },
  cleric: { summary: "A prepared Wisdom caster empowered by a divine domain.", primary: "Wisdom", saves: "Wisdom, Charisma", package: [armor("scale-mail", "Scale Mail", 14, true, 2), shield, item("mace", "Mace"), item("priests-pack", "Priest's pack"), item("holy-symbol", "Holy symbol")] },
  druid: { summary: "A prepared Wisdom caster tied to nature and wild shape.", primary: "Wisdom", saves: "Intelligence, Wisdom", package: [armor("leather", "Leather Armor", 11, true), shield, item("scimitar", "Scimitar"), item("explorers-pack", "Explorer's pack"), item("druidic-focus", "Druidic focus")] },
  fighter: { summary: "A flexible martial specialist with broad equipment training.", primary: "Strength or Dexterity", saves: "Strength, Constitution", package: [armor("chain-mail", "Chain Mail", 16, false), shield, item("martial-weapon", "Martial weapon"), item("light-crossbow", "Light crossbow"), item("bolts", "Crossbow bolts", 20), item("dungeoneers-pack", "Dungeoneer's pack")] },
  monk: { summary: "A mobile martial artist using Dexterity, Wisdom, and ki.", primary: "Dexterity and Wisdom", saves: "Strength, Dexterity", package: [item("shortsword", "Shortsword"), item("dungeoneers-pack", "Dungeoneer's pack"), item("dart", "Dart", 10)] },
  paladin: { summary: "A heavily armed divine champion using Strength and Charisma.", primary: "Strength and Charisma", saves: "Wisdom, Charisma", package: [armor("chain-mail", "Chain Mail", 16, false), shield, item("martial-weapon", "Martial weapon"), item("javelin", "Javelin", 5), item("priests-pack", "Priest's pack"), item("holy-symbol", "Holy symbol")] },
  ranger: { summary: "A wilderness martial specialist with later Wisdom spellcasting.", primary: "Dexterity and Wisdom", saves: "Strength, Dexterity", package: [armor("scale-mail", "Scale Mail", 14, true, 2), item("shortsword", "Shortsword", 2), item("longbow", "Longbow"), item("arrows", "Arrows", 20), item("dungeoneers-pack", "Dungeoneer's pack")] },
  rogue: { summary: "A precise, skill-heavy martial expert built around Sneak Attack.", primary: "Dexterity", saves: "Dexterity, Intelligence", package: [armor("leather", "Leather Armor", 11, true), item("rapier", "Rapier"), item("shortbow", "Shortbow"), item("arrows", "Arrows", 20), item("burglars-pack", "Burglar's pack"), item("thieves-tools", "Thieves' tools")] },
  sorcerer: { summary: "An innate Charisma caster with metamagic.", primary: "Charisma", saves: "Constitution, Charisma", package: [item("light-crossbow", "Light crossbow"), item("bolts", "Crossbow bolts", 20), item("component-pouch", "Component pouch"), item("dungeoneers-pack", "Dungeoneer's pack"), item("dagger", "Dagger", 2)] },
  warlock: { summary: "A pact-bound Charisma caster with short-rest spell slots.", primary: "Charisma", saves: "Wisdom, Charisma", package: [armor("leather", "Leather Armor", 11, true), item("simple-weapon", "Simple weapon", 2), item("component-pouch", "Component pouch"), item("scholars-pack", "Scholar's pack"), item("dagger", "Dagger", 2)] },
  wizard: { summary: "An Intelligence caster with the broadest spellbook.", primary: "Intelligence", saves: "Intelligence, Wisdom", package: [item("quarterstaff", "Quarterstaff"), item("component-pouch", "Component pouch"), item("scholars-pack", "Scholar's pack"), item("spellbook", "Spellbook")] },
};

const equipmentChoice = (id, label, replaceItemIds, options) => ({ id, label, replaceItemIds, options });
const equipmentOption = (id, label, items) => ({ id, label, items });

export const CLASS_EQUIPMENT_CHOICES = {
  artificer: [
    equipmentChoice("armor", "Armor", ["starting-scale-mail"], [equipmentOption("scale", "Scale Mail", [armor("scale-mail", "Scale Mail", 14, true, 2)]), equipmentOption("studded", "Studded Leather", [armor("studded-leather", "Studded Leather", 12, true)])]),
    equipmentChoice("simple-weapons", "Two simple weapons", ["starting-simple-weapon"], [equipmentOption("daggers", "Two daggers", [item("dagger", "Dagger", 2)]), equipmentOption("maces", "Two maces", [item("mace", "Mace", 2)]), equipmentOption("quarterstaff-spear", "Quarterstaff and spear", [item("quarterstaff", "Quarterstaff"), item("spear", "Spear")]), equipmentOption("handaxe-hammer", "Handaxe and light hammer", [item("handaxe", "Handaxe"), item("light-hammer", "Light hammer")])]),
  ],
  barbarian: [
    equipmentChoice("primary-weapon", "Primary weapon", ["starting-greataxe"], [equipmentOption("greataxe", "Greataxe", [item("greataxe", "Greataxe")]), equipmentOption("martial-melee", "Other martial melee weapon", [item("martial-melee", "Martial melee weapon")])]),
    equipmentChoice("secondary-weapons", "Secondary weapons", ["starting-handaxe"], [equipmentOption("handaxes", "Two handaxes", [item("handaxe", "Handaxe", 2)]), equipmentOption("simple-weapon", "One simple weapon", [item("simple-weapon", "Simple weapon")])]),
  ],
  bard: [
    equipmentChoice("weapon", "Weapon", ["starting-rapier"], [equipmentOption("rapier", "Rapier", [item("rapier", "Rapier")]), equipmentOption("longsword", "Longsword", [item("longsword", "Longsword")]), equipmentOption("simple-weapon", "Simple weapon", [item("simple-weapon", "Simple weapon")])]),
    equipmentChoice("pack", "Equipment pack", ["starting-entertainers-pack"], [equipmentOption("diplomats", "Diplomat's pack", [item("diplomats-pack", "Diplomat's pack")]), equipmentOption("entertainers", "Entertainer's pack", [item("entertainers-pack", "Entertainer's pack")])]),
    equipmentChoice("instrument", "Instrument", ["starting-lute"], [equipmentOption("lute", "Lute", [item("lute", "Lute")]), equipmentOption("instrument", "Other musical instrument", [item("musical-instrument", "Musical instrument")])]),
  ],
  cleric: [
    equipmentChoice("armor", "Armor", ["starting-scale-mail"], [equipmentOption("scale", "Scale Mail", [armor("scale-mail", "Scale Mail", 14, true, 2)]), equipmentOption("leather", "Leather Armor", [armor("leather", "Leather Armor", 11, true)]), equipmentOption("chain", "Chain Mail (if proficient)", [armor("chain-mail", "Chain Mail", 16, false)])]),
    equipmentChoice("weapon", "Weapon", ["starting-mace"], [equipmentOption("mace", "Mace", [item("mace", "Mace")]), equipmentOption("warhammer", "Warhammer (if proficient)", [item("warhammer", "Warhammer")])]),
    equipmentChoice("pack", "Equipment pack", ["starting-priests-pack"], [equipmentOption("priests", "Priest's pack", [item("priests-pack", "Priest's pack")]), equipmentOption("explorers", "Explorer's pack", [item("explorers-pack", "Explorer's pack")])]),
  ],
  druid: [
    equipmentChoice("first-item", "Shield or weapon", ["starting-shield"], [equipmentOption("shield", "Wooden shield", [shield]), equipmentOption("simple-weapon", "Simple weapon", [item("simple-weapon", "Simple weapon")])]),
    equipmentChoice("melee-weapon", "Melee weapon", ["starting-scimitar"], [equipmentOption("scimitar", "Scimitar", [item("scimitar", "Scimitar")]), equipmentOption("simple-melee", "Simple melee weapon", [item("simple-melee", "Simple melee weapon")])]),
  ],
  fighter: [
    equipmentChoice("armor", "Armor", ["starting-chain-mail"], [equipmentOption("chain", "Chain Mail", [armor("chain-mail", "Chain Mail", 16, false)]), equipmentOption("leather-bow", "Leather Armor, longbow, and 20 arrows", [armor("leather", "Leather Armor", 11, true), item("longbow", "Longbow"), item("arrows", "Arrows", 20)])]),
    equipmentChoice("weapons", "Martial weapon set", ["starting-shield", "starting-martial-weapon"], [equipmentOption("weapon-shield", "Martial weapon and shield", [item("martial-weapon", "Martial weapon"), shield]), equipmentOption("two-weapons", "Two martial weapons", [item("martial-weapon-a", "Martial weapon"), item("martial-weapon-b", "Martial weapon")])]),
    equipmentChoice("ranged", "Ranged or thrown set", ["starting-light-crossbow", "starting-bolts"], [equipmentOption("crossbow", "Light crossbow and 20 bolts", [item("light-crossbow", "Light crossbow"), item("bolts", "Crossbow bolts", 20)]), equipmentOption("handaxes", "Two handaxes", [item("handaxe", "Handaxe", 2)])]),
    equipmentChoice("pack", "Equipment pack", ["starting-dungeoneers-pack"], [equipmentOption("dungeoneers", "Dungeoneer's pack", [item("dungeoneers-pack", "Dungeoneer's pack")]), equipmentOption("explorers", "Explorer's pack", [item("explorers-pack", "Explorer's pack")])]),
  ],
  monk: [
    equipmentChoice("weapon", "Weapon", ["starting-shortsword"], [equipmentOption("shortsword", "Shortsword", [item("shortsword", "Shortsword")]), equipmentOption("simple-weapon", "Simple weapon", [item("simple-weapon", "Simple weapon")])]),
    equipmentChoice("pack", "Equipment pack", ["starting-dungeoneers-pack"], [equipmentOption("dungeoneers", "Dungeoneer's pack", [item("dungeoneers-pack", "Dungeoneer's pack")]), equipmentOption("explorers", "Explorer's pack", [item("explorers-pack", "Explorer's pack")])]),
  ],
  paladin: [
    equipmentChoice("weapons", "Martial weapon set", ["starting-shield", "starting-martial-weapon"], [equipmentOption("weapon-shield", "Martial weapon and shield", [item("martial-weapon", "Martial weapon"), shield]), equipmentOption("two-weapons", "Two martial weapons", [item("martial-weapon-a", "Martial weapon"), item("martial-weapon-b", "Martial weapon")])]),
    equipmentChoice("secondary", "Secondary weapons", ["starting-javelin"], [equipmentOption("javelins", "Five javelins", [item("javelin", "Javelin", 5)]), equipmentOption("simple-melee", "Simple melee weapon", [item("simple-melee", "Simple melee weapon")])]),
    equipmentChoice("pack", "Equipment pack", ["starting-priests-pack"], [equipmentOption("priests", "Priest's pack", [item("priests-pack", "Priest's pack")]), equipmentOption("explorers", "Explorer's pack", [item("explorers-pack", "Explorer's pack")])]),
  ],
  ranger: [
    equipmentChoice("armor", "Armor", ["starting-scale-mail"], [equipmentOption("scale", "Scale Mail", [armor("scale-mail", "Scale Mail", 14, true, 2)]), equipmentOption("leather", "Leather Armor", [armor("leather", "Leather Armor", 11, true)])]),
    equipmentChoice("melee", "Melee weapons", ["starting-shortsword"], [equipmentOption("shortswords", "Two shortswords", [item("shortsword", "Shortsword", 2)]), equipmentOption("simple-melee", "Two simple melee weapons", [item("simple-melee", "Simple melee weapon", 2)])]),
    equipmentChoice("pack", "Equipment pack", ["starting-dungeoneers-pack"], [equipmentOption("dungeoneers", "Dungeoneer's pack", [item("dungeoneers-pack", "Dungeoneer's pack")]), equipmentOption("explorers", "Explorer's pack", [item("explorers-pack", "Explorer's pack")])]),
  ],
  rogue: [
    equipmentChoice("primary", "Primary weapon", ["starting-rapier"], [equipmentOption("rapier", "Rapier", [item("rapier", "Rapier")]), equipmentOption("shortsword", "Shortsword", [item("shortsword", "Shortsword")])]),
    equipmentChoice("ranged", "Ranged or melee set", ["starting-shortbow", "starting-arrows"], [equipmentOption("shortbow", "Shortbow and 20 arrows", [item("shortbow", "Shortbow"), item("arrows", "Arrows", 20)]), equipmentOption("shortsword", "Shortsword", [item("secondary-shortsword", "Shortsword")])]),
    equipmentChoice("pack", "Equipment pack", ["starting-burglars-pack"], [equipmentOption("burglars", "Burglar's pack", [item("burglars-pack", "Burglar's pack")]), equipmentOption("dungeoneers", "Dungeoneer's pack", [item("dungeoneers-pack", "Dungeoneer's pack")]), equipmentOption("explorers", "Explorer's pack", [item("explorers-pack", "Explorer's pack")])]),
  ],
  sorcerer: [
    equipmentChoice("weapon", "Weapon", ["starting-light-crossbow", "starting-bolts"], [equipmentOption("crossbow", "Light crossbow and 20 bolts", [item("light-crossbow", "Light crossbow"), item("bolts", "Crossbow bolts", 20)]), equipmentOption("simple", "Simple weapon", [item("simple-weapon", "Simple weapon")])]),
    equipmentChoice("focus", "Spellcasting equipment", ["starting-component-pouch"], [equipmentOption("pouch", "Component pouch", [item("component-pouch", "Component pouch")]), equipmentOption("focus", "Arcane focus", [item("arcane-focus", "Arcane focus")])]),
    equipmentChoice("pack", "Equipment pack", ["starting-dungeoneers-pack"], [equipmentOption("dungeoneers", "Dungeoneer's pack", [item("dungeoneers-pack", "Dungeoneer's pack")]), equipmentOption("explorers", "Explorer's pack", [item("explorers-pack", "Explorer's pack")])]),
  ],
  warlock: [
    equipmentChoice("ranged", "Ranged weapon", ["starting-simple-weapon"], [equipmentOption("crossbow", "Light crossbow, 20 bolts, and a simple weapon", [item("light-crossbow", "Light crossbow"), item("bolts", "Crossbow bolts", 20), item("simple-weapon", "Simple weapon")]), equipmentOption("simple", "Two simple weapons", [item("simple-weapon", "Simple weapon", 2)])]),
    equipmentChoice("focus", "Spellcasting equipment", ["starting-component-pouch"], [equipmentOption("pouch", "Component pouch", [item("component-pouch", "Component pouch")]), equipmentOption("focus", "Arcane focus", [item("arcane-focus", "Arcane focus")])]),
    equipmentChoice("pack", "Equipment pack", ["starting-scholars-pack"], [equipmentOption("scholars", "Scholar's pack", [item("scholars-pack", "Scholar's pack")]), equipmentOption("dungeoneers", "Dungeoneer's pack", [item("dungeoneers-pack", "Dungeoneer's pack")])]),
  ],
  wizard: [
    equipmentChoice("weapon", "Weapon", ["starting-quarterstaff"], [equipmentOption("quarterstaff", "Quarterstaff", [item("quarterstaff", "Quarterstaff")]), equipmentOption("dagger", "Dagger", [item("dagger", "Dagger")])]),
    equipmentChoice("focus", "Spellcasting equipment", ["starting-component-pouch"], [equipmentOption("pouch", "Component pouch", [item("component-pouch", "Component pouch")]), equipmentOption("focus", "Arcane focus", [item("arcane-focus", "Arcane focus")])]),
    equipmentChoice("pack", "Equipment pack", ["starting-scholars-pack"], [equipmentOption("scholars", "Scholar's pack", [item("scholars-pack", "Scholar's pack")]), equipmentOption("explorers", "Explorer's pack", [item("explorers-pack", "Explorer's pack")])]),
  ],
};

export function equipmentChoicesForClass(classId) {
  return structuredClone(CLASS_EQUIPMENT_CHOICES[classId] || []);
}

function unresolvedStartingEquipmentForClass(classId, selections = {}) {
  const base = structuredClone(CLASS_CREATION_DETAILS[classId]?.package || []);
  return (CLASS_EQUIPMENT_CHOICES[classId] || []).reduce((items, choice) => {
    const selected = choice.options.find((option) => option.id === selections[choice.id]) || choice.options[0];
    return [...items.filter((entry) => !choice.replaceItemIds.includes(entry.id)), ...structuredClone(selected.items)];
  }, base);
}

const GENERIC_WEAPON_FILTERS = {
  "simple weapon": (weapon) => weapon.isSimple,
  "simple melee weapon": (weapon) => weapon.isSimple && (weapon.attackType || "melee") === "melee",
  "martial weapon": (weapon) => weapon.isMartial,
  "martial melee weapon": (weapon) => weapon.isMartial && (weapon.attackType || "melee") === "melee",
};

const displayWeaponName = (id) => id.split(" ").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function genericWeaponOptions(name) {
  const filter = GENERIC_WEAPON_FILTERS[String(name).toLowerCase()];
  if (!filter) return [];
  return Object.entries(SRD_WEAPONS_2014).filter(([, weapon]) => filter(weapon)).map(([id]) => ({ id, name: displayWeaponName(id) }));
}

export function startingWeaponSubstitutionSlots(classId, selections = {}) {
  return unresolvedStartingEquipmentForClass(classId, selections).flatMap((entry) => {
    const options = genericWeaponOptions(entry.name);
    if (!options.length) return [];
    return Array.from({ length: Math.max(1, Number(entry.quantity || 1)) }, (_, index) => ({
      id: `${entry.id}:${index + 1}`,
      label: `${entry.name}${Number(entry.quantity || 1) > 1 ? ` ${index + 1}` : ""}`,
      options: structuredClone(options),
    }));
  });
}

export function startingEquipmentForClass(classId, selections = {}, weaponSubstitutions = {}) {
  const unresolved = unresolvedStartingEquipmentForClass(classId, selections);
  const slots = new Map(startingWeaponSubstitutionSlots(classId, selections).map((slot) => [slot.id, slot]));
  return unresolved.flatMap((entry) => {
    const quantity = Math.max(1, Number(entry.quantity || 1));
    const firstSlot = slots.get(`${entry.id}:1`);
    if (!firstSlot) return [entry];
    return Array.from({ length: quantity }, (_, index) => {
      const slot = slots.get(`${entry.id}:${index + 1}`);
      const selectedId = slot.options.some((option) => option.id === weaponSubstitutions[slot.id]) ? weaponSubstitutions[slot.id] : slot.options[0].id;
      const selected = slot.options.find((option) => option.id === selectedId);
      return item(`${slug(entry.id.replace(/^starting-/, ""))}-${index + 1}-${selectedId}`, selected.name, 1, `Starting ${entry.name.toLowerCase()} selection`);
    });
  });
}
