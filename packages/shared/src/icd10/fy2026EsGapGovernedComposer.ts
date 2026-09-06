/**
 * MEDUI.TRILANG.DX.P3-F.7-ES — deterministic Medora-governed Spanish labels
 * for FY2026 selectable codes absent from CIE-10-ES 2026.
 *
 * Not OFFICIAL_SOURCE. Not parent/sibling inheritance. Not English fallback.
 * Uses CIE-10-ES lexical conventions (encuentro, laterality, unspecified)
 * plus exact-code concept stems. Output is EXACT_GOVERNED after review.
 */
import { normalizeIcd10CodeForLookup } from "../icd10Normalize.js";

export const FY2026_ES_GAP_BUCKETS = [
  "OFFICIAL_SPANISH_SOURCE_AVAILABLE",
  "GOVERNED_SPANISH_LABEL_REQUIRED",
  "REVIEW_REQUIRED",
  "INVALID_OR_NONSELECTABLE",
] as const;
export type Fy2026EsGapBucket = (typeof FY2026_ES_GAP_BUCKETS)[number];

export type Fy2026EsGapComposeInput = {
  code: string;
  shortDescription: string;
  isSelectable: boolean;
};

export type Fy2026EsGapComposeResult = {
  code: string;
  normalizedCode: string;
  family: string;
  bucket: Fy2026EsGapBucket;
  label: string | null;
  blockedReason: string | null;
};

const ENCOUNTER: Record<string, string> = {
  A: "contacto inicial",
  D: "contacto sucesivo",
  S: "secuela",
};

const L98_SEVERITY: Record<string, string> = {
  "1": "limitada a la rotura de la piel",
  "2": "con exposición de la capa adiposa",
  "3": "con necrosis de músculo",
  "4": "con necrosis de hueso",
  "5": "con afectación muscular sin evidencia de necrosis",
  "6": "con afectación ósea sin evidencia de necrosis",
  "8": "con otra gravedad especificada",
  "9": "de gravedad no especificada",
};

const L98_AXIAL_SITE: Record<string, string> = {
  "3": "abdomen",
  "4": "tórax",
  "5": "cuello",
  "6": "cara",
  "7": "ingle",
};

const L98_ARM_SITE: Record<string, string> = {
  "1": "brazo",
  "2": "antebrazo",
  "3": "mano",
};

const L98_LATERALITY: Record<string, string> = {
  "1": "derecho",
  "2": "izquierdo",
  "9": "no especificado",
};

const S31_WOUND: Record<string, string> = {
  "0": "Herida abierta no especificada de pared abdominal",
  "1": "Desgarro de pared abdominal sin cuerpo extraño",
  "2": "Desgarro de pared abdominal con cuerpo extraño",
  "3": "Herida punzante de pared abdominal sin cuerpo extraño",
  "4": "Herida punzante de pared abdominal con cuerpo extraño",
  "5": "Mordedura abierta de pared abdominal",
};

const S31_FLANK: Record<string, string> = {
  "6": "flanco derecho",
  "7": "flanco izquierdo",
  A: "flanco no especificado",
};

const S30_STEM: Record<string, string> = {
  S3011X: "Contusión de pared abdominal",
  S3012X: "Contusión de la ingle",
  S3013X: "Contusión de la región del flanco",
  S3081A: "Abrasión del flanco",
  S3082A: "Ampolla (no térmica) del flanco",
  S3084A: "Constricción externa del flanco",
  S3085A: "Cuerpo extraño superficial del flanco",
  S3086A: "Picadura de insecto (no venenoso) del flanco",
  S3087A: "Otra mordedura superficial del flanco",
  S309A: "Traumatismo superficial no especificado del flanco",
};

const T36_INTENT: Record<string, string> = {
  "1": "Envenenamiento por antibióticos fluoroquinolónicos, accidental (no intencionado)",
  "2": "Envenenamiento por antibióticos fluoroquinolónicos, autolesión intencionada",
  "3": "Envenenamiento por antibióticos fluoroquinolónicos, agresión",
  "4": "Envenenamiento por antibióticos fluoroquinolónicos, intencionalidad sin determinar",
  "5": "Efecto adverso de antibióticos fluoroquinolónicos",
  "6": "Infradosificación de antibióticos fluoroquinolónicos",
};

