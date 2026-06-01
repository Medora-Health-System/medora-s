import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const csvPath = path.join(root, "docs/imaging/enterprise-imaging-workbook.csv");
const outPath = path.join(root, "apps/api/prisma/data/haiti-imaging-wave3.ts");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

const lines = fs.readFileSync(csvPath, "utf8").trim().split("\n");
const rows = lines.slice(1).map(parseCsvLine).filter((p) => p[10] === "3");

const LEGACY_BODY = {
  BODY_REGION_HEPATOBILIARY: "FOIE",
  BODY_REGION_HIP: "HANCHE",
  BODY_REGION_KNEE: "GENOU",
  BODY_REGION_LOWER_EXTREMITY: "MEMBRE INF",
  BODY_REGION_PELVIS: "BASSIN",
  BODY_REGION_HEAD: "TETE",
  BODY_REGION_UPPER_EXTREMITY: "MEMBRE SUP",
  BODY_REGION_HEAD_NECK: "TETE COU",
  BODY_REGION_BREAST: "SEIN",
  BODY_REGION_SPINE: "RACHIS",
  BODY_REGION_ABDOMEN: "ABDOMEN",
  BODY_REGION_CHEST: "THORAX",
};
const LEGACY_MOD = {
  MODALITY_MRI: "MRI",
  MODALITY_MRA: "MRA",
  MODALITY_US: "US",
  MODALITY_FL: "FL",
  MODALITY_NM: "NM",
};

/** Legacy + search aliases (2E.7A / 2E.7B package). */
const ALIASES = {
  MRI_CHOLANGIOGRAM: ["MRCP", "cholangiogram", "IRM cholédoque"],
  MRI_HIP_BILATERAL_WO_CONTRAST: ["MRI Hip Bilateral", "IRM hanche bilatérale"],
  MRI_HIP_LEFT_WO_CONTRAST: ["MRI Hip Left", "IRM hanche gauche"],
  MRI_HIP_RIGHT_WO_CONTRAST: ["MRI Hip Right", "IRM hanche droite"],
  MRI_KNEE_LEFT: ["MRI Knee Left", "knee MRI left", "IRM genou gauche"],
  MRI_KNEE_RIGHT: ["MRI Knee Right", "knee MRI right", "IRM genou droit"],
  MRI_LOWER_EXTREMITY_LEFT_W_WO_CONTRAST: ["MRI LE Left w&wo", "IRM membre inférieur gauche"],
  MRI_LOWER_EXTREMITY_RIGHT_W_WO_CONTRAST: ["MRI LE Right w&wo", "IRM membre inférieur droit"],
  MRI_PELVIS: ["MRI Pelvis", "IRM pelvis"],
  MRI_PELVIS_LIMITED: ["MRI Pelvis Limited", "IRM pelvis limitée"],
  MRI_SELLA: ["MRI Sella", "IRM selle turcique"],
  MRI_UPPER_EXTREMITY_LEFT_WO_CONTRAST: ["MRI UE Left wo", "IRM membre supérieur gauche"],
  MRI_UPPER_EXTREMITY_RIGHT_WO_CONTRAST: ["MRI UE Right wo", "IRM membre supérieur droit"],
  MRI_UPPER_EXTREMITY_RIGHT_W_WO_CONTRAST: ["MRI UE Right w&wo"],
  MRA_BRAIN: ["MRA Brain", "ARM cérébrale"],
  MRA_CAROTID_W_CONTRAST: ["MRA Carotid w Contrast", "ARM carotides avec contraste"],
  MRA_CAROTID_WO_CONTRAST: ["MRA Carotid wo Contrast", "ARM carotides sans contraste"],
  MRA_LE_LEFT_W_CONTRAST: ["MRA LE Left", "ARM membre inférieur gauche"],
  MRA_LE_RIGHT_W_CONTRAST: ["MRA LE Right", "ARM membre inférieur droit"],
  US_CAROTID_DUPLEX: ["Carotid Duplex", "carotid duplex", "duplex carotidien"],
  US_ARTERIAL_DOPPLER_LE_BILATERAL: ["LE Arterial Doppler Bilateral", "Doppler artériel MI bilatéral"],
  US_ARTERIAL_DOPPLER_LE_LEFT: ["LE Arterial Doppler Left", "Doppler artériel MI gauche"],
  US_ARTERIAL_DOPPLER_LE_RIGHT: ["LE Arterial Doppler Right", "Doppler artériel MI droit"],
  US_VENOUS_DOPPLER_UE_BILATERAL: ["UE Venous Doppler Bilateral", "Doppler veineux MS bilatéral"],
  US_VENOUS_DOPPLER_UE_LEFT: ["UE Venous Doppler Left", "Doppler veineux MS gauche"],
  US_VENOUS_DOPPLER_UE_RIGHT: ["UE Venous Doppler Right", "Doppler veineux MS droit"],
  US_ARTERIAL_DOPPLER_UE_BILATERAL: ["UE Arterial Doppler Bilateral", "Doppler artériel MS bilatéral"],
  US_ARTERIAL_DOPPLER_UE_LEFT: ["UE Arterial Doppler Left"],
  US_ARTERIAL_DOPPLER_UE_RIGHT: ["UE Arterial Doppler Right"],
  US_BREAST_BILATERAL: ["Breast US Bilateral", "échographie mammaire bilatérale"],
  US_BREAST_LEFT: ["Breast US Left", "échographie mammaire gauche"],
  US_BREAST_RIGHT: ["Breast US Right", "échographie mammaire droite"],
  FL_ESOPHAGRAM: ["Esophagram", "swallow study", "œsophagogramme"],
  FL_LINE_PLACEMENT: ["Line Placement Fluoro", "fluoro line"],
  FL_TUBE_PLACEMENT: ["Tube Placement Fluoro", "fluoro tube"],
  FL_LUMBAR_PUNCTURE: ["Lumbar Puncture Fluoro", "ponction lombaire fluoroscopie"],
  NM_HIDA: ["HIDA", "HIDA Scan", "scintigraphie HIDA"],
  NM_GB_EMPTYING: ["GB Emptying", "gallbladder emptying", "évacuation vésiculaire"],
  NM_VQ_PERFUSION: ["VQ Perfusion", "scintigraphie V/Q perfusion"],
  NM_VQ_VENTILATION: ["VQ Ventilation", "scintigraphie V/Q ventilation"],
  NM_VQ_COMBINED: ["VQ Combined", "vq scan", "scintigraphie V/Q"],
};

