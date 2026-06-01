import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const csvPath = path.join(root, "docs/imaging/enterprise-imaging-workbook.csv");
const outPath = path.join(root, "apps/api/prisma/data/haiti-imaging-wave1.ts");

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
const rows = lines.slice(1).map(parseCsvLine).filter((p) => p[10] === "1");

const LEGACY_BODY = {
  BODY_REGION_ABDOMEN: "ABDOMEN",
  BODY_REGION_CHEST: "THORAX",
  BODY_REGION_SPINE: "RACHIS",
  BODY_REGION_SPINE_CERVICAL: "RACHIS CERVICAL",
  BODY_REGION_SPINE_THORACIC: "RACHIS THORACIC",
  BODY_REGION_HEAD: "head",
  BODY_REGION_ABDOMEN_PELVIS: "ABDOMEN/PELVIS",
  BODY_REGION_PELVIS: "PELVIS",
  BODY_REGION_RIBS: "RIBS",
};
const LEGACY_MOD = { MODALITY_XR: "XR", MODALITY_CT: "CT", MODALITY_MRI: "MRI" };

const ALIASES = {
  XR_ABDOMEN_1V: ["Abdomen 1V"],
  XR_ABDOMEN_2V: ["Abdomen 2V"],
  XR_ABDOMEN_3V_ACUTE: ["Abdomen 3V Acute Series"],
  XR_RIBS_LEFT_WITH_CXR: ["Ribs Left with CXR"],
  XR_RIBS_RIGHT_WITH_CXR: ["Ribs Right with CXR"],
  XR_CSPINE_1V_LATERAL: ["C-Spine 1V Lateral"],
  XR_CSPINE_2_3V: ["C-Spine 2-3V"],
  XR_CSPINE_3V_UPRIGHT: ["C-Spine 3V Upright"],
  XR_CSPINE_COMPLETE: ["C-Spine Complete"],
  XR_LSPINE_2V: ["L-Spine 2V"],
  XR_LSPINE_2V_UPRIGHT: ["L-Spine 2V Upright"],
  XR_LSPINE_3V: ["L-Spine 3V"],
  XR_LSPINE_3V_UPRIGHT: ["L-Spine 3V Upright"],
  XR_TSPINE_2V: ["T-Spine 2V"],
  XR_TSPINE_3V_UPRIGHT: ["T-Spine 3V Upright"],
  XR_THORACOLUMBAR_2V: ["Thoracolumbar Spine 2V"],
  XR_SACRUM_COCCYX_2V: ["Coccyx and Sacrum", "Sacrum and Coccyx", "sacrum coccyx"],
  XR_RIBS_LEFT: ["Ribs Left"],
  XR_RIBS_RIGHT: ["Ribs Right"],
  CT_HEAD_W_CONTRAST: ["CT Head w IV Contrast"],
  CT_CHEST_W_IV_CONTRAST: ["CT Chest w IV Contrast"],
  CT_CHEST_W_WO_CONTRAST: ["CT Chest w&wo IV Contrast"],
  CT_ABDOMEN_PELVIS_W_IV_CONTRAST: ["CT Abdomen/Pelvis w IV Contrast", "CT Abdomen w IV Contrast"],
  CT_ABDOMEN_PELVIS_W_WO_CONTRAST: ["CT Abdomen/Pelvis w&wo IV Contrast", "CT Abdomen w&wo IV Contrast"],
  CT_PELVIS_WO_CONTRAST: ["CT Pelvis wo IV Contrast"],
  CT_PELVIS_W_WO_CONTRAST: ["CT Pelvis w&wo IV Contrast"],
  MRI_BRAIN_W_CONTRAST: ["MRI Head w Contrast"],
  MRI_BRAIN_W_WO_CONTRAST: ["MRI Head w&wo Contrast"],
  MRI_CSPINE_WO_CONTRAST: ["MRI C-Spine wo Contrast"],
  MRI_CSPINE_W_CONTRAST: ["MRI C-Spine w Contrast"],
  MRI_CSPINE_W_WO_CONTRAST: ["MRI C-Spine w&wo Contrast"],
  MRI_LSPINE_WO_CONTRAST: ["MRI L-Spine wo Contrast"],
  MRI_LSPINE_W_CONTRAST: ["MRI L-Spine w Contrast"],
  MRI_LSPINE_W_WO_CONTRAST: ["MRI L-Spine w&wo Contrast"],
  MRI_TSPINE_WO_CONTRAST: ["MRI T-Spine wo Contrast"],
  MRI_TSPINE_W_CONTRAST: ["MRI T-Spine w Contrast"],
  MRI_TSPINE_W_WO_CONTRAST: ["MRI T-Spine w&wo Contrast"],
};

const FORBIDDEN = new Set(["CT_HEAD", "CT_ABD", "DOPPLER_VEIN", "US_ABD", "CT_CHEST_CTA"]);

const seeds = rows.map((p) => {
  const code = p[0];
  if (FORBIDDEN.has(code)) throw new Error(`forbidden ${code}`);
  let sub = p[8] || null;
  if (code === "XR_RIBS_LEFT" || code === "XR_RIBS_RIGHT") sub = "ANATOMIC_SUBREGION_RIBS";
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
      anatomicSubregion: sub,
      protocol: p[9] || null,
    },
    aliases,
  };
});

const xr = seeds.filter((s) => s.implementationBatch === "XR-1").length;
const ct = seeds.filter((s) => s.implementationBatch === "CT-1").length;
const mri = seeds.filter((s) => s.implementationBatch === "MRI-1").length;

const header = `/**
 * Phase 2E.4A — Wave 1 imaging catalog (workbook wave=1, W2.2 authorized).
 * Regenerate: node apps/api/prisma/scripts/generate-wave1-imaging-data.mjs
 */
`;

const body = `${header}
export type Wave1ImagingClassifierTuple = {
  modality: string;
  bodyRegion: string;
  contrastType: string;
  viewCount: string | null;
  laterality: string;
  anatomicSubregion: string | null;
  protocol: string | null;
};

export type Wave1ImagingCatalogSeed = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  legacyModality: string;
  legacyBodyRegion: string;
  implementationBatch: "XR-1" | "CT-1" | "MRI-1";
  searchText: string;
  classifiers: Wave1ImagingClassifierTuple;
  aliases: string[];
};

export const WAVE1_FORBIDDEN_CATALOG_CODES = [
  "CT_HEAD",
  "CT_ABD",
  "DOPPLER_VEIN",
  "US_ABD",
  "CT_CHEST_CTA",
] as const;

export const WAVE1_XR_CHEST_TUPLE_ALIASES = [
  "Chest 1V Decub",
  "Chest Post Intubation",
] as const;

export const WAVE1_IMAGING_BATCH_COUNTS = { xr: ${xr}, ct: ${ct}, mri: ${mri}, total: ${seeds.length} } as const;

export const HAITI_IMAGING_WAVE1_CATALOG: Wave1ImagingCatalogSeed[] = ${JSON.stringify(seeds, null, 2)};
`;

fs.writeFileSync(outPath, body);
console.log(`Wrote ${outPath} (${seeds.length} rows)`);
