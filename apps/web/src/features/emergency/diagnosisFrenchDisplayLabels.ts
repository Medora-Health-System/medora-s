/**
 * Phase 19Y.16B — French ICD-10 display labels (UI-only; stored/billing labels stay English).
 */

import { normalizeIcd10CodeForLookup, parseProductUiLanguage } from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import { normalizeDiagnosisSearchText } from "./diagnosisFrenchSearchAliases";

export { normalizeDiagnosisSearchText };

export type LocalizedDiagnosisDisplayInput = {
  code: string;
  shortDescription?: string | null;
  description?: string | null;
};

/** Local curated French display labels keyed by normalized ICD-10-CM code (no official FR catalog). */
const FRENCH_ICD10_DISPLAY_LABELS_BY_NORMALIZED_CODE: Readonly<Record<string, string>> = {
  R1085: "Douleur abdominale à plusieurs sites",
  R1084: "Douleur abdominale généralisée",
  R109: "Douleur abdominale non précisée",
  R1010: "Douleur abdominale haute non précisée",
  R079: "Douleur thoracique non précisée",
  R519: "Céphalée non précisée",
  R42: "Étourdissements et vertiges",
  R0602: "Essoufflement",
  R059: "Toux non précisée",
  R509: "Fièvre non précisée",
  R1110: "Vomissements non précisés",
  R197: "Diarrhée non précisée",
  N390: "Infection urinaire, siège non précisé",
  R300: "Dysurie",
  M5450: "Douleur lombaire non précisée",
  R002: "Palpitations",
  R55: "Syncope et collapsus",
  R531: "Faiblesse",
  R5383: "Fatigue",
  I10: "Hypertension essentielle",
  S0101: "Plaie ouverte",
  S0101XA: "Plaie ouverte",
  S0105XA: "Morsure ouverte du scalp",
  S61459A: "Morsure ouverte du doigt",
  W540XXA: "Morsure de chien",
  W5501XA: "Morsure de chat",
  W5503XA: "Morsure de chat",
  W5581XA: "Morsure par autre mammifère",
  W503XXA: "Morsure humaine accidentelle",
  T141: "Lésion traumatique, non précisée",
  S93401: "Entorse et foulure de cheville, non précisée",
  S93401A: "Entorse et foulure de cheville, non précisée",
  S9340: "Entorse de cheville",
  S43001A: "Luxation antérieure de l'épaule droite",
  S43101A: "Luxation de l'articulation acromio-claviculaire droite",
  S53031A: "Poignet de bonne (coude droit)",
  S73001A: "Luxation de la hanche droite",
  S83001A: "Luxation de la rotule droite",
  S63116A: "Luxation d'un doigt de la main droite",
  S030XXA: "Luxation de la mâchoire",
  S63501A: "Entorse du poignet droit",
  S8390XA: "Entorse du genou droit",
  S161XXA: "Élongation musculaire au niveau du cou",
  S39012A: "Élongation des muscles du bas du dos",
  S43401A: "Entorse de l'épaule droite",
  S76311A: "Élongation des ischio-jambiers droits",
  S0093: "Contusion de la tête, du visage et du cou, non précisée",
  S0093XA: "Contusion de la tête, du visage et du cou, non précisée",
  S300: "Contusion de la paroi abdominale, non précisée",
  L0390: "Cellulite, non précisée",
  L03: "Cellulite",
  T2010XA: "Brûlure du premier degré de la tête, du visage et du cou, partie non précisée",
  T23201A: "Brûlure du deuxième degré de la main non précisée",
  T270XXA: "Brûlure des voies respiratoires, partie non précisée",
  T754XXA: "Effets de la foudre",
  T33011A: "Gelure superficielle du doigt",
  L559: "Coup de soleil, sans précision",
  S21301A: "Plaie pénétrante de la paroi antérieure du thorax",
  S31601A: "Plaie pénétrante de la paroi abdominale",
  S61239A: "Plaie punctiforme d'un doigt, sans corps étranger",
  S0550XA: "Plaie pénétrante de l'œil, sans corps étranger",
  S91339A: "Plaie punctiforme du pied, sans corps étranger",
  S1193XA: "Plaie ouverte du cou",
  T07XXXA: "Blessures multiples, sans précision",
  T794XXA: "Choc traumatique",
  S0920XA: "Rupture traumatique du tympan, sans précision",
  T700XXA: "Barotraumatisme otitique",
  W400XXA: "Explosion de matériel de dynamitage",
  W39XXXA: "Décharge de feu d'artifice",
  T7121XA: "Asphyxie due à un ensevelissement",
  H60339: "Otite externe infectieuse (oreille du baigneur), oreille non précisée",
  H6020: "Otite externe maligne (nécrosante), oreille non précisée",
  H6690: "Otite moyenne, sans précision",
  H7090: "Mastoïdite, sans précision",
  H7290: "Perforation de la membrane tympanique, sans précision",
  H9120: "Surdité soudaine idiopathique, oreille non précisée",
  H8110: "Vertige positionnel paroxystique bénin, oreille non précisée",
  H8120: "Névrite vestibulaire, oreille non précisée",
  H8301: "Labyrinthite, oreille droite",
  G510: "Paralysie de Bell",
  R040: "Épistaxis",
  T171XXA: "Corps étranger dans la narine, rencontre initiale",
  J36: "Abcès périamygdalien",
  J390: "Abcès rétropharyngé et parapharyngé",
  K122: "Cellulite et abcès de la bouche (angine de Ludwig)",
  J0510: "Épiglottite aiguë, sans obstruction",
  K1120: "Sialadénite, sans précision",
  B0221: "Zona avec ganglionite géniculée (syndrome de Ramsay Hunt)",
  K115: "Sialolithiase (calcul salivaire)",
};

