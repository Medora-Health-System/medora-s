import * as fs from "fs";
import * as path from "path";

type MedoraMedication = {
  medoraCode: string;
  genericName: string;
  displayNameEn: string;
  strength: string;
  dosageForm: string;
  route: string;
  aliases: string[];
};

type FdaNdcIngredient = {
  name?: string;
  strength?: string;
};

type FdaNdcPackage = {
  packageNdc?: string;
  description?: string;
};

type FdaNdcProduct = {
  productNdc?: string;
  genericName?: string;
  brandName?: string;
  dosageForm?: string;
  route?: string[];
  activeIngredients?: FdaNdcIngredient[];
  packages?: FdaNdcPackage[];
  productType?: string;
  marketingStatus?: string;
  listingExpirationDate?: string;
};

type NdcCandidate = {
  productNdc: string;
  brandName: string;
  genericName: string;
  dosageForm: string;
  route: string[];
  activeIngredients: FdaNdcIngredient[];
  packages: FdaNdcPackage[];
  score: number;
  reason: string;
};

type OutputRow = MedoraMedication & {
  candidates: NdcCandidate[];
  status: "strong" | "review" | "no_candidate";
};

const medoraMedicationSource = path.resolve("apps/api/prisma/data/haiti-medications.ts");
const fdaNdcPath = path.resolve(process.env.HOME!, "medora-data/processed/fda-ndc.json");
const outPath = path.resolve(process.env.HOME!, "medora-data/processed/medora-medication-ndc-candidates.json");

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

