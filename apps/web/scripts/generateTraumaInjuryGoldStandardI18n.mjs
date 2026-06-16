/**
 * One-off generator: collect keys from trauma gold-standard builders and emit EN/FR i18n stubs.
 * Run: node apps/web/scripts/generateTraumaInjuryGoldStandardI18n.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const libUrl = pathToFileURL(
  join(__dirname, "../src/lib/providerDocumentationTraumaInjuryComplaintIntelGoldStandard.ts")
).href;

const mod = await import(libUrl);

const BUILDERS = [
  ["fall", mod.buildFallComplaintIntel],
  ["headInjury", mod.buildHeadInjuryComplaintIntel],
  ["laceration", mod.buildLacerationComplaintIntel],
  ["fractureConcern", mod.buildFractureConcernComplaintIntel],
  ["mvcCollision", mod.buildMvcCollisionComplaintIntel],
  ["assaultTrauma", mod.buildAssaultTraumaComplaintIntel],
  ["neckPainTrauma", mod.buildNeckPainTraumaComplaintIntel],
  ["backPainTrauma", mod.buildBackPainTraumaComplaintIntel],
  ["crushInjury", mod.buildCrushInjuryComplaintIntel],
  ["penetratingInjury", mod.buildPenetratingInjuryComplaintIntel],
  ["burnInjury", mod.buildBurnInjuryComplaintIntel],
  ["pediatricTrauma", mod.buildPediatricTraumaComplaintIntel],
  ["backPainComplaintV1", mod.buildBackPainComplaintV1Intel],
  ["neckPainComplaintV1", mod.buildNeckPainComplaintV1Intel],
  ["shoulderInjuryComplaintV1", mod.buildShoulderInjuryComplaintV1Intel],
  ["kneeInjuryComplaintV1", mod.buildKneeInjuryComplaintV1Intel],
  ["ankleFootInjuryComplaintV1", mod.buildAnkleFootInjuryComplaintV1Intel],
  ["hipPainInjuryComplaintV1", mod.buildHipPainInjuryComplaintV1Intel],
  ["handWristInjuryComplaintV1", mod.buildHandWristInjuryComplaintV1Intel],
  ["fallTraumaComplaintV1", mod.buildFallTraumaComplaintV1Intel],
  ["minorHeadInjuryComplaintV1", mod.buildMinorHeadInjuryComplaintV1Intel],
  ["lacerationSoftTissueComplaintV1", mod.buildLacerationSoftTissueComplaintV1Intel],
  ["concussionFollowupComplaintV1", mod.buildConcussionFollowupComplaintV1Intel],
];

function keyToEn(key) {
  const prefixes = [
    "hpiDenies",
    "rosDenies",
    "hpi",
    "ros",
    "exam",
    "rf",
    "wa",
    "diff",
    "mdm",
    "risk",
    "reasoning",
    "imp",
    "plan",
    "reassess",
    "disp",
  ];
  let rest = key;
  for (const p of prefixes) {
    if (rest.startsWith(p)) {
      rest = rest.slice(p.length);
      if (p === "hpiDenies" || p === "rosDenies") {
        const body = rest.replace(/([A-Z])/g, " $1").trim().toLowerCase();
        return `denies ${body}`;
      }
      break;
    }
  }
  return rest.replace(/([A-Z])/g, " $1").trim().toLowerCase();
}

function keyToFr(key) {
  const en = keyToEn(key);
  const map = {
    "denies ": "nie ",
    fever: "fièvre",
    vomiting: "vomissements",
    headache: "céphalée",
    dizziness: "vertige",
    weakness: "faiblesse",
    numbness: "engourdissement",
    pain: "douleur",
    swelling: "gonflement",
    bruising: "ecchymose",
    fracture: "fracture",
    concussion: "commotion cérébrale",
    laceration: "lacération",
    "hemodynamically stable": "hémodynamiquement stable",
    "alert and oriented": "alerte et orienté",
    "return precautions discussed": "consignes de retour discutées",
    reviewed: "revu",
  };
  let out = en;
  for (const [from, to] of Object.entries(map)) {
    out = out.replaceAll(from, to);
  }
  return out;
}

function collectKeys(builder, ns) {
  const keys = [];
  builder((k) => {
    keys.push(k);
    return `providerDocumentationComplaintIntel.${ns}.${k}`;
  });
  return [...new Set(keys)].sort();
}

const enOut = {};
const frOut = {};

for (const [ns, builder] of BUILDERS) {
  const keys = collectKeys(builder, ns);
  enOut[ns] = {};
  frOut[ns] = {};
  for (const key of keys) {
    enOut[ns][key] = keyToEn(key);
    frOut[ns][key] = keyToFr(key);
  }
}

function serialize(obj, locale) {
  const lines = [`/** ME.2N-R — chart-ready trauma/injury complaint intelligence i18n (${locale}) */`];
  lines.push(`export const providerDocumentationTraumaInjuryComplaintIntel${locale === "en" ? "En" : "Fr"} = {`);
  for (const [ns, keys] of Object.entries(obj)) {
    lines.push(`  ${ns}: {`);
    for (const [key, value] of Object.entries(keys)) {
      lines.push(`    ${key}: ${JSON.stringify(value)},`);
    }
    lines.push("  },");
  }
  lines.push("} as const;");
  lines.push("");
  return lines.join("\n");
}

const i18nDir = join(__dirname, "../src/i18n/messages");
writeFileSync(join(i18nDir, "providerDocumentationTraumaInjuryComplaintIntel.en.ts"), serialize(enOut, "en"));
writeFileSync(join(i18nDir, "providerDocumentationTraumaInjuryComplaintIntel.fr.ts"), serialize(frOut, "fr"));
console.log("Generated trauma injury i18n for", BUILDERS.length, "namespaces");
