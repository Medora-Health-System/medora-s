import * as fs from "fs";
import * as path from "path";

type MedoraImagingRow = {
  medoraCode: string;
  displayNameEn: string;
  modality: string;
  bodyRegion: string;
  aliases: string[];
  searchText: string;
};

type PlaybookCsvRow = {
  LoincNumber: string;
  LongCommonName: string;
  PartTypeName: string;
  RID: string;
  PreferredName: string;
  RPID: string;
  LongName: string;
};

type PlaybookPart = {
  partTypeName: string;
  rid: string;
  preferredName: string;
};

type PlaybookStudy = {
  loincNumber: string;
  longCommonName: string;
  rpid: string;
  longName: string;
  parts: PlaybookPart[];
  modalityParts: string[];
  regionParts: string[];
  focusParts: string[];
  timingParts: string[];
  subtypeParts: string[];
  reasonParts: string[];
  haystack: string;
};

type Candidate = {
  loincNumber: string;
  longCommonName: string;
  rpid: string;
  longName: string;
  parts: PlaybookPart[];
  score: number;
  reason: string;
};

type OutputRow = {
  medoraCode: string;
  displayNameEn: string;
  modality: string;
  bodyRegion: string;
  candidates: Candidate[];
};

const imagingSeedPath = path.resolve("apps/api/prisma/data/haiti-imaging-studies.ts");
const playbookPath = path.resolve(
  process.env.HOME!,
  "medora-data/raw/loinc/2026-03/Loinc_2.82/AccessoryFiles/LoincRsnaRadiologyPlaybook/LoincRsnaRadiologyPlaybook.csv",
);
const outPath = path.resolve(process.env.HOME!, "medora-data/processed/medora-imaging-radlex-candidates.json");

const modalityTerms: Record<string, string[]> = {
  CT: ["ct", "computed tomography"],
  CTA: ["cta", "ct angiography", "angio"],
  XR: ["xr", "x ray", "radiography", "radiograph"],
  US: ["us", "ultrasound"],
  MRI: ["mri", "magnetic resonance"],
};