function containsPhrase(haystack: string, phrase: string): boolean {
  const normalizedHaystack = normalize(haystack);
  const normalizedPhrase = normalize(phrase);
  return normalizedPhrase.length > 0 && ` ${normalizedHaystack} `.includes(` ${normalizedPhrase} `);
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

function deriveMedicationCode(row: {
  genericName: string;
  strength: string;
  dosageForm: string;
  route: string;
}): string {
  const generic = row.genericName
    .toUpperCase()
    .replace(/\s*\+\s*/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

  const strength = row.strength
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/\//g, "_PER_")
    .replace(/,/g, "")
    .replace(/[^A-Z0-9_.]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "0";

  const formMap: Record<string, string> = {
    "comprimé": "COMPRIME",
    "gélule": "CAPSULE",
    capsule: "CAPSULE",
    "suspension buvable": "SUSPENSION_BUVABLE",
    sirop: "SIROP",
    suppositoire: "SUPPOSITOIRE",
    injectable: "INJECTABLE",
    perfusion: "PERFUSION",
    "crème": "CREME",
    pommade: "POMMADE",
    lotion: "LOTION",
    ovule: "OVULE",
    shampooing: "SHAMPOOING",
    inhalateur: "INHALATEUR",
    "solution de nébulisation": "SOLUTION_NEBULISATION",
    collyre: "COLLYRE",
    "pommade ophtalmique": "POMMADE_OPHTALMIQUE",
    "spray nasal": "SPRAY_NASAL",
    "poudre pour solution buvable": "POUDRE_SOLUTION_BUVABLE",
    "comprimé dispersible": "COMPRIME_DISPERSIBLE",
  };
  const formRaw = row.dosageForm.trim().toLowerCase();
  const form = formMap[formRaw] ?? formRaw.replace(/\s+/g, "_").toUpperCase().replace(/[^A-Z0-9_]/g, "");

  const routeMap: Record<string, string> = {
    orale: "ORAL",
    oral: "ORAL",
    injectable: "INJECTION",
    "injectable-intramusculaire": "INTRAMUSCULAR",
    intramusculaire: "INTRAMUSCULAR",
    intraveineuse: "INTRAVENOUS",
    rectale: "RECTAL",
    topique: "TOPICAL",
    vaginale: "VAGINAL",
    ophtalmique: "OPHTHALMIC",
    nasale: "NASAL",
    "sous-cutanée": "SUBCUTANEOUS",
    "sous-cutanee": "SUBCUTANEOUS",
    inhalée: "INHALATION",
    inhalee: "INHALATION",
  };
  const routeRaw = row.route.trim().toLowerCase().normalize("NFD").replace(/\u0301/g, "").replace(/é/g, "e");
  const route = routeMap[routeRaw] ?? routeRaw.replace(/\s+/g, "_").toUpperCase().replace(/[^A-Z0-9_]/g, "");

  return [generic, strength, form, route].filter(Boolean).join("_").replace(/_+/g, "_");
}

function resolveDisplayNameEn(row: { genericName: string; displayNameEn?: string }): string {
  if (row.displayNameEn?.trim()) return row.displayNameEn.trim();
  const mapped: Record<string, string> = {
    Paracetamol: "Acetaminophen",
    Salbutamol: "Albuterol",
    Adrenaline: "Epinephrine",
    "Ringer Lactate": "Lactated Ringer's",
    "Normal Saline": "Normal saline",
    "Regular Insulin": "Insulin (regular)",
    "NPH Insulin": "NPH insulin",
    "Insulin 70/30": "Insulin 70/30",
  };
  return mapped[row.genericName] ?? row.genericName;
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

function readMedoraMedications(): MedoraMedication[] {
  return extractSeedObjects(readText(medoraMedicationSource), "HAITI_MEDICATION_CATALOG")
    .map((obj) => {
      const row = {
        genericName: stringField(obj, "genericName"),
        displayNameEn: stringField(obj, "displayNameEn"),
        strength: stringField(obj, "strength"),
        dosageForm: stringField(obj, "dosageForm"),
        route: stringField(obj, "route"),
      };

      return {
        medoraCode: stringField(obj, "code") || deriveMedicationCode(row),
        ...row,
        displayNameEn: resolveDisplayNameEn(row),
        aliases: arrayField(obj, "commonAliases"),
      };
    })
    .filter((row) => row.genericName);
}

function canonicalGenericName(row: MedoraMedication): string {
  return row.displayNameEn || row.genericName;
}

function isMedoraCombo(row: MedoraMedication): boolean {
  const text = normalize([row.genericName, row.displayNameEn, row.aliases.join(" ")].join(" "));
  return /(\b70\b.*\b30\b|\band\b|\bwith\b|\btazobactam\b|\bclavulanate\b|\btrimethoprim\b|\bsulfamethoxazole\b)/i.test(text);
}

function isProductCombo(product: FdaNdcProduct): boolean {
  return (product.activeIngredients ?? []).length > 1 || /(\+|\/|\band\b|\bwith\b)/i.test(product.genericName ?? "");
}

function routeTerms(route: string): string[] {
  const normalized = normalize(route);
  if (/\b(intraveineuse|iv|injectable|perfusion)\b/.test(normalized)) return ["INTRAVENOUS", "INTRAMUSCULAR", "SUBCUTANEOUS"];
  if (/\b(oral|orale|comprime|gelule|sirop|suspension buvable)\b/.test(normalized)) return ["ORAL"];
  if (/\b(topique|creme|lotion)\b/.test(normalized)) return ["TOPICAL"];
  if (/\b(rectale|suppositoire)\b/.test(normalized)) return ["RECTAL"];
  return [];
}

function dosageFormTerms(dosageForm: string): string[] {
  const normalized = normalize(dosageForm);
  if (/\b(injectable|perfusion)\b/.test(normalized)) return ["INJECTION", "SOLUTION"];
  if (/\b(comprime)\b/.test(normalized)) return ["TABLET"];
  if (/\b(gelule)\b/.test(normalized)) return ["CAPSULE"];
  if (/\b(sirop|suspension)\b/.test(normalized)) return ["SOLUTION", "SUSPENSION"];
  if (/\b(creme)\b/.test(normalized)) return ["CREAM"];
  if (/\b(lotion)\b/.test(normalized)) return ["LOTION"];
  if (/\b(suppositoire)\b/.test(normalized)) return ["SUPPOSITORY"];
  return [];
}

function strengthTokens(strength: string): string[] {
  const normalized = normalize(strength)
    .replace(/\bui\b/g, "unit")
    .replace(/\bmcg\b/g, "ug");
  return normalized
    .split(/\s+/)
    .filter((token) => /^\d+(?:\.\d+)?$/.test(token) || ["mg", "g", "ml", "ug", "unit", "percent"].includes(token));
}

function activeIngredientText(product: FdaNdcProduct): string {
  return (product.activeIngredients ?? []).map((ingredient) => `${ingredient.name ?? ""} ${ingredient.strength ?? ""}`).join(" ");
}

function meaningfulTokens(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !["and", "with", "the", "for"].includes(token));
}

function isExpired(product: FdaNdcProduct): boolean {
  const date = product.listingExpirationDate ?? "";
  return /^\d{8}$/.test(date) && date < "20260428";
}

function scoreCandidate(row: MedoraMedication, product: FdaNdcProduct): { score: number; reasons: string[] } {
  const medoraName = canonicalGenericName(row);
  const productGeneric = product.genericName ?? "";
  const ingredientText = activeIngredientText(product);
  const productText = [productGeneric, product.brandName, ingredientText].join(" ");
  const rowAliases = row.aliases.join(" ");

  let score = 0;
  const reasons: string[] = [];

  if (normalize(productGeneric) === normalize(medoraName) || normalize(productGeneric) === normalize(row.genericName)) {
    score += 90;
    reasons.push("exact generic name");
  } else if (containsPhrase(productGeneric, medoraName) || containsPhrase(medoraName, productGeneric)) {
    score += 60;
    reasons.push("generic name contains");
  } else if (meaningfulTokens(medoraName).length > 0 && meaningfulTokens(medoraName).every((token) => meaningfulTokens(productGeneric).includes(token))) {
    score += 65;
    reasons.push("generic ingredient words match");
  } else if (containsPhrase(ingredientText, medoraName) || containsPhrase(ingredientText, row.genericName)) {
    score += 55;
    reasons.push("active ingredient match");
  } else if (row.aliases.some((alias) => containsPhrase(productText, alias))) {
    score += 30;
    reasons.push("alias match");
  } else {
    return { score: 0, reasons: [] };
  }

  const rowStrengthTokens = strengthTokens(row.strength);
  const productStrengthText = normalize(ingredientText);
  const strengthMatches = rowStrengthTokens.filter((token) => productStrengthText.includes(token));
  if (strengthMatches.length > 0) {
    score += Math.min(25, strengthMatches.length * 5);
    reasons.push(`strength terms: ${strengthMatches.slice(0, 4).join(", ")}`);
  }

  const expectedRoutes = routeTerms(`${row.route} ${row.dosageForm}`);
  const productRoutes = product.route ?? [];
  const routeMatch = expectedRoutes.length === 0 || productRoutes.some((route) => expectedRoutes.includes(route.toUpperCase()));
  if (routeMatch) {
    score += 20;
    reasons.push("route match");
  } else {
    score -= 35;
    reasons.push("route mismatch");
  }

  const expectedForms = dosageFormTerms(row.dosageForm);
  const productForm = product.dosageForm ?? "";
  const formMatch = expectedForms.length === 0 || expectedForms.some((form) => containsPhrase(productForm, form));
  if (formMatch) {
    score += 15;
    reasons.push("dosage form match");
  } else {
    score -= 25;
    reasons.push("dosage form mismatch");
  }

  if (product.productType === "HUMAN PRESCRIPTION DRUG") {
    score += 15;
    reasons.push("human prescription drug");
  } else if (product.productType?.includes("OTC") && !/\b(antacid|paracetamol|ibuprofen|aspirin)\b/i.test(row.genericName)) {
    score -= 20;
    reasons.push("OTC product penalty");
  }

  if (!isExpired(product)) {
    score += 10;
    reasons.push("non-expired listing");
  } else {
    score -= 20;
    reasons.push("expired listing");
  }

  if (isProductCombo(product) && !isMedoraCombo(row)) {
    score -= 45;
    reasons.push("combination product penalty");
  }

  const medoraInjectable = /\b(injectable|intraveineuse|perfusion)\b/.test(normalize(`${row.route} ${row.dosageForm}`));
  if (medoraInjectable && /\b(ophthalmic|topical|oral)\b/.test(normalize(`${product.route?.join(" ")} ${product.dosageForm}`))) {
    score -= 45;
    reasons.push("non-injectable product penalty");
  }

  return { score, reasons: [...new Set(reasons)] };
}

function statusFor(candidates: NdcCandidate[]): OutputRow["status"] {
  const topScore = candidates[0]?.score ?? 0;
  if (topScore >= 130) return "strong";
  if (topScore >= 75) return "review";
  return "no_candidate";
}

function main() {
  const medoraRows = readMedoraMedications();
  const fdaProducts = readJson<FdaNdcProduct[]>(fdaNdcPath);

  const output: OutputRow[] = medoraRows.map((row) => {
    const candidates = fdaProducts
      .map((product) => ({ product, scored: scoreCandidate(row, product) }))
      .filter(({ product, scored }) => scored.score >= 55 && product.productNdc)
      .sort((a, b) => b.scored.score - a.scored.score || (a.product.genericName ?? "").localeCompare(b.product.genericName ?? ""))
      .slice(0, 10)
      .map(({ product, scored }) => ({
        productNdc: product.productNdc ?? "",
        brandName: product.brandName ?? "",
        genericName: product.genericName ?? "",
        dosageForm: product.dosageForm ?? "",
        route: product.route ?? [],
        activeIngredients: product.activeIngredients ?? [],
        packages: product.packages ?? [],
        score: scored.score,
        reason: scored.reasons.join("; "),
      }));

    return {
      ...row,
      candidates,
      status: statusFor(candidates),
    };
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  const count = (status: OutputRow["status"]) => output.filter((row) => row.status === status).length;
  console.log(`Read ${medoraRows.length} Medora medication rows`);
  console.log(`Read ${fdaProducts.length} FDA NDC products`);
  console.log(`strong: ${count("strong")}`);
  console.log(`review: ${count("review")}`);
  console.log(`no_candidate: ${count("no_candidate")}`);
  console.log(`Wrote ${outPath}`);
}

main();
