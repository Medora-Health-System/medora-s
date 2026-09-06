/**
 * MEDUI.TRILANG.DX.P3-F.8-ES — deterministic Medora-governed Spanish labels
 * for FY2027 selectable codes that are new or whose English concept changed.
 *
 * Not OFFICIAL_SOURCE. Not parent/sibling inheritance. Not English fallback.
 * Not CIE-10-ES / WHO / ATIH / SNOMED / UMLS as exact U.S. ICD-10-CM wording.
 * Carry-forward of unchanged FY2026 concepts is a separate module.
 */
import { normalizeIcd10CodeForLookup } from "../icd10Normalize.js";

export const FY2027_ES_GAP_BUCKETS = [
  "GOVERNED_SPANISH_LABEL_REQUIRED",
  "REVIEW_REQUIRED",
  "INVALID_OR_NONSELECTABLE",
] as const;
export type Fy2027EsGapBucket = (typeof FY2027_ES_GAP_BUCKETS)[number];

export type Fy2027EsGapComposeInput = {
  code: string;
  shortDescription: string;
  longDescription?: string | null;
  isSelectable: boolean;
};

export type Fy2027EsGapComposeResult = {
  code: string;
  normalizedCode: string;
  family: string;
  bucket: Fy2027EsGapBucket;
  label: string | null;
  blockedReason: string | null;
};

const ENCOUNTER: Record<string, string> = {
  A: "contacto inicial",
  D: "contacto sucesivo",
  S: "secuela",
};

const INTENT: Record<string, string> = {
  "1": "accidental (no intencionado)",
  "2": "autolesión intencionada",
  "3": "agresión",
  "4": "intencionalidad sin determinar",
};

const TOXIC_SUBSTANCE: Record<string, string> = {
  T5281: "alquenos",
  T5282: "cicloparafinas",
  T5289: "otros disolventes orgánicos",
  T5982: "hexametilen diisocianato",
  T6585: "medetomidina",
};

const M86_SITE: Record<string, string> = {
  "1": "hombro",
  "2": "brazo",
  "3": "antebrazo",
  "4": "mano",
  "5": "muslo",
  "6": "pierna",
  "7": "tobillo y pie",
};

const M86_SIDE: Record<string, string> = {
  "1": "derecho",
  "2": "izquierdo",
  "9": "no especificado",
};

const O31_TRIMESTER: Record<string, string> = {
  "0": "trimestre no especificado",
  "1": "primer trimestre",
  "2": "segundo trimestre",
  "3": "tercer trimestre",
};

const O31_FETUS: Record<string, string> = {
  "0": "feto no especificado",
  "1": "feto 1",
  "2": "feto 2",
  "3": "feto 3",
  "4": "feto 4",
  "5": "feto 5",
  "9": "otro feto",
};

const O00_LATERALITY: Record<string, string> = {
  "1": "derecho",
  "2": "izquierdo",
  "9": "no especificado",
};

