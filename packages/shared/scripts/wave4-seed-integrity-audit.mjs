/**
 * M1.7C.2A — Wave 4 seed integrity audit (read-only).
 * Run: pnpm --filter @medora/shared build && node packages/shared/scripts/wave4-seed-integrity-audit.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, "../dist/medication");

async function load(name, key) {
  const m = await import(pathToFileURL(join(dist, `${name}.js`)).href);
  return m[key];
}

function wave4ConceptCodeForGeneric(genericName) {
  const slug = genericName
    .toUpperCase()
    .replace(/\s*\+\s*/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `ENT_W4_${slug || "UNKNOWN"}`;
}

function wave4PackageCodeForProduct(productCode) {
  return `${productCode.trim()}_PKG_DEFAULT`;
}

function norm(s) {
  return (s ?? "").trim().toLowerCase();
}

function aliasTexts(entry) {
  return (entry.aliases ?? []).map((a) => norm(a.text)).filter(Boolean);
}

function hasAlias(entry, text) {
  const t = norm(text);
  return aliasTexts(entry).some((a) => a === t || a.includes(t));
}

const audit = {
  part1: {},
  part2: [],
  part3: {},
  part4: {},
  part5: {},
  part6: [],
  part7: {},
  part8: {},
  part9: {},
  part10: { conflictCount: 0, conflicts: [] },
  validationErrors: [],
};

const manifest = await load("enterpriseWave4EdHospitalFormularyManifest", "ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_MANIFEST");
const billingByCode = await load("enterpriseWave4EdHospitalBillingManifest", "ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_BY_CODE");
const billingManifest = await load("enterpriseWave4EdHospitalBillingManifest", "ENTERPRISE_WAVE4_ED_HOSPITAL_BILLING_MANIFEST");

const validateFn = await import(pathToFileURL(join(dist, "enterpriseWave4EdHospitalFormularyValidation.js")).href);
const searchVal = await import(pathToFileURL(join(dist, "enterpriseWave4EdHospitalSearchValidation.js")).href);
const locVal = await import(pathToFileURL(join(dist, "medicationLocalizationValidation.js")).href);

audit.validationErrors = validateFn.validateEnterpriseWave4EdHospitalFormularyManifest();

// PART 1
const createCount = manifest.filter((e) => e.mode === "CREATE" || !e.mode).length;
const enrichCount = manifest.filter((e) => e.mode === "ENRICH").length;
const totalAliases = manifest.reduce((n, e) => n + (e.aliases?.length ?? 0), 0);
const totalPackages = manifest.length; // 1 default package per product
const totalProducts = manifest.length;
const totalBillingProfiles = manifest.length;

audit.part1 = {
  totalMedications: manifest.length,
  createEntries: createCount,
  enrichEntries: enrichCount,
  totalProducts,
  totalPackages,
  totalBillingProfiles,
  totalAliases,
};

// PART 2 — duplicates
function pushDup(type, key, entries, severity = "HIGH") {
  if (entries.length <= 1) return;
  audit.part2.push({
    medication: entries.map((e) => e.catalogCode).join(", "),
    conflictType: type,
    key,
    severity,
    action: type === "catalogCode" ? "BLOCK — fix generator" : "REVIEW — may be intentional strength variants",
  });
}

const byCatalog = new Map();
const byGeneric = new Map();
const byProduct = new Map();
const byPackage = new Map();
const byConcept = new Map();

for (const e of manifest) {
  const cc = e.catalogCode;
  byCatalog.set(cc, [...(byCatalog.get(cc) ?? []), e]);
  const g = norm(e.genericName);
  byGeneric.set(g, [...(byGeneric.get(g) ?? []), e]);
  byProduct.set(cc, [...(byProduct.get(cc) ?? []), e]);
  const pkg = wave4PackageCodeForProduct(cc);
  byPackage.set(pkg, [...(byPackage.get(pkg) ?? []), e]);
  const concept = wave4ConceptCodeForGeneric(e.genericName);
  byConcept.set(concept, [...(byConcept.get(concept) ?? []), e]);
}

