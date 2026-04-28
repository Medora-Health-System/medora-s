import * as fs from "fs";
import * as path from "path";

type MedoraMedication = {
  code: string;
  genericName: string;
  displayNameEn: string;
  displayNameFr: string;
  strength: string;
  dosageForm: string;
  route: string;
  aliases: string[];
};

type EdMedicationTerm = {
  genericName: string;
  aliases: string[];
  routeHints: string[];
};

type HcpcsCandidate = {
  code: string;
  description: string;
  short: string;
  billingUnit?: string;
  sourceFile: string;
};

type NdcCandidate = {
  ndc: string;
  productNdc?: string;
  packageNdc?: string;
  genericName?: string;
  brandName?: string;
  dosageForm?: string;
  route?: string;
  strength?: string;
  sourceFile: string;
};

type EdMedicationCandidate = {
  genericName: string;
  commonBrandAliases: string[];
  routeCandidates: string[];
  dosageForm: string[];
  strengthCandidates: string[];
  ndcCandidates: NdcCandidate[];
  hcpcsCandidates: HcpcsCandidate[];
  alreadyInMedora: "yes" | "no";
  confidence: "high" | "medium" | "low";
  needsClinicalReview: boolean;
};

const processedDir = path.resolve(process.env.HOME!, "medora-data/processed");
const outputPath = path.resolve(processedDir, "medora-ed-medication-candidates.json");
const medoraMedicationSource = path.resolve(
  process.cwd(),
  "apps/api/prisma/data/haiti-medications.ts",
);

const ED_MEDICATION_TERMS: EdMedicationTerm[] = [
  { genericName: "Metoprolol", aliases: ["Lopressor", "Toprol XL", "metoprolol tartrate"], routeHints: ["orale", "intraveineuse"] },
  { genericName: "Propofol", aliases: ["Diprivan"], routeHints: ["intraveineuse"] },
  { genericName: "Midazolam", aliases: ["Versed"], routeHints: ["intraveineuse", "intramusculaire", "intranasale"] },
  { genericName: "Rocuronium", aliases: ["Zemuron"], routeHints: ["intraveineuse"] },
  { genericName: "Succinylcholine", aliases: ["Anectine", "suxamethonium"], routeHints: ["intraveineuse", "intramusculaire"] },
  { genericName: "Etomidate", aliases: ["Amidate"], routeHints: ["intraveineuse"] },
  { genericName: "Ketamine", aliases: ["Ketalar"], routeHints: ["intraveineuse", "intramusculaire", "intranasale"] },
  { genericName: "Fentanyl", aliases: ["Sublimaze"], routeHints: ["intraveineuse", "intramusculaire", "intranasale"] },
  { genericName: "Morphine", aliases: ["morphine sulfate"], routeHints: ["intraveineuse", "intramusculaire", "sous-cutanée"] },
  { genericName: "Hydromorphone", aliases: ["Dilaudid"], routeHints: ["intraveineuse", "intramusculaire", "sous-cutanée"] },
  { genericName: "Lorazepam", aliases: ["Ativan"], routeHints: ["intraveineuse", "intramusculaire", "orale"] },
  { genericName: "Haloperidol", aliases: ["Haldol"], routeHints: ["intraveineuse", "intramusculaire", "orale"] },
  { genericName: "Droperidol", aliases: ["Inapsine"], routeHints: ["intraveineuse", "intramusculaire"] },
  { genericName: "Epinephrine", aliases: ["Adrenalin", "Adrenaline"], routeHints: ["intraveineuse", "intramusculaire", "sous-cutanée", "inhalation"] },
  { genericName: "Norepinephrine", aliases: ["Levophed", "noradrenaline"], routeHints: ["intraveineuse"] },
  { genericName: "Phenylephrine", aliases: ["Neo-Synephrine"], routeHints: ["intraveineuse"] },
  { genericName: "Vasopressin", aliases: ["Pitressin"], routeHints: ["intraveineuse"] },
  { genericName: "Dopamine", aliases: ["Intropin"], routeHints: ["intraveineuse"] },
  { genericName: "Dobutamine", aliases: ["Dobutrex"], routeHints: ["intraveineuse"] },
  { genericName: "Amiodarone", aliases: ["Cordarone", "Pacerone"], routeHints: ["intraveineuse", "orale"] },
  { genericName: "Adenosine", aliases: ["Adenocard"], routeHints: ["intraveineuse"] },
  { genericName: "Labetalol", aliases: ["Trandate"], routeHints: ["intraveineuse", "orale"] },
  { genericName: "Nicardipine", aliases: ["Cardene"], routeHints: ["intraveineuse", "orale"] },
  { genericName: "Ceftriaxone", aliases: ["Rocephin"], routeHints: ["intraveineuse", "intramusculaire"] },
  { genericName: "Cefazolin", aliases: ["Ancef", "Kefzol"], routeHints: ["intraveineuse", "intramusculaire"] },
  { genericName: "Cefepime", aliases: ["Maxipime"], routeHints: ["intraveineuse", "intramusculaire"] },
  { genericName: "Vancomycin", aliases: ["Vancocin"], routeHints: ["intraveineuse", "orale"] },
  { genericName: "Piperacillin-tazobactam", aliases: ["Zosyn", "piperacillin tazobactam", "piperacillin and tazobactam"], routeHints: ["intraveineuse"] },
  { genericName: "Insulin", aliases: ["regular insulin", "insulin regular", "Humulin R", "Novolin R"], routeHints: ["intraveineuse", "sous-cutanée"] },
  { genericName: "Heparin", aliases: ["heparin sodium", "héparine"], routeHints: ["intraveineuse", "sous-cutanée"] },
  { genericName: "Potassium chloride", aliases: ["KCl", "potassium"], routeHints: ["intraveineuse", "orale"] },
  { genericName: "Magnesium sulfate", aliases: ["MgSO4", "magnesium"], routeHints: ["intraveineuse", "intramusculaire"] },
  { genericName: "Calcium gluconate", aliases: ["calcium"], routeHints: ["intraveineuse"] },
  { genericName: "Sodium bicarbonate", aliases: ["bicarbonate", "sodium bicarb"], routeHints: ["intraveineuse", "orale"] },
  { genericName: "Naloxone", aliases: ["Narcan"], routeHints: ["intraveineuse", "intramusculaire", "intranasale"] },
  { genericName: "Ondansetron", aliases: ["Zofran"], routeHints: ["intraveineuse", "intramusculaire", "orale"] },
  { genericName: "Metoclopramide", aliases: ["Reglan", "Primperan"], routeHints: ["intraveineuse", "intramusculaire", "orale"] },
  { genericName: "Pantoprazole", aliases: ["Protonix"], routeHints: ["intraveineuse", "orale"] },
];

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

