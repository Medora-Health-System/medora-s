/**
 * ED.HOSP.1E — Hospital Admission order composer presentation catalog.
 *
 * Authoring surface only. Opening / selecting / Review creates ZERO canonical orders.
 * Activation uses the existing OrdersService planner (`planComposerCareOrderCreates`).
 *
 * Zero handwriting: no custom CARE drafts, no "Other" fields, no general order textarea.
 * Predetermined CARE_FREE_TEXT rows are click-to-select mappings onto exact CARE wording.
 *
 * Observation is a separate ED pathway (1D). This catalog must not offer Observation LOC.
 */

import {
  ED_HOSP_1D_PAPER_SHEET_MEDICATION_TOKENS,
  type EdHosp1dOrderModalTab,
  type EdHospComposerPlannerSuggestion,
} from "./edHosp1dObservationOrderComposer.js";
import { OBSERVATION_ORDER_TEMPLATE_ITEMS } from "../observationOrderTemplate.js";
import type { HospitalRequestedLevelOfCare } from "./hospitalAdmissionIntakeVocabV1.js";
import { INPATIENT_CODE_STATUSES } from "./inpatientClinicalOpsV1.js";
import { resolveHospitalDestinationIntent } from "./hospitalDestinationIntent.js";

export const ED_HOSP_1E_COMPOSER_OUTCOME = "ADMISSION" as const;

export const ED_HOSP_1E_CATEGORY_IDS = [
  "admission_loc",
  "diagnosis",
  "code_status",
  "monitoring",
  "vitals_checks",
  "activity",
  "diet",
  "respiratory",
  "iv_fluids",
  "medications",
  "laboratory",
  "imaging",
  "consults",
  "precautions",
  "nursing",
  "review",
] as const;

export type EdHosp1eComposerCategoryId = (typeof ED_HOSP_1E_CATEGORY_IDS)[number];

export type EdHosp1eComposerSuggestion = EdHospComposerPlannerSuggestion & {
  category: EdHosp1eComposerCategoryId;
  defaultSelected: false;
  opensOrderTab?: EdHosp1dOrderModalTab;
  consultPlanOnly?: boolean;
};

/** Inpatient-only LOC chips. Observation stays on the 1D pathway; OTHER is handwriting. */
export const ED_HOSP_1E_INPATIENT_LEVELS_OF_CARE = [
  "MEDICAL_SURGICAL",
  "TELEMETRY",
  "STEPDOWN",
  "INTERMEDIATE_CARE",
  "INTENSIVE_CARE",
  "POSTOPERATIVE",
  "PEDIATRIC_ACUTE_CARE",
  "LABOR_AND_DELIVERY",
  "POSTPARTUM",
  "BEHAVIORAL_HEALTH",
] as const satisfies readonly HospitalRequestedLevelOfCare[];

export const ED_HOSP_1E_CODE_STATUS_VALUES = INPATIENT_CODE_STATUSES.filter(
  (code) => code !== "UNKNOWN" && code !== "PENDING_DISCUSSION"
);

export const ED_HOSP_1E_STRUCTURED_GAPS = [
  "VS_FREQUENCY_Q8H_Q6H_Q1H_ROUTINE_NO_DEDICATED_TEMPLATE",
  "NEURO_NEUROVASCULAR_FREQUENCY_NO_DEDICATED_TEMPLATE",
  "GLUCOSE_AC_HS_NO_DEDICATED_TEMPLATE",
  "I_AND_O_STRICT_ROUTINE_NO_DEDICATED_PROCEDURE",
  "WEIGHT_BEARING_STATUS_NO_CANONICAL_CHOICES",
  "OXYGEN_DEVICE_FLOW_FIO2_REQUIRE_CREATE_ORDER_MODAL",
  "VTE_PROPHYLAXIS_ENGINE_ABSENT",
  "SCD_SEQUENTIAL_COMPRESSION_NO_PROCEDURE",
  "ASPIRATION_PRECAUTIONS_NO_PROCEDURE",
  "CONSULT_GI_SURGERY_PULM_NEPHROLOGY_ID_NO_PROCEDURE",
  "EXPECTED_LOS_NO_STRUCTURED_FIELD",
  "DURABLE_INPATIENT_CLINICAL_OPS_CODE_STATUS_WRITE",
  "ACCEPTING_PROVIDER_DIRECTORY_CONVERGENCE",
  "FACILITY_ADMISSION_ORDER_SET_BUNDLES",
] as const;

