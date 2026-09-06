/**
 * MEDUI.TRILANG.DX.P3-F.8-ES — semantic certification of new/changed FY2027 Spanish.
 * Features are derived from ICD-10-CM code identity and canonical English catalog text.
 * Composer tables are never the feature source.
 *
 * STRUCTURAL_CANDIDATE is not SEMANTICALLY_CERTIFIED.
 */
import { normalizeIcd10CodeForLookup } from "../icd10Normalize.js";

export const FY2027_ES_SEMANTIC_STATUSES = ["PASS", "REVIEW_REQUIRED", "FAIL"] as const;
export type Fy2027EsSemanticStatus = (typeof FY2027_ES_SEMANTIC_STATUSES)[number];

export const FY2027_ES_APPROVAL_STAGES = [
  "STRUCTURAL_CANDIDATE",
  "SEMANTICALLY_CERTIFIED",
  "APPROVED_FOR_INGEST",
] as const;
export type Fy2027EsApprovalStage = (typeof FY2027_ES_APPROVAL_STAGES)[number];

export type Fy2027EsSemanticFeature = {
  key: string;
  required: string[];
  forbidden?: string[];
};

export type Fy2027EsSemanticRow = {
  code: string;
  normalizedCode: string;
  family: string;
  english: string;
  spanish: string;
  features: Fy2027EsSemanticFeature[];
  structuralStatus: string;
  semanticStatus: Fy2027EsSemanticStatus;
  semanticNotes: string[];
};

const ENCOUNTER_ES: Record<string, string> = {
  A: "contacto inicial",
  D: "contacto sucesivo",
  S: "secuela",
};

const INTENT_ES: Record<string, { required: string[]; forbidden: string[] }> = {
  "1": {
    required: ["accidental"],
    forbidden: ["autolesión intencionada", "agresión", "intencionalidad sin determinar"],
  },
  "2": {
    required: ["autolesión intencionada"],
    forbidden: ["accidental", "agresión", "intencionalidad sin determinar"],
  },
  "3": {
    required: ["agresión"],
    forbidden: ["accidental", "autolesión intencionada", "intencionalidad sin determinar"],
  },
  "4": {
    required: ["intencionalidad sin determinar"],
    forbidden: ["accidental", "autolesión intencionada", "agresión"],
  },
};

const GENE_TOKEN = /\b[A-Z]{2,}[0-9][A-Z0-9]*\b/g;

function familyOf(normalized: string): string {
  return normalized.slice(0, 3);
}

function hasAll(es: string, tokens: readonly string[]): boolean {
  return tokens.every((token) => es.includes(token.toLowerCase()));
}

function hasAny(es: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => es.includes(token.toLowerCase()));
}

function toxicFeatures(normalized: string): Fy2027EsSemanticFeature[] {
  const features: Fy2027EsSemanticFeature[] = [];
  const stem = normalized.slice(0, 5);
  const intent = normalized[5] ?? "";
  const seventh = normalized[6] ?? "";
  if (stem === "T5281") features.push({ key: "substance", required: ["alquenos"], forbidden: ["cicloparafinas", "medetomidina"] });
  if (stem === "T5282") features.push({ key: "substance", required: ["cicloparafinas"], forbidden: ["alquenos", "medetomidina"] });
  if (stem === "T5289") {
    features.push({
      key: "substance",
      required: ["otros disolventes orgánicos"],
      forbidden: ["alquenos", "cicloparafinas"],
    });
  }
  if (stem === "T5982") features.push({ key: "substance", required: ["hexametilen diisocianato"] });
  if (stem === "T6585") features.push({ key: "substance", required: ["medetomidina"], forbidden: ["xilazina"] });
  const intentRule = INTENT_ES[intent];
  if (intentRule) features.push({ key: "intent", required: intentRule.required, forbidden: intentRule.forbidden });
  const encounter = ENCOUNTER_ES[seventh];
  if (encounter) {
    features.push({
      key: "encounter_character",
      required: [encounter],
      forbidden: Object.values(ENCOUNTER_ES).filter((value) => value !== encounter),
    });
  }
  return features;
}

