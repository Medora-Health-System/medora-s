/**
 * MEDUI.MEDS.ENTERPRISE_IVPB_RUNTIME_METADATA_REMEDIATION_WAVE.1
 * Generates Haiti seed supplement rows for IVPB medications with enterprise manifest
 * metadata but no Haiti runtime row. Never guesses — manifest must have INFUSION + matching route/form.
 *
 * Run: pnpm --filter @medora/shared build && node packages/shared/scripts/generate-haiti-ivpb-runtime-seed-supplement.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "../dist/medication");
const outPath = join(__dirname, "../../../apps/api/prisma/data/haiti-ivpb-runtime-metadata-remediation.ts");

/** IVPB codes missing runtime metadata and not in Haiti seed (audit 2026-06). Alias-only codes excluded. */
const NOT_IN_HAITI_SEED_IVPB_CODES = [
  "ACETAMINOPHEN_1000_MG_100_ML_PERFUSION_INTRAVEINEUSE",
  "ALBUMIN_25_50_ML_PERFUSION_INTRAVEINEUSE",
  "ALBUMIN_5_250_ML_PERFUSION_INTRAVEINEUSE",
  "AMIODARONE_900_MG_500_ML_PERFUSION_INTRAVEINEUSE",
  "ANGIOTENSIN_II_2_5_MG_500_ML_PERFUSION_INTRAVEINEUSE",
  "AZITHROMYCIN_500_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "CALCIUM_CHLORIDE_10_100_ML_PERFUSION_INTRAVEINEUSE",
  "CALCIUM_GLUCONATE_10_100_ML_PERFUSION_INTRAVEINEUSE",
  "CIPROFLOXACIN_400_MG_200_ML_PERFUSION_INTRAVEINEUSE",
  "CLINDAMYCIN_900_MG_50_ML_PERFUSION_INTRAVEINEUSE",
  "CRYOPRECIPITATE_10_UNITS_PERFUSION_INTRAVEINEUSE",
  "DEXTROSE_10_100_ML_PERFUSION_INTRAVEINEUSE",
  "DEXTROSE_10_250_ML_PERFUSION_INTRAVEINEUSE",
  "DEXTROSE_5_1000_ML_PERFUSION_INTRAVEINEUSE",
  "DEXTROSE_5_250_ML_PERFUSION_INTRAVEINEUSE",
  "DEXTROSE_5_RINGER_LACTATE_1000_ML_PERFUSION_INTRAVEINEUSE",
  "DEXTROSE_SALINE_5_0_45_PERFUSION_INTRAVEINEUSE",
  "DOBUTAMINE_500_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "DOPAMINE_800_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "EPINEPHRINE_0_1_MG_ML_PERFUSION_INTRAVEINEUSE",
  "EPINEPHRINE_16_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "EPINEPHRINE_4_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "EPTIFIBATIDE_75_MG_100_ML_PERFUSION_INTRAVEINEUSE",
  "ETHANOL_10_PERFUSION_INTRAVEINEUSE",
  "FRESH_FROZEN_PLASMA_250_ML_PERFUSION_INTRAVEINEUSE",
  "HEPARIN_25000_UNITS_500_ML_PERFUSION_INTRAVEINEUSE",
  "HYPERTONIC_SALINE_3_1000_ML_PERFUSION_INTRAVEINEUSE",
  "HYPERTONIC_SALINE_3_500_ML_PERFUSION_INTRAVEINEUSE",
  "LEVETIRACETAM_1000_MG_100_ML_PERFUSION_INTRAVEINEUSE",
  "LEVOFLOXACIN_750_MG_150_ML_PERFUSION_INTRAVEINEUSE",
  "LINEZOLID_600_MG_300_ML_PERFUSION_INTRAVEINEUSE",
  "MAGNESIUM_SULFATE_40_G_1000_ML_OB_PERFUSION_INTRAVEINEUSE",
  "MAGNESIUM_SULFATE_4_G_100_ML_OB_PERFUSION_INTRAVEINEUSE",
  "MAGNESIUM_SULFATE_4_G_100_ML_PERFUSION_INTRAVEINEUSE",
  "MANNITOL_15_PERFUSION_INTRAVEINEUSE",
  "MANNITOL_20_PERFUSION_INTRAVEINEUSE",
  "MILRINONE_40_MG_200_ML_PERFUSION_INTRAVEINEUSE",
  "NITROGLYCERIN_50_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "NOREPINEPHRINE_16_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "NOREPINEPHRINE_8_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "NORMOSOL_1000_ML_PERFUSION_INTRAVEINEUSE",
  "OXYTOCIN_30_UNITS_500_ML_PERFUSION_INTRAVEINEUSE",
  "PACKED_RED_BLOOD_CELLS_250_ML_PERFUSION_INTRAVEINEUSE",
  "PHENYLEPHRINE_50_MG_250_ML_PERFUSION_INTRAVEINEUSE",
  "PLASMALYTE_1000_ML_PERFUSION_INTRAVEINEUSE",
  "PLATELETS_APHERESIS_UNIT_PERFUSION_INTRAVEINEUSE",
  "POTASSIUM_CHLORIDE_10_MEQ_100_ML_PERFUSION_INTRAVEINEUSE",
  "POTASSIUM_CHLORIDE_40_MEQ_1000_ML_PERFUSION_INTRAVEINEUSE",
  "POTASSIUM_PHOSPHATE_30_MMOL_500_ML_PERFUSION_INTRAVEINEUSE",
  "REGULAR_INSULIN_100_UI_ML_DRIP_KIT_PERFUSION_INTRAVEINEUSE",
  "SODIUM_CHLORIDE_0_45_1000_ML_PERFUSION_INTRAVEINEUSE",
  "SODIUM_CHLORIDE_0_45_500_ML_PERFUSION_INTRAVEINEUSE",
  "SODIUM_CHLORIDE_0_9_1000_ML_PERFUSION_INTRAVEINEUSE",
  "SODIUM_CHLORIDE_0_9_250_ML_PERFUSION_INTRAVEINEUSE",
  "SODIUM_CHLORIDE_0_9_500_ML_PERFUSION_INTRAVEINEUSE",
  "SODIUM_PHOSPHATE_15_MMOL_250_ML_PERFUSION_INTRAVEINEUSE",
  "VASOPRESSIN_40_UNITS_100_ML_PERFUSION_INTRAVEINEUSE",
  "WHOLE_BLOOD_500_ML_PERFUSION_INTRAVEINEUSE",
];