const T65_INTENT: Record<string, string> = {
  "1": "Efecto tóxico de xilazina, accidental (no intencionado)",
  "2": "Efecto tóxico de xilazina, autolesión intencionada",
  "3": "Efecto tóxico de xilazina, agresión",
  "4": "Efecto tóxico de xilazina, intencionalidad sin determinar",
};

const T78_STEM: Record<string, string> = {
  T78070: "Reacción anafiláctica por leche y productos lácteos con tolerancia a la leche horneada",
  T78071: "Reacción anafiláctica por leche y productos lácteos con reactividad a la leche horneada",
  T78079: "Reacción anafiláctica por leche y productos lácteos, no especificada",
  T78080: "Reacción anafiláctica por huevo con tolerancia al huevo horneado",
  T78081: "Reacción anafiláctica por huevo con reactividad al huevo horneado",
  T78089: "Reacción anafiláctica por huevos, no especificada",
  T78110: "Otras reacciones adversas alimentarias por leche y productos lácteos con tolerancia a la leche horneada",
  T78111: "Otras reacciones adversas alimentarias por leche y productos lácteos con reactividad a la leche horneada",
  T78119: "Otras reacciones adversas alimentarias por leche y productos lácteos, tolerancia o reactividad a la leche horneada no especificada",
  T78120: "Otras reacciones adversas alimentarias por huevo con tolerancia al huevo horneado",
  T78121: "Otras reacciones adversas alimentarias por huevo con reactividad al huevo horneado",
  T78129: "Otras reacciones adversas alimentarias por huevo, tolerancia o reactividad al huevo horneado no especificada",
  T7819: "Otras reacciones adversas alimentarias, no clasificadas en otra parte",
};

