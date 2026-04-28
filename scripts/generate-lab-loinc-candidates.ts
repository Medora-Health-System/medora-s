import * as fs from "fs";
import * as path from "path";

type MedoraLab = {
  medoraCode: string;
  displayNameEn: string;
  displayNameFr: string;
  aliases: string[];
  searchText: string;
};

type LoincRow = {
  loinc?: string;
  name?: string;
  short?: string;
  component?: string;
  property?: string;
  system?: string;
  scale?: string;
  method?: string;
  class?: string;
  status?: string;
};

type LoincCandidate = {
  loinc: string;
  name: string;
  component: string;
  system: string;
  class: string;
  score: number;
  reason: string;
};

const PANEL_PHRASES_BY_MEDORA_CODE: Record<string, string[]> = {
  BMP: ["basic metabolic panel"],
  ER_BMP: ["basic metabolic panel"],
  CMP: ["comprehensive metabolic panel"],
  ER_CMP: ["comprehensive metabolic panel"],
};

const PREFERRED_PANEL_LOINCS_BY_MEDORA_CODE: Record<string, string[]> = {
  BMP: ["51990-0"],
  ER_BMP: ["51990-0"],
  CMP: ["24323-8"],
  ER_CMP: ["24323-8"],
};

const PREFERRED_LOINCS_BY_MEDORA_CODE: Record<string, string[]> = {
  ER_DDM: ["48065-7", "22457-8"],
  ER_PT_INR: ["5902-2", "6301-6"],
  ER_APTT: ["3173-2"],
  ER_UA: ["24356-8"],
  ER_BC: ["600-7"],
};

const CBC_CODES = new Set(["CBC", "ER_CBC", "CBC_DIFF", "NFS_DIFF"]);
const TROPONIN_CODES = new Set(["TROP", "TROPONIN", "ER_TROP"]);
const D_DIMER_CODES = new Set(["D_DIMER", "DDIMER", "ER_DDM"]);
const PT_INR_CODES = new Set(["PT_INR", "INR", "ER_PT_INR"]);
const APTT_CODES = new Set(["APTT", "TCA", "ER_APTT"]);
const URINALYSIS_CODES = new Set(["UA", "ER_UA"]);
const BLOOD_CULTURE_CODES = new Set(["BLOOD_CULTURE", "ER_BC"]);

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

function normalize(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  const stop = new Set([
    "a",
    "and",
    "avec",
    "de",
    "des",
    "du",
    "en",
    "for",
    "in",
    "la",
    "le",
    "les",
    "of",
    "or",
    "test",
    "the",
    "with",
  ]);
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !stop.has(token));
}

function arrayField(objectSource: string, field: string): string[] {
  const match = objectSource.match(new RegExp(`${field}\\s*:\\s*\\[([^\\]]*)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

function stringField(objectSource: string, field: string): string {
  const match = objectSource.match(new RegExp(`${field}\\s*:\\s*"([^"]*)"`));
  return match?.[1] ?? "";
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

  for (let i = arrayStart + 1; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") {
      depth += 1;
      inObject = true;
      current += ch;
      continue;
    }
    if (inObject) current += ch;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0 && inObject) {
        objects.push(current);
        current = "";
        inObject = false;
      }
    }
    if (ch === "]" && depth === 0 && !inObject) break;
  }

  return objects;
}

