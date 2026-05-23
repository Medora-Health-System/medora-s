import type { DocumentedProcedureType } from "./schemas/encounterProcedureDocument.js";

/** Evidence tag for review-only procedure bridge rows (no CPT assigned). */
export const DOCUMENTED_PROCEDURE_CPT_PENDING_EVIDENCE = "CPT_PENDING_LICENSE" as const;

/** Fixed English reason string for API / parity with auto-bill decision mapping (UI translates via i18n). */
export const DOCUMENTED_PROCEDURE_REVIEW_REASON =
  "Procedure documented; CPT/chargemaster review required." as const;

/** Internal Medora billing codes — not CPT/HCPCS; chargemaster mapping is out of scope for this phase. */
export const DOCUMENTED_PROCEDURE_BILLING_MEDORA_CODE: Record<DocumentedProcedureType, string> = {
  LACERATION_REPAIR: "PROCEDURE_LACERATION_REPAIR",
  WOUND_CARE: "PROCEDURE_WOUND_CARE",
  INCISION_AND_DRAINAGE: "PROCEDURE_INCISION_DRAINAGE",
  SPLINT_APPLICATION: "PROCEDURE_SPLINT_APPLICATION",
  FOLEY_CATHETER: "PROCEDURE_FOLEY_CATHETER",
  EKG: "PROCEDURE_EKG",
  GLUCOSE_CHECK: "PROCEDURE_GLUCOSE_CHECK",
  URINE_COLLECTION: "PROCEDURE_URINE_COLLECTION",
  PREGNANCY_TEST: "PROCEDURE_PREGNANCY_TEST",
  CHEST_TUBE: "PROCEDURE_CHEST_TUBE",
  INTUBATION: "PROCEDURE_INTUBATION",
  CENTRAL_LINE: "PROCEDURE_CENTRAL_LINE",
  PROCEDURAL_SEDATION: "PROCEDURE_PROCEDURAL_SEDATION",
  REDUCTION: "PROCEDURE_REDUCTION",
  THORACENTESIS_PARACENTESIS: "PROCEDURE_THORACENTESIS_PARACENTESIS",
  PELVIC_EXAM: "PROCEDURE_PELVIC_EXAM",
  LUMBAR_PUNCTURE: "PROCEDURE_LUMBAR_PUNCTURE",
};

/** French display labels for billing review surfaces (product language). */
export const DOCUMENTED_PROCEDURE_DISPLAY_NAME_FR: Record<DocumentedProcedureType, string> = {
  LACERATION_REPAIR: "Suture de lacération (documentée)",
  WOUND_CARE: "Soins de plaie (documentés)",
  INCISION_AND_DRAINAGE: "Incision et drainage (documentés)",
  SPLINT_APPLICATION: "Pose d'attelle (documentée)",
  FOLEY_CATHETER: "Sonde vésicale (documentée)",
  EKG: "ECG (documenté)",
  GLUCOSE_CHECK: "Glycémie capillaire (documentée)",
  URINE_COLLECTION: "Collecte d'urine (documentée)",
  PREGNANCY_TEST: "Test de grossesse (documenté)",
  CHEST_TUBE: "Drain thoracique (documenté)",
  INTUBATION: "Intubation (documentée)",
  CENTRAL_LINE: "Cathéter central (documenté)",
  PROCEDURAL_SEDATION: "Sédation procédurale (documentée)",
  REDUCTION: "Réduction (documentée)",
  THORACENTESIS_PARACENTESIS: "Thoracentèse / paracentèse (documentée)",
  PELVIC_EXAM: "Examen pelvien (documenté)",
  LUMBAR_PUNCTURE: "Ponction lombaire (documentée)",
};

export function medoraCodeForDocumentedProcedureType(procedureType: string | null | undefined): string | null {
  const k = procedureType?.trim();
  if (!k || !(k in DOCUMENTED_PROCEDURE_BILLING_MEDORA_CODE)) return null;
  return DOCUMENTED_PROCEDURE_BILLING_MEDORA_CODE[k as DocumentedProcedureType];
}

export function displayNameFrForDocumentedProcedureType(procedureType: string | null | undefined): string {
  const k = procedureType?.trim();
  if (!k || !(k in DOCUMENTED_PROCEDURE_DISPLAY_NAME_FR)) return "Procédure documentée";
  return DOCUMENTED_PROCEDURE_DISPLAY_NAME_FR[k as DocumentedProcedureType];
}
