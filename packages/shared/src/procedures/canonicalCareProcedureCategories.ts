/**
 * MEDUI.CARE_PROCEDURES.CANONICAL_CATALOG_FOUNDATION.1
 * Canonical Care / Procedures picker categories (UI label remains "Care / Procedures").
 */
import { pickProductUiCopy } from "../i18n/productUiLocale.js";

export const CANONICAL_CARE_PROCEDURE_CATEGORIES = [
  "MONITORING",
  "RESPIRATORY",
  "NURSING_PATIENT_CARE",
  "WOUND_CARE",
  "ORTHOPEDICS_IMMOBILIZATION",
  "VASCULAR_ACCESS",
  "GI_GU",
  "NEURO_STROKE",
  "TRAUMA",
  "CONSULTS",
  "EQUIPMENT",
  "SPECIMEN_POC",
  "ADMISSION_DISPOSITION",
  "COMMUNICATION",
  "OTHER",
] as const;

export type CanonicalCareProcedureCategory = (typeof CANONICAL_CARE_PROCEDURE_CATEGORIES)[number];

export function canonicalCareProcedureCategoryLabel(
  category: CanonicalCareProcedureCategory,
  locale: string
): string {
  const en: Record<CanonicalCareProcedureCategory, string> = {
    MONITORING: "Monitoring",
    RESPIRATORY: "Respiratory",
    NURSING_PATIENT_CARE: "Nursing / Patient Care",
    WOUND_CARE: "Wound Care",
    ORTHOPEDICS_IMMOBILIZATION: "Orthopedics / Immobilization",
    VASCULAR_ACCESS: "Vascular Access",
    GI_GU: "GI / GU",
    NEURO_STROKE: "Neuro / Stroke",
    TRAUMA: "Trauma",
    CONSULTS: "Consults",
    EQUIPMENT: "Equipment",
    SPECIMEN_POC: "Specimen / POC",
    ADMISSION_DISPOSITION: "Admission / Disposition",
    COMMUNICATION: "Communication",
    OTHER: "Other",
  };
  const fr: Record<CanonicalCareProcedureCategory, string> = {
    MONITORING: "Surveillance",
    RESPIRATORY: "Respiratoire",
    NURSING_PATIENT_CARE: "Soins infirmiers / patient",
    WOUND_CARE: "Soins de plaie",
    ORTHOPEDICS_IMMOBILIZATION: "Orthopédie / immobilisation",
    VASCULAR_ACCESS: "Accès vasculaire",
    GI_GU: "GI / GU",
    NEURO_STROKE: "Neuro / AVC",
    TRAUMA: "Trauma",
    CONSULTS: "Consultations",
    EQUIPMENT: "Équipement",
    SPECIMEN_POC: "Prélèvement / POC",
    ADMISSION_DISPOSITION: "Admission / sortie",
    COMMUNICATION: "Communication",
    OTHER: "Autre",
  };
  const es: Record<CanonicalCareProcedureCategory, string> = {
    MONITORING: "Monitoreo",
    RESPIRATORY: "Respiratorio",
    NURSING_PATIENT_CARE: "Enfermería / atención al paciente",
    WOUND_CARE: "Cuidado de heridas",
    ORTHOPEDICS_IMMOBILIZATION: "Ortopedia / inmovilización",
    VASCULAR_ACCESS: "Acceso vascular",
    GI_GU: "GI / GU",
    NEURO_STROKE: "Neuro / ACV",
    TRAUMA: "Trauma",
    CONSULTS: "Interconsultas",
    EQUIPMENT: "Equipo",
    SPECIMEN_POC: "Muestra / POC",
    ADMISSION_DISPOSITION: "Admisión / disposición",
    COMMUNICATION: "Comunicación",
    OTHER: "Otro",
  };
  return pickProductUiCopy(locale, { en: en[category], fr: fr[category], es: es[category] }, es[category]);
}