for (const [k, v] of byCatalog) pushDup("catalogCode", k, v, "CRITICAL");
for (const [k, v] of byProduct) pushDup("productCode", k, v, "CRITICAL");
for (const [k, v] of byPackage) pushDup("packageCode", k, v, "CRITICAL");
for (const [k, v] of byConcept) {
  if (v.length > 1) {
    audit.part2.push({
      medication: v.map((e) => e.catalogCode).join(", "),
      conflictType: "conceptCode (shared generic)",
      key: k,
      severity: "INFO",
      action: "Expected — multiple SKUs share ENT_W4 concept",
    });
  }
}
for (const [k, v] of byGeneric) {
  if (v.length > 1) {
    audit.part2.push({
      medication: `${v.length} entries`,
      conflictType: "genericName",
      key: k,
      severity: "INFO",
      action: "Expected — strength/route variants",
    });
  }
}

// PART 3 — Ondansetron
const ond = manifest.filter((e) => norm(e.genericName) === "ondansetron");
audit.part3 = {
  count: ond.length,
  products: ond.map((e) => ({
    catalogCode: e.catalogCode,
    mode: e.mode ?? "CREATE",
    strength: e.strength,
    dosageForm: e.dosageForm,
    route: e.route,
    administrationType: e.administrationType,
    hasOndansetronAlias: hasAlias(e, "ondansetron"),
    hasZofranAlias: hasAlias(e, "zofran"),
    aliases: e.aliases?.map((a) => a.text) ?? [],
  })),
  duplicateProducts: ond.length > 3 ? "REVIEW" : ond.length === 3 ? "PASS" : "FAIL",
};

// PART 4 — Insulin
const insulin = manifest.filter((e) => e.governance?.isInsulin === true || norm(e.genericName).includes("insulin"));
audit.part4 = {
  entries: insulin.map((e) => ({
    catalogCode: e.catalogCode,
    mode: e.mode ?? "CREATE",
    genericName: e.genericName,
    route: e.route,
    dosageForm: e.dosageForm,
    administrationType: e.administrationType,
    isInsulin: e.governance?.isInsulin,
    requiresDoubleSign: e.governance?.requiresDoubleSign,
    isContinuousInfusion: e.governance?.isContinuousInfusion,
  })),
};

// PART 5 — Metoprolol
const metro = manifest.filter((e) => norm(e.genericName) === "metoprolol");
audit.part5 = {
  entries: metro.map((e) => ({
    catalogCode: e.catalogCode,
    mode: e.mode,
    strength: e.strength,
    route: e.route,
  })),
  oralIsEnrich: metro.find((e) => e.catalogCode.includes("25_MG_COMPRIME"))?.mode === "ENRICH",
  ivIsCreate: metro.find((e) => e.catalogCode.includes("5MG_5ML_IV"))?.mode !== "ENRICH",
};

// PART 6 — Blood products
const bloodCodes = ["PRBC", "WHOLE_BLOOD", "PLATELET", "FFP", "CRYO"];
const blood = manifest.filter(
  (e) =>
    e.governance?.isBloodProduct === true ||
    bloodCodes.some((b) => e.catalogCode.includes(b)) ||
    norm(e.genericName).includes("blood") ||
    norm(e.displayNameEn).includes("platelet") ||
    norm(e.displayNameEn).includes("cryoprecipitate") ||
    norm(e.displayNameEn).includes("ffp") ||
    norm(e.displayNameEn).includes("prbc")
);
audit.part6 = blood.map((e) => ({
  catalogCode: e.catalogCode,
  displayNameEn: e.displayNameEn,
  isBloodProduct: e.governance?.isBloodProduct,
  requiresDoubleSign: e.governance?.requiresDoubleSign,
  pass: e.governance?.isBloodProduct === true && e.governance?.requiresDoubleSign === true,
}));

// PART 7 — Billing
const missingBilling = manifest.filter((e) => !billingByCode[e.catalogCode]);
audit.part7 = {
  formularyCount: manifest.length,
  billingManifestCount: billingManifest.length,
  coveragePct: ((manifest.length - missingBilling.length) / manifest.length) * 100,
  missing: missingBilling.map((e) => e.catalogCode),
};

