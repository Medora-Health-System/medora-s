import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const csvPath = path.join(root, "docs/imaging/enterprise-imaging-workbook.csv");
const outPath = path.join(root, "apps/api/prisma/data/haiti-imaging-wave2.ts");

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
const rows = lines.slice(1).map(parseCsvLine).filter((p) => p[10] === "2");

const LEGACY_BODY = {
  BODY_REGION_ANKLE: "CHEVILLE",
  BODY_REGION_ELBOW: "COUDE",
  BODY_REGION_THIGH: "CUISSE",
  BODY_REGION_FOOT: "PIED",
  BODY_REGION_FOREARM: "AVANT-BRAS",
  BODY_REGION_HAND: "MAIN",
  BODY_REGION_HIP: "HANCHE",
  BODY_REGION_ARM: "BRAS",
  BODY_REGION_KNEE: "GENOU",
  BODY_REGION_PELVIS: "BASSIN",
  BODY_REGION_SHOULDER: "EPAULE",
  BODY_REGION_LEG: "JAMBE",
  BODY_REGION_WRIST: "POIGNET",
  BODY_REGION_LOWER_EXTREMITY: "MEMBRE INF",
  BODY_REGION_UPPER_EXTREMITY: "MEMBRE SUP",
  BODY_REGION_AORTA: "AORTE",
  BODY_REGION_BLADDER: "VESSIE",
  BODY_REGION_CHEST: "THORAX",
  BODY_REGION_THYROID: "THYROIDE",
};
const LEGACY_MOD = { MODALITY_XR: "XR", MODALITY_CT: "CT", MODALITY_CTA: "CTA", MODALITY_US: "US", MODALITY_MRI: "MRI" };

/** Legacy + search aliases (2E.6A package). */
const ALIASES = {
  XR_CALCANEUS_LEFT_2V: ["Os Calcis Left 2V", "calcaneus left", "calcanéus gauche"],
  XR_CALCANEUS_RIGHT_2V: ["Os Calcis Right 2V", "calcaneus right", "calcanéus droite"],
  XR_ANKLE_LEFT_2V: ["Ankle Left 2V"],
  XR_ANKLE_LEFT_3V: ["Ankle Left 3V"],
  XR_ANKLE_RIGHT_2V: ["Ankle Right 2V"],
  XR_ANKLE_RIGHT_3V: ["Ankle Right 3V"],
  XR_ELBOW_LEFT_2V: ["Elbow Left 2V"],
  XR_ELBOW_LEFT_3V: ["Elbow Left 3V"],
  XR_ELBOW_LEFT_4V: ["Elbow Left 4V"],
  XR_ELBOW_RIGHT_2V: ["Elbow Right 2V"],
  XR_ELBOW_RIGHT_3V: ["Elbow Right 3V"],
  XR_ELBOW_RIGHT_4V: ["Elbow Right 4V"],
  XR_FEMUR_LEFT_2V: ["Femur Left 2V"],
  XR_FEMUR_RIGHT_2V: ["Femur Right 2V"],
  XR_FOOT_BILATERAL_2V: ["Foot Bilateral 2V"],
  XR_FOOT_LEFT_2V: ["Foot Left 2V"],
  XR_FOOT_LEFT_3V: ["Foot Left 3V"],
  XR_FOOT_RIGHT_2V: ["Foot Right 2V"],
  XR_FOOT_RIGHT_3V: ["Foot Right 3V"],
  XR_FOREARM_LEFT_2V: ["Forearm Left 2V"],
  XR_FOREARM_RIGHT_2V: ["Forearm Right 2V"],
  XR_HAND_LEFT_2V: ["Hand Left 2V"],
  XR_HAND_LEFT_3V: ["Hand Left 3V"],
  XR_HAND_RIGHT_2V: ["Hand Right 2V"],
  XR_HAND_RIGHT_3V: ["Hand Right 3V"],
  XR_HIP_BILATERAL_WITH_PELVIS: ["Hip Bilateral with Pelvis"],
  XR_HIP_LEFT_1V: ["Hip Left 1V"],
  XR_HIP_LEFT_2V: ["Hip Left 2V"],
  XR_HIP_RIGHT_1V: ["Hip Right 1V"],
  XR_HIP_RIGHT_2V: ["Hip Right 2V"],
  XR_HUMERUS_LEFT_2V: ["Humerus Left 2V"],
  XR_HUMERUS_RIGHT_2V: ["Humerus Right 2V"],
  XR_INFANT_FOOT_LEFT_2V: ["Infant Foot Left 2V"],
  XR_KNEE_LEFT_2V: ["Knee Left 2V"],
  XR_KNEE_LEFT_3V: ["Knee Left 3V"],
  XR_KNEE_LEFT_4V: ["Knee Left 4V"],
  XR_KNEE_LEFT_SUNRISE: ["Knee Left Sunrise", "sunrise left"],
  XR_KNEE_RIGHT_2V: ["Knee Right 2V"],
  XR_KNEE_RIGHT_3V: ["Knee Right 3V"],
  XR_KNEE_RIGHT_4V: ["Knee Right 4V"],
  XR_KNEE_RIGHT_SUNRISE: ["Knee Right Sunrise", "sunrise right"],
  XR_PELVIS_AP: ["Pelvis AP"],
  XR_PELVIS_COMPLETE: ["Pelvis Complete"],
  XR_SHOULDER_LEFT_2V: ["Shoulder Left 2V"],
  XR_SHOULDER_LEFT_3V: ["Shoulder Left 3V"],
  XR_SHOULDER_RIGHT_2V: ["Shoulder Right 2V"],
  XR_SHOULDER_RIGHT_3V: ["Shoulder Right 3V"],
  XR_TIB_FIB_LEFT_2V: ["Tibia Fibula Left 2V", "Tib Fib Left 2V"],
  XR_TIB_FIB_RIGHT_2V: ["Tibia Fibula Right 2V", "Tib Fib Right 2V"],
  XR_WRIST_LEFT_2V: ["Wrist Left 2V"],
  XR_WRIST_LEFT_3V: ["Wrist Left 3V"],
  XR_WRIST_RIGHT_2V: ["Wrist Right 2V"],
  XR_WRIST_RIGHT_3V: ["Wrist Right 3V"],
  CTA_LOWER_EXTREMITY_LEFT: ["CTA Lower Extremity Left", "cta le left", "angioscanner membre inférieur gauche"],
  CTA_LOWER_EXTREMITY_RIGHT: ["CTA Lower Extremity Right", "cta le right", "angioscanner membre inférieur droit"],
  CTA_UPPER_EXTREMITY_LEFT: ["CTA Upper Extremity Left", "cta ue left", "angioscanner membre supérieur gauche"],
  CTA_UPPER_EXTREMITY_RIGHT: ["CTA Upper Extremity Right", "cta ue right", "angioscanner membre supérieur droit"],
  US_THYROID: ["Thyroid Ultrasound", "échographie thyroïde", "echo thyroid"],
  US_AORTA: ["Aorta Ultrasound", "échographie aorte", "echo aorta"],
  US_BLADDER: ["Bladder Ultrasound", "échographie vessie", "echo bladder"],
  US_CHEST: ["Chest Ultrasound", "échographie thorax", "echo chest"],
};