async function loadManifestMaps() {
  const modules = [
    ["enterpriseWave4EdHospitalFormularyManifest", "ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE"],
    ["enterpriseIvFluidsFormularyManifest", "ENTERPRISE_IV_FLUIDS_FORMULARY_BY_CODE"],
    ["enterpriseNeurologyInfectiousDiseaseFormularyManifest", "ENTERPRISE_NEUROLOGY_INFECTIOUS_DISEASE_FORMULARY_BY_CODE"],
    ["enterpriseWave1FormularyManifest", "ENTERPRISE_WAVE1_FORMULARY_BY_CODE"],
    ["enterpriseWave2FormularyManifest", "ENTERPRISE_WAVE2_FORMULARY_BY_CODE"],
    ["enterpriseWave3FormularyManifest", "ENTERPRISE_WAVE3_FORMULARY_BY_CODE"],
  ];
  /** @type {Record<string, object>} */
  const byCode = {};
  for (const [file, key] of modules) {
    const m = await import(pathToFileURL(join(distDir, `${file}.js`)).href);
    const map = m[key] ?? {};
    for (const [code, entry] of Object.entries(map)) {
      if (!byCode[code]) byCode[code] = entry;
    }
  }
  return byCode;
}

function normalizeRoute(r) {
  return String(r ?? "").trim().toLowerCase();
}

function normalizeForm(f) {
  return String(f ?? "").trim().toLowerCase();
}

function aliasesFromEntry(entry) {
  const fromAliases = (entry.aliases ?? []).map((a) => a.text).filter(Boolean);
  const fromSearch = (entry.searchTerms ?? []).slice(0, 4);
  const unique = [...new Set([...fromAliases, ...fromSearch])];
  return unique.length > 0 ? unique : [entry.genericName];
}

function seedRowFromManifest(entry, sortPriority) {
  const gov = entry.governance ?? {};
  return {
    code: entry.catalogCode,
    genericName: entry.genericName,
    displayNameFr: entry.displayNameFr,
    displayNameEn: entry.displayNameEn,
    strength: entry.strength,
    dosageForm: entry.dosageForm,
    route: entry.route,
    therapeuticClass: entry.therapeuticClass,
    administrationType: entry.administrationType,
    billingClass: entry.billingClass ?? "THERAPEUTIC",
    commonAliases: aliasesFromEntry(entry),
    isEssential: entry.isEssential ?? false,
    isActive: true,
    sortPriority,
    isControlled: gov.isControlled ?? false,
    controlledSchedule: gov.controlledSchedule ?? null,
    requiresWitness: gov.requiresWitness ?? false,
    requiresDoubleSign: gov.requiresDoubleSign ?? false,
  };
}