// PART 8 — Localization
const locIssues = locVal.validateEnterpriseWaveFormularyLocalizationReady(
  manifest.map(validateFn.wave4EdHospitalFormularyEntryToLocalizationContract)
);
const locBlocking = locIssues.issues.filter((i) => i.severity === "blocking");
const locMissing = manifest.filter(
  (e) =>
    !e.displayNameEn?.trim() ||
    !e.displayNameFr?.trim() ||
    !e.genericName?.trim() ||
    !(e.aliases?.some((a) => a.language === "en")) ||
    !(e.aliases?.some((a) => a.language === "fr")) ||
    !(e.searchTerms?.length > 0)
);
audit.part8 = {
  displayNameEnPct: (manifest.filter((e) => e.displayNameEn?.trim()).length / manifest.length) * 100,
  displayNameFrPct: (manifest.filter((e) => e.displayNameFr?.trim()).length / manifest.length) * 100,
  genericNamePct: (manifest.filter((e) => e.genericName?.trim()).length / manifest.length) * 100,
  enAliasPct: (manifest.filter((e) => e.aliases?.some((a) => a.language === "en")).length / manifest.length) * 100,
  frAliasPct: (manifest.filter((e) => e.aliases?.some((a) => a.language === "fr")).length / manifest.length) * 100,
  searchTermsPct: (manifest.filter((e) => e.searchTerms?.length > 0).length / manifest.length) * 100,
  blockingIssues: locBlocking,
  missingFields: locMissing.map((e) => e.catalogCode),
};

// PART 9 — Search collisions
const searchErrors = searchVal.validateWave4SearchHardening(manifest);
const collisionChecks = {
  levofloxacin_vs_levophed: searchErrors.some((e) => e.toLowerCase().includes("levofloxacin") || e.toLowerCase().includes("levophed")) ? "COLLISION" : "SAFE",
  tpa: searchErrors.some((e) => e.toLowerCase().includes("tpa") || e.toLowerCase().includes("alteplase")) ? "COLLISION" : "SAFE",
  mgso4: searchErrors.some((e) => e.toLowerCase().includes("mgso4") || e.toLowerCase().includes("magnesium")) ? "COLLISION" : "SAFE",
  kcl: searchErrors.some((e) => e.toLowerCase().includes("kcl") || e.toLowerCase().includes("potassium")) ? "COLLISION" : "SAFE",
  ntg: searchErrors.some((e) => e.toLowerCase().includes("ntg") || e.toLowerCase().includes("nitroglycerin")) ? "COLLISION" : "SAFE",
};
audit.part9 = { collisionChecks, searchErrors };

// PART 10 — Governance integrity
const govErrors = [
  ...validateFn.validateWave4DoubleRnPolicy(),
  ...validateFn.validateWave4HydromorphoneDoubleRnPolicy(),
];
audit.part10 = { conflictCount: govErrors.length, conflicts: govErrors };

// Readiness scores
const seedReady = audit.validationErrors.length === 0 && missingBilling.length === 0 ? 100 : Math.max(0, 100 - audit.validationErrors.length * 5);
const govReady = govErrors.length === 0 ? 100 : Math.max(0, 100 - govErrors.length * 10);
const billingReady = audit.part7.coveragePct;
const locReady = locBlocking.length === 0 && locMissing.length === 0 ? 100 : Math.max(0, 100 - (locBlocking.length + locMissing.length) * 5);
const searchReady = searchErrors.length === 0 ? 100 : Math.max(0, 100 - searchErrors.length * 10);
const overall = Math.round((seedReady + govReady + billingReady + locReady + searchReady) / 5);

audit.readiness = {
  seedReadiness: seedReady,
  governanceReadiness: govReady,
  billingReadiness: Math.round(billingReady),
  localizationReadiness: locReady,
  searchReadiness: searchReady,
  overall,
};

audit.verdict =
  manifest.length === 227 &&
  audit.validationErrors.length === 0 &&
  missingBilling.length === 0 &&
  govErrors.length === 0 &&
  searchErrors.length === 0 &&
  audit.part2.filter((d) => d.severity === "CRITICAL").length === 0
    ? "SAFE"
    : "NOT SAFE";

const outPath = join(__dirname, "../.wave4-seed-integrity-audit.json");
writeFileSync(outPath, JSON.stringify(audit, null, 2));
console.log(JSON.stringify(audit, null, 2));