/** Exact-code stems for families that are not mechanically templated. */
const EXPLICIT_STEMS: Record<string, string> = {
  B8801: "Infestación por ácaros Demodex",
  B8809: "Otras acariasis",
  C50A0: "Neoplasia maligna inflamatoria de mama no especificada",
  C50A1: "Neoplasia maligna inflamatoria de mama derecha",
  C50A2: "Neoplasia maligna inflamatoria de mama izquierda",
  D711: "Deficiencia de adhesión leucocitaria",
  D718: "Otros trastornos funcionales de los neutrófilos polimorfonucleares",
  D719: "Trastornos funcionales de los neutrófilos polimorfonucleares, no especificados",
  E11A: "Diabetes mellitus tipo 2 sin complicaciones, en remisión",
  E72530: "Hiperoxaluria primaria, tipo 1",
  E72538: "Otra hiperoxaluria primaria especificada",
  E72539: "Hiperoxaluria primaria, no especificada",
  E72540: "Hiperoxaluria dietética",
  E72541: "Hiperoxaluria entérica",
  E72548: "Otra hiperoxaluria secundaria",
  E72549: "Hiperoxaluria secundaria, no especificada",
  E78010: "Hipercolesterolemia familiar homocigótica [HoFH]",
  E78011: "Hipercolesterolemia familiar heterocigótica [HeFH]",
  E78019: "Hipercolesterolemia familiar, no especificada",
  E83820: "Calcificación arterial generalizada de la infancia con causalidad genética no especificada",
  E83821: "Deficiencia de ENPP1 que causa calcificación arterial generalizada de la infancia",
  E83822: "Deficiencia de ENPP1 que causa raquitismo hipofosfatémico autosómico recesivo tipo 2",
  E83823: "Deficiencia de ABCC6 que causa calcificación arterial generalizada de la infancia",
  E83824: "Deficiencia de ABCC6 que causa seudoxantoma elástico",
  E83825: "Deficiencia de CD73 que causa calcificación arterial",
  E8810: "Lipodistrofia, no especificada",
  E8811: "Lipodistrofia parcial",
  E8812: "Lipodistrofia generalizada",
  E8813: "Lipodistrofia localizada",
  E8814: "Lipodistrofia asociada al VIH",
  E8819: "Otra lipodistrofia, no clasificada en otra parte",
  G3187: "Apraxia del habla progresiva primaria",
  G35A: "Esclerosis múltiple remitente-recurrente",
  G35B0: "Esclerosis múltiple primaria progresiva, no especificada",
  G35B1: "Esclerosis múltiple primaria progresiva activa",
  G35B2: "Esclerosis múltiple primaria progresiva no activa",
  G35C0: "Esclerosis múltiple secundaria progresiva, no especificada",
  G35C1: "Esclerosis múltiple secundaria progresiva activa",
  G35C2: "Esclerosis múltiple secundaria progresiva no activa",
  G35D: "Esclerosis múltiple, no especificada",
  G71036: "Distrofia muscular de cinturas por disfunción de la proteína relacionada con fukutina",
  H0181: "Otra inflamación especificada del párpado superior derecho",
  H0182: "Otra inflamación especificada del párpado inferior derecho",
  H0183: "Otra inflamación del ojo derecho, párpado no especificado",
  H0184: "Otra inflamación especificada del párpado superior izquierdo",
  H0185: "Otra inflamación especificada del párpado inferior izquierdo",
  H0186: "Otra inflamación del ojo izquierdo, párpado no especificado",
  H0189: "Otra inflamación de ojo no especificado, párpado no especificado",
  H018A: "Otra inflamación del ojo derecho, párpados superior e inferior",
  H018B: "Otra inflamación del ojo izquierdo, párpados superior e inferior",
  H05831: "Orbitopatía tiroidea, órbita derecha",
  H05832: "Orbitopatía tiroidea, órbita izquierda",
  H05833: "Orbitopatía tiroidea, bilateral",
  H05839: "Orbitopatía tiroidea, órbita no especificada",
  H40841: "Glaucoma de ángulo cerrado secundario neovascular, ojo derecho",
  H40842: "Glaucoma de ángulo cerrado secundario neovascular, ojo izquierdo",
  H40843: "Glaucoma de ángulo cerrado secundario neovascular, bilateral",
  H40849: "Glaucoma de ángulo cerrado secundario neovascular, no especificado",
  I27840: "Enfermedad hepática asociada a Fontan [FALD]",
  I27841: "Disfunción linfática asociada a Fontan",
  I27848: "Otra afección asociada a Fontan",
  I27849: "Circulación relacionada con Fontan, no especificada",
  L02217: "Absceso cutáneo del flanco",
  L02227: "Forúnculo del flanco",
  L0331A: "Celulitis del flanco",
  L0332A: "Linfangitis aguda del flanco",
  M05A: "Factor reumatoide y anticuerpo antipéptido citrulinado anormales con artritis reumatoide",
  N00B1: "Síndrome nefrítico agudo con glomerulonefritis membranoproliferativa por inmunocomplejos idiopática (IC-MPGN)",
  N00B2: "Síndrome nefrítico agudo con glomerulonefritis membranoproliferativa por inmunocomplejos secundaria (IC-MPGN)",
  N04B1: "Síndrome nefrótico con glomerulonefritis membranoproliferativa por inmunocomplejos idiopática (IC-MPGN)",
  N04B2: "Síndrome nefrótico con glomerulonefritis membranoproliferativa por inmunocomplejos secundaria (IC-MPGN)",
  N07B: "Nefropatía hereditaria, no clasificada en otra parte, con enfermedad renal mediada por APOL1",
  Q8787: "Síndrome de Hao-Fountain",
  Q8788: "Síndrome CTNNB1",
  Q8981: "Síndrome de Kabuki",
  Q8989: "Otras malformaciones congénitas especificadas",
  Q99811: "Síndrome de Usher, tipo 1",
  Q99812: "Síndrome de Usher, tipo 2",
  Q99813: "Síndrome de Usher, tipo 3",
  Q99818: "Otro síndrome de Usher",
  Q99819: "Síndrome de Usher, no especificado",
  Q9989: "Otras anomalías cromosómicas especificadas",
  QA00101: "Trastorno del neurodesarrollo relacionado con SCN2A",
  QA00102: "Trastorno del neurodesarrollo relacionado con CACNA1A",
  QA00109: "Trastorno del neurodesarrollo relacionado con variante patógena en otro gen de canal iónico",
  QA0011: "Trastorno del neurodesarrollo relacionado con variante patógena en genes de receptores de glutamato",
  QA0012: "Trastorno del neurodesarrollo relacionado con variante patógena en otros genes de receptores",
  QA00131: "Trastorno relacionado con SLC6A1",
  QA00139: "Trastorno del neurodesarrollo relacionado con variante patógena en otro gen transportador o de soluto",
  QA00141: "Trastorno relacionado con la proteína 1 de unión a sintaxina",
  QA00142: "Trastorno sinaptopático relacionado con DLG4",
  QA00149: "Trastorno del neurodesarrollo relacionado con variante patógena en otro gen relacionado con la sinapsis",
  QA00151: "Síndrome FOXG1",
  QA00159: "Trastorno del neurodesarrollo relacionado con otros genes asociados a transcripción y expresión génica",
  QA08: "Otro trastorno del neurodesarrollo relacionado con variante patógena en otros genes específicos",
  R1020: "Dolor pélvico y perineal, lado no especificado",
  R1021: "Dolor pélvico y perineal, lado derecho",
  R1022: "Dolor pélvico y perineal, lado izquierdo",
  R1023: "Dolor pélvico y perineal, bilateral",
  R1024: "Dolor suprapúbico",
  R108A1: "Dolor a la palpación en flanco derecho",
  R108A2: "Dolor a la palpación en flanco izquierdo",
  R108A3: "Dolor a la palpación suprapúbico",
  R108A9: "Dolor a la palpación en flanco, no especificado",
  R10A0: "Dolor en flanco, lado no especificado",
  R10A1: "Dolor en flanco, lado derecho",
  R10A2: "Dolor en flanco, lado izquierdo",
  R10A3: "Dolor en flanco, bilateral",
  R1116: "Síndrome de hiperémesis por cannabis",
  R39851: "Dolor a la palpación en el ángulo costovertebral, lado derecho",
  R39852: "Dolor a la palpación en el ángulo costovertebral, lado izquierdo",
  R39853: "Dolor a la palpación en el ángulo costovertebral, bilateral",
  R39859: "Dolor a la palpación en el ángulo costovertebral, lado no especificado",
  R7681: "Factor reumatoide o anticuerpo antipéptido citrulinado anormales sin artritis reumatoide",
  R7689: "Otros hallazgos inmunológicos séricos anormales especificados",
  T75830: "Enfermedad de la guerra del Golfo",
  T75838: "Efectos de otro teatro de guerra",
  W44H9: "Otro objeto cortante que entra por orificio natural",
  W453: "Anzuelo que penetra a través de la piel",
  Y36A1: "Sobrepresión por explosión de bajo nivel en operaciones de guerra",
  Y36A2: "Sobrepresión por explosión de alto nivel en operaciones de guerra",
  Y37A1: "Sobrepresión por explosión de bajo nivel en operaciones militares",
  Y37A2: "Sobrepresión por explosión de alto nivel en operaciones militares",
  Y93L1: "Actividad, partir leña",
  Y93L9: "Actividad, otra actividad al aire libre",
  Z1505: "Susceptibilidad genética a neoplasia maligna de trompa(s) de Falopio",
  Z15060: "Susceptibilidad genética a cáncer colorrectal",
  Z15068: "Susceptibilidad genética a otra neoplasia maligna del aparato digestivo",
  Z1507: "Susceptibilidad genética a neoplasia maligna de las vías urinarias",
  Z153: "Susceptibilidad genética a enfermedad renal",
  Z4081: "Encuentro para cirugía profiláctica de extirpación de ovario(s) sin factores de riesgo genéticos o familiares",
  Z4082: "Encuentro para cirugía profiláctica de extirpación de trompa(s) de Falopio sin factores de riesgo genéticos o familiares",
  Z4089: "Encuentro para otra cirugía profiláctica",
  Z59861: "Inseguridad financiera, dificultad para pagar servicios públicos",
  Z59868: "Otra inseguridad financiera especificada",
  Z59869: "Inseguridad financiera, no especificada",
  Z7731: "Contacto y (sospecha de) exposición a teatro de la guerra del Golfo",
  Z7739: "Contacto y (sospecha de) exposición a otro teatro de guerra",
  Z8044: "Antecedentes familiares de neoplasia maligna de trompa(s) de Falopio",
  Z8411: "Antecedentes familiares de enfermedad renal mediada por APOL1 [AMKD]",
  Z8419: "Antecedentes familiares de otros trastornos del riñón y del uréter",
  Z84A: "Antecedentes familiares de exposición a dietilestilbestrol",
  Z854A: "Antecedentes personales de neoplasia maligna de trompa(s) de Falopio",
  Z8600A: "Antecedentes personales de neoplasia in situ de trompa(s) de Falopio",
  Z910110: "Alergia a productos lácteos, no especificada",
  Z910111: "Alergia a productos lácteos con tolerancia a la leche horneada",
  Z910112: "Alergia a productos lácteos con reactividad a la leche horneada",
  Z910120: "Alergia al huevo, no especificada",
  Z910121: "Alergia al huevo con tolerancia al huevo horneado",
  Z910122: "Alergia al huevo con reactividad al huevo horneado",
  Z91B: "Factor de riesgo personal de exposición a dietilestilbestrol",
};