const EXPLICIT_STEMS: Record<string, string> = {
  C7831: "Neoplasia maligna secundaria de laringe",
  C7832: "Neoplasia maligna secundaria de faringe",
  C7983: "Neoplasia maligna secundaria de cavidad oral",
  D6911: "Trombastenia de Glanzmann",
  D6919: "Otros defectos cualitativos de las plaquetas",
  E89830: "Hipoglucemia posbariátrica",
  E89838: "Otra hipoglucemia posprocedimiento",
  F64A: "Trastorno de la identidad de género, en remisión",
  I4200: "Miocardiopatía dilatada, no especificada",
  I4201: "Miocardiopatía dilatada familiar-genética",
  I4209: "Otra miocardiopatía dilatada",
  I4281: "Miocardiopatía arritmogénica",
  I4289: "Otras miocardiopatías no clasificadas en otra parte",
  I4722: "Taquicardia ventricular polimórfica catecolaminérgica [CPVT]",
  I4981: "Síndrome de Brugada",
  I4982: "Bigeminismo ventricular",
  I4989: "Otras arritmias cardiacas especificadas no clasificadas en otra parte",
  J34830: "Sinusitis odontógena, seno maxilar",
  J34831: "Sinusitis odontógena, seno etmoidal",
  J34832: "Sinusitis odontógena, seno frontal",
  J34833: "Sinusitis odontógena, seno esfenoidal",
  J34839: "Sinusitis odontógena, no especificada",
  J4B: "Micetoma pulmonar",
  K31B: "Estenosis hipertrófica de píloro en la infancia",
  K6A01: "Absceso prevesical",
  K6A09: "Otro absceso pélvico",
  K6A8: "Otras enfermedades de la pelvis, no clasificadas en otra parte",
  K740A: "Fibrosis hepática, fibrosis moderada",
  K7683: "Hepatopatía asociada a fallo intestinal",
  L02232: "Ántrax de espalda [cualquier parte, excepto la nalga y el flanco]",
  L02237: "Ántrax del flanco",
  L03312: "Celulitis de espalda [cualquier parte, excepto la nalga y el flanco]",
  L03322: "Linfangitis aguda de espalda [cualquier parte, excepto la nalga y el flanco]",
  M043: "Síndrome VEXAS",
  M67A01: "Fascitis plantar, pie derecho",
  M67A02: "Fascitis plantar, pie izquierdo",
  M67A09: "Fascitis plantar, pie no especificado",
  M7220: "Fibromatosis de fascia plantar, pie no especificado",
  M7221: "Fibromatosis de fascia plantar, pie derecho",
  M7222: "Fibromatosis de fascia plantar, pie izquierdo",
  N99860: "Isquemia del pezón intraoperatoria y posprocedimiento",
  N99861: "Necrosis del pezón intraoperatoria y posprocedimiento",
  O0031: "Embarazo ectópico en cicatriz de cesárea sin embarazo intrauterino",
  O0032: "Embarazo ectópico en cicatriz de cesárea con embarazo intrauterino",
  O0041: "Embarazo ectópico cervical sin embarazo intrauterino",
  O0042: "Embarazo ectópico cervical con embarazo intrauterino",
  Q87A: "Síndrome de Loeys-Dietz",
  QA171: "Síndrome de Lynch",
  QA1790: "Síndrome de cáncer familiar con mutación patógena BRCA1",
  QA1791: "Síndrome de cáncer familiar con mutación patógena BRCA2",
  QA1792: "Síndrome de Li-Fraumeni",
  QA1798: "Otros síndromes hereditarios de predisposición a neoplasias de múltiples sistemas",
  R7872: "Nivel anormal de gadolinio en sangre",
  Z2914: "Encuentro para inmunoglobulina antirrábica profiláctica",
  Z6818: "Índice de masa corporal [IMC] 18.4 o menor, adulto",
  Z6819: "Índice de masa corporal [IMC] 18.5-19.9, adulto",
  Z77013: "Contacto con y (sospecha de) exposición al gadolinio",
  Z7732: "Contacto con y exposición a fosas de quema en teatro de guerra",
  Z7733: "Contacto con y (sospecha de) exposición al Agente Naranja",
  Z7740: "Contacto con y exposición a sobrepresión por explosión no especificada",
  Z7741: "Contacto con y exposición a sobrepresión por explosión de bajo nivel",
  Z7742: "Contacto con y exposición a sobrepresión por explosión de alto nivel",
  Z7749: "Contacto con y exposición a otra sobrepresión por explosión",
  Z8617: "Historia personal de infección por Clostridioides difficile",
  Z878901: "Historia personal de transición de género social",
  Z878902: "Historia personal de transición de género médica",
  Z878903: "Historia personal de transición de género quirúrgica",
  Z878904: "Historia personal de cirugía intersexual",
  Z878909: "Historia personal de transición de género no especificada",
  Z87893: "Historia personal de destransición de género",
};

function composeToxic(normalized: string): string | null {
  if (normalized.length !== 7) return null;
  const stem = normalized.slice(0, 5);
  const intent = INTENT[normalized[5] ?? ""];
  const encounter = ENCOUNTER[normalized[6] ?? ""];
  const substance = TOXIC_SUBSTANCE[stem];
  if (!intent || !encounter || !substance) return null;
  return `Efecto tóxico de ${substance}, ${intent}, ${encounter}`;
}