function readMedoraLabs(): MedoraLab[] {
  const haitiPath = path.resolve("apps/api/prisma/data/haiti-lab-tests.ts");
  const erPath = path.resolve("apps/api/prisma/data/er-us-lab-tests.ts");
  const haitiObjects = extractSeedObjects(readText(haitiPath), "HAITI_LAB_CATALOG");
  const erObjects = extractSeedObjects(readText(erPath), "US_ER_LAB_CATALOG");

  const labs = [
    ...haitiObjects.map((obj) => ({
      medoraCode: stringField(obj, "code"),
      displayNameEn: stringField(obj, "displayNameEn"),
      displayNameFr: stringField(obj, "displayNameFr"),
      aliases: arrayField(obj, "aliases"),
      searchText: stringField(obj, "searchText"),
    })),
    ...erObjects.map((obj) => ({
      medoraCode: stringField(obj, "code"),
      displayNameEn: stringField(obj, "displayNameEn"),
      displayNameFr: stringField(obj, "displayNameFr"),
      aliases: arrayField(obj, "aliases"),
      searchText: stringField(obj, "searchText"),
    })),
  ].filter((lab) => lab.medoraCode);

  const byCode = new Map<string, MedoraLab>();
  for (const lab of labs) {
    if (!byCode.has(lab.medoraCode)) byCode.set(lab.medoraCode, lab);
  }
  return [...byCode.values()];
}

function combinedLoincText(row: LoincRow): string {
  return [
    row.name,
    row.short,
    row.component,
    row.property,
    row.system,
    row.scale,
    row.method,
    row.class,
  ].filter(Boolean).join(" ");
}

function isMolecularLab(lab: MedoraLab): boolean {
  const text = normalize([lab.medoraCode, lab.displayNameEn, lab.displayNameFr, lab.aliases.join(" "), lab.searchText].join(" "));
  return /\b(pcr|naat|molecular|moleculaire|genetic|genotype|sequencing|sars|covid|hiv|hepatitis|hep)\b/.test(text);
}

function isPanelLab(lab: MedoraLab): boolean {
  const text = normalize([lab.medoraCode, lab.displayNameEn, lab.displayNameFr, lab.searchText].join(" "));
  return /\b(panel|cbc|bmp|cmp|urinalysis|ua|abg|vbg|gas|lipid)\b/.test(text);
}

function isMetabolicPanelLab(lab: MedoraLab): boolean {
  const medoraName = normalize([
    lab.medoraCode,
    lab.displayNameEn,
    lab.displayNameFr,
    lab.aliases.join(" "),
    lab.searchText,
  ].join(" "));
  return /\b(panel|cmp|bmp)\b/.test(medoraName);
}

function isCbcLab(lab: MedoraLab): boolean {
  if (CBC_CODES.has(lab.medoraCode)) return true;
  const medoraName = normalize([
    lab.medoraCode,
    lab.displayNameEn,
    lab.displayNameFr,
    lab.aliases.join(" "),
    lab.searchText,
  ].join(" "));
  return /\b(cbc|nfs|complete blood count|hemogramme)\b/.test(medoraName);
}

function isTroponinLab(lab: MedoraLab): boolean {
  if (TROPONIN_CODES.has(lab.medoraCode)) return true;
  const medoraName = normalize([
    lab.medoraCode,
    lab.displayNameEn,
    lab.displayNameFr,
    lab.aliases.join(" "),
    lab.searchText,
  ].join(" "));
  return /\b(troponin|troponine|trop)\b/.test(medoraName);
}

function isDimerLab(lab: MedoraLab): boolean {
  if (D_DIMER_CODES.has(lab.medoraCode)) return true;
  const medoraName = normalize([
    lab.medoraCode,
    lab.displayNameEn,
    lab.displayNameFr,
    lab.aliases.join(" "),
    lab.searchText,
  ].join(" "));
  return /\b(d dimer|dimeres|ddimer)\b/.test(medoraName);
}

function isPtInrLab(lab: MedoraLab): boolean {
  if (PT_INR_CODES.has(lab.medoraCode)) return true;
  const medoraName = normalize([
    lab.medoraCode,
    lab.displayNameEn,
    lab.displayNameFr,
    lab.aliases.join(" "),
    lab.searchText,
  ].join(" "));
  return /\b(pt inr|prothrombin|taux de prothrombine)\b/.test(medoraName);
}