function familyOf(normalized: string): string {
  return normalized.slice(0, 3);
}

function l98SidePhrase(site: string, side: string): string {
  if (site === "mano") {
    if (side === "derecho") return "mano derecha";
    if (side === "izquierdo") return "mano izquierda";
    return "mano no especificada";
  }
  if (side === "no especificado") return `${site} no especificado`;
  return `${site} ${side}`;
}

function withEncounter(stem: string, seventh: string | undefined): string | null {
  const enc = seventh ? ENCOUNTER[seventh] : null;
  if (seventh && !enc) return null;
  return enc ? `${stem}, ${enc}` : stem;
}

function composeL98(normalized: string): string | null {
  if (normalized.startsWith("L98A") && normalized.length === 7) {
    const site = L98_ARM_SITE[normalized[4]!];
    const side = L98_LATERALITY[normalized[5]!];
    const sev = L98_SEVERITY[normalized[6]!];
    if (!site || !side || !sev) return null;
    return `Úlcera crónica no debida a presión en ${l98SidePhrase(site, side)}, ${sev}`;
  }
  if (normalized.startsWith("L98") && normalized.length === 6 && normalized[3] === "4") {
    const site = L98_AXIAL_SITE[normalized[4]!];
    const sev = L98_SEVERITY[normalized[5]!];
    if (!site || !sev) return null;
    return `Úlcera crónica no debida a presión en ${site}, ${sev}`;
  }
  return null;
}