function composeM86(normalized: string): string | null {
  if (!normalized.startsWith("M868X") || normalized.length !== 7) return null;
  const siteDigit = normalized[5]!;
  const last = normalized[6]!;
  if (siteDigit === "8") {
    if (last === "0") return "Otras osteomielitis, cráneo";
    if (last === "1") return "Otras osteomielitis, cara y senos";
    if (last === "9") return "Otras osteomielitis, otro sitio";
    return null;
  }
  const site = M86_SITE[siteDigit];
  const side = M86_SIDE[last];
  if (!site || !side) return null;
  if (siteDigit === "7") {
    if (last === "1") return "Otras osteomielitis, tobillo y pie derechos";
    if (last === "2") return "Otras osteomielitis, tobillo y pie izquierdos";
    return "Otras osteomielitis, tobillo y pie no especificados";
  }
  return `Otras osteomielitis, ${site} ${side}`;
}

function composeO31(normalized: string): string | null {
  if (!normalized.startsWith("O314") || normalized.length !== 7 || normalized[5] !== "X") return null;
  const trimester = O31_TRIMESTER[normalized[4] ?? ""];
  const fetus = O31_FETUS[normalized[6] ?? ""];
  if (!trimester || !fetus) return null;
  return `Continuación del embarazo tras síndrome de gemelo evanescente, un feto o más, ${trimester}, ${fetus}`;
}

function composeO00(normalized: string): string | null {
  if (normalized.startsWith("O0012") && normalized.length === 6) {
    const side = O00_LATERALITY[normalized[5] ?? ""];
    if (!side) return null;
    return `Embarazo ectópico intersticial ${side} sin embarazo intrauterino`;
  }
  if (normalized.startsWith("O0013") && normalized.length === 6) {
    const side = O00_LATERALITY[normalized[5] ?? ""];
    if (!side) return null;
    return `Embarazo ectópico intersticial ${side} con embarazo intrauterino`;
  }
  if (normalized.startsWith("O0051") && normalized.length === 6) {
    const side = O00_LATERALITY[normalized[5] ?? ""];
    if (!side) return null;
    return `Embarazo ectópico cornual ${side} sin embarazo intrauterino`;
  }
  if (normalized.startsWith("O0052") && normalized.length === 6) {
    const side = O00_LATERALITY[normalized[5] ?? ""];
    if (!side) return null;
    return `Embarazo ectópico cornual ${side} con embarazo intrauterino`;
  }
  return null;
}

export function composeFy2027EsGapLabel(input: Fy2027EsGapComposeInput): Fy2027EsGapComposeResult {
  const normalized = normalizeIcd10CodeForLookup(input.code);
  const family = normalized.slice(0, 3);
  const fail = (reason: string): Fy2027EsGapComposeResult => ({
    code: input.code,
    normalizedCode: normalized,
    family,
    bucket: input.isSelectable ? "REVIEW_REQUIRED" : "INVALID_OR_NONSELECTABLE",
    label: null,
    blockedReason: reason,
  });
  if (!input.isSelectable) return fail("NONSELECTABLE");

  let label: string | null = EXPLICIT_STEMS[normalized] ?? null;
  if (!label && (normalized.startsWith("T528") || normalized.startsWith("T5982") || normalized.startsWith("T6585"))) {
    label = composeToxic(normalized);
  }
  if (!label && normalized.startsWith("M868X")) label = composeM86(normalized);
  if (!label && normalized.startsWith("O314")) label = composeO31(normalized);
  if (!label && normalized.startsWith("O00")) label = composeO00(normalized);
  if (!label) return fail("NO_GOVERNED_TEMPLATE");
  return {
    code: input.code,
    normalizedCode: normalized,
    family,
    bucket: "GOVERNED_SPANISH_LABEL_REQUIRED",
    label,
    blockedReason: null,
  };
}

