/**
 * MEDUI.TRILANG.DX.P3-F.7A-ES — semantic certification of governed FY2026 Spanish
 * gap labels. Features are derived from ICD-10-CM code identity and canonical
 * English catalog text. Spanish composer tables are never the feature source.
 *
 * STRUCTURAL_CANDIDATE is not SEMANTICALLY_CERTIFIED.
 */
import { normalizeIcd10CodeForLookup } from "../icd10Normalize.js";

export const FY2026_ES_SEMANTIC_STATUSES = ["PASS", "REVIEW_REQUIRED", "FAIL"] as const;
export type Fy2026EsSemanticStatus = (typeof FY2026_ES_SEMANTIC_STATUSES)[number];

/** Engineering approval stages. STRUCTURAL_CANDIDATE is never clinical approval. */
export const FY2026_ES_APPROVAL_STAGES = [
  "STRUCTURAL_CANDIDATE",
  "SEMANTICALLY_CERTIFIED",
  "APPROVED_FOR_LOCAL_INGEST",
] as const;
export type Fy2026EsApprovalStage = (typeof FY2026_ES_APPROVAL_STAGES)[number];

export type Fy2026EsSemanticFeature = {
  key: string;
  required: string[];
  forbidden?: string[];
};

export type Fy2026EsSemanticRow = {
  code: string;
  normalizedCode: string;
  family: string;
  english: string;
  spanish: string;
  features: Fy2026EsSemanticFeature[];
  structuralStatus: string;
  semanticStatus: Fy2026EsSemanticStatus;
  semanticNotes: string[];
};

