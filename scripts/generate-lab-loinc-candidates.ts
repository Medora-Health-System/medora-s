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

function excluded(row: LoincRow, lab: MedoraLab): boolean {
  const status = normalize(row.status);
  if (status && status !== "active" && status !== "trial") return true;

  const text = ` ${normalize(combinedLoincText(row))} `;
  if (/\b(deprecated|discouraged)\b/.test(text)) return true;
  if (/\b(animal|mouse|mice|rat|canine|dog|feline|cat|bovine|equine|porcine|veterinary)\b/.test(text)) return true;
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
