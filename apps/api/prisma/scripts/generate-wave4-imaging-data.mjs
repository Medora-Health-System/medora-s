import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const csvPath = path.join(root, "docs/imaging/enterprise-imaging-workbook.csv");
const outPath = path.join(root, "apps/api/prisma/data/haiti-imaging-wave4.ts");

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
const rows = lines.slice(1).map(parseCsvLine).filter((p) => p[10] === "4");

const LEGACY_BODY = {
  BODY_REGION_SHOULDER: "EPAULE",
  BODY_REGION_FACE: "VISAGE",
  BODY_REGION_SINUS: "SINUS",
  BODY_REGION_HEAD: "TETE",
  BODY_REGION_HEAD_NECK: "TETE COU",
  BODY_REGION_SPINE_THORACIC: "RACHIS",
  BODY_REGION_FOOT: "PIED",
  BODY_REGION_HIP: "HANCHE",
  BODY_REGION_KNEE: "GENOU",
  BODY_REGION_LOWER_EXTREMITY: "MEMBRE INF",
  BODY_REGION_UPPER_EXTREMITY: "MEMBRE SUP",
};
const LEGACY_MOD = {
  MODALITY_XR: "XR",
  MODALITY_CT: "CT",
};

/** Legacy + search aliases (2E.8A / 2E.8B package). */
const ALIASES = {
  XR_AC_JOINT_BILATERAL_2V: ["AC joint bilateral", "articulation AC bilatérale", "AC joints"],
  XR_AC_JOINT_LEFT_2V: ["AC joint left", "articulation AC gauche"],
  XR_AC_JOINT_RIGHT_2V: ["AC joint right", "articulation AC droite"],
  XR_CLAVICLE_LEFT_2V: ["clavicle left", "clavicule gauche", "radiographie clavicule gauche"],
  XR_CLAVICLE_RIGHT_2V: ["clavicle right", "clavicule droite", "radiographie clavicule droite"],
  XR_SCAPULA_LEFT: ["scapula left", "scapula gauche", "omoplate gauche"],
  XR_SCAPULA_RIGHT: ["scapula right", "scapula droite", "omoplate droite"],
  CT_BRAIN_PERFUSION: ["brain perfusion CT", "perfusion cérébrale", "CT perfusion"],
  CT_FACIAL_WO_CONTRAST: ["facial CT", "facial bones CT", "os faciaux"],
  CT_MAXILLOFACIAL_WO_CONTRAST: ["maxillofacial CT wo", "maxillo-facial sans contraste"],
  CT_MAXILLOFACIAL_W_IV_CONTRAST: ["maxillofacial CT w contrast", "maxillo-facial avec contraste"],
  CT_ORBITS_WO_CONTRAST: ["orbit CT", "CT orbits", "TDM orbites"],
  CT_SINUSES_WO_CONTRAST: ["sinus CT", "CT sinuses", "TDM sinus"],
  CT_STN_WO_CONTRAST: ["soft tissue neck CT", "parties molles du cou"],
  CT_STN_W_IV_CONTRAST: ["soft tissue neck CT w contrast", "cou avec contraste"],
  CT_STN_W_WO_CONTRAST: ["soft tissue neck CT w wo", "cou avec et sans contraste"],
  CT_TSPINE_WO_CONTRAST: ["thoracic spine CT", "T-spine CT", "TDM rachis thoracique"],
  CT_FOOT_LEFT_WO_CONTRAST: ["CT foot left", "TDM pied gauche"],
  CT_FOOT_RIGHT_WO_CONTRAST: ["CT foot right", "TDM pied droit"],
  CT_HIP_LEFT_WO_CONTRAST: ["CT hip left", "TDM hanche gauche"],
  CT_HIP_RIGHT_WO_CONTRAST: ["CT hip right", "TDM hanche droite"],
  CT_KNEE_LEFT_WO_CONTRAST: ["CT knee left", "ct knee left", "TDM genou gauche"],
  CT_KNEE_RIGHT_WO_CONTRAST: ["CT knee right", "TDM genou droit"],
  CT_LOWER_EXTREMITY_LEFT_W_IV_CONTRAST: ["CT LE left w contrast", "membre inférieur gauche avec contraste"],
  CT_LOWER_EXTREMITY_LEFT_WO_CONTRAST: ["CT LE left wo", "membre inférieur gauche sans contraste"],
  CT_LOWER_EXTREMITY_RIGHT_W_IV_CONTRAST: ["CT LE right w contrast", "membre inférieur droit avec contraste"],
  CT_LOWER_EXTREMITY_RIGHT_WO_CONTRAST: ["CT LE right wo", "membre inférieur droit sans contraste"],
  CT_UPPER_EXTREMITY_LEFT_W_IV_CONTRAST: ["CT UE left w contrast", "membre supérieur gauche avec contraste"],
  CT_UPPER_EXTREMITY_LEFT_WO_CONTRAST: ["CT UE left wo", "membre supérieur gauche sans contraste"],
  CT_UPPER_EXTREMITY_RIGHT_W_IV_CONTRAST: ["CT UE right w contrast", "membre supérieur droit avec contraste"],
  CT_UPPER_EXTREMITY_RIGHT_WO_CONTRAST: ["CT UE right wo", "membre supérieur droit sans contraste"],
};

const FORBIDDEN = new Set(["CT_HEAD", "CT_ABD", "DOPPLER_VEIN", "US_ABD", "CT_CHEST_CTA"]);

const BATCHES = new Set(["XR-3", "CT-3"]);

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

const xr3 = seeds.filter((s) => s.implementationBatch === "XR-3").length;
const ct3 = seeds.filter((s) => s.implementationBatch === "CT-3").length;

if (seeds.length !== 31) {
  throw new Error(`expected 31 wave 4 rows, got ${seeds.length}`);
}
if (xr3 !== 7 || ct3 !== 24) {
  throw new Error(`expected XR-3=7 CT-3=24, got XR-3=${xr3} CT-3=${ct3}`);
}

const header = `/**
 * Phase 2E.8B — Wave 4 imaging catalog (workbook wave=4, 2E.8A authorized).
 * Regenerate: node apps/api/prisma/scripts/generate-wave4-imaging-data.mjs
 */
`;

const body = `${header}
export type Wave4ImagingClassifierTuple = {
  modality: string;
  bodyRegion: string;
  contrastType: string;
  viewCount: string | null;
  laterality: string;
  anatomicSubregion: string | null;
  protocol: string | null;
};

export type Wave4ImagingCatalogSeed = {
  code: string;
  displayNameEn: string;
  displayNameFr: string;
  legacyModality: string;
  legacyBodyRegion: string;
  implementationBatch: "XR-3" | "CT-3";
  searchText: string;
  classifiers: Wave4ImagingClassifierTuple;
  aliases: string[];
};

export const WAVE4_FORBIDDEN_CATALOG_CODES = [
  "CT_HEAD",
  "CT_ABD",
  "DOPPLER_VEIN",
  "US_ABD",
  "CT_CHEST_CTA",
] as const;

export const WAVE4_IMAGING_BATCH_COUNTS = { xr3: ${xr3}, ct3: ${ct3}, total: ${seeds.length} } as const;

export const HAITI_IMAGING_WAVE4_CATALOG: Wave4ImagingCatalogSeed[] = ${JSON.stringify(seeds, null, 2)};
`;

fs.writeFileSync(outPath, body);
console.log(`Wrote ${outPath} (${seeds.length} rows: XR-3=${xr3}, CT-3=${ct3})`);