function isApttLab(lab: MedoraLab): boolean {
  if (APTT_CODES.has(lab.medoraCode)) return true;
  const medoraName = normalize([
    lab.medoraCode,
    lab.displayNameEn,
    lab.displayNameFr,
    lab.aliases.join(" "),
    lab.searchText,
  ].join(" "));
  return /\b(aptt|ptt|thromboplastin|cephaline|tca)\b/.test(medoraName);
}

function isUrinalysisLab(lab: MedoraLab): boolean {
  if (URINALYSIS_CODES.has(lab.medoraCode)) return true;
  const medoraName = normalize([
    lab.medoraCode,
    lab.displayNameEn,
    lab.displayNameFr,
    lab.aliases.join(" "),
    lab.searchText,
  ].join(" "));
  return /\b(urinalysis|analyse d urine|urine)\b/.test(medoraName);
}

function isBloodCultureLab(lab: MedoraLab): boolean {
  if (BLOOD_CULTURE_CODES.has(lab.medoraCode)) return true;
  const medoraName = normalize([
    lab.medoraCode,
    lab.displayNameEn,
    lab.displayNameFr,
    lab.aliases.join(" "),
    lab.searchText,
  ].join(" "));
  return /\b(blood culture|hemoculture|bacteremia|sepsis culture)\b/.test(medoraName);
}

function excluded(row: LoincRow, lab: MedoraLab): boolean {
  const status = normalize(row.status);
  if (status && status !== "active" && status !== "trial") return true;

  const text = ` ${normalize(combinedLoincText(row))} `;
  const component = ` ${normalize(row.component)} `;
  const preferredCodes = PREFERRED_LOINCS_BY_MEDORA_CODE[lab.medoraCode] ?? [];
  if (/\b(deprecated|discouraged)\b/.test(text)) return true;
  if (/\b(animal|mouse|mice|rat|canine|dog|feline|cat|bovine|equine|porcine|veterinary)\b/.test(text)) return true;
  if (/\b(dialysis|hemodialysis|haemodialysis|peritoneal dialysis)\b/.test(text)) return true;
  if (/\b(parathyrin|parathyroid)\b/.test(component)) return true;
  if (isDimerLab(lab) && !/\b(fibrin d dimer|d dimer)\b/.test(text)) return true;
  if (
    isPtInrLab(lab) &&
    !preferredCodes.includes(row.loinc ?? "") &&
    !/\b(prothrombin time|inr|international normalized ratio)\b/.test(` ${normalize(row.name)} ${component} `)
  ) return true;
  if (
    isPtInrLab(lab) &&
    /\b(parathyrin|parathyroid|phosphatidylserine|fragment|antibody|ab|antigen|ag|factor substitution)\b/.test(text)
  ) return true;
  if (isApttLab(lab) && !preferredCodes.includes(row.loinc ?? "") && !/\b(thromboplastin|aptt|ptt)\b/.test(text)) return true;
  if (isUrinalysisLab(lab) && !preferredCodes.includes(row.loinc ?? "") && !/\b(urinalysis|urine)\b/.test(text)) return true;
  if (
    isBloodCultureLab(lab) &&
    !preferredCodes.includes(row.loinc ?? "") &&
    !(/\bblood\b|\bbld\b/.test(text) && /\bculture\b/.test(text))
  ) return true;
  if (!isMolecularLab(lab) && /\b(sequence|sequencing|gene|genetic|genotype|mutation|variant|allele)\b/.test(text)) return true;
  if (/\b(delta|change|trend|timing|interpretation|interpreted|interp|calculated|calculation|research)\b/.test(text)) return true;
  if (/\b(after|before|post|pre|challenge|baseline|peak|trough|random|fasting)\b/.test(text)) return true;

  return false;
}

