import fs from "node:fs";
import path from "node:path";
import classContent from "../src/data/generated/classContent2014.json" with { type: "json" };
import { CLASS_CREATION_CHOICES_2014, CLASS_LEVEL_CHOICES_2014 } from "../src/data/classChoices2014.js";
import { SUBCLASS_RULES } from "../src/domain/progression.js";

const root = process.cwd();
const resourcesSource = fs.readFileSync(path.join(root, "src/domain/classResources2014.js"), "utf8");
const rows = Object.keys(CLASS_CREATION_CHOICES_2014).sort().map((classId) => {
  const subclasses = SUBCLASS_RULES[classId]?.options || [];
  const imported = Object.values(classContent.subclasses[classId] || {});
  const importedNames = new Set(imported.map((entry) => entry.name.toLowerCase()));
  const missingSubclassRules = subclasses.filter((entry) => !importedNames.has(entry.name.toLowerCase())).map((entry) => entry.name);
  const classFeatures = classContent.classes[classId]?.features?.length || 0;
  const subclassFeatures = imported.reduce((sum, entry) => sum + entry.features.length, 0);
  return {
    classId,
    classFeatures,
    importedSubclasses: imported.length,
    subclassFeatures,
    creationSkills: CLASS_CREATION_CHOICES_2014[classId].skills.count,
    guidedChoices: (CLASS_LEVEL_CHOICES_2014[classId] || []).length,
    resourceTracker: resourcesSource.includes(`"${classId}"`),
    missingSubclassRules,
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  source: "Open5e v2 · SRD 2014 plus local guided-choice catalogs",
  totals: {
    classes: rows.length,
    classFeatures: rows.reduce((sum, row) => sum + row.classFeatures, 0),
    importedSubclasses: rows.reduce((sum, row) => sum + row.importedSubclasses, 0),
    subclassFeatures: rows.reduce((sum, row) => sum + row.subclassFeatures, 0),
    guidedChoices: rows.reduce((sum, row) => sum + row.guidedChoices, 0),
    missingSubclassRuleSets: rows.reduce((sum, row) => sum + row.missingSubclassRules.length, 0),
  },
  classes: rows,
};

const output = path.join(root, "docs/class-depth-audit.json");
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Class-depth audit: ${report.totals.classes} classes, ${report.totals.classFeatures} class features, ${report.totals.subclassFeatures} subclass features.`);
console.log(`Remaining non-SRD subclass rulesets: ${report.totals.missingSubclassRuleSets}.`);