const FORBIDDEN = new Set(["CT_HEAD", "CT_ABD", "DOPPLER_VEIN", "US_ABD", "CT_CHEST_CTA"]);

const seeds = rows.map((p) => {
  const code = p[0];
  if (FORBIDDEN.has(code)) throw new Error(`forbidden ${code}`);
  const aliases = ALIASES[code] ?? [];
  const searchParts = [p[1], p[2], p[0], LEGACY_MOD[p[3]], LEGACY_BODY[p[4]], ...aliases];
  return {
    code,
    displayNameEn: p[1],
    displayNameFr: p[2],
    legacyModality: LEGACY_MOD[p[3]],
    legacyBodyRegion: LEGACY_BODY[p[4]],
    implementationBatch: p[16].replace(/\r/g, ""),
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

const xr = seeds.filter((s) => s.implementationBatch === "XR-2").length;
const ct = seeds.filter((s) => s.implementationBatch === "CT-2").length;
const us = seeds.filter((s) => s.implementationBatch === "US-1").length;

const header = `/**
 * Phase 2E.6B — Wave 2 imaging catalog (workbook wave=2, 2E.6A authorized).
 * Regenerate: node apps/api/prisma/scripts/generate-wave2-imaging-data.mjs
 */
`;

const body = `${header}
export type Wave2ImagingClassifierTuple = {
  modality: string;
  bodyRegion: string;
  contrastType: string;
  viewCount: string | null;
  laterality: string;
  anatomicSubregion: string | null;
  protocol: string | null;
};

export type Wave2ImagingCatalogSeed = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  legacyModality: string;
  legacyBodyRegion: string;
  implementationBatch: "XR-2" | "CT-2" | "US-1";
  searchText: string;
  classifiers: Wave2ImagingClassifierTuple;
  aliases: string[];
};

export const WAVE2_FORBIDDEN_CATALOG_CODES = [
  "CT_HEAD",
  "CT_ABD",
  "DOPPLER_VEIN",
  "US_ABD",
  "CT_CHEST_CTA",
] as const;

export const WAVE2_IMAGING_BATCH_COUNTS = { xr: ${xr}, ct: ${ct}, us: ${us}, total: ${seeds.length} } as const;

export const HAITI_IMAGING_WAVE2_CATALOG: Wave2ImagingCatalogSeed[] = ${JSON.stringify(seeds, null, 2)};
`;

fs.writeFileSync(outPath, body);
console.log(`Wrote ${outPath} (${seeds.length} rows: XR-2=${xr}, CT-2=${ct}, US-1=${us})`);