function templateSuggestion(
  category: EdHosp1eComposerCategoryId,
  templateItemId: string
): EdHosp1eComposerSuggestion | null {
  const def = OBSERVATION_ORDER_TEMPLATE_ITEMS.find((item) => item.id === templateItemId);
  if (!def) return null;
  return {
    id: `tpl:${templateItemId}`,
    category,
    kind: "CARE_TEMPLATE",
    labelEn: def.manualLabelEn,
    labelFr: def.manualLabelFr,
    defaultSelected: false,
    templateItemId,
  };
}

function mustTemplate(
  category: EdHosp1eComposerCategoryId,
  templateItemId: string
): EdHosp1eComposerSuggestion {
  const row = templateSuggestion(category, templateItemId);
  if (!row) {
    throw new Error(`ed_hosp_1e_missing_template:${templateItemId}`);
  }
  return row;
}

function procedureSuggestion(
  id: string,
  category: EdHosp1eComposerCategoryId,
  enterpriseProcedureId: string,
  fallbackEn: string,
  fallbackFr: string,
  extra?: Pick<EdHosp1eComposerSuggestion, "consultPlanOnly">
): EdHosp1eComposerSuggestion {
  return {
    id,
    category,
    kind: "CARE_PROCEDURE",
    labelEn: fallbackEn,
    labelFr: fallbackFr,
    defaultSelected: false,
    enterpriseProcedureId,
    ...extra,
  };
}

function freeTextSuggestion(
  id: string,
  category: EdHosp1eComposerCategoryId,
  labelEn: string,
  labelFr: string
): EdHosp1eComposerSuggestion {
  return {
    id,
    category,
    kind: "CARE_FREE_TEXT",
    labelEn,
    labelFr,
    defaultSelected: false,
    freeTextEn: labelEn,
    freeTextFr: labelFr,
  };
}

function modalSuggestion(
  id: string,
  category: EdHosp1eComposerCategoryId,
  labelEn: string,
  labelFr: string,
  opensOrderTab: EdHosp1dOrderModalTab
): EdHosp1eComposerSuggestion {
  return {
    id,
    category,
    kind: "OPEN_ORDER_MODAL",
    labelEn,
    labelFr,
    defaultSelected: false,
    opensOrderTab,
  };
}

/**
 * Selection-only presentation catalog. None are default-selected.
 * Medications / labs / imaging / oxygen parameters / IV fluids open CreateOrderModal.
 */