const ENCOUNTER_ES: Record<string, string> = {
  A: "contacto inicial",
  D: "contacto sucesivo",
  S: "secuela",
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

function codeFeatures(normalized: string): Fy2026EsSemanticFeature[] {
  const family = familyOf(normalized);
  const features: Fy2026EsSemanticFeature[] = [];
  const seventh = normalized.slice(-1);

  if (family === "S31" && normalized.length === 7) {
    const penet = normalized[3];
    const wound = normalized[4];
    const flank = normalized[5];
    features.push({ key: "anatomical_site", required: ["pared abdominal"] });
    if (flank === "6") features.push({ key: "laterality", required: ["flanco derecho"], forbidden: ["flanco izquierdo"] });
    if (flank === "7") features.push({ key: "laterality", required: ["flanco izquierdo"], forbidden: ["flanco derecho"] });
    if (flank === "A") features.push({ key: "laterality", required: ["flanco no especificado"] });
    if (penet === "1") {
      features.push({
        key: "peritoneal_penetration",
        required: ["sin penetración en cavidad peritoneal"],
        forbidden: ["con penetración en cavidad peritoneal"],
      });
    }
    if (penet === "6") {
      features.push({
        key: "peritoneal_penetration",
        required: ["con penetración en cavidad peritoneal"],
        forbidden: ["sin penetración en cavidad peritoneal"],
      });
    }
    if (wound === "0") {
      features.push({
        key: "open_wound_type",
        required: ["herida abierta no especificada"],
        forbidden: ["desgarro", "herida punzante", "mordedura"],
      });
    }
    if (wound === "1") {
      features.push({
        key: "open_wound_type",
        required: ["desgarro", "sin cuerpo extraño"],
        forbidden: ["herida punzante", "mordedura", "con cuerpo extraño"],
      });
    }
    if (wound === "2") {
      features.push({
        key: "open_wound_type",
        required: ["desgarro", "con cuerpo extraño"],
        forbidden: ["herida punzante", "mordedura", "sin cuerpo extraño"],
      });
    }
    if (wound === "3") {
      features.push({
        key: "open_wound_type",
        required: ["herida punzante", "sin cuerpo extraño"],
        forbidden: ["desgarro", "mordedura", "con cuerpo extraño"],
      });
    }
    if (wound === "4") {
      features.push({
        key: "open_wound_type",
        required: ["herida punzante", "con cuerpo extraño"],
        forbidden: ["desgarro", "mordedura", "sin cuerpo extraño"],
      });
    }
    if (wound === "5") {
      features.push({
        key: "open_wound_type",
        required: ["mordedura abierta"],
        forbidden: ["desgarro", "herida punzante"],
      });
    }
  }

  if (family === "S30") {
    if (normalized.startsWith("S3011")) features.push({ key: "anatomical_site", required: ["contusión", "pared abdominal"] });
    if (normalized.startsWith("S3012")) features.push({ key: "anatomical_site", required: ["contusión", "ingle"] });
    if (normalized.startsWith("S3013")) features.push({ key: "anatomical_site", required: ["contusión", "flanco"] });
    if (normalized.startsWith("S3081A")) features.push({ key: "injury_type", required: ["abrasión", "flanco"] });
    if (normalized.startsWith("S3082A")) features.push({ key: "injury_type", required: ["ampolla", "flanco"] });
    if (normalized.startsWith("S3084A")) features.push({ key: "injury_type", required: ["constricción", "flanco"] });
    if (normalized.startsWith("S3085A")) features.push({ key: "foreign_body", required: ["cuerpo extraño", "flanco"] });
    if (normalized.startsWith("S3086A")) features.push({ key: "injury_type", required: ["picadura de insecto", "flanco"] });
    if (normalized.startsWith("S3087A")) features.push({ key: "injury_type", required: ["mordedura superficial", "flanco"] });
    if (normalized.startsWith("S309A")) features.push({ key: "injury_type", required: ["traumatismo superficial no especificado", "flanco"] });
  }

  if (family === "L98") {
    features.push({ key: "disease_subtype", required: ["úlcera crónica no debida a presión"] });
    if (normalized.startsWith("L98A") && normalized.length === 7) {
      const site = normalized[4];
      const side = normalized[5];
      const sev = normalized[6];
      if (site === "1") features.push({ key: "anatomical_site", required: ["brazo"] });
      if (site === "2") features.push({ key: "anatomical_site", required: ["antebrazo"] });
      if (site === "3") features.push({ key: "anatomical_site", required: ["mano"] });
      if (side === "1") features.push({ key: "laterality", required: ["derech"] });
      if (side === "2") features.push({ key: "laterality", required: ["izquierd"] });
      if (side === "9") features.push({ key: "laterality", required: ["no especificad"] });
      if (sev === "1") features.push({ key: "severity", required: ["rotura de la piel"] });
      if (sev === "2") features.push({ key: "severity", required: ["capa adiposa"] });
      if (sev === "3") features.push({ key: "severity", required: ["necrosis de músculo"] });
      if (sev === "4") features.push({ key: "severity", required: ["necrosis de hueso"] });
      if (sev === "5") features.push({ key: "severity", required: ["afectación muscular", "sin evidencia de necrosis"] });
      if (sev === "6") features.push({ key: "severity", required: ["afectación ósea", "sin evidencia de necrosis"] });
      if (sev === "8") features.push({ key: "severity", required: ["otra gravedad"] });
      if (sev === "9") features.push({ key: "severity", required: ["gravedad no especificada"] });
    }
    if (normalized.startsWith("L984") && normalized.length === 6) {
      const site = normalized[4];
      if (site === "3") features.push({ key: "anatomical_site", required: ["abdomen"] });
      if (site === "4") features.push({ key: "anatomical_site", required: ["tórax"] });
      if (site === "5") features.push({ key: "anatomical_site", required: ["cuello"] });
      if (site === "6") features.push({ key: "anatomical_site", required: ["cara"] });
      if (site === "7") features.push({ key: "anatomical_site", required: ["ingle"] });
    }
  }

  if (normalized.startsWith("T36AX") && normalized.length === 7) {
    const intent = normalized[5];
    features.push({ key: "substance", required: ["fluoroquinol"] });
    if (intent === "1") {
      features.push({
        key: "poisoning",
        required: ["envenenamiento", "accidental"],
        forbidden: ["efecto adverso", "infradosificación", "autolesión", "agresión"],
      });
    }
    if (intent === "2") {
      features.push({
        key: "intentional_self_harm",
        required: ["envenenamiento", "autolesión intencionada"],
        forbidden: ["efecto adverso", "infradosificación", "accidental", "agresión"],
      });
    }
    if (intent === "3") {
      features.push({
        key: "assault",
        required: ["envenenamiento", "agresión"],
        forbidden: ["efecto adverso", "infradosificación", "accidental", "autolesión"],
      });
    }
    if (intent === "4") {
      features.push({
        key: "undetermined_intent",
        required: ["envenenamiento", "intencionalidad sin determinar"],
        forbidden: ["efecto adverso", "infradosificación"],
      });
    }
    if (intent === "5") {
      features.push({
        key: "adverse_effect",
        required: ["efecto adverso"],
        forbidden: ["envenenamiento", "infradosificación", "autolesión", "agresión"],
      });
    }
    if (intent === "6") {
      features.push({
        key: "underdosing",
        required: ["infradosificación"],
        forbidden: ["envenenamiento", "efecto adverso", "autolesión", "agresión"],
      });
    }
  }

  if (normalized.startsWith("T6584") && normalized.length === 7) {
    const intent = normalized[5];
    features.push({ key: "substance", required: ["xilazina"] });
    if (intent === "1") features.push({ key: "poisoning", required: ["efecto tóxico", "accidental"] });
    if (intent === "2") features.push({ key: "intentional_self_harm", required: ["efecto tóxico", "autolesión intencionada"] });
    if (intent === "3") features.push({ key: "assault", required: ["efecto tóxico", "agresión"] });
    if (intent === "4") features.push({ key: "undetermined_intent", required: ["efecto tóxico", "intencionalidad sin determinar"] });
  }

  if (family === "T78") {
    const stem = normalized.startsWith("T7819") ? "T7819" : normalized.slice(0, -1);
    if (stem.startsWith("T7807") || stem.startsWith("T7808")) {
      features.push({ key: "manifestation", required: ["reacción anafiláctica"], forbidden: ["otras reacciones adversas alimentarias"] });
    }
    if (stem.startsWith("T7811") || stem.startsWith("T7812") || stem === "T7819") {
      features.push({ key: "manifestation", required: ["reacciones adversas alimentarias"], forbidden: ["reacción anafiláctica"] });
    }
    if (stem.startsWith("T7807") || stem.startsWith("T7811")) {
      features.push({ key: "allergen_identity", required: ["leche"] });
    }
    if (stem.startsWith("T7808") || stem.startsWith("T7812")) {
      features.push({ key: "allergen_identity", required: ["huevo"] });
    }
    if (stem.endsWith("0") && (stem.startsWith("T7807") || stem.startsWith("T7811"))) {
      features.push({ key: "baked_food", required: ["tolerancia a la leche horneada"], forbidden: ["reactividad a la leche horneada"] });
    }
    if (stem.endsWith("1") && (stem.startsWith("T7807") || stem.startsWith("T7811"))) {
      features.push({ key: "baked_food", required: ["reactividad a la leche horneada"], forbidden: ["tolerancia a la leche horneada"] });
    }
    if (stem.endsWith("0") && (stem.startsWith("T7808") || stem.startsWith("T7812"))) {
      features.push({ key: "baked_food", required: ["tolerancia al huevo horneado"], forbidden: ["reactividad al huevo horneado"] });
    }
    if (stem.endsWith("1") && (stem.startsWith("T7808") || stem.startsWith("T7812"))) {
      features.push({ key: "baked_food", required: ["reactividad al huevo horneado"], forbidden: ["tolerancia al huevo horneado"] });
    }
  }

  if (family === "G35") {
    features.push({ key: "disease_subtype", required: ["esclerosis múltiple"] });
    if (normalized === "G35A") {
      features.push({
        key: "disease_subtype",
        required: ["remitente-recurrente"],
        forbidden: ["primaria progresiva", "secundaria progresiva", "no especificada"],
      });
    }
    if (normalized.startsWith("G35B")) {
      features.push({ key: "disease_subtype", required: ["primaria progresiva"], forbidden: ["secundaria progresiva", "remitente-recurrente"] });
    }
    if (normalized.startsWith("G35C")) {
      features.push({ key: "disease_subtype", required: ["secundaria progresiva"], forbidden: ["primaria progresiva", "remitente-recurrente"] });
    }
    if (normalized === "G35B0" || normalized === "G35C0") {
      features.push({ key: "unspecified", required: ["no especificada"] });
    }
    if (normalized === "G35B1" || normalized === "G35C1") {
      features.push({ key: "acuity", required: ["activa"], forbidden: ["no activa"] });
    }
    if (normalized === "G35B2" || normalized === "G35C2") {
      features.push({ key: "acuity", required: ["no activa"] });
    }
    if (normalized === "G35D") {
      features.push({ key: "unspecified", required: ["no especificada"], forbidden: ["remitente-recurrente", "primaria progresiva", "secundaria progresiva"] });
    }
  }

  if (family === "R10") {
    if (normalized.startsWith("R102") && normalized !== "R1024") {
      features.push({ key: "anatomical_site", required: ["pélvico"], forbidden: ["dolor abdominal en varios sitios"] });
    }
    if (normalized === "R1020") features.push({ key: "laterality", required: ["lado no especificado"] });
    if (normalized === "R1021") features.push({ key: "laterality", required: ["lado derecho"] });
    if (normalized === "R1022") features.push({ key: "laterality", required: ["lado izquierdo"] });
    if (normalized === "R1024") features.push({ key: "anatomical_site", required: ["suprapúbico"] });
    if (normalized.startsWith("R108A")) features.push({ key: "anatomical_site", required: ["dolor a la palpación"] });
    if (normalized === "R108A1") features.push({ key: "laterality", required: ["flanco derecho"] });
    if (normalized === "R108A2") features.push({ key: "laterality", required: ["flanco izquierdo"] });
    if (normalized === "R108A3") features.push({ key: "anatomical_site", required: ["suprapúbico"] });
    if (normalized === "R108A9") features.push({ key: "anatomical_site", required: ["flanco"] });
    if (normalized.startsWith("R10A")) {
      features.push({ key: "anatomical_site", required: ["dolor en flanco"], forbidden: ["dolor abdominal en varios sitios", "pélvico"] });
    }
    if (normalized === "R10A0") features.push({ key: "laterality", required: ["lado no especificado"] });
    if (normalized === "R10A1") features.push({ key: "laterality", required: ["lado derecho"] });
    if (normalized === "R10A2") features.push({ key: "laterality", required: ["lado izquierdo"] });
    if (normalized === "R10A3" || normalized === "R1023") features.push({ key: "laterality", required: ["bilateral"] });
  }

  if (normalized === "R1116") {
    features.push({ key: "disease_subtype", required: ["hiperémesis", "cannabis"], forbidden: ["náuseas"] });
  }

  if (normalized.startsWith("QA0")) {
    if (normalized === "QA00101") features.push({ key: "gene_identity", required: ["SCN2A"] });
    if (normalized === "QA00102") features.push({ key: "gene_identity", required: ["CACNA1A"] });
    if (normalized === "QA00131") features.push({ key: "gene_identity", required: ["SLC6A1"] });
    if (normalized === "QA00142") features.push({ key: "gene_identity", required: ["DLG4"] });
    if (normalized === "QA00151") features.push({ key: "gene_identity", required: ["FOXG1"] });
    if (normalized === "QA00141") features.push({ key: "gene_identity", required: ["sintaxina"] });
    if (normalized === "QA0011") features.push({ key: "disease_subtype", required: ["glutamato"] });
  }

  if (normalized.startsWith("E72")) {
    features.push({ key: "disease_subtype", required: ["hiperoxaluria"], forbidden: ["hiperooxaluria"] });
    if (normalized === "E72530") features.push({ key: "disease_subtype", required: ["primaria", "tipo 1"] });
    if (normalized === "E72540") features.push({ key: "disease_subtype", required: ["dietética"] });
    if (normalized === "E72541") features.push({ key: "disease_subtype", required: ["entérica"] });
    if (normalized.startsWith("E7253")) features.push({ key: "disease_subtype", required: ["primaria"] });
    if (normalized === "E72548" || normalized === "E72549") features.push({ key: "disease_subtype", required: ["secundaria"] });
  }
  if (normalized.startsWith("E83")) {
    if (normalized === "E83821" || normalized === "E83822") features.push({ key: "gene_identity", required: ["ENPP1"] });
    if (normalized === "E83823" || normalized === "E83824") features.push({ key: "gene_identity", required: ["ABCC6"] });
    if (normalized === "E83825") features.push({ key: "gene_identity", required: ["CD73"] });
  }

  if (normalized.startsWith("C50A")) {
    features.push({ key: "disease_subtype", required: ["inflamatoria", "mama"] });
    if (normalized === "C50A1") features.push({ key: "laterality", required: ["derecha"] });
    if (normalized === "C50A2") features.push({ key: "laterality", required: ["izquierda"] });
  }

  if (normalized.startsWith("H01")) {
    if (["H0181", "H0182", "H0183", "H018A"].includes(normalized)) features.push({ key: "laterality", required: ["derech"] });
    if (["H0184", "H0185", "H0186", "H018B"].includes(normalized)) features.push({ key: "laterality", required: ["izquierd"] });
    if (normalized === "H0181" || normalized === "H0184") features.push({ key: "anatomical_site", required: ["párpado superior"] });
    if (normalized === "H0182" || normalized === "H0185") features.push({ key: "anatomical_site", required: ["párpado inferior"] });
    if (normalized === "H018A" || normalized === "H018B") {
      features.push({ key: "anatomical_site", required: ["párpados superior e inferior"] });
    }
    if (normalized === "H0183" || normalized === "H0186" || normalized === "H0189") {
      features.push({ key: "anatomical_site", required: ["párpado no especificado"] });
    }
  }

  if (normalized.startsWith("H0583")) {
    features.push({ key: "disease_subtype", required: ["orbitopatía tiroidea"] });
    if (normalized === "H05831") features.push({ key: "laterality", required: ["órbita derecha"] });
    if (normalized === "H05832") features.push({ key: "laterality", required: ["órbita izquierda"] });
    if (normalized === "H05833") features.push({ key: "laterality", required: ["bilateral"] });
  }

  if (normalized.startsWith("H4084")) {
    features.push({ key: "disease_subtype", required: ["glaucoma", "neovascular"] });
    if (normalized === "H40841") features.push({ key: "laterality", required: ["ojo derecho"] });
    if (normalized === "H40842") features.push({ key: "laterality", required: ["ojo izquierdo"] });
    if (normalized === "H40843") features.push({ key: "laterality", required: ["bilateral"] });
  }

  if (normalized.startsWith("Z91")) {
    if (normalized.startsWith("Z91011")) features.push({ key: "allergen_identity", required: ["lácteos"] });
    if (normalized.startsWith("Z91012")) features.push({ key: "allergen_identity", required: ["huevo"] });
    if (normalized === "Z910111") features.push({ key: "baked_food", required: ["tolerancia a la leche horneada"] });
    if (normalized === "Z910112") features.push({ key: "baked_food", required: ["reactividad a la leche horneada"] });
    if (normalized === "Z910121") features.push({ key: "baked_food", required: ["tolerancia al huevo horneado"] });
    if (normalized === "Z910122") features.push({ key: "baked_food", required: ["reactividad al huevo horneado"] });
  }

  if (normalized.startsWith("E88")) {
    features.push({ key: "disease_subtype", required: ["lipodistrofia"] });
    if (normalized === "E8811") features.push({ key: "disease_subtype", required: ["parcial"] });
    if (normalized === "E8812") features.push({ key: "disease_subtype", required: ["generalizada"] });
    if (normalized === "E8813") features.push({ key: "disease_subtype", required: ["localizada"] });
    if (normalized === "E8814") features.push({ key: "disease_subtype", required: ["vih"] });
  }

  if (normalized.startsWith("Q99")) {
    if (normalized.startsWith("Q9981")) features.push({ key: "disease_subtype", required: ["usher"] });
    if (normalized === "Q99811") features.push({ key: "disease_subtype", required: ["tipo 1"] });
    if (normalized === "Q99812") features.push({ key: "disease_subtype", required: ["tipo 2"] });
    if (normalized === "Q99813") features.push({ key: "disease_subtype", required: ["tipo 3"] });
  }

  if (normalized.startsWith("N00") || normalized.startsWith("N04")) {
    features.push({ key: "disease_subtype", required: ["ic-mpgn"] });
    if (normalized.startsWith("N00")) features.push({ key: "disease_subtype", required: ["nefrítico"] });
    if (normalized.startsWith("N04")) features.push({ key: "disease_subtype", required: ["nefrótico"] });
    if (normalized.endsWith("B1")) features.push({ key: "disease_subtype", required: ["idiopática"] });
    if (normalized.endsWith("B2")) features.push({ key: "disease_subtype", required: ["secundaria"] });
  }

  if (normalized === "M05A") {
    features.push({ key: "with_without", required: ["con artritis reumatoide"] });
  }
  if (normalized === "R7681") {
    features.push({
      key: "with_without",
      required: ["sin artritis reumatoide"],
      forbidden: ["con artritis reumatoide"],
    });
  }
  if (normalized === "B8801") features.push({ key: "disease_subtype", required: ["demodex"] });
  if (normalized === "B8809") features.push({ key: "disease_subtype", required: ["acariasis"] });
  if (normalized.startsWith("D71") && normalized !== "D711") features.push({ key: "disease_subtype", required: ["neutrófil"] });
  if (normalized === "D711") features.push({ key: "disease_subtype", required: ["adhesión leucocitaria"] });
  if (normalized.startsWith("E78")) features.push({ key: "disease_subtype", required: ["hipercolesterolemia familiar"] });
  if (normalized === "E78010") features.push({ key: "disease_subtype", required: ["homocigótica", "hofh"] });
  if (normalized === "E78011") features.push({ key: "disease_subtype", required: ["heterocigótica", "hefh"] });
  if (normalized === "E83820") features.push({ key: "disease_subtype", required: ["calcificación arterial generalizada"] });
  if (normalized === "G3187") features.push({ key: "disease_subtype", required: ["apraxia"] });
  if (normalized === "G71036") features.push({ key: "disease_subtype", required: ["fukutina"] });
  if (normalized === "H0189") features.push({ key: "laterality", required: ["no especificado"] });
  if (normalized.startsWith("I27")) features.push({ key: "disease_subtype", required: ["fontan"] });
  if (normalized === "Q8787") features.push({ key: "disease_subtype", required: ["hao-fountain"] });
  if (normalized === "Q8981") features.push({ key: "disease_subtype", required: ["kabuki"] });
  if (normalized === "Q8989") features.push({ key: "disease_subtype", required: ["malformaciones congénitas"] });
  if (normalized === "Q9989") features.push({ key: "disease_subtype", required: ["cromosóm"] });
  if (normalized === "QA00109") features.push({ key: "disease_subtype", required: ["canal iónico"] });
  if (normalized === "QA0012") features.push({ key: "disease_subtype", required: ["receptores"] });
  if (normalized === "QA00139") features.push({ key: "disease_subtype", required: ["transportador"] });
  if (normalized === "QA00149") features.push({ key: "disease_subtype", required: ["sinapsis"] });
  if (normalized === "QA00159") features.push({ key: "disease_subtype", required: ["expresión génica"] });
  if (normalized === "QA08") features.push({ key: "disease_subtype", required: ["neurodesarrollo"] });
  if (normalized.startsWith("R3985")) features.push({ key: "anatomical_site", required: ["costovertebral"] });
  if (normalized === "R39851") features.push({ key: "laterality", required: ["lado derecho"] });
  if (normalized === "R39852") features.push({ key: "laterality", required: ["lado izquierdo"] });
  if (normalized === "R39853") features.push({ key: "laterality", required: ["bilateral"] });
  if (normalized === "R7689") features.push({ key: "disease_subtype", required: ["inmunológ"] });
  if (normalized.startsWith("Y93")) features.push({ key: "status", required: ["actividad"] });
  if (normalized === "Y93L1") features.push({ key: "status", required: ["leña"] });
  if (normalized.startsWith("Z59")) features.push({ key: "status", required: ["inseguridad financiera"] });
  if (normalized.startsWith("Z77")) features.push({ key: "external_cause", required: ["exposición"] });
  if (normalized === "Z7731") features.push({ key: "external_cause", required: ["guerra del golfo"] });
  if (normalized === "Z91B") features.push({ key: "status", required: ["dietilestilbestrol"] });
  if (normalized === "L02217") features.push({ key: "anatomical_site", required: ["absceso", "flanco"] });
  if (normalized === "L02227") features.push({ key: "anatomical_site", required: ["forúnculo", "flanco"] });
  if (normalized === "L0331A") features.push({ key: "anatomical_site", required: ["celulitis", "flanco"] });
  if (normalized === "L0332A") features.push({ key: "anatomical_site", required: ["linfangitis", "flanco"] });
  if (normalized === "E11A") {
    features.push({ key: "status", required: ["tipo 2", "remisión"] });
    features.push({ key: "with_without", required: ["sin complicaciones"] });
  }
  if (normalized === "Q8788") features.push({ key: "gene_identity", required: ["CTNNB1"] });
  if (normalized === "N07B" || normalized === "Z8411") features.push({ key: "gene_identity", required: ["APOL1"] });
  if (normalized.startsWith("Z15")) features.push({ key: "status", required: ["susceptibilidad genética"] });
  if (normalized.startsWith("Z40")) features.push({ key: "status", required: ["cirugía profiláctica"] });
  if (normalized === "Z4081") {
    features.push({
      key: "anatomical_site",
      required: ["ovario"],
      forbidden: ["falopio"],
    });
    features.push({ key: "with_without", required: ["sin factores de riesgo"] });
  }
  if (normalized === "Z4082") {
    features.push({
      key: "anatomical_site",
      required: ["falopio"],
      forbidden: ["ovario"],
    });
    features.push({ key: "with_without", required: ["sin factores de riesgo"] });
  }
  if (normalized.startsWith("Z80") || normalized.startsWith("Z84") || normalized.startsWith("Z85") || normalized.startsWith("Z86")) {
    features.push({ key: "status", required: ["antecedentes"] });
  }
  if (normalized === "Z854A" || normalized === "Z8600A" || normalized === "Z8044" || normalized === "Z1505") {
    features.push({ key: "anatomical_site", required: ["falopio"] });
  }
  if (normalized.startsWith("T75830")) features.push({ key: "external_cause", required: ["guerra del golfo"] });
  if (normalized.startsWith("T75838")) features.push({ key: "external_cause", required: ["teatro de guerra"] });
  if (normalized.startsWith("Y36A1") || normalized.startsWith("Y37A1")) {
    features.push({ key: "external_cause", required: ["sobrepresión", "bajo nivel"] });
  }
  if (normalized.startsWith("Y36A2") || normalized.startsWith("Y37A2")) {
    features.push({ key: "external_cause", required: ["sobrepresión", "alto nivel"] });
  }
  if (normalized.startsWith("Y36A")) features.push({ key: "external_cause", required: ["operaciones de guerra"] });
  if (normalized.startsWith("Y37A")) features.push({ key: "external_cause", required: ["operaciones militares"] });
  if (normalized.startsWith("W44H9")) features.push({ key: "external_cause", required: ["orificio natural"] });
  if (normalized.startsWith("W453")) features.push({ key: "external_cause", required: ["anzuelo"] });

  if (normalized.length >= 7 && ENCOUNTER_ES[seventh] && ["S30", "S31", "T36", "T65", "T78", "T75", "Y36", "Y37", "W44", "W45"].includes(family)) {
    features.push({
      key: "encounter_character",
      required: [ENCOUNTER_ES[seventh]!],
      forbidden: Object.values(ENCOUNTER_ES).filter((value) => value !== ENCOUNTER_ES[seventh]),
    });
  }

  return features;
}

function englishFeatures(english: string): Fy2026EsSemanticFeature[] {
  const features: Fy2026EsSemanticFeature[] = [];
  const genes = english.match(GENE_TOKEN) ?? [];
  for (const gene of genes) {
    if (["ICD", "NEC", "NOS", "HIV", "FALD", "AMKD", "IC"].includes(gene)) continue;
    features.push({ key: "gene_identity", required: [gene] });
  }
  const lower = english.toLowerCase();
  if (/\bhyperoxaluria\b/.test(lower)) {
    features.push({ key: "disease_subtype", required: ["hiperoxaluria"], forbidden: ["hiperooxaluria"] });
  }
  if (/type 1/.test(lower) && /hyperoxaluria/.test(lower)) {
    features.push({ key: "disease_subtype", required: ["tipo 1"] });
  }
  if (/\bdietary\b/.test(lower)) features.push({ key: "disease_subtype", required: ["dietética"] });
  if (/\benteric\b/.test(lower)) features.push({ key: "disease_subtype", required: ["entérica"] });
  if (/primary hyperoxaluria/.test(lower) && !/type 1|other specified/.test(lower) && /unspecified/.test(lower)) {
    features.push({ key: "disease_subtype", required: ["primaria"] });
  }
  if (/\bwithout rheumatoid\b/.test(lower) || /w\/o rheu arthrit/.test(lower)) {
    features.push({ key: "with_without", required: ["sin artritis reumatoide"], forbidden: ["con artritis reumatoide"] });
  } else if (/w rheu arthrit|with rheu arthrit/.test(lower)) {
    features.push({ key: "with_without", required: ["con artritis reumatoide"] });
  }
  return features;
}

export function extractFy2026EsSemanticFeatures(input: {
  code: string;
  shortDescription: string;
}): { family: string; normalizedCode: string; features: Fy2026EsSemanticFeature[] } {
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

export function certifyFy2026EsGapSemantics(input: {
  code: string;
  shortDescription: string;
  spanish: string;
  structuralStatus: string;
  parentSpanish?: string | null;
}): Fy2026EsSemanticRow {
  const extracted = extractFy2026EsSemanticFeatures({
    code: input.code,
    shortDescription: input.shortDescription,
  });
  const es = input.spanish.toLowerCase();
  const notes: string[] = [];
  let status: Fy2026EsSemanticStatus = "PASS";

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
  if (input.structuralStatus === "APPROVED_CANDIDATE" || input.structuralStatus === "STRUCTURAL_CANDIDATE") {
    notes.push("STRUCTURAL_PASS_IS_NOT_SEMANTIC_PASS");
  }
  if (input.parentSpanish && input.parentSpanish.trim() === input.spanish.trim()) {
    notes.push("PARENT_LABEL_COPY");
    status = "FAIL";
  }
  if (/\b(abdominal pain|nausea|vomiting|multiple sclerosis|cellulitis, unspecified)\b/i.test(input.spanish)) {
    notes.push("ENGLISH_FALLBACK");
    status = "FAIL";
  }

  for (const feature of extracted.features) {
    if (!hasAll(es, feature.required)) {
      notes.push(`MISSING_${feature.key.toUpperCase()}:${feature.required.join("+")}`);
      status = "FAIL";
    }
    if (feature.forbidden && hasAny(es, feature.forbidden)) {
      notes.push(`FORBIDDEN_${feature.key.toUpperCase()}:${feature.forbidden.filter((token) => es.includes(token.toLowerCase())).join("+")}`);
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

export type Fy2026EsSemanticFamilySummary = {
  family: string;
  TOTAL: number;
  PASS: number;
  REVIEW_REQUIRED: number;
  FAIL: number;
};

export function fy2026EsGapIngestGate(options: {
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

export function fy2026EsApprovalStage(input: {
  semanticStatus: Fy2026EsSemanticStatus;
  approvedForLocalIngest: boolean;
}): Fy2026EsApprovalStage | "PENDING_REVIEW" {
  if (input.approvedForLocalIngest && input.semanticStatus === "PASS") return "APPROVED_FOR_LOCAL_INGEST";
  if (input.semanticStatus === "PASS") return "SEMANTICALLY_CERTIFIED";
  return "PENDING_REVIEW";
}

export function toFy2026EsSemanticReviewRecord(
  row: Fy2026EsSemanticRow,
  approvedForLocalIngest = false,
): {
  CODE: string;
  OFFICIAL_ENGLISH_DESCRIPTION: string;
  PROPOSED_SPANISH_DESCRIPTION: string;
  FAMILY: string;
  SEMANTIC_FEATURES: Fy2026EsSemanticFeature[];
  STRUCTURAL_STATUS: string;
  SEMANTIC_STATUS: Fy2026EsSemanticStatus;
  SEMANTIC_NOTES: string[];
  APPROVAL_STAGE: Fy2026EsApprovalStage | "PENDING_REVIEW";
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
    APPROVAL_STAGE: fy2026EsApprovalStage({
      semanticStatus: row.semanticStatus,
      approvedForLocalIngest,
    }),
  };
}

export function summarizeFy2026EsSemantics(
  rows: readonly Fy2026EsSemanticRow[],
): Fy2026EsSemanticFamilySummary[] {
  const byFamily = new Map<string, Fy2026EsSemanticFamilySummary>();
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