function scoreCandidate(lab: MedoraLab, row: LoincRow): { score: number; reasons: string[] } {
  const labTerms = new Set([
    ...tokens(lab.medoraCode),
    ...tokens(lab.displayNameEn),
    ...tokens(lab.displayNameFr),
    ...lab.aliases.flatMap(tokens),
    ...(PANEL_PHRASES_BY_MEDORA_CODE[lab.medoraCode] ?? []).flatMap(tokens),
  ]);
  const searchTerms = new Set(tokens(lab.searchText));
  const rowName = normalize(row.name);
  const rowShort = normalize(row.short);
  const component = normalize(row.component);
  const rowClass = normalize(row.class);
  const system = normalize(row.system);
  const rowText = normalize(combinedLoincText(row));

  let score = 0;
  const reasons: string[] = [];

  if ((PREFERRED_PANEL_LOINCS_BY_MEDORA_CODE[lab.medoraCode] ?? []).includes(row.loinc ?? "")) {
    score += 200;
    reasons.push("preferred panel LOINC candidate");
  }
  if ((PREFERRED_LOINCS_BY_MEDORA_CODE[lab.medoraCode] ?? []).includes(row.loinc ?? "")) {
    score += 120;
    reasons.push("preferred reviewed LOINC candidate");
  }

  for (const term of labTerms) {
    if (component === term || rowName === term || rowShort === term) {
      score += 60;
      reasons.push(`exact term: ${term}`);
    } else if (component.startsWith(term) || rowName.startsWith(term) || rowShort.startsWith(term)) {
      score += 35;
      reasons.push(`prefix term: ${term}`);
    } else if (rowText.includes(term)) {
      score += 18;
      reasons.push(`contains term: ${term}`);
    }
  }

  for (const term of searchTerms) {
    if (rowText.includes(term)) score += 4;
  }

  if (isPanelLab(lab) && rowClass.includes("panel")) {
    score += 35;
    reasons.push("panel preferred");
  }
  if (isMetabolicPanelLab(lab) && rowClass.startsWith("panel") && component.includes("metabolic panel")) {
    score += 80;
    reasons.push("metabolic panel PANEL-class preferred");
  }
  if (isMetabolicPanelLab(lab) && rowClass.startsWith("panel chem")) {
    score += 45;
    reasons.push("PANEL.CHEM preferred");
  }
  if (isMetabolicPanelLab(lab) && /\b(basic metabolic panel|comprehensive metabolic panel)\b/.test(component)) {
    score += 70;
    reasons.push("metabolic panel component preferred");
  }
  if (isMetabolicPanelLab(lab) && /\b(creatinine clearance|gfr|glomerular filtration|urine|urinary)\b/.test(rowText)) {
    score -= 90;
    reasons.push("deprioritized nonstandard metabolic panel context");
  }
  if (isCbcLab(lab) && rowClass.startsWith("panel") && /\b(bld|blood)\b/.test(system)) {
    score += 70;
    reasons.push("CBC panel Blood preferred");
  }
  if (isCbcLab(lab) && /\b(complete blood count|cbc|hemogram)\b/.test(component)) {
    score += 55;
    reasons.push("CBC component preferred");
  }
  if (isCbcLab(lab) && /\b(auto|automated|differential|diff)\b/.test(rowText)) {
    score += 35;
    reasons.push("CBC auto differential preferred");
  }
  if (isTroponinLab(lab) && /\btroponin i\b/.test(component)) {
    score += 90;
    reasons.push("Troponin I preferred");
  }
  if (isTroponinLab(lab) && /\b(ser plas|serum plasma|blood|bld)\b/.test(system)) {
    score += 45;
    reasons.push("Troponin serum/plasma/blood preferred");
  }
  if (isTroponinLab(lab) && /\b(high sensitivity|high sensitive|hs)\b/.test(rowText)) {
    score += 35;
    reasons.push("high-sensitivity Troponin preferred");
  }
  if (isTroponinLab(lab) && /\b(qn|mass|mc nc|mcnc)\b/.test(rowText)) {
    score += 20;
    reasons.push("quantitative Troponin preferred");
  }
  if (isDimerLab(lab) && /\b(fibrin d dimer|d dimer)\b/.test(rowText)) {
    score += 85;
    reasons.push("D-dimer analyte preferred");
  }
  if (isDimerLab(lab) && /\b(bld|blood|ser plas|serum plasma|plasma)\b/.test(system)) {
    score += 35;
    reasons.push("D-dimer blood/plasma preferred");
  }
  if (isDimerLab(lab) && rowClass.includes("coag")) {
    score += 25;
    reasons.push("D-dimer coagulation class preferred");
  }
  if (isPtInrLab(lab) && /\bprothrombin\b/.test(rowText)) {
    score += 110;
    reasons.push("PT/INR prothrombin meaning preferred");
  }
  if (isPtInrLab(lab) && /\b(inr|international normalized ratio)\b/.test(rowText)) {
    score += 90;
    reasons.push("PT/INR INR meaning preferred");
  }
  if (isPtInrLab(lab) && rowClass.includes("coag")) {
    score += 35;
    reasons.push("PT/INR coagulation class preferred");
  }
  if (isApttLab(lab) && /\b(activated partial thromboplastin|aptt|ptt)\b/.test(rowText)) {
    score += 120;
    reasons.push("aPTT thromboplastin meaning preferred");
  }
  if (isApttLab(lab) && rowClass.includes("coag")) {
    score += 35;
    reasons.push("aPTT coagulation class preferred");
  }
  if (isUrinalysisLab(lab) && component.includes("urinalysis complete panel")) {
    score += 120;
    reasons.push("urinalysis complete panel preferred");
  }
  if (isUrinalysisLab(lab) && rowClass.includes("panel ua")) {
    score += 45;
    reasons.push("urinalysis panel class preferred");
  }
  if (isBloodCultureLab(lab) && component === "bacteria" && /\bbld\b|\bblood\b/.test(system) && rowText.includes("culture")) {
    score += 130;
    reasons.push("blood culture bacteria preferred");
  }
  if (isBloodCultureLab(lab) && rowClass.includes("micro")) {
    score += 35;
    reasons.push("blood culture microbiology class preferred");
  }
  if (system.includes("ser plas") || system === "bld" || system.includes("blood")) {
    score += 20;
    reasons.push("preferred common blood system");
  }
  if (rowClass.includes("chem") || rowClass.includes("hematology") || rowClass.includes("coag") || rowClass.includes("micro")) {
    score += 8;
    reasons.push("lab class match");
  }

  return { score, reasons: [...new Set(reasons)].slice(0, 6) };
}