function unique<T>(values: T[]): T[] {
  return [...new Set(values.filter(Boolean))];
}

function stringField(objectSource: string, field: string): string {
  const match = objectSource.match(new RegExp(`${field}\\s*:\\s*"([^"]*)"`));
  return match?.[1] ?? "";
}

function arrayField(objectSource: string, field: string): string[] {
  const match = objectSource.match(new RegExp(`${field}\\s*:\\s*A?\\(\\[([^\\]]*)\\]\\)`));
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
    if (char === "{" && depth === 0) {
      inObject = true;
      current = "";
    }
    if (inObject) current += char;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && inObject) {
        objects.push(current);
        inObject = false;
      }
    }
    if (char === "]" && depth === 0 && !inObject) break;
  }

  return objects;
}

function readMedoraCatalog(): MedoraMedication[] {
  const source = readText(medoraMedicationSource);
  return extractSeedObjects(source, "HAITI_MEDICATION_CATALOG").map((obj) => ({
    code: stringField(obj, "code"),
    genericName: stringField(obj, "genericName"),
    displayNameEn: stringField(obj, "displayNameEn"),
    displayNameFr: stringField(obj, "displayNameFr"),
    strength: stringField(obj, "strength"),
    dosageForm: stringField(obj, "dosageForm"),
    route: stringField(obj, "route"),
    aliases: arrayField(obj, "commonAliases"),
  }));
}

function discoverJsonFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return discoverJsonFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".json") ? [fullPath] : [];
  });
}

function valueAsString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(valueAsString).filter(Boolean).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(valueAsString).filter(Boolean).join(" ");
  }
  return "";
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["results", "data", "products", "items", "records"]) {
      if (Array.isArray(record[key])) return asRecordArray(record[key]);
    }
  }
  return [];
}

function termHaystack(term: EdMedicationTerm): string {
  return normalize([term.genericName, ...term.aliases].join(" "));
}