const SPANISH_ICD10_DISPLAY_LABELS_BY_NORMALIZED_CODE: Readonly<Record<string, string>> = {
  R1085: "Dolor abdominal en varios sitios",
  R1084: "Dolor abdominal generalizado",
  R109: "Dolor abdominal no especificado",
  R1010: "Dolor abdominal alto no especificado",
  R079: "Dolor torácico no especificado",
  R519: "Cefalea no especificada",
  R42: "Mareo y vértigo",
  R0602: "Disnea",
  R059: "Tos no especificada",
  R509: "Fiebre no especificada",
  R1110: "Vómitos no especificados",
  R197: "Diarrea no especificada",
  N390: "Infección urinaria, sitio no especificado",
  R300: "Disuria",
  M5450: "Lumbalgia no especificada",
  R002: "Palpitaciones",
  R55: "Síncope y colapso",
  R531: "Debilidad",
  R5383: "Fatiga",
  I10: "Hipertensión esencial",
  S0101: "Herida abierta",
  S0101XA: "Herida abierta",
  S0105XA: "Mordedura abierta del cuero cabelludo",
  S61459A: "Mordedura abierta del dedo",
  W540XXA: "Mordedura de perro",
  W5501XA: "Mordedura de gato",
  W5503XA: "Mordedura de gato",
  W5581XA: "Mordedura por otro mamífero",
  W503XXA: "Mordedura humana accidental",
  T141: "Lesión traumática no especificada",
  S93401: "Esguince de tobillo no especificado",
  S93401A: "Esguince de tobillo no especificado",
  S9340: "Esguince de tobillo",
  S43001A: "Luxación anterior del hombro derecho",
  S43101A: "Luxación de la articulación acromioclavicular derecha",
  S53031A: "Codo de niñera (codo derecho)",
  S73001A: "Luxación de la cadera derecha",
  S83001A: "Luxación de la rótula derecha",
  S63116A: "Luxación de un dedo de la mano derecha",
  S030XXA: "Luxación de la mandíbula",
  S63501A: "Esguince de la muñeca derecha",
  S8390XA: "Esguince de la rodilla derecha",
  S161XXA: "Distensión muscular del cuello",
  S39012A: "Distensión muscular de la zona lumbar",
  S43401A: "Esguince del hombro derecho",
  S76311A: "Distensión de isquiotibiales derechos",
  S0093: "Contusión de cabeza, cara y cuello no especificada",
  S0093XA: "Contusión de cabeza, cara y cuello no especificada",
  S300: "Contusión de la pared abdominal no especificada",
  L0390: "Celulitis no especificada",
  L03: "Celulitis",
  T2010XA: "Quemadura de primer grado de cabeza, cara y cuello, parte no especificada",
  T23201A: "Quemadura de segundo grado de la mano no especificada",
  T270XXA: "Quemadura de las vías respiratorias, parte no especificada",
  T754XXA: "Efectos del rayo",
  T33011A: "Congelación superficial del dedo",
  L559: "Quemadura solar, sin precisión",
  S21301A: "Herida penetrante de la pared anterior del tórax",
  S31601A: "Herida penetrante de la pared abdominal",
  S61239A: "Herida punzante de un dedo, sin cuerpo extraño",
  S0550XA: "Herida penetrante del ojo, sin cuerpo extraño",
  S91339A: "Herida punzante del pie, sin cuerpo extraño",
  S1193XA: "Herida abierta del cuello",
  T07XXXA: "Heridas múltiples, sin precisión",
  T794XXA: "Choque traumático",
  S0920XA: "Rotura traumática del tímpano, sin precisión",
  T700XXA: "Barotrauma ótico",
  W400XXA: "Explosión de material de dinamita",
  W39XXXA: "Descarga de fuegos artificiales",
  T7121XA: "Asfixia por sepultamiento",
  H60339: "Otitis externa infecciosa, oído no especificado",
  H6020: "Otitis externa maligna, oído no especificado",
  H6690: "Otitis media, sin precisión",
  H7090: "Mastoiditis, sin precisión",
  H7290: "Perforación de la membrana timpánica, sin precisión",
  H9120: "Sordera súbita idiopática, oído no especificado",
  H8110: "Vértigo posicional paroxístico benigno, oído no especificado",
  H8120: "Neuritis vestibular, oído no especificado",
  H8301: "Laberintitis, oído derecho",
  G510: "Parálisis de Bell",
  R040: "Epistaxis",
  T171XXA: "Cuerpo extraño en la fosa nasal, encuentro inicial",
  J36: "Absceso periamigdalino",
  J390: "Absceso retrofaríngeo y parafaríngeo",
  K122: "Celulitis y absceso de la boca (angina de Ludwig)",
  J0510: "Epiglotitis aguda, sin obstrucción",
  K1120: "Sialadenitis, sin precisión",
  B0221: "Zóster con ganglionitis geniculada (síndrome de Ramsay Hunt)",
  K115: "Sialolitiasis",
};