function composeS31(normalized: string): string | null {
  if (!normalized.startsWith("S31") || normalized.length !== 7) return null;
  const penet = normalized[3];
  const wound = S31_WOUND[normalized[4]!];
  const flank = S31_FLANK[normalized[5]!];
  const enc = ENCOUNTER[normalized[6]!];
  if ((penet !== "1" && penet !== "6") || !wound || !flank || !enc) return null;
  const perit =
    penet === "1"
      ? "sin penetración en cavidad peritoneal"
      : "con penetración en cavidad peritoneal";
  return `${wound}, ${flank}, ${perit}, ${enc}`;
}

function composeS30(normalized: string): string | null {
  const seventh = normalized.slice(-1);
  const stemKey =
    normalized.startsWith("S309A") ? "S309A" : normalized.slice(0, normalized.length - 1);
  const stem = S30_STEM[stemKey];
  if (!stem) return null;
  return withEncounter(stem, seventh);
}

function composeT36(normalized: string): string | null {
  // T36AX1A
  if (!normalized.startsWith("T36AX") || normalized.length !== 7) return null;
  const stem = T36_INTENT[normalized[5]!];
  const enc = ENCOUNTER[normalized[6]!];
  if (!stem || !enc) return null;
  return `${stem}, ${enc}`;
}