function matchesTerm(term: EdMedicationTerm, text: string): boolean {
  const normalized = ` ${normalize(text)} `;
  const names = [term.genericName, ...term.aliases].map(normalize).filter(Boolean);
  return names.some((name) => normalized.includes(` ${name} `));
}

function dosageFormFromText(text: string): string {
  const normalized = normalize(text);
  if (/\b(injection|injectable|inj|intravenous|iv|infusion)\b/.test(normalized)) return "injectable";
  if (/\b(tablet|tab|capsule|cap|oral)\b/.test(normalized)) return "oral";
  if (/\b(nasal|spray)\b/.test(normalized)) return "spray nasal";
  if (/\b(solution|soln)\b/.test(normalized)) return "solution";
  return "";
}

function strengthFromText(text: string): string[] {
  const matches = text.match(/\b\d+(?:\.\d+)?\s?(?:mg|mcg|g|units?|iu|ui|meq|%)(?:\s?\/\s?\d+(?:\.\d+)?\s?(?:ml|mL|l|L))?\b/gi);
  return unique(matches ?? []);
}

function readHcpcsCandidates(files: string[]): HcpcsCandidate[] {
  const candidates: HcpcsCandidate[] = [];
  for (const file of files.filter((candidate) => fs.existsSync(candidate))) {
    const rows = asRecordArray(readJson<unknown>(file));
    for (const row of rows) {
      const variants = asRecordArray(row.variants);
      if (variants.length > 0) {
        for (const variant of variants) {
          candidates.push({
            code: valueAsString(variant.code),
            description: valueAsString(variant.description),
            short: valueAsString(variant.short),
            billingUnit: valueAsString(row.billingUnits),
            sourceFile: path.basename(file),
          });
        }
      } else {
        candidates.push({
          code: valueAsString(row.code),
          description: valueAsString(row.description ?? row.name),
          short: valueAsString(row.short),
          billingUnit: valueAsString(row.billingUnits),
          sourceFile: path.basename(file),
        });
      }
    }
  }
  return candidates.filter((candidate) => candidate.code || candidate.description || candidate.short);
}

function readNdcCandidates(files: string[]): NdcCandidate[] {
  const ndcFiles = files.filter((file) => /\b(ndc|fda|openfda|drug)\b/i.test(path.basename(file)));
  const candidates: NdcCandidate[] = [];
  for (const file of ndcFiles) {
    const rows = asRecordArray(readJson<unknown>(file));
    for (const row of rows) {
      const activeIngredients = asRecordArray(row.active_ingredients ?? row.activeIngredients);
      const activeIngredientText = activeIngredients.map(valueAsString).join(" ");
      const productNdc = valueAsString(row.product_ndc ?? row.productNdc);
      const packageNdc = valueAsString(row.package_ndc ?? row.packageNdc);
      const ndc = valueAsString(row.ndc ?? row.ndc11 ?? row.ndcCode) || packageNdc || productNdc;
      if (!ndc) continue;
      candidates.push({
        ndc,
        productNdc,
        packageNdc,
        genericName: valueAsString(row.generic_name ?? row.genericName ?? row.nonproprietary_name ?? row.nonproprietaryName ?? activeIngredientText),
        brandName: valueAsString(row.brand_name ?? row.brandName ?? row.proprietary_name ?? row.proprietaryName),
        dosageForm: valueAsString(row.dosage_form ?? row.dosageForm),
        route: valueAsString(row.route ?? row.routes),
        strength: valueAsString(row.strength ?? activeIngredients.map((ingredient) => valueAsString(ingredient.strength)).filter(Boolean)),
        sourceFile: path.basename(file),
      });
    }
  }
  return candidates;
}

function candidateText(candidate: HcpcsCandidate | NdcCandidate): string {
  return valueAsString(candidate);
}

function dedupeHcpcs(candidates: HcpcsCandidate[]): HcpcsCandidate[] {
  const byKey = new Map<string, HcpcsCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.code}|${normalize(candidate.description)}|${normalize(candidate.short)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, candidate);
      continue;
    }
    byKey.set(key, {
      ...existing,
      billingUnit: existing.billingUnit || candidate.billingUnit,
      sourceFile: unique([...existing.sourceFile.split(", "), candidate.sourceFile]).join(", "),
    });
  }
  return [...byKey.values()];
}