function codeFeatures(normalized: string): Fy2027EsSemanticFeature[] {
  const features: Fy2027EsSemanticFeature[] = [];
  const family = familyOf(normalized);

  if (
    (normalized.startsWith("T528") || normalized.startsWith("T5982") || normalized.startsWith("T6585")) &&
    normalized.length === 7
  ) {
    return toxicFeatures(normalized);
  }

  if (normalized.startsWith("M868X") && normalized.length === 7) {
    features.push({ key: "disease_subtype", required: ["osteomielitis"] });
    const site = normalized[5]!;
    const last = normalized[6]!;
    if (site === "1") features.push({ key: "anatomical_site", required: ["hombro"] });
    if (site === "2") features.push({ key: "anatomical_site", required: ["brazo"], forbidden: ["antebrazo"] });
    if (site === "3") features.push({ key: "anatomical_site", required: ["antebrazo"] });
    if (site === "4") features.push({ key: "anatomical_site", required: ["mano"] });
    if (site === "5") features.push({ key: "anatomical_site", required: ["muslo"] });
    if (site === "6") features.push({ key: "anatomical_site", required: ["pierna"] });
    if (site === "7") features.push({ key: "anatomical_site", required: ["tobillo", "pie"] });
    if (site === "8" && last === "0") features.push({ key: "anatomical_site", required: ["cráneo"] });
    if (site === "8" && last === "1") features.push({ key: "anatomical_site", required: ["cara", "senos"] });
    if (site === "8" && last === "9") features.push({ key: "anatomical_site", required: ["otro sitio"] });
    if (site !== "8") {
      if (last === "1") features.push({ key: "laterality", required: ["derech"], forbidden: ["izquierd"] });
      if (last === "2") features.push({ key: "laterality", required: ["izquierd"], forbidden: ["derech"] });
      if (last === "9") features.push({ key: "laterality", required: ["no especificad"] });
    }
    return features;
  }

  if (normalized.startsWith("O314") && normalized.length === 7) {
    features.push({ key: "disease_subtype", required: ["gemelo evanescente"] });
    const trimester = normalized[4]!;
    const fetus = normalized[6]!;
    if (trimester === "0") features.push({ key: "trimester", required: ["trimestre no especificado"] });
    if (trimester === "1") features.push({ key: "trimester", required: ["primer trimestre"], forbidden: ["segundo trimestre", "tercer trimestre"] });
    if (trimester === "2") features.push({ key: "trimester", required: ["segundo trimestre"], forbidden: ["primer trimestre", "tercer trimestre"] });
    if (trimester === "3") features.push({ key: "trimester", required: ["tercer trimestre"], forbidden: ["primer trimestre", "segundo trimestre"] });
    if (fetus === "0") features.push({ key: "fetus", required: ["feto no especificado"] });
    if (fetus === "1") features.push({ key: "fetus", required: ["feto 1"], forbidden: ["feto 2", "feto 3", "feto 4", "feto 5"] });
    if (fetus === "2") features.push({ key: "fetus", required: ["feto 2"], forbidden: ["feto 1", "feto 3"] });
    if (fetus === "3") features.push({ key: "fetus", required: ["feto 3"], forbidden: ["feto 1", "feto 2"] });
    if (fetus === "4") features.push({ key: "fetus", required: ["feto 4"] });
    if (fetus === "5") features.push({ key: "fetus", required: ["feto 5"] });
    if (fetus === "9") features.push({ key: "fetus", required: ["otro feto"] });
    return features;
  }

  if (normalized.startsWith("O00")) {
    if (normalized.startsWith("O0012") || normalized.startsWith("O0013")) {
      features.push({ key: "anatomical_site", required: ["intersticial"], forbidden: ["cornual", "cervical", "cesárea"] });
    }
    if (normalized.startsWith("O0051") || normalized.startsWith("O0052")) {
      features.push({ key: "anatomical_site", required: ["cornual"], forbidden: ["intersticial", "cervical"] });
    }
    if (normalized === "O0031" || normalized === "O0032") {
      features.push({ key: "anatomical_site", required: ["cicatriz de cesárea"], forbidden: ["intersticial", "cornual", "cervical"] });
    }
    if (normalized === "O0041" || normalized === "O0042") {
      features.push({ key: "anatomical_site", required: ["cervical"], forbidden: ["intersticial", "cornual", "cesárea"] });
    }
    const last = normalized.slice(-1);
    if (normalized.length === 6 && (normalized.startsWith("O0012") || normalized.startsWith("O0013") || normalized.startsWith("O0051") || normalized.startsWith("O0052"))) {
      if (last === "1") features.push({ key: "laterality", required: ["derech"], forbidden: ["izquierd"] });
      if (last === "2") features.push({ key: "laterality", required: ["izquierd"], forbidden: ["derech"] });
      if (last === "9") features.push({ key: "laterality", required: ["no especificado"] });
    }
    if (normalized.startsWith("O0012") || normalized === "O0031" || normalized === "O0041" || normalized.startsWith("O0051")) {
      features.push({
        key: "with_without",
        required: ["sin embarazo intrauterino"],
        forbidden: ["con embarazo intrauterino"],
      });
    }
    if (normalized.startsWith("O0013") || normalized === "O0032" || normalized === "O0042" || normalized.startsWith("O0052")) {
      features.push({
        key: "with_without",
        required: ["con embarazo intrauterino"],
        forbidden: ["sin embarazo intrauterino"],
      });
    }
    return features;
  }

  if (normalized === "C7831") features.push({ key: "anatomical_site", required: ["laringe"], forbidden: ["faringe"] });
  if (normalized === "C7832") features.push({ key: "anatomical_site", required: ["faringe"], forbidden: ["laringe"] });
  if (normalized === "C7983") features.push({ key: "anatomical_site", required: ["cavidad oral"] });
  if (normalized === "D6911") features.push({ key: "disease_subtype", required: ["glanzmann"] });
  if (normalized === "D6919") features.push({ key: "disease_subtype", required: ["plaquetas"], forbidden: ["glanzmann"] });
  if (normalized === "E89830") features.push({ key: "disease_subtype", required: ["hipoglucemia", "posbariátrica"] });
  if (normalized === "E89838") features.push({ key: "disease_subtype", required: ["hipoglucemia", "posprocedimiento"], forbidden: ["posbariátrica"] });
  if (normalized === "F64A") features.push({ key: "status", required: ["identidad de género", "remisión"] });
  if (normalized === "I4200") features.push({ key: "disease_subtype", required: ["dilatada", "no especificada"] });
  if (normalized === "I4201") features.push({ key: "disease_subtype", required: ["dilatada", "familiar"] });
  if (normalized === "I4209") features.push({ key: "disease_subtype", required: ["dilatada"], forbidden: ["familiar", "no especificada"] });
  if (normalized === "I4281") features.push({ key: "disease_subtype", required: ["arritmogénica"] });
  if (normalized === "I4289") features.push({ key: "disease_subtype", required: ["miocardiopatías"] });
  if (normalized === "I4722") features.push({ key: "disease_subtype", required: ["cpvt"] });
  if (normalized === "I4981") features.push({ key: "disease_subtype", required: ["brugada"] });
  if (normalized === "I4982") features.push({ key: "disease_subtype", required: ["bigeminismo ventricular"] });
  if (normalized === "I4989") features.push({ key: "disease_subtype", required: ["arritmias"] });
  if (normalized.startsWith("J3483")) {
    features.push({ key: "disease_subtype", required: ["sinusitis odontógena"] });
    if (normalized === "J34830") features.push({ key: "anatomical_site", required: ["maxilar"] });
    if (normalized === "J34831") features.push({ key: "anatomical_site", required: ["etmoidal"] });
    if (normalized === "J34832") features.push({ key: "anatomical_site", required: ["frontal"] });
    if (normalized === "J34833") features.push({ key: "anatomical_site", required: ["esfenoidal"] });
    if (normalized === "J34839") features.push({ key: "unspecified", required: ["no especificada"] });
  }
  if (normalized === "J4B") features.push({ key: "disease_subtype", required: ["micetoma pulmonar"] });
  if (normalized === "K31B") features.push({ key: "disease_subtype", required: ["píloro", "infancia"] });
  if (normalized === "K6A01") features.push({ key: "anatomical_site", required: ["prevesical"] });
  if (normalized === "K6A09") features.push({ key: "anatomical_site", required: ["absceso pélvico"] });
  if (normalized === "K6A8") features.push({ key: "disease_subtype", required: ["pelvis"] });
  if (normalized === "K740A") features.push({ key: "severity", required: ["fibrosis", "moderada"] });
  if (normalized === "K7683") features.push({ key: "disease_subtype", required: ["fallo intestinal"] });
  if (normalized === "L02232") {
    features.push({ key: "anatomical_site", required: ["ántrax", "espalda", "nalga", "flanco"] });
    features.push({ key: "with_without", required: ["excepto"] });
  }
  if (normalized === "L02237") {
    features.push({ key: "anatomical_site", required: ["ántrax", "flanco"], forbidden: ["espalda"] });
  }
  if (normalized === "L03312") {
    features.push({ key: "anatomical_site", required: ["celulitis", "espalda", "nalga", "flanco"] });
  }
  if (normalized === "L03322") {
    features.push({ key: "anatomical_site", required: ["linfangitis", "espalda", "nalga", "flanco"] });
  }
  if (normalized === "M043") features.push({ key: "disease_subtype", required: ["vexas"] });
  if (normalized.startsWith("M67A0")) {
    features.push({ key: "disease_subtype", required: ["fascitis plantar"] });
    if (normalized === "M67A01") features.push({ key: "laterality", required: ["pie derecho"], forbidden: ["pie izquierdo"] });
    if (normalized === "M67A02") features.push({ key: "laterality", required: ["pie izquierdo"], forbidden: ["pie derecho"] });
    if (normalized === "M67A09") features.push({ key: "laterality", required: ["pie no especificado"] });
  }
  if (normalized.startsWith("M722")) {
    features.push({ key: "disease_subtype", required: ["fibromatosis", "fascia plantar"] });
    if (normalized === "M7221") features.push({ key: "laterality", required: ["pie derecho"], forbidden: ["pie izquierdo"] });
    if (normalized === "M7222") features.push({ key: "laterality", required: ["pie izquierdo"], forbidden: ["pie derecho"] });
    if (normalized === "M7220") features.push({ key: "laterality", required: ["pie no especificado"] });
  }
  if (normalized === "N99860") features.push({ key: "disease_subtype", required: ["isquemia", "pezón"] });
  if (normalized === "N99861") features.push({ key: "disease_subtype", required: ["necrosis", "pezón"], forbidden: ["isquemia"] });
  if (normalized === "Q87A") features.push({ key: "disease_subtype", required: ["loeys-dietz"] });
  if (normalized === "QA171") features.push({ key: "disease_subtype", required: ["lynch"] });
  if (normalized === "QA1790") features.push({ key: "gene_identity", required: ["brca1"], forbidden: ["brca2"] });
  if (normalized === "QA1791") features.push({ key: "gene_identity", required: ["brca2"], forbidden: ["brca1"] });
  if (normalized === "QA1792") features.push({ key: "disease_subtype", required: ["li-fraumeni"] });
  if (normalized === "QA1798") features.push({ key: "disease_subtype", required: ["predisposición", "neoplasias"] });
  if (normalized === "R7872") features.push({ key: "substance", required: ["gadolinio", "sangre"] });
  if (normalized === "Z2914") features.push({ key: "substance", required: ["inmunoglobulina", "antirrábica"] });
  if (normalized === "Z6818") {
    features.push({ key: "severity", required: ["18.4"], forbidden: ["18.5", "19.9 o menor"] });
  }
  if (normalized === "Z6819") {
    features.push({ key: "severity", required: ["18.5", "19.9"], forbidden: ["18.4"] });
  }
  if (normalized === "Z77013") features.push({ key: "external_cause", required: ["gadolinio"] });
  if (normalized === "Z7732") features.push({ key: "external_cause", required: ["fosas de quema"] });
  if (normalized === "Z7733") features.push({ key: "external_cause", required: ["agente naranja"] });
  if (normalized === "Z7740") features.push({ key: "external_cause", required: ["sobrepresión", "no especificada"] });
  if (normalized === "Z7741") features.push({ key: "external_cause", required: ["sobrepresión", "bajo nivel"], forbidden: ["alto nivel"] });
  if (normalized === "Z7742") features.push({ key: "external_cause", required: ["sobrepresión", "alto nivel"], forbidden: ["bajo nivel"] });
  if (normalized === "Z7749") features.push({ key: "external_cause", required: ["otra sobrepresión"] });
  if (normalized === "Z8617") features.push({ key: "status", required: ["clostridioides difficile"] });
  if (normalized === "Z878901") features.push({ key: "status", required: ["transición de género social"], forbidden: ["médica", "quirúrgica", "destransición"] });
  if (normalized === "Z878902") features.push({ key: "status", required: ["transición de género médica"], forbidden: ["social", "quirúrgica", "destransición"] });
  if (normalized === "Z878903") features.push({ key: "status", required: ["transición de género quirúrgica"], forbidden: ["social", "médica", "destransición"] });
  if (normalized === "Z878904") features.push({ key: "status", required: ["cirugía intersexual"], forbidden: ["transición de género"] });
  if (normalized === "Z878909") features.push({ key: "status", required: ["transición de género no especificada"] });
  if (normalized === "Z87893") features.push({ key: "status", required: ["destransición de género"] });

  return features;
}

