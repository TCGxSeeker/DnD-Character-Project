import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(process.argv[2] || process.cwd());
const endpoint = "https://api.open5e.com/v2/classes/?document__key__in=srd-2014&limit=100";
const outputPath = path.join(projectRoot, "src", "data", "generated", "classContent2014.json");
const excludedTypes = new Set(["STARTING_EQUIPMENT", "PROFICIENCIES", "PROFICIENCY_BONUS", "SPELL_SLOTS"]);
const excludedNames = new Set(["Ability Score Improvement"]);

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function conciseSummary(desc, name) {
  const clean = String(desc || "").replace(/\r/g, "").replace(/\*+/g, "").replace(/#+\s*/g, "").trim();
  const first = clean.split(/\n\n|(?<=[.!?])\s+/).find(Boolean) || `${name} is gained from this class progression.`;
  return first.length > 220 ? `${first.slice(0, 217).trim()}...` : first;
}

function benefits(desc) {
  return String(desc || "").replace(/\r/g, "").split(/\n\n+/).map((entry) => entry.replace(/^#+\s*/gm, "").replace(/^\*\s*/gm, "- ").trim()).filter(Boolean);
}

function normalizeFeature(record, raw) {
  const gains = [...(raw.gained_at || [])].filter((gain) => Number(gain.level) > 0).sort((a, b) => a.level - b.level);
  if (!gains.length || excludedTypes.has(raw.feature_type) || excludedNames.has(raw.name) || raw.desc === "[Column data]") return null;
  const classId = slug(record.subclass_of?.name || record.name);
  const sourceId = slug(record.name);
  return {
    id: String(raw.key || `${sourceId}-${slug(raw.name)}`).replace(/^srd_/, "srd-").replaceAll("_", "-"),
    name: raw.name,
    classId,
    ...(record.subclass_of ? { subclassId: sourceId } : {}),
    level: Number(gains[0].level),
    gains: gains.map((gain) => ({ level: Number(gain.level), ...(gain.detail ? { detail: gain.detail } : {}) })),
    detail: conciseSummary(raw.desc, raw.name),
    benefits: benefits(raw.desc),
    source: "SRD 2014",
  };
}

const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
if (!response.ok) throw new Error(`Open5e class sync failed: ${response.status} ${response.statusText}`);
const payload = await response.json();
const records = (payload.results || []).sort((a, b) => a.name.localeCompare(b.name));
const classes = {};
const subclasses = {};

for (const record of records) {
  const normalized = (record.features || []).map((raw) => normalizeFeature(record, raw)).filter(Boolean);
  if (record.subclass_of) {
    const classId = slug(record.subclass_of.name);
    subclasses[classId] ||= {};
    subclasses[classId][slug(record.name)] = { name: record.name, source: "SRD 2014", features: normalized };
  } else {
    classes[slug(record.name)] = { name: record.name, source: "SRD 2014", features: normalized };
  }
}

const output = { edition: "5e-2014", document: "srd-2014", generatedAt: new Date().toISOString(), classes, subclasses };
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
const featureCount = Object.values(classes).reduce((sum, entry) => sum + entry.features.length, 0);
const subclassFeatureCount = Object.values(subclasses).flatMap((entries) => Object.values(entries)).reduce((sum, entry) => sum + entry.features.length, 0);
console.log(JSON.stringify({ outputPath, classCount: Object.keys(classes).length, subclassCount: Object.values(subclasses).reduce((sum, entries) => sum + Object.keys(entries).length, 0), featureCount, subclassFeatureCount }, null, 2));