function dedupeNdc(candidates: NdcCandidate[]): NdcCandidate[] {
  const byNdc = new Map<string, NdcCandidate>();
  for (const candidate of candidates) {
    if (!byNdc.has(candidate.ndc)) byNdc.set(candidate.ndc, candidate);
  }
  return [...byNdc.values()];
}

function medoraMatches(term: EdMedicationTerm, medoraCatalog: MedoraMedication[]): MedoraMedication[] {
  return medoraCatalog.filter((item) =>
    matchesTerm(term, [
      item.genericName,
      item.displayNameEn,
      item.displayNameFr,
      item.code,
      item.aliases.join(" "),
    ].join(" ")),
  );
}

function confidenceFor(alreadyInMedora: boolean, hcpcsCount: number, ndcCount: number): "high" | "medium" | "low" {
  if (alreadyInMedora && (hcpcsCount > 0 || ndcCount > 0)) return "high";
  if (alreadyInMedora || hcpcsCount > 0 || ndcCount > 0) return "medium";
  return "low";
}

function main() {
  const medoraCatalog = readMedoraCatalog();
  const jsonFiles = discoverJsonFiles(processedDir);
  const hcpcsFiles = [
    path.join(processedDir, "medora-er-medication-hcpcs-candidates.json"),
    path.join(processedDir, "hcpcs-jcode-drug-candidates.json"),
    path.join(processedDir, "medora-medications-v2.json"),
  ];
  const hcpcsCandidates = readHcpcsCandidates(hcpcsFiles);
  const ndcCandidates = readNdcCandidates(jsonFiles);

  const output: EdMedicationCandidate[] = ED_MEDICATION_TERMS.map((term) => {
    const medoraItems = medoraMatches(term, medoraCatalog);
    const matchingHcpcs = dedupeHcpcs(
      hcpcsCandidates.filter((candidate) => matchesTerm(term, candidateText(candidate))),
    ).slice(0, 20);
    const matchingNdc = dedupeNdc(
      ndcCandidates.filter((candidate) => matchesTerm(term, candidateText(candidate))),
    ).slice(0, 20);
    const dosageForms = unique([
      ...medoraItems.map((item) => item.dosageForm),
      ...matchingNdc.map((candidate) => candidate.dosageForm ?? ""),
      ...matchingHcpcs.map((candidate) => dosageFormFromText(`${candidate.description} ${candidate.short}`)),
    ]);
    const strengths = unique([
      ...medoraItems.map((item) => item.strength),
      ...matchingNdc.map((candidate) => candidate.strength ?? ""),
      ...matchingHcpcs.flatMap((candidate) => [
        ...(candidate.billingUnit ? [candidate.billingUnit] : []),
        ...strengthFromText(`${candidate.description} ${candidate.short}`),
      ]),
    ]);
    const routeCandidates = unique([
      ...term.routeHints,
      ...medoraItems.map((item) => item.route),
      ...matchingNdc.map((candidate) => candidate.route ?? ""),
    ]);
    const alreadyInMedora = medoraItems.length > 0;

    return {
      genericName: term.genericName,
      commonBrandAliases: term.aliases,
      routeCandidates,
      dosageForm: dosageForms,
      strengthCandidates: strengths,
      ndcCandidates: matchingNdc,
      hcpcsCandidates: matchingHcpcs,
      alreadyInMedora: alreadyInMedora ? "yes" : "no",
      confidence: confidenceFor(alreadyInMedora, matchingHcpcs.length, matchingNdc.length),
      needsClinicalReview: true,
    };
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`Read ${medoraCatalog.length} Medora medication rows`);
  console.log(`Read ${hcpcsCandidates.length} HCPCS candidate rows`);
  console.log(`Read ${ndcCandidates.length} NDC candidate rows from discoverable processed FDA/NDC files`);
  console.log(`Wrote ${output.length} ED medication candidate groups to ${outputPath}`);
  console.log(`Already in Medora: ${output.filter((candidate) => candidate.alreadyInMedora === "yes").length}`);
  console.log(`With HCPCS candidates: ${output.filter((candidate) => candidate.hcpcsCandidates.length > 0).length}`);
  console.log(`With NDC candidates: ${output.filter((candidate) => candidate.ndcCandidates.length > 0).length}`);
}

main();