function composeT65(normalized: string): string | null {
  if (!normalized.startsWith("T6584") || normalized.length !== 7) return null;
  const stem = T65_INTENT[normalized[5]!];
  const enc = ENCOUNTER[normalized[6]!];
  if (!stem || !enc) return null;
  return `${stem}, ${enc}`;
}

function composeT78(normalized: string): string | null {
  const seventh = normalized.slice(-1);
  const key = normalized.startsWith("T7819") ? "T7819" : normalized.slice(0, -1);
  const stem = T78_STEM[key];
  if (!stem) return null;
  return withEncounter(stem, seventh);
}

function composeT75Y36Y37W(normalized: string): string | null {
  const seventh = normalized.slice(-1);
  if (!ENCOUNTER[seventh] && normalized.length >= 7) {
    const stem = EXPLICIT_STEMS[normalized];
    return stem ?? null;
  }
  for (const len of [6, 5, 4]) {
    const key = normalized.slice(0, len);
    if (EXPLICIT_STEMS[key] && ENCOUNTER[seventh]) {
      return withEncounter(EXPLICIT_STEMS[key]!, seventh);
    }
  }
  return null;
}

export function composeFy2026EsGapLabel(input: Fy2026EsGapComposeInput): Fy2026EsGapComposeResult {
  const normalized = normalizeIcd10CodeForLookup(input.code);
  const family = familyOf(normalized);
  const fail = (reason: string, bucket: Fy2026EsGapBucket = "REVIEW_REQUIRED"): Fy2026EsGapComposeResult => ({
    code: input.code,
    normalizedCode: normalized,
    family,
    bucket,
    label: null,
    blockedReason: reason,
  });
  if (!input.isSelectable) {
    return fail("NONSELECTABLE", "INVALID_OR_NONSELECTABLE");
  }
  let label: string | null = null;
  if (family === "L98") label = composeL98(normalized);
  else if (family === "S31") label = composeS31(normalized);
  else if (family === "S30") label = composeS30(normalized);
  else if (family === "T36") label = composeT36(normalized);
  else if (family === "T65") label = composeT65(normalized);
  else if (family === "T78") label = composeT78(normalized);
  else if (EXPLICIT_STEMS[normalized]) label = EXPLICIT_STEMS[normalized]!;
  else label = composeT75Y36Y37W(normalized);

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

export function validateFy2026EsGapLabel(input: {
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
  if (normalized.length >= 7 && ENCOUNTER[seventh]) {
    const expected = ENCOUNTER[seventh]!;
    if (!es.includes(expected)) errors.push(`MISSING_ENCOUNTER:${expected}`);
  }
  if (/\bright\b|\br flank\b|\br up arm\b|\br forearm\b/.test(en) && !es.includes("derech")) {
    errors.push("MISSING_RIGHT_LATERALITY");
  }
  if (/\bleft\b|\bl flank\b|\bl up arm\b|\bl forearm\b/.test(en) && !es.includes("izquierd")) {
    errors.push("MISSING_LEFT_LATERALITY");
  }
  if (/\bbilateral\b/.test(en) && !es.includes("bilateral")) errors.push("MISSING_BILATERAL");
  if (/(?:w\/o|without)\s+penet/.test(en) && !es.includes("sin penetración")) {
    errors.push("MISSING_WITHOUT_PERITONEAL");
  }
  if (/(?:w|with)\s+penet/.test(en) && !es.includes("con penetración")) {
    errors.push("MISSING_WITH_PERITONEAL");
  }
  if (/tolerance to bkd milk|tolerance to baked milk/.test(en) && !es.includes("tolerancia a la leche horneada")) {
    errors.push("MISSING_BAKED_MILK_TOLERANCE");
  }
  if (/rct to bkd milk|reactivity to baked milk|with rct to bkd milk/.test(en) && !es.includes("reactividad a la leche horneada")) {
    errors.push("MISSING_BAKED_MILK_REACTIVITY");
  }
  if (/tolerance to baked egg|tolerance to bkd egg/.test(en) && !es.includes("tolerancia al huevo horneado")) {
    errors.push("MISSING_BAKED_EGG_TOLERANCE");
  }
  if (/rct to baked egg|reactivity to baked egg|with rct to baked egg/.test(en) && !es.includes("reactividad al huevo horneado")) {
    errors.push("MISSING_BAKED_EGG_REACTIVITY");
  }
  if (input.parentLabel && input.parentLabel.trim() && input.parentLabel.trim() === input.label.trim()) {
    errors.push("PARENT_LABEL_COPY");
  }
  if ((input.siblingLabels ?? []).includes(input.label)) errors.push("SIBLING_LABEL_COPY");
  if (/\b(abdominal pain|nausea|vomiting|cellulitis, unspecified|multiple sclerosis)\b/i.test(input.label)) {
    errors.push("ENGLISH_FALLBACK");
  }
  if (!input.label.trim()) errors.push("BLANK_LABEL");
  return errors;
}

export type Fy2026EsGapReviewStatus = "STRUCTURAL_CANDIDATE" | "PENDING_REVIEW" | "BLOCKED";

export type Fy2026EsGapReviewRow = Fy2026EsGapComposeResult & {
  shortDescription: string;
  validationErrors: string[];
  reviewStatus: Fy2026EsGapReviewStatus;
};

/**
 * Structural review gate only. STRUCTURAL_CANDIDATE is not SEMANTICALLY_CERTIFIED
 * and is not APPROVED_FOR_LOCAL_INGEST. Semantic certification is a later gate.
 */
export function reviewFy2026EsGapCandidate(
  input: Fy2026EsGapComposeInput & {
    parentLabel?: string | null;
    siblingLabels?: readonly string[];
  },
): Fy2026EsGapReviewRow {
  const composed = composeFy2026EsGapLabel(input);
  const validationErrors = composed.label
    ? validateFy2026EsGapLabel({
        code: input.code,
        shortDescription: input.shortDescription,
        label: composed.label,
        parentLabel: input.parentLabel,
        siblingLabels: input.siblingLabels,
      })
    : [composed.blockedReason ?? "NO_LABEL"];
  let reviewStatus: Fy2026EsGapReviewStatus = "PENDING_REVIEW";
  if (!composed.label || composed.bucket === "INVALID_OR_NONSELECTABLE") reviewStatus = "BLOCKED";
  else if (validationErrors.length === 0) reviewStatus = "STRUCTURAL_CANDIDATE";
  return {
    ...composed,
    shortDescription: input.shortDescription,
    validationErrors,
    reviewStatus,
  };
}

export type Fy2026EsGapFamilySummary = {
  family: string;
  TOTAL_CODES: number;
  OFFICIAL_SOURCE_FOUND: number;
  GOVERNED_REQUIRED: number;
  STRUCTURAL_CANDIDATE: number;
  REVIEW_REQUIRED: number;
  BLOCKED: number;
};

export function summarizeFy2026EsGapFamilies(
  rows: readonly Fy2026EsGapReviewRow[],
): Fy2026EsGapFamilySummary[] {
  const byFamily = new Map<string, Fy2026EsGapFamilySummary>();
  for (const row of rows) {
    const current = byFamily.get(row.family) ?? {
      family: row.family,
      TOTAL_CODES: 0,
      OFFICIAL_SOURCE_FOUND: 0,
      GOVERNED_REQUIRED: 0,
      STRUCTURAL_CANDIDATE: 0,
      REVIEW_REQUIRED: 0,
      BLOCKED: 0,
    };
    current.TOTAL_CODES += 1;
    if (row.bucket === "OFFICIAL_SPANISH_SOURCE_AVAILABLE") current.OFFICIAL_SOURCE_FOUND += 1;
    if (row.bucket === "GOVERNED_SPANISH_LABEL_REQUIRED") current.GOVERNED_REQUIRED += 1;
    if (row.reviewStatus === "STRUCTURAL_CANDIDATE") current.STRUCTURAL_CANDIDATE += 1;
    else if (row.reviewStatus === "BLOCKED") current.BLOCKED += 1;
    else current.REVIEW_REQUIRED += 1;
    byFamily.set(row.family, current);
  }
  return [...byFamily.values()].sort((a, b) => b.TOTAL_CODES - a.TOTAL_CODES || a.family.localeCompare(b.family));
}
