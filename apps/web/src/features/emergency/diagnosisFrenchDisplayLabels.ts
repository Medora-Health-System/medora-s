/**
 * Phase 19Y.16B — French ICD-10 display labels (UI-only; stored/billing labels stay English).
 */

import { normalizeIcd10CodeForLookup } from "@medora/shared";
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
};

export function getFrenchDiagnosisDisplayLabel(code: string, englishLabel: string): string {
  const normalizedCode = normalizeIcd10CodeForLookup(code);
  const mapped = FRENCH_ICD10_DISPLAY_LABELS_BY_NORMALIZED_CODE[normalizedCode];
  if (mapped) return mapped;
  const trimmedEnglish = englishLabel.trim();
  return trimmedEnglish || code.trim();
}

export function getLocalizedDiagnosisDisplayLabel(
  diagnosis: LocalizedDiagnosisDisplayInput,
  locale: SupportedLanguage
): string {
  const englishLabel =
    diagnosis.shortDescription?.trim() || diagnosis.description?.trim() || diagnosis.code.trim();
  if (locale !== "fr") return englishLabel;
  return getFrenchDiagnosisDisplayLabel(diagnosis.code, englishLabel);
}

export function getFrenchIcd10DisplayLabelCatalog(): Readonly<Record<string, string>> {
  return FRENCH_ICD10_DISPLAY_LABELS_BY_NORMALIZED_CODE;
}