function main() {
  const loincPath = path.resolve(process.env.HOME!, "medora-data/processed/loinc.json");
  const outPath = path.resolve(process.env.HOME!, "medora-data/processed/medora-lab-loinc-candidates.json");
  const labs = readMedoraLabs();
  const loincRows = readJson<LoincRow[]>(loincPath);

  const output = labs.map((lab) => {
    const candidates: LoincCandidate[] = [];
    for (const row of loincRows) {
      if (!row.loinc || excluded(row, lab)) continue;
      const scored = scoreCandidate(lab, row);
      if (scored.score < 40) continue;
      candidates.push({
        loinc: row.loinc,
        name: row.name ?? "",
        component: row.component ?? "",
        system: row.system ?? "",
        class: row.class ?? "",
        score: scored.score,
        reason: scored.reasons.join("; "),
      });
    }

    candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return {
      medoraCode: lab.medoraCode,
      displayNameEn: lab.displayNameEn,
      displayNameFr: lab.displayNameFr,
      aliases: lab.aliases,
      candidates: candidates.slice(0, 10),
    };
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  const totalCandidates = output.reduce((sum, row) => sum + row.candidates.length, 0);
  const labsWithCandidates = output.filter((row) => row.candidates.length > 0).length;
  console.log(`Read ${labs.length} Medora lab rows`);
  console.log(`Read ${loincRows.length} LOINC rows`);
  console.log(`Wrote ${output.length} lab candidate groups to ${outPath}`);
  console.log(`Candidate groups with results: ${labsWithCandidates}`);
  console.log(`Total top candidates written: ${totalCandidates}`);
}

main();