function englishFeatures(english: string): Fy2027EsSemanticFeature[] {
  const features: Fy2027EsSemanticFeature[] = [];
  const genes = english.match(GENE_TOKEN) ?? [];
  for (const gene of genes) {
    if (["ICD", "NEC", "NOS", "HIV", "BMI", "CPVT", "HDI"].includes(gene)) continue;
    features.push({ key: "gene_identity", required: [gene] });
  }
  return features;
}

export function extractFy2027EsSemanticFeatures(input: {
  code: string;
  shortDescription: string;
}): { family: string; normalizedCode: string; features: Fy2027EsSemanticFeature[] } {
  const normalized = normalizeIcd10CodeForLookup(input.code);
  const fromCode = codeFeatures(normalized);
  const fromEnglish = englishFeatures(input.shortDescription);
  const merged = [...fromCode];
  for (const feature of fromEnglish) {
    if (!merged.some((row) => row.key === feature.key && row.required.join("|") === feature.required.join("|"))) {
      merged.push(feature);
    }
  }
  return { family: familyOf(normalized), normalizedCode: normalized, features: merged };
}

export function certifyFy2027EsGapSemantics(input: {
  code: string;
  shortDescription: string;
  spanish: string;
  structuralStatus: string;
  parentSpanish?: string | null;
}): Fy2027EsSemanticRow {
  const extracted = extractFy2027EsSemanticFeatures({
    code: input.code,
    shortDescription: input.shortDescription,
  });
  const es = input.spanish.toLowerCase();
  const notes: string[] = [];
  let status: Fy2027EsSemanticStatus = "PASS";

  if (!input.spanish.trim()) {
    return {
      code: input.code,
      normalizedCode: extracted.normalizedCode,
      family: extracted.family,
      english: input.shortDescription,
      spanish: input.spanish,
      features: extracted.features,
      structuralStatus: input.structuralStatus,
      semanticStatus: "FAIL",
      semanticNotes: ["BLANK_SPANISH"],
    };
  }
  if (input.structuralStatus === "STRUCTURAL_CANDIDATE") {
    notes.push("STRUCTURAL_PASS_IS_NOT_SEMANTIC_PASS");
  }
  if (input.parentSpanish && input.parentSpanish.trim() === input.spanish.trim()) {
    notes.push("PARENT_LABEL_COPY");
    status = "FAIL";
  }
  if (/\b(abdominal pain|nausea|vomiting|carbuncle of back|cellulitis of back)\b/i.test(input.spanish)) {
    notes.push("ENGLISH_FALLBACK");
    status = "FAIL";
  }

  for (const feature of extracted.features) {
    if (!hasAll(es, feature.required)) {
      notes.push(`MISSING_${feature.key.toUpperCase()}:${feature.required.join("+")}`);
      status = "FAIL";
    }
    if (feature.forbidden && hasAny(es, feature.forbidden)) {
      notes.push(
        `FORBIDDEN_${feature.key.toUpperCase()}:${feature.forbidden.filter((token) => es.includes(token.toLowerCase())).join("+")}`,
      );
      status = "FAIL";
    }
  }

  if (extracted.features.length === 0) {
    notes.push("NO_CODE_DERIVED_FEATURES");
    if (status === "PASS") status = "REVIEW_REQUIRED";
  }

  return {
    code: input.code,
    normalizedCode: extracted.normalizedCode,
    family: extracted.family,
    english: input.shortDescription,
    spanish: input.spanish,
    features: extracted.features,
    structuralStatus: input.structuralStatus,
    semanticStatus: status,
    semanticNotes: notes,
  };
}