export function validateFy2027EsGapLabel(input: {
  code: string;
  shortDescription: string;
  label: string;
  parentLabel?: string | null;
  siblingLabels?: readonly string[];
}): string[] {
  const errors: string[] = [];
  const en = input.shortDescription.toLowerCase();
  const es = input.label.toLowerCase();
  const normalized = normalizeIcd10CodeForLookup(input.code);
  const seventh = normalized.slice(-1);
  if (normalized.length >= 7 && ENCOUNTER[seventh] && /toxic effect|sequela|init|subs/.test(en)) {
    const expected = ENCOUNTER[seventh]!;
    if (!es.includes(expected)) errors.push(`MISSING_ENCOUNTER:${expected}`);
  }
  if (/\bright\b/.test(en) && !es.includes("derech")) errors.push("MISSING_RIGHT_LATERALITY");
  if (/\bleft\b/.test(en) && !es.includes("izquierd")) errors.push("MISSING_LEFT_LATERALITY");
  if (/\bflank\b/.test(en) && !es.includes("flanco")) errors.push("MISSING_FLANK");
  if (/\bwithout\b/.test(en) && /uterin|intrauterine/.test(en) && !es.includes("sin embarazo intrauterino")) {
    errors.push("MISSING_WITHOUT_IUP");
  }
  if (/\bwith\b/.test(en) && !/\bwithout\b/.test(en) && /uterin|intrauterine/.test(en) && !es.includes("con embarazo intrauterino")) {
    errors.push("MISSING_WITH_IUP");
  }
  if (/brca1/i.test(en) && !input.label.includes("BRCA1")) errors.push("MISSING_BRCA1");
  if (/brca2/i.test(en) && !input.label.includes("BRCA2")) errors.push("MISSING_BRCA2");
  if (input.parentLabel && input.parentLabel.trim() && input.parentLabel.trim() === input.label.trim()) {
    errors.push("PARENT_LABEL_COPY");
  }
  if ((input.siblingLabels ?? []).includes(input.label)) errors.push("SIBLING_LABEL_COPY");
  if (/\b(abdominal pain|nausea|vomiting|cellulitis, unspecified|carbuncle of back)\b/i.test(input.label)) {
    errors.push("ENGLISH_FALLBACK");
  }
  if (!input.label.trim()) errors.push("BLANK_LABEL");
  return errors;
}

export type Fy2027EsGapReviewStatus = "STRUCTURAL_CANDIDATE" | "PENDING_REVIEW" | "BLOCKED";

export type Fy2027EsGapReviewRow = Fy2027EsGapComposeResult & {
  shortDescription: string;
  validationErrors: string[];
  reviewStatus: Fy2027EsGapReviewStatus;
};

export function reviewFy2027EsGapCandidate(
  input: Fy2027EsGapComposeInput & {
    parentLabel?: string | null;
    siblingLabels?: readonly string[];
  },
): Fy2027EsGapReviewRow {
  const composed = composeFy2027EsGapLabel(input);
  const validationErrors = composed.label
    ? validateFy2027EsGapLabel({
        code: input.code,
        shortDescription: input.shortDescription,
        label: composed.label,
        parentLabel: input.parentLabel,
        siblingLabels: input.siblingLabels,
      })
    : [composed.blockedReason ?? "NO_LABEL"];
  let reviewStatus: Fy2027EsGapReviewStatus = "PENDING_REVIEW";
  if (!composed.label || composed.bucket === "INVALID_OR_NONSELECTABLE") reviewStatus = "BLOCKED";
  else if (validationErrors.length === 0) reviewStatus = "STRUCTURAL_CANDIDATE";
  return {
    ...composed,
    shortDescription: input.shortDescription,
    validationErrors,
    reviewStatus,
  };
}

export type Fy2027EsGapFamilySummary = {
  family: string;
  TOTAL_CODES: number;
  STRUCTURAL_CANDIDATE: number;
  REVIEW_REQUIRED: number;
  BLOCKED: number;
};

export function summarizeFy2027EsGapFamilies(
  rows: readonly Fy2027EsGapReviewRow[],
): Fy2027EsGapFamilySummary[] {
  const byFamily = new Map<string, Fy2027EsGapFamilySummary>();
  for (const row of rows) {
    const current = byFamily.get(row.family) ?? {
      family: row.family,
      TOTAL_CODES: 0,
      STRUCTURAL_CANDIDATE: 0,
      REVIEW_REQUIRED: 0,
      BLOCKED: 0,
    };
    current.TOTAL_CODES += 1;
    if (row.reviewStatus === "STRUCTURAL_CANDIDATE") current.STRUCTURAL_CANDIDATE += 1;
    else if (row.reviewStatus === "BLOCKED") current.BLOCKED += 1;
    else current.REVIEW_REQUIRED += 1;
    byFamily.set(row.family, current);
  }
  return [...byFamily.values()].sort((a, b) => b.TOTAL_CODES - a.TOTAL_CODES || a.family.localeCompare(b.family));
}