const regionTermsByMedoraCode: Record<string, string[]> = {
  XR_CHEST: ["chest", "thorax"],
  XR_CHEST_2V: ["chest", "thorax"],
  CT_HEAD: ["head"],
  CT_HEAD_WO_CONTRAST: ["head"],
  CT_CERVICAL_SPINE: ["cervical spine", "neck"],
  CT_CHEST: ["chest", "thorax"],
  CT_CHEST_CTA: ["chest", "thorax", "pulmonary arteries"],
  CTA_CHEST: ["chest", "thorax", "pulmonary arteries"],
  CTA_HEAD_NECK: ["head", "neck", "head vessels", "neck vessels"],
  CT_ABD: ["abdomen", "pelvis"],
  CT_ABDOMEN_PELVIS: ["abdomen", "pelvis"],
  CTA_ABDOMEN_PELVIS: ["abdomen", "pelvis"],
  CT_CHEST_ABDOMEN_PELVIS_TRAUMA: ["chest", "abdomen", "pelvis"],
  US_ABD: ["abdomen"],
  US_ABDOMEN: ["abdomen"],
  US_RUQ_GALLBLADDER: ["right upper quadrant", "ruq", "abdomen", "gallbladder", "biliary"],
  US_RENAL: ["kidney", "renal", "retroperitoneal"],
  US_PELVIS: ["pelvis"],
  US_FAST: ["abdomen", "pericardial", "fluid"],
  US_SCROTUM_TESTICULAR: ["scrotum", "testicle", "testis"],
  DOPPLER_VEIN: ["lower extremity", "leg", "vein", "venous"],
  US_VENOUS_DOPPLER_LE: ["lower extremity", "leg", "vein", "venous"],
};

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function normalize(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsPhrase(haystack: string, phrase: string): boolean {
  const normalizedHaystack = normalize(haystack);
  const normalized = normalize(phrase);
  return normalized.length > 0 && ` ${normalizedHaystack} `.includes(` ${normalized} `);
}

function tokens(value: string): string[] {
  const stop = new Set([
    "and",
    "angioscanner",
    "avec",
    "bassin",
    "contraste",
    "echo",
    "echographie",
    "exam",
    "imaging",
    "protocol",
    "protocole",
    "radiographie",
    "scan",
    "scanner",
    "sans",
    "tdm",
    "the",
    "with",
    "without",
    "xray",
  ]);
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stop.has(token));
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      i += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function stringField(objectSource: string, field: string): string {
  const match = objectSource.match(new RegExp(`${field}\\s*:\\s*"([^"]*)"`));
  return match?.[1] ?? "";
}

function arrayField(objectSource: string, field: string): string[] {
  const match = objectSource.match(new RegExp(`${field}\\s*:\\s*\\[([^\\]]*)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

function extractSeedObjects(source: string, exportName: string): string[] {
  const start = source.indexOf(`export const ${exportName}`);
  if (start < 0) throw new Error(`Could not find export ${exportName}`);
  const equals = source.indexOf("=", start);
  const arrayStart = source.indexOf("[", equals);
  const objects: string[] = [];
  let depth = 0;
  let current = "";
  let inObject = false;

  for (let i = arrayStart + 1; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") {
      depth += 1;
      inObject = true;
      current += char;
      continue;
    }
    if (inObject) current += char;
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && inObject) {
        objects.push(current);
        current = "";
        inObject = false;
      }
    }
    if (char === "]" && depth === 0 && !inObject) break;
  }

  return objects;
}

function readMedoraImagingRows(): MedoraImagingRow[] {
  return extractSeedObjects(readText(imagingSeedPath), "HAITI_IMAGING_CATALOG").map((obj) => ({
    medoraCode: stringField(obj, "code"),
    displayNameEn: stringField(obj, "displayNameEn"),
    modality: stringField(obj, "modality"),
    bodyRegion: stringField(obj, "bodyRegion"),
    aliases: arrayField(obj, "aliases"),
    searchText: stringField(obj, "searchText"),
  })).filter((row) => row.medoraCode);
}

function valuesForPartType(parts: PlaybookPart[], partTypeFragment: string): string[] {
  const fragment = normalize(partTypeFragment);
  return parts
    .filter((part) => normalize(part.partTypeName).includes(fragment))
    .map((part) => part.preferredName)
    .filter(Boolean);
}

function groupedPlaybookStudies(): PlaybookStudy[] {
  const lines = readText(playbookPath).split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0] ?? "");
  const groups = new Map<string, PlaybookCsvRow[]>();

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])) as PlaybookCsvRow;
    if (!row.LoincNumber) continue;
    const existing = groups.get(row.LoincNumber) ?? [];
    existing.push(row);
    groups.set(row.LoincNumber, existing);
  }

  return [...groups.entries()].map(([loincNumber, rows]) => {
    const parts = rows.map((row) => ({
      partTypeName: row.PartTypeName,
      rid: row.RID,
      preferredName: row.PreferredName,
    }));
    const rpid = rows.find((row) => row.RPID)?.RPID ?? "";
    const longName = rows.find((row) => row.LongName)?.LongName ?? "";
    const longCommonName = rows[0]?.LongCommonName ?? "";
    const preferredNames = parts.map((part) => part.preferredName);
    const ridValues = parts.map((part) => part.rid);

    return {
      loincNumber,
      longCommonName,
      rpid,
      longName,
      parts,
      modalityParts: valuesForPartType(parts, "modality"),
      regionParts: valuesForPartType(parts, "region imaged"),
      focusParts: valuesForPartType(parts, "imaging focus"),
      timingParts: valuesForPartType(parts, "timing"),
      subtypeParts: valuesForPartType(parts, "modality subtype"),
      reasonParts: valuesForPartType(parts, "reason for exam"),
      haystack: normalize([longCommonName, longName, rpid, ...preferredNames, ...ridValues].join(" ")),
    };
  });
}

function expectedModality(row: MedoraImagingRow): "CT" | "CTA" | "XR" | "US" | "MRI" {
  const label = normalize([row.medoraCode, row.displayNameEn, row.aliases.join(" "), row.searchText].join(" "));
  if (label.includes("cta") || label.includes("angio")) return "CTA";
  return row.modality.toUpperCase() as "CT" | "XR" | "US" | "MRI";
}

function studyHasModality(study: PlaybookStudy, modality: string): boolean {
  const haystack = normalize([study.longCommonName, study.longName, ...study.modalityParts, ...study.subtypeParts].join(" "));
  const terms = modalityTerms[modality] ?? [modality.toLowerCase()];
  if (modality === "CTA") {
    const isCt = study.modalityParts.some((part) => containsPhrase(part, "computed tomography")) || containsPhrase(study.longCommonName, "CTA");
    const isAngio = study.subtypeParts.some((part) => containsPhrase(part, "angiography")) || containsPhrase(study.longCommonName, "CTA");
    return isCt && isAngio;
  }
  return terms.some((term) => containsPhrase(haystack, term));
}

function isOverlyBroad(study: PlaybookStudy): boolean {
  const haystack = study.haystack;
  return (
    containsPhrase(haystack, "imaging modality") ||
    containsPhrase(haystack, "body region") ||
    containsPhrase(haystack, "guidance") ||
    containsPhrase(haystack, "fluoroscopy guidance")
  );
}

function scoreCandidate(row: MedoraImagingRow, study: PlaybookStudy): { score: number; reasons: string[] } {
  const expected = expectedModality(row);
  const modalityMatch = studyHasModality(study, expected);
  if (!modalityMatch) return { score: 0, reasons: [] };
  if (isOverlyBroad(study)) return { score: 0, reasons: [] };
  if (row.medoraCode === "CT_HEAD_WO_CONTRAST") {
    const name = normalize(study.longCommonName);
    if (!containsPhrase(name, "ct head")) return { score: 0, reasons: [] };
    if (!containsPhrase(name, "wo contrast")) return { score: 0, reasons: [] };
    if (/\b(perfusion|angiogram|vessels|orbit|face|neck|cone beam|wo and w)\b/.test(name)) return { score: 0, reasons: [] };
  }

  let score = 35;
  const reasons = [`modality ${expected}`];
  const haystack = study.haystack;
  const labelText = normalize([row.displayNameEn, row.aliases.join(" "), row.searchText].join(" "));

  const regionTerms = regionTermsByMedoraCode[row.medoraCode] ?? tokens(row.bodyRegion);
  const matchedRegions = regionTerms.filter((term) => containsPhrase(haystack, term));
  score += matchedRegions.length * 18;
  if (matchedRegions.length > 0) reasons.push(`region/focus: ${matchedRegions.slice(0, 3).join(", ")}`);

  const matchedTerms = [...new Set(tokens(labelText))]
    .filter((term) => containsPhrase(haystack, term))
    .slice(0, 8);
  score += matchedTerms.length * 5;
  if (matchedTerms.length > 0) reasons.push(`terms: ${matchedTerms.slice(0, 5).join(", ")}`);

  if (expected === "CTA") {
    if (study.subtypeParts.some((part) => containsPhrase(part, "angiography")) || containsPhrase(haystack, "angio")) {
      score += 35;
      reasons.push("CTA angiography subtype");
    } else {
      score -= 40;
      reasons.push("CTA label without angiography subtype");
    }
  }

  if (containsPhrase(labelText, "without contrast") || containsPhrase(labelText, "non contrast")) {
    if (study.timingParts.some((part) => containsPhrase(part, "without")) || containsPhrase(study.longCommonName, "WO contrast")) {
      score += 30;
      reasons.push("without contrast");
    } else if (containsPhrase(haystack, "with")) {
      score -= 35;
      reasons.push("contrast mismatch risk");
    }
  }

  const normalizedStudyName = normalize(study.longCommonName);
  if (row.medoraCode === "CT_HEAD_WO_CONTRAST" && normalizedStudyName === "ct head wo contrast") {
    score += 60;
    reasons.push("exact CT head without contrast");
  }
  if (row.medoraCode === "CTA_CHEST" && containsPhrase(normalizedStudyName, "pulmonary embolus")) {
    score += 35;
    reasons.push("PE protocol candidate");
  }
  if (row.medoraCode === "CTA_HEAD_NECK" && containsPhrase(normalizedStudyName, "head vessels") && containsPhrase(normalizedStudyName, "neck vessels")) {
    score += 45;
    reasons.push("combined head/neck vessels");
  }

  if (containsPhrase(labelText, "gallbladder") && !containsPhrase(haystack, "gallbladder") && !containsPhrase(haystack, "right upper quadrant")) {
    score -= 20;
    reasons.push("missing gallbladder/RUQ focus");
  }

  if (containsPhrase(labelText, "fast") && !containsPhrase(haystack, "fast") && !containsPhrase(haystack, "trauma")) {
    score -= 20;
    reasons.push("FAST not explicit");
  }

  if (row.medoraCode === "CT_CHEST_ABDOMEN_PELVIS_TRAUMA" && !containsPhrase(haystack, "trauma")) {
    score -= 20;
    reasons.push("trauma protocol not explicit");
  }

  return { score, reasons: [...new Set(reasons)] };
}

function main() {
  const medoraRows = readMedoraImagingRows();
  const studies = groupedPlaybookStudies();

  const output: OutputRow[] = medoraRows.map((row) => {
    const candidates = studies
      .map((study) => ({ study, scored: scoreCandidate(row, study) }))
      .filter(({ scored }) => scored.score >= 45)
      .sort((a, b) => b.scored.score - a.scored.score || a.study.longCommonName.localeCompare(b.study.longCommonName))
      .slice(0, 10)
      .map(({ study, scored }) => ({
        loincNumber: study.loincNumber,
        longCommonName: study.longCommonName,
        rpid: study.rpid,
        longName: study.longName,
        parts: study.parts,
        score: scored.score,
        reason: scored.reasons.join("; "),
      }));

    return {
      medoraCode: row.medoraCode,
      displayNameEn: row.displayNameEn,
      modality: row.modality,
      bodyRegion: row.bodyRegion,
      candidates,
    };
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`Read ${medoraRows.length} Medora imaging rows`);
  console.log(`Grouped ${studies.length} LOINC-RSNA Playbook studies`);
  console.log(`Groups with candidates: ${output.filter((row) => row.candidates.length > 0).length}`);
  console.log(`Wrote review candidates to ${outPath}`);
}

main();
