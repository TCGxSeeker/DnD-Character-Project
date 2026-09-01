import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { calculateCharacterGraph } from "../src/domain/calculationGraph.js";
import { getCharacterFeatures, getCharacterSpells } from "../src/domain/grantedContent.js";
import { CLASS_RULES } from "../src/domain/rules.js";

const SUBCLASSES = {
  artificer: ["battle-smith", "Battle Smith"], barbarian: ["berserker", "Path of the Berserker"], bard: ["lore", "College of Lore"],
  cleric: ["life", "Life Domain"], druid: ["land", "Circle of the Land"], fighter: ["champion", "Champion"], monk: ["open-hand", "Way of the Open Hand"],
  paladin: ["devotion", "Oath of Devotion"], ranger: ["hunter", "Hunter"], rogue: ["thief", "Thief"], sorcerer: ["draconic-bloodline", "Draconic Bloodline"],
  warlock: ["fiend", "The Fiend"], wizard: ["evocation", "School of Evocation"],
};

function characterAt(classId, level) {
  const [subclassId, subclass] = SUBCLASSES[classId];
  return {
    id: `matrix-${classId}-${level}`, name: `${CLASS_RULES[classId].name} ${level}`, ancestryId: "human", ancestryOptionId: "standard", ancestry: "Human — Standard",
    background: "Acolyte", abilities: { strength: 12, dexterity: 14, constitution: 14, intelligence: 16, wisdom: 16, charisma: 16 },
    classLevels: [{ classId, level, subclassId, subclass }], levelHistory: Array.from({ length: level }, (_, index) => ({ level: index + 1, classId, baseHp: index ? 6 : CLASS_RULES[classId].hitDie })),
    skills: ["Perception"], expertise: [], saves: [], features: [], spells: [], inventory: [], conditions: [], resources: [], companions: [], classChoices: [], proficiencies: {}, history: [],
  };
}

const rows = [];
for (const classId of Object.keys(CLASS_RULES)) {
  assert.ok(SUBCLASSES[classId], `Missing matrix subclass for ${classId}`);
  let previousFeatureCount = 0;
  for (let level = 1; level <= 20; level += 1) {
    const character = characterAt(classId, level);
    const features = getCharacterFeatures(character);
    const spells = getCharacterSpells(character);
    const graph = calculateCharacterGraph(character);
    assert.ok(Number.isFinite(graph.armorClass.value), `${classId} ${level} has invalid AC`);
    assert.ok(Number.isFinite(graph.maxHp.value) && graph.maxHp.value > 0, `${classId} ${level} has invalid HP`);
    assert.ok(features.length >= previousFeatureCount, `${classId} features decreased at level ${level}`);
    assert.ok(features.every((feature) => feature.id && feature.name && feature.source && feature.detail), `${classId} ${level} has an incomplete feature`);
    assert.doesNotThrow(() => JSON.stringify({ graph, features, spells }), `${classId} ${level} is not serialization-safe`);
    previousFeatureCount = features.length;
    rows.push({ classId, level, featureCount: features.length, grantedSpellCount: spells.length, armorClass: graph.armorClass.value, maxHp: graph.maxHp.value });
  }
}

const report = { generatedAt: new Date().toISOString(), edition: "2014", builds: rows.length, classCount: Object.keys(CLASS_RULES).length, levelsPerClass: 20, rows };
writeFileSync("docs/build-matrix-report.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(`Validated ${report.builds} builds across ${report.classCount} classes and wrote docs/build-matrix-report.json.`);