export function getSpanishDiagnosisDisplayLabel(code: string, englishLabel: string): string {
  const normalizedCode = normalizeIcd10CodeForLookup(code);
  const mapped = SPANISH_ICD10_DISPLAY_LABELS_BY_NORMALIZED_CODE[normalizedCode];
  if (mapped) return mapped;
  const trimmedCode = code.trim();
  if (trimmedCode) return trimmedCode;
  void englishLabel;
  return "UNLOCALIZED_SOURCE";
}

export function getFrenchDiagnosisDisplayLabel(code: string, englishLabel: string): string {
  const normalizedCode = normalizeIcd10CodeForLookup(code);
  const mapped = FRENCH_ICD10_DISPLAY_LABELS_BY_NORMALIZED_CODE[normalizedCode];
  if (mapped) return mapped;
  const trimmedCode = code.trim();
  if (trimmedCode) return trimmedCode;
  void englishLabel;
  return "UNLOCALIZED_SOURCE";
}

export function getLocalizedDiagnosisDisplayLabel(
  diagnosis: LocalizedDiagnosisDisplayInput,
  locale: SupportedLanguage | string
): string {
  const parsed = parseProductUiLanguage(locale);
  const englishLabel =
    diagnosis.shortDescription?.trim() || diagnosis.description?.trim() || diagnosis.code.trim();
  if (parsed === "en") return englishLabel;
  if (parsed === "fr") return getFrenchDiagnosisDisplayLabel(diagnosis.code, englishLabel);
  if (parsed === "es") return getSpanishDiagnosisDisplayLabel(diagnosis.code, englishLabel);
  return diagnosis.code.trim() || "UNLOCALIZED_SOURCE";
}

export function formatDiagnosisOneLineDisplay(
  diagnosis: LocalizedDiagnosisDisplayInput,
  locale: SupportedLanguage | string
): { primary: string; metadata: string | null; visibleLines: 1 } {
  const primary = getLocalizedDiagnosisDisplayLabel(diagnosis, locale);
  const code = diagnosis.code.trim();
  const metadata =
    code && primary.trim().toLowerCase() !== code.toLowerCase() ? code : null;
  return { primary, metadata, visibleLines: 1 };
}

export function getFrenchIcd10DisplayLabelCatalog(): Readonly<Record<string, string>> {
  return FRENCH_ICD10_DISPLAY_LABELS_BY_NORMALIZED_CODE;
}