export const ED_HOSP_1E_COMPOSER_SUGGESTIONS: readonly EdHosp1eComposerSuggestion[] = [
  freeTextSuggestion("ft:code_full", "code_status", "Full code", "Code complet"),
  freeTextSuggestion("ft:code_dnr", "code_status", "DNR", "Ne pas réanimer (DNR)"),
  freeTextSuggestion("ft:code_dni", "code_status", "DNI", "Ne pas intuber (DNI)"),
  freeTextSuggestion("ft:code_dnr_dni", "code_status", "DNR/DNI", "DNR/DNI"),
  freeTextSuggestion(
    "ft:code_limited",
    "code_status",
    "Limited interventions",
    "Interventions limitées"
  ),
  freeTextSuggestion(
    "ft:code_comfort",
    "code_status",
    "Comfort measures only",
    "Mesures de confort uniquement"
  ),

  mustTemplate("monitoring", "mon_pulse_ox_continuous"),
  procedureSuggestion(
    "proc:continuous_cardiac_monitoring",
    "monitoring",
    "continuous_cardiac_monitoring",
    "Cardiac monitoring / telemetry",
    "Surveillance cardiaque / télémétrie"
  ),
  procedureSuggestion(
    "proc:pulse_oximetry",
    "monitoring",
    "pulse_oximetry",
    "Pulse oximetry",
    "Oxymétrie de pouls"
  ),

  freeTextSuggestion("ft:vitals_q2h", "vitals_checks", "Vital signs every 2 hours", "Signes vitaux toutes les 2 heures"),
  freeTextSuggestion("ft:vitals_q4h", "vitals_checks", "Vital signs every 4 hours", "Signes vitaux toutes les 4 heures"),
  freeTextSuggestion("ft:vitals_routine", "vitals_checks", "Vital signs routine", "Signes vitaux de routine"),
  freeTextSuggestion("ft:vitals_q8h", "vitals_checks", "Vital signs every 8 hours", "Signes vitaux toutes les 8 heures"),
  freeTextSuggestion("ft:vitals_q6h", "vitals_checks", "Vital signs every 6 hours", "Signes vitaux toutes les 6 heures"),
  freeTextSuggestion("ft:vitals_q1h", "vitals_checks", "Vital signs every 1 hour", "Signes vitaux toutes les heures"),
  procedureSuggestion(
    "proc:neuro_check",
    "vitals_checks",
    "neuro_check",
    "Neuro check",
    "Contrôle neurologique"
  ),
  freeTextSuggestion("ft:neuro_q4h", "vitals_checks", "Neuro checks every 4 hours", "Contrôle neurologique toutes les 4 heures"),
  freeTextSuggestion("ft:neuro_q2h", "vitals_checks", "Neuro checks every 2 hours", "Contrôle neurologique toutes les 2 heures"),
  freeTextSuggestion("ft:neuro_q1h", "vitals_checks", "Neuro checks every 1 hour", "Contrôle neurologique toutes les heures"),
  procedureSuggestion(
    "proc:neurovascular_check",
    "vitals_checks",
    "neurovascular_check",
    "Neurovascular check",
    "Contrôle neurovasculaire"
  ),
  freeTextSuggestion(
    "ft:nv_q4h",
    "vitals_checks",
    "Neurovascular checks every 4 hours",
    "Contrôle neurovasculaire toutes les 4 heures"
  ),
  freeTextSuggestion(
    "ft:nv_q2h",
    "vitals_checks",
    "Neurovascular checks every 2 hours",
    "Contrôle neurovasculaire toutes les 2 heures"
  ),
  freeTextSuggestion(
    "ft:nv_q1h",
    "vitals_checks",
    "Neurovascular checks every 1 hour",
    "Contrôle neurovasculaire toutes les heures"
  ),
  procedureSuggestion(
    "proc:glucose_check",
    "vitals_checks",
    "glucose_check",
    "Glucose check",
    "Contrôle de la glycémie"
  ),
  freeTextSuggestion("ft:glucose_achs", "vitals_checks", "Glucose AC/HS", "Glycémie AC/HS"),
  freeTextSuggestion("ft:glucose_q6h", "vitals_checks", "Glucose every 6 hours", "Glycémie toutes les 6 heures"),
  freeTextSuggestion("ft:glucose_q4h", "vitals_checks", "Glucose every 4 hours", "Glycémie toutes les 4 heures"),
  freeTextSuggestion("ft:io_routine", "vitals_checks", "Intake and output — routine", "Entrées et sorties — routine"),
  freeTextSuggestion("ft:io_strict", "vitals_checks", "Intake and output — strict", "Entrées et sorties — strictes"),

  freeTextSuggestion("ft:activity_as_tolerated", "activity", "Activity as tolerated", "Activité selon tolérance"),
  freeTextSuggestion("ft:bed_rest", "activity", "Bed rest", "Repos au lit"),
  freeTextSuggestion("ft:up_assist", "activity", "Up with assistance", "Lever avec aide"),
  procedureSuggestion(
    "proc:ambulation_trial",
    "activity",
    "ambulation_trial",
    "Ambulate with assistance",
    "Marche avec aide"
  ),
  freeTextSuggestion("ft:bathroom_privileges", "activity", "Bathroom privileges", "Privilèges sanitaires"),

  procedureSuggestion("proc:npo_status", "diet", "npo_status", "NPO", "À jeun (NPO)"),
  mustTemplate("diet", "com_diet_ad_lib"),
  freeTextSuggestion("ft:diet_regular", "diet", "Regular diet", "Régime normal"),
  freeTextSuggestion("ft:diet_clear_liquid", "diet", "Clear liquid diet", "Régime liquide clair"),
  freeTextSuggestion("ft:diet_full_liquid", "diet", "Full liquid diet", "Régime liquide complet"),
  freeTextSuggestion("ft:diet_cardiac", "diet", "Cardiac / heart-healthy diet", "Régime cardiaque"),
  freeTextSuggestion("ft:diet_low_sodium", "diet", "Low sodium diet", "Régime hyposodé"),
  freeTextSuggestion("ft:diet_diabetic", "diet", "Diabetic / carbohydrate-controlled diet", "Régime diabétique"),
  freeTextSuggestion("ft:diet_renal", "diet", "Renal diet", "Régime rénal"),
  freeTextSuggestion("ft:diet_soft", "diet", "Soft / mechanical diet", "Régime mixé / mécanique"),
  freeTextSuggestion("ft:diet_pureed", "diet", "Pureed diet", "Régime mixé lisse"),

  freeTextSuggestion("ft:room_air", "respiratory", "Room air", "Air ambiant"),
  procedureSuggestion(
    "proc:respiratory_treatment",
    "respiratory",
    "respiratory_treatment",
    "Respiratory therapy evaluation",
    "Évaluation de kinésithérapie respiratoire"
  ),
  modalSuggestion(
    "modal:oxygen",
    "respiratory",
    "Oxygen therapy (device, flow, FiO2)",
    "Oxygénothérapie (dispositif, débit, FiO2)",
    "CARE"
  ),

  procedureSuggestion(
    "proc:peripheral_iv_placement",
    "iv_fluids",
    "peripheral_iv_placement",
    "Peripheral IV",
    "Voie veineuse périphérique"
  ),
  freeTextSuggestion("ft:saline_lock", "iv_fluids", "Saline lock / maintain IV access", "Voie veineuse avec bouchon"),
  procedureSuggestion(
    "proc:iv_fluids_setup",
    "iv_fluids",
    "iv_fluids_setup",
    "Maintain IV access",
    "Maintenir l'accès veineux"
  ),
  modalSuggestion(
    "modal:iv_fluids",
    "iv_fluids",
    "IV fluids (existing medication / fluid catalog)",
    "Solutés IV (catalogue médicament / perfusion)",
    "MEDICATION"
  ),

  modalSuggestion(
    "modal:medication",
    "medications",
    "Add medication (existing catalog)",
    "Ajouter un médicament (catalogue existant)",
    "MEDICATION"
  ),
  modalSuggestion(
    "modal:laboratory",
    "laboratory",
    "Add laboratory order (existing catalog)",
    "Ajouter une biologie (catalogue existant)",
    "LAB"
  ),
  modalSuggestion(
    "modal:imaging",
    "imaging",
    "Add imaging order (existing catalog)",
    "Ajouter une imagerie (catalogue existant)",
    "IMAGING"
  ),
  procedureSuggestion("proc:ekg_ecg", "imaging", "ekg_ecg", "ECG", "ECG"),

  procedureSuggestion(
    "proc:cardiology_consult",
    "consults",
    "cardiology_consult",
    "Cardiology consult (request)",
    "Consultation cardiologie (demande)",
    { consultPlanOnly: true }
  ),
  procedureSuggestion(
    "proc:neurology_consult",
    "consults",
    "neurology_consult",
    "Neurology consult (request)",
    "Consultation neurologie (demande)",
    { consultPlanOnly: true }
  ),
  procedureSuggestion(
    "proc:orthopedics_consult",
    "consults",
    "orthopedics_consult",
    "Surgery / orthopedics consult (request)",
    "Consultation chirurgie / orthopédie (demande)",
    { consultPlanOnly: true }
  ),
  procedureSuggestion(
    "proc:psychiatry_consult",
    "consults",
    "psychiatry_consult",
    "Psychiatry consult (request)",
    "Consultation psychiatrie (demande)",
    { consultPlanOnly: true }
  ),
  procedureSuggestion(
    "proc:social_work_consult",
    "consults",
    "social_work_consult",
    "Social work consult (request)",
    "Consultation travail social (demande)",
    { consultPlanOnly: true }
  ),

  procedureSuggestion(
    "proc:fall_precautions",
    "precautions",
    "fall_precautions",
    "Fall precautions",
    "Précautions contre les chutes"
  ),
  procedureSuggestion(
    "proc:isolation_precautions",
    "precautions",
    "isolation_precautions",
    "Isolation precautions",
    "Précautions d'isolement"
  ),
  procedureSuggestion(
    "proc:seizure_precautions",
    "precautions",
    "seizure_precautions",
    "Seizure precautions",
    "Précautions convulsions"
  ),

  freeTextSuggestion("ft:daily_weight", "nursing", "Daily weight", "Poids quotidien"),
  freeTextSuggestion("ft:elevate_hob", "nursing", "Elevate head of bed", "Relever la tête du lit"),
  procedureSuggestion(
    "proc:incentive_spirometry_nursing",
    "nursing",
    "incentive_spirometry_nursing",
    "Incentive spirometry",
    "Spirométrie incentive"
  ),
  freeTextSuggestion("ft:turn_reposition", "nursing", "Turn and reposition", "Tourner et repositionner"),
  procedureSuggestion("proc:foley_catheter", "nursing", "foley_catheter", "Foley catheter", "Sonde de Foley"),
  procedureSuggestion("proc:wound_care", "nursing", "wound_care", "Wound care", "Soins de plaie"),
];