export function fy2027EsGapIngestGate(options: {
  approveStructurallyPassing: boolean;
  approveSemanticallyCertified: boolean;
  applyLocal: boolean;
}): { allowed: true } | { allowed: false; reason: string } {
  if (options.applyLocal && options.approveStructurallyPassing) {
    return { allowed: false, reason: "REFUSING_STRUCTURAL_INGEST" };
  }
  if (options.applyLocal && !options.approveSemanticallyCertified) {
    return { allowed: false, reason: "REFUSING_INGEST" };
  }
  return { allowed: true };
}

export function fy2027EsApprovalStage(input: {
  semanticStatus: Fy2027EsSemanticStatus;
  approvedForIngest: boolean;
}): Fy2027EsApprovalStage | "PENDING_REVIEW" {
  if (input.approvedForIngest && input.semanticStatus === "PASS") return "APPROVED_FOR_INGEST";
  if (input.semanticStatus === "PASS") return "SEMANTICALLY_CERTIFIED";
  return "PENDING_REVIEW";
}

export function toFy2027EsSemanticReviewRecord(
  row: Fy2027EsSemanticRow,
  approvedForIngest = false,
): {
  CODE: string;
  OFFICIAL_ENGLISH_DESCRIPTION: string;
  PROPOSED_SPANISH_DESCRIPTION: string;
  FAMILY: string;
  SEMANTIC_FEATURES: Fy2027EsSemanticFeature[];
  STRUCTURAL_STATUS: string;
  SEMANTIC_STATUS: Fy2027EsSemanticStatus;
  SEMANTIC_NOTES: string[];
  APPROVAL_STAGE: Fy2027EsApprovalStage | "PENDING_REVIEW";
} {
  return {
    CODE: row.code,
    OFFICIAL_ENGLISH_DESCRIPTION: row.english,
    PROPOSED_SPANISH_DESCRIPTION: row.spanish,
    FAMILY: row.family,
    SEMANTIC_FEATURES: row.features,
    STRUCTURAL_STATUS: row.structuralStatus,
    SEMANTIC_STATUS: row.semanticStatus,
    SEMANTIC_NOTES: row.semanticNotes,
    APPROVAL_STAGE: fy2027EsApprovalStage({
      semanticStatus: row.semanticStatus,
      approvedForIngest,
    }),
  };
}

export type Fy2027EsSemanticFamilySummary = {
  family: string;
  TOTAL: number;
  PASS: number;
  REVIEW_REQUIRED: number;
  FAIL: number;
};

export function summarizeFy2027EsSemantics(
  rows: readonly Fy2027EsSemanticRow[],
): Fy2027EsSemanticFamilySummary[] {
  const byFamily = new Map<string, Fy2027EsSemanticFamilySummary>();
  for (const row of rows) {
    const current = byFamily.get(row.family) ?? {
      family: row.family,
      TOTAL: 0,
      PASS: 0,
      REVIEW_REQUIRED: 0,
      FAIL: 0,
    };
    current.TOTAL += 1;
    current[row.semanticStatus] += 1;
    byFamily.set(row.family, current);
  }
  return [...byFamily.values()].sort((a, b) => b.TOTAL - a.TOTAL || a.family.localeCompare(b.family));
}