function serializeSeed(row) {
  const aliasList = row.commonAliases.map((a) => JSON.stringify(a)).join(", ");
  const lines = [
    "  {",
    `    code: ${JSON.stringify(row.code)},`,
    `    genericName: ${JSON.stringify(row.genericName)},`,
    `    displayNameFr: ${JSON.stringify(row.displayNameFr)},`,
    row.displayNameEn ? `    displayNameEn: ${JSON.stringify(row.displayNameEn)},` : null,
    `    strength: ${JSON.stringify(row.strength)},`,
    `    dosageForm: ${JSON.stringify(row.dosageForm)},`,
    `    route: ${JSON.stringify(row.route)},`,
    `    therapeuticClass: ${JSON.stringify(row.therapeuticClass)},`,
    `    administrationType: ${JSON.stringify(row.administrationType)},`,
    `    billingClass: ${JSON.stringify(row.billingClass)},`,
    `    commonAliases: A([${aliasList}]),`,
    `    ...nonEssential(${row.sortPriority}),`,
    row.isControlled ? `    ...controlled(${JSON.stringify(row.controlledSchedule ?? "II")}),` : null,
    "  },",
  ].filter(Boolean);
  return lines.join("\n");
}

async function main() {
  const manifestByCode = await loadManifestMaps();
  const seeds = [];
  const manualReview = [];
  let sort = 900;

  for (const code of NOT_IN_HAITI_SEED_IVPB_CODES) {
    const entry = manifestByCode[code];
    if (!entry) {
      manualReview.push({ code, reason: "MANIFEST_MISSING" });
      continue;
    }
    if (entry.administrationType !== "INFUSION") {
      manualReview.push({ code, reason: "MANIFEST_NOT_INFUSION", admin: entry.administrationType });
      continue;
    }
    const route = normalizeRoute(entry.route);
    const form = normalizeForm(entry.dosageForm);
    if (!route.includes("intrave") && route !== "injectable") {
      manualReview.push({ code, reason: "INVALID_ROUTE", route: entry.route });
      continue;
    }
    if (form !== "perfusion" && form !== "injectable") {
      manualReview.push({ code, reason: "INVALID_DOSAGE_FORM", form: entry.dosageForm });
      continue;
    }
    sort += 1;
    seeds.push(seedRowFromManifest({ ...entry, catalogCode: code }, sort));
  }

  if (manualReview.length > 0) {
    console.error("[ivpb-runtime-seed] MANUAL_REVIEW required:", JSON.stringify(manualReview, null, 2));
    process.exit(1);
  }

  if (seeds.length !== NOT_IN_HAITI_SEED_IVPB_CODES.length) {
    console.error(`[ivpb-runtime-seed] expected ${NOT_IN_HAITI_SEED_IVPB_CODES.length} seeds, got ${seeds.length}`);
    process.exit(1);
  }

  const body = `/**
 * MEDUI.MEDS.ENTERPRISE_IVPB_RUNTIME_METADATA_REMEDIATION_WAVE.1
 * Runtime-authoritative Haiti seed rows for enterprise IVPB medications.
 * Generated — do not edit by hand.
 * Regenerate: node packages/shared/scripts/generate-haiti-ivpb-runtime-seed-supplement.mjs
 */

const A = (s: string[]) => s;
const nonEssential = (n: number) => ({ isEssential: false, isActive: true, sortPriority: n });
const controlled = (schedule: "II" | "III" | "IV", requiresDoubleSign = false) => ({
  isControlled: true,
  controlledSchedule: schedule,
  requiresWitness: false,
  requiresDoubleSign,
});

/** ${seeds.length} IVPB runtime metadata remediation rows — enterprise manifest reconciled. */
export const HAITI_IVPB_RUNTIME_METADATA_REMEDIATION_SEEDS = [
${seeds.map(serializeSeed).join("\n")}
];
`;

  writeFileSync(outPath, body, "utf8");
  console.log(`[ivpb-runtime-seed] wrote ${seeds.length} rows → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