export function shouldMountAdmissionOrderComposer(outcomeUi: string | null | undefined): boolean {
  return String(outcomeUi ?? "").trim().toUpperCase() === ED_HOSP_1E_COMPOSER_OUTCOME;
}

export function persistedAdmissionDecisionRemountsComposer(input: {
  admissionSummaryJson?: unknown;
  placementRequestedEncounterType?: string | null;
}): boolean {
  return resolveHospitalDestinationIntent({
    admissionSummaryJson: input.admissionSummaryJson,
    placementRequestedEncounterType: input.placementRequestedEncounterType,
  }) === "INPATIENT";
}

export function admissionComposerSuggestionsCreateZeroOrders(): true {
  return true;
}

export function admissionComposerHasNoDefaultSelection(
  items: readonly { defaultSelected: boolean }[] = ED_HOSP_1E_COMPOSER_SUGGESTIONS
): boolean {
  return items.every((item) => item.defaultSelected === false);
}

export function admissionComposerContainsPaperSheetMedications(
  items: readonly EdHosp1eComposerSuggestion[] = ED_HOSP_1E_COMPOSER_SUGGESTIONS
): boolean {
  const blob = items
    .map((item) => `${item.id} ${item.labelEn} ${item.labelFr}`.toLowerCase())
    .join(" ");
  return ED_HOSP_1D_PAPER_SHEET_MEDICATION_TOKENS.some((token) => blob.includes(token));
}

