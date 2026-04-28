import * as fs from "fs";
import * as path from "path";

type MedoraLab = {
  medoraCode: string;
  displayNameEn: string;
  billingCodeDefault: string;
  aliases: string[];
  searchText: string;
};

type ClfsRow = {
  code?: string;
  description?: string;
  rate?: string;
};

type ValidationStatus = "valid" | "missing_code" | "not_found" | "needs_review";

type ValidationRow = {
  medoraCode: string;
  displayNameEn: string;
  billingCodeDefault: string;
  clfsFound: boolean;
  clfsDescription: string;
  clfsRate: string;
  status: ValidationStatus;
  notes: string;
};

const haitiLabPath = path.resolve("apps/api/prisma/data/haiti-lab-tests.ts");
const erLabPath = path.resolve("apps/api/prisma/data/er-us-lab-tests.ts");
const clfsPath = path.resolve(process.env.HOME!, "medora-data/processed/clfs.json");
const outPath = path.resolve(process.env.HOME!, "medora-data/processed/medora-lab-clfs-validation.json");

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
    "blood",
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
    "serum",
    "test",
    "the",
    "urine",
    "with",
  ]);
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stop.has(token));
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

function readMedoraLabs(): MedoraLab[] {
  const haitiObjects = extractSeedObjects(readText(haitiLabPath), "HAITI_LAB_CATALOG");
  const erObjects = extractSeedObjects(readText(erLabPath), "US_ER_LAB_CATALOG");
  const labs = [
    ...haitiObjects.map((obj) => ({
      medoraCode: stringField(obj, "code"),
      displayNameEn: stringField(obj, "displayNameEn"),
      billingCodeDefault: stringField(obj, "billingCodeDefault"),
      aliases: arrayField(obj, "aliases"),
      searchText: stringField(obj, "searchText"),
    })),
    ...erObjects.map((obj) => ({
      medoraCode: stringField(obj, "code"),
      displayNameEn: stringField(obj, "displayNameEn") || stringField(obj, "nameEn"),
      billingCodeDefault: stringField(obj, "billingCodeDefault"),
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

const expectedDescriptionTermsByCode: Record<string, string[]> = {
  ER_BMP: ["basic", "metabolic"],
  ER_CMP: ["comprehensive", "metabolic"],
  ER_DDM: ["fibrin", "degradation"],
  ER_PT_INR: ["prothrombin"],
  ER_APTT: ["thromboplastin", "partial"],
  ER_ABG: ["blood", "ph"],
  ER_VBG: ["blood", "ph"],
  ER_BNP: ["natriuretic"],
  ER_CRP: ["reactive", "protein"],
  ER_BLOOD_TYPE: ["blood", "typing", "abo"],
};

function looksMismatched(lab: MedoraLab, clfs: ClfsRow): boolean {
  const labTokens = tokens(`${lab.medoraCode} ${lab.displayNameEn} ${lab.aliases.join(" ")} ${lab.searchText}`);
  const description = normalize(clfs.description);
  if (labTokens.length === 0 || !description) return false;

  const expectedTerms = expectedDescriptionTermsByCode[lab.medoraCode] ?? [];
  const meaningfulMatches = [...labTokens, ...expectedTerms].filter((token) => description.includes(normalize(token)));
  return meaningfulMatches.length === 0;
}

function validateLab(lab: MedoraLab, clfsByCode: Map<string, ClfsRow>): ValidationRow {
  const billingCodeDefault = lab.billingCodeDefault.trim();
  if (!billingCodeDefault) {
    return {
      medoraCode: lab.medoraCode,
      displayNameEn: lab.displayNameEn,
      billingCodeDefault,
      clfsFound: false,
      clfsDescription: "",
      clfsRate: "",
      status: "missing_code",
      notes: "No billingCodeDefault on Medora lab row.",
    };
  }

  const clfs = clfsByCode.get(billingCodeDefault);
  if (!clfs) {
    return {
      medoraCode: lab.medoraCode,
      displayNameEn: lab.displayNameEn,
      billingCodeDefault,
      clfsFound: false,
      clfsDescription: "",
      clfsRate: "",
      status: "not_found",
      notes: "billingCodeDefault was not found by exact code match in parsed CLFS JSON.",
    };
  }

  const mismatch = looksMismatched(lab, clfs);
  return {
    medoraCode: lab.medoraCode,
    displayNameEn: lab.displayNameEn,
    billingCodeDefault,
    clfsFound: true,
    clfsDescription: clfs.description ?? "",
    clfsRate: clfs.rate ?? "",
    status: mismatch ? "needs_review" : "valid",
    notes: mismatch
      ? "CLFS code exists, but the CLFS description did not share meaningful terms with the Medora lab label."
      : "Exact code found in CLFS.",
  };
}

function main() {
  const labs = readMedoraLabs();
  const clfsRows = readJson<ClfsRow[]>(clfsPath);
  const clfsByCode = new Map(
    clfsRows
      .filter((row) => row.code)
      .map((row) => [String(row.code).trim().toUpperCase(), row] as const),
  );

  const output = labs.map((lab) =>
    validateLab(
      {
        ...lab,
        billingCodeDefault: lab.billingCodeDefault.trim().toUpperCase(),
      },
      clfsByCode,
    ),
  );

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  const count = (status: ValidationStatus) => output.filter((row) => row.status === status).length;
  console.log(`Wrote ${output.length} lab CLFS validation rows to ${outPath}`);
  console.log(`valid: ${count("valid")}`);
  console.log(`missing_code: ${count("missing_code")}`);
  console.log(`not_found: ${count("not_found")}`);
  console.log(`needs_review: ${count("needs_review")}`);
}

main();