const FORBIDDEN = new Set(["CT_HEAD", "CT_ABD", "DOPPLER_VEIN", "US_ABD", "CT_CHEST_CTA"]);

const BATCHES = new Set(["MRI-2", "MRA-1", "US-2", "US-3", "FL-1", "NM-1"]);

const seeds = rows.map((p) => {
  const code = p[0];
  if (FORBIDDEN.has(code)) throw new Error(`forbidden ${code}`);
  const batch = p[16].replace(/\r/g, "");
  if (!BATCHES.has(batch)) throw new Error(`unexpected batch ${batch} on ${code}`);
  const aliases = ALIASES[code] ?? [];
  const searchParts = [p[1], p[2], p[0], LEGACY_MOD[p[3]], LEGACY_BODY[p[4]], ...aliases];
  return {
    code,
    displayNameEn: p[1],
    displayNameFr: p[2],
    legacyModality: LEGACY_MOD[p[3]],
    legacyBodyRegion: LEGACY_BODY[p[4]],
    implementationBatch: batch,
    searchText: searchParts.join(" ").toLowerCase().replace(/\s+/g, " ").trim(),
    classifiers: {
      modality: p[3],
      bodyRegion: p[4],
      contrastType: p[5],
      viewCount: p[6] || null,
      laterality: p[7],
      anatomicSubregion: p[8] || null,
      protocol: p[9] || null,
    },
    aliases,
  };
});

const mri2 = seeds.filter((s) => s.implementationBatch === "MRI-2").length;
const mra1 = seeds.filter((s) => s.implementationBatch === "MRA-1").length;
const us2 = seeds.filter((s) => s.implementationBatch === "US-2").length;
const us3 = seeds.filter((s) => s.implementationBatch === "US-3").length;
const fl1 = seeds.filter((s) => s.implementationBatch === "FL-1").length;
const nm1 = seeds.filter((s) => s.implementationBatch === "NM-1").length;

if (seeds.length !== 41) {
  throw new Error(`expected 41 wave 3 rows, got ${seeds.length}`);
}

const header = `/**
 * Phase 2E.7B — Wave 3 imaging catalog (workbook wave=3, 2E.7A authorized).
 * Regenerate: node apps/api/prisma/scripts/generate-wave3-imaging-data.mjs
 */
`;

const body = `${header}
export type Wave3ImagingClassifierTuple = {
  modality: string;
  bodyRegion: string;
  contrastType: string;
  viewCount: string | null;
  laterality: string;
  anatomicSubregion: string | null;
  protocol: string | null;
};

export type Wave3ImagingCatalogSeed = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  legacyModality: string;
  legacyBodyRegion: string;
  implementationBatch: "MRI-2" | "MRA-1" | "US-2" | "US-3" | "FL-1" | "NM-1";
  searchText: string;
  classifiers: Wave3ImagingClassifierTuple;
  aliases: string[];
};

export const WAVE3_FORBIDDEN_CATALOG_CODES = [
  "CT_HEAD",
  "CT_ABD",
  "DOPPLER_VEIN",
  "US_ABD",
  "CT_CHEST_CTA",
] as const;

export const WAVE3_IMAGING_BATCH_COUNTS = { mri2: ${mri2}, mra1: ${mra1}, us2: ${us2}, us3: ${us3}, fl1: ${fl1}, nm1: ${nm1}, total: ${seeds.length} } as const;

export const HAITI_IMAGING_WAVE3_CATALOG: Wave3ImagingCatalogSeed[] = ${JSON.stringify(seeds, null, 2)};
`;

fs.writeFileSync(outPath, body);
console.log(
  `Wrote ${outPath} (${seeds.length} rows: MRI-2=${mri2}, MRA-1=${mra1}, US-2=${us2}, US-3=${us3}, FL-1=${fl1}, NM-1=${nm1})`
);