export function admissionComposerHasNoOtherEscapeHatch(
  items: readonly EdHosp1eComposerSuggestion[] = ED_HOSP_1E_COMPOSER_SUGGESTIONS
): boolean {
  return items.every((item) => {
    const blob = `${item.id} ${item.labelEn} ${item.labelFr}`.toLowerCase();
    if (item.id.startsWith("custom:")) return false;
    if (blob.includes("other:") || blob.includes("autre :") || blob.includes("other order")) return false;
    return true;
  });
}

export function admissionComposerDoesNotIncludeObservationLevelOfCare(): boolean {
  const loc = ED_HOSP_1E_INPATIENT_LEVELS_OF_CARE as readonly string[];
  return !loc.includes("OBSERVATION") && !loc.includes("OTHER");
}

export function admissionComposerDoesNotInferOrdersFromDiagnosis(): true {
  return true;
}

export function admissionComposerDoesNotAutoOrderMedicationsOxygenOrFluids(): boolean {
  return ED_HOSP_1E_COMPOSER_SUGGESTIONS.every((item) => item.defaultSelected === false);
}

export function admissionComposerHasNoSelectAll(): true {
  return true;
}

export function admissionComposerHasNoPrivateOrderStore(): true {
  return true;
}

export function admissionComposerDoesNotCreateEncounterTypeObservation(): true {
  return true;
}

export function canActivateAdmissionComposerOrders(input: {
  canPrescribe: boolean;
  encounterOpen?: boolean;
}): boolean {
  return input.canPrescribe === true && input.encounterOpen !== false;
}

export function admissionLevelOfCareCreatesZeroOrders(_code: string | null | undefined): true {
  return true;
}

export function paperSheetMedicationTokensUnusedInAdmissionCatalog(): boolean {
  const blob = ED_HOSP_1E_COMPOSER_SUGGESTIONS.map((item) => `${item.id} ${item.labelEn}`.toLowerCase()).join(" ");
  return ED_HOSP_1D_PAPER_SHEET_MEDICATION_TOKENS.every((token) => !blob.includes(token));
}

export type EdHosp1ePendingDiagnosis = {
  icd10CatalogId: string;
  code: string;
  description: string;
};

export function admissionDiagnosisDuplicate(
  pending: readonly EdHosp1ePendingDiagnosis[],
  hit: { id: string; code?: string }
): boolean {
  const id = hit.id.trim();
  const code = (hit.code ?? "").trim().toUpperCase();
  return pending.some((row) => row.icd10CatalogId === id || (code && row.code.toUpperCase() === code));
}

export function filterActivatableAdmissionSuggestions(
  items: readonly EdHosp1eComposerSuggestion[]
): EdHosp1eComposerSuggestion[] {
  return items.filter(
    (item) =>
      item.kind === "CARE_TEMPLATE" || item.kind === "CARE_PROCEDURE" || item.kind === "CARE_FREE_TEXT"
  );
}

export type { EdHosp1dOrderModalTab };
