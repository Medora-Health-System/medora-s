/**
 * MEDUI.ES.1D — Medora Spanish medical terminology canon.
 *
 * Spanish clinical UI terms MUST come from:
 * A. this approved canon, or
 * B. authoritative localized catalog data with validated provenance, or
 * C. canonical code / UNLOCALIZED_ES / UNLOCALIZED_SOURCE when no Spanish exists.
 *
 * Components must not invent synonyms. This is display terminology only —
 * never mutate ICD-10, CPT, LOINC, RxNorm, NDC, UCUM, or internal IDs.
 *
 * Authored narrative (notes, reports, free text) is never auto-translated.
 */

import { hiddenSpanishPlaceholder, isHiddenSpanishPlaceholder } from "../productUiLocale.js";
import type { ProductUiLanguage } from "../productUiLocale.js";

export const MEDORA_SPANISH_MEDICAL_TERMINOLOGY_VERSION = "2026.09.1";

export const SPANISH_CLINICAL_TERMINOLOGY_RULE =
  "CANON_OR_VALIDATED_CATALOG_OR_CODE" as const;

export type EsMedicalTermStatus = "APPROVED" | "REVIEW_REQUIRED";

export type EsMedicalTerminologyDomain =
  | "GENERAL_CLINICAL_STATUS"
  | "ENCOUNTER_CARE_SETTING"
  | "PROVIDER_DOCUMENTATION"
  | "NURSING"
  | "MEDICATION_ROUTE"
  | "MEDICATION_DOSAGE_FORM"
  | "MEDICATION_ORDERING"
  | "LABORATORY"
  | "RADIOLOGY_IMAGING"
  | "DIAGNOSIS_ASSESSMENT"
  | "PROCEDURES"
  | "VITAL_SIGNS"
  | "ALLERGIES"
  | "MAR_ADMINISTRATION"
  | "ADMISSION_OBSERVATION_DISCHARGE"
  | "PLACEMENT_BED"
  | "CLINIC"
  | "DENTAL"
  | "BILLING_CLAIM"
  | "PRINT_CONSENT_LEGAL";

export type EsMedicalTerminologyAudience = "clinician" | "patient" | "both";

export type EsMedicalTerminologyEntry = {
  key: string;
  en: string;
  es: string;
  domain: EsMedicalTerminologyDomain;
  status: EsMedicalTermStatus;
  abbreviation?: string;
  esExpanded?: string;
  notes?: string;
  audience?: EsMedicalTerminologyAudience;
  /** Existing EN/FR i18n paths to overlay when status is APPROVED. */
  uiMessageKeys?: readonly string[];
};

const CANONICAL_ABBREVIATIONS = [
  "IV",
  "IM",
  "PO",
  "SC",
  "SQ",
  "SL",
  "PR",
  "CT",
  "MRI",
  "XR",
  "US",
  "ECG",
  "EKG",
  "CBC",
  "CMP",
  "BMP",
  "MAR",
  "PRN",
  "HPI",
  "ROS",
  "MDM",
  "NKA",
  "BMI",
] as const;

export const ES_MEDICAL_CANONICAL_ABBREVIATIONS: readonly string[] = CANONICAL_ABBREVIATIONS;

function entry(
  key: string,
  en: string,
  es: string,
  domain: EsMedicalTerminologyDomain,
  extra: Omit<EsMedicalTerminologyEntry, "key" | "en" | "es" | "domain" | "status"> & {
    status?: EsMedicalTermStatus;
  } = {}
): EsMedicalTerminologyEntry {
  const { status = "APPROVED", ...rest } = extra;
  return { key, en, es, domain, audience: extra.audience ?? "clinician", ...rest, status };
}

export const ES_MEDICAL_TERMINOLOGY: readonly EsMedicalTerminologyEntry[] = [
  // A. General clinical status
  entry("clinical.status.active", "Active", "Activo", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.inactive", "Inactive", "Inactivo", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.pending", "Pending", "Pendiente", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.completed", "Completed", "Completado", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.cancelled", "Cancelled", "Cancelado", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.voided", "Voided", "Anulado", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.signed", "Signed", "Firmado", "GENERAL_CLINICAL_STATUS", {
    uiMessageKeys: ["packetWizard.signed", "packetWizard.statusSigned"],
  }),
  entry("clinical.status.draft", "Draft", "Borrador", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.final", "Final", "Final", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.amended", "Amended", "Enmendado", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.corrected", "Corrected", "Corregido", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.reviewed", "Reviewed", "Revisado", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.acknowledged", "Acknowledged", "Reconocido", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.acknowledgeReceipt", "Acknowledge receipt", "Acuse de recibo", "GENERAL_CLINICAL_STATUS", {
    uiMessageKeys: ["worklistDepartments.shared.acknowledge"],
  }),
  entry("clinical.status.scheduled", "Scheduled", "Programado", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.unscheduled", "Unscheduled", "No programado", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.open", "Open", "Abierto", "GENERAL_CLINICAL_STATUS"),
  entry("clinical.status.closed", "Closed", "Cerrado", "GENERAL_CLINICAL_STATUS"),

  // B. Encounter / care setting
  entry("clinical.setting.emergencyDepartment", "Emergency Department", "Servicio de urgencias", "ENCOUNTER_CARE_SETTING", {
    abbreviation: "ED",
    uiMessageKeys: ["nav.emergency"],
  }),
  entry("clinical.setting.emergencyRoom", "Emergency Room", "Urgencias", "ENCOUNTER_CARE_SETTING", {
    abbreviation: "ER",
    notes: "Compact label; not interchangeable with inpatient admission.",
  }),
  entry("clinical.setting.inpatient", "Inpatient", "Hospitalización", "ENCOUNTER_CARE_SETTING"),
  entry("clinical.setting.outpatient", "Outpatient", "Ambulatorio", "ENCOUNTER_CARE_SETTING"),
  entry("clinical.setting.observation", "Observation", "Observación", "ENCOUNTER_CARE_SETTING", {
    uiMessageKeys: ["nav.observation"],
    notes: "Distinct from inpatient admission.",
  }),
  entry("clinical.setting.clinic", "Clinic", "Consulta externa", "ENCOUNTER_CARE_SETTING", {
    uiMessageKeys: ["nav.clinicCare"],
  }),
  entry("clinical.setting.dental", "Dental", "Odontología", "ENCOUNTER_CARE_SETTING", {
    uiMessageKeys: ["nav.dentalCare"],
  }),
  entry("clinical.setting.hospital", "Hospital", "Hospital", "ENCOUNTER_CARE_SETTING", {
    uiMessageKeys: ["nav.hospitalisation"],
  }),
  entry("clinical.setting.unit", "Unit", "Unidad", "ENCOUNTER_CARE_SETTING"),
  entry("clinical.setting.room", "Room", "Habitación", "ENCOUNTER_CARE_SETTING", {
    uiMessageKeys: ["common.room"],
  }),
  entry("clinical.setting.bed", "Bed", "Cama", "ENCOUNTER_CARE_SETTING"),
  entry("clinical.setting.transfer", "Transfer", "Traslado", "ENCOUNTER_CARE_SETTING"),
  entry("clinical.setting.admission", "Admission", "Admisión", "ENCOUNTER_CARE_SETTING"),
  entry("clinical.setting.discharge", "Discharge", "Alta", "ENCOUNTER_CARE_SETTING"),
  entry("clinical.setting.disposition", "Disposition", "Disposición", "ENCOUNTER_CARE_SETTING"),
  entry("clinical.setting.encounter", "Encounter", "Encuentro clínico", "ENCOUNTER_CARE_SETTING", {
    uiMessageKeys: ["nav.encounters"],
  }),

  // C. Provider documentation
  entry("clinical.provider.historyAndPhysical", "History and Physical", "Historia clínica y exploración física", "PROVIDER_DOCUMENTATION", {
    abbreviation: "H&P",
  }),
  entry("clinical.provider.progressNote", "Progress Note", "Nota de evolución", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.consultNote", "Consult Note", "Nota de interconsulta", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.dischargeSummary", "Discharge Summary", "Resumen de alta", "PROVIDER_DOCUMENTATION", {
    uiMessageKeys: ["printOutput.discharge.htmlTitle", "printOutput.discharge.documentH1"],
  }),
  entry("clinical.provider.assessment", "Assessment", "Valoración", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.plan", "Plan", "Plan", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.assessmentAndPlan", "Assessment and Plan", "Valoración y plan", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.hpi", "History of Present Illness", "Historia de la enfermedad actual", "PROVIDER_DOCUMENTATION", {
    abbreviation: "HPI",
  }),
  entry("clinical.provider.ros", "Review of Systems", "Revisión por sistemas", "PROVIDER_DOCUMENTATION", {
    abbreviation: "ROS",
  }),
  entry("clinical.provider.physicalExamination", "Physical Examination", "Exploración física", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.mdm", "Medical Decision Making", "Razonamiento clínico (MDM)", "PROVIDER_DOCUMENTATION", {
    abbreviation: "MDM",
  }),
  entry("clinical.provider.diagnosis", "Diagnosis", "Diagnóstico", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.problemList", "Problem List", "Lista de problemas", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.addendum", "Addendum", "Addendum", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.correction", "Correction", "Corrección", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.signature", "Signature", "Firma", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.signedBy", "Signed by", "Firmado por", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.dateOfService", "Date of Service", "Fecha de atención", "PROVIDER_DOCUMENTATION"),
  entry("clinical.provider.provider", "Provider", "Profesional clínico", "PROVIDER_DOCUMENTATION", {
    uiMessageKeys: ["nav.provider"],
    notes: "Workforce family (MD/DO/NP/PA); not interchangeable with physician.",
  }),
  entry("clinical.provider.physician", "Physician", "Médico", "PROVIDER_DOCUMENTATION", {
    uiMessageKeys: ["common.physician"],
  }),

  // D. Nursing
  entry("clinical.nursing.assessment", "Nursing Assessment", "Evaluación de enfermería", "NURSING"),
  entry("clinical.nursing.note", "Nursing Note", "Nota de enfermería", "NURSING"),
  entry("clinical.nursing.handoff", "Handoff", "Pase de guardia", "NURSING"),
  entry("clinical.nursing.receivingNurse", "Receiving Nurse", "Enfermero receptor", "NURSING"),
  entry("clinical.nursing.sendingNurse", "Sending Nurse", "Enfermero que entrega", "NURSING"),
  entry("clinical.nursing.fallRisk", "Fall Risk", "Riesgo de caídas", "NURSING"),
  entry("clinical.nursing.painAssessment", "Pain Assessment", "Evaluación del dolor", "NURSING"),
  entry("clinical.nursing.intake", "Intake", "Ingesta", "NURSING", {
    notes: "I&O intake; not hospital admission (ingresos).",
  }),
  entry("clinical.nursing.output", "Output", "Eliminación", "NURSING", {
    notes: "I&O output; not hospital discharge (egresos).",
  }),
  entry("clinical.nursing.mobility", "Mobility", "Movilidad", "NURSING"),
  entry("clinical.nursing.skinAssessment", "Skin Assessment", "Evaluación de la piel", "NURSING"),
  entry("clinical.nursing.neuroAssessment", "Neuro Assessment", "Evaluación neurológica", "NURSING"),
  entry("clinical.nursing.respiratoryAssessment", "Respiratory Assessment", "Evaluación respiratoria", "NURSING"),
  entry("clinical.nursing.cardiacAssessment", "Cardiac Assessment", "Evaluación cardíaca", "NURSING"),
  entry("clinical.nursing.safety", "Safety", "Seguridad", "NURSING"),
  entry("clinical.nursing.precautions", "Precautions", "Precauciones", "NURSING"),
  entry("clinical.nursing.nursing", "Nursing", "Enfermería", "NURSING", {
    uiMessageKeys: ["nav.nursing"],
  }),

  // E. Medication routes — codes stay PO/IV/IM; labels are display only
  entry("clinical.route.oral", "Oral", "Oral", "MEDICATION_ROUTE", { abbreviation: "PO" }),
  entry("clinical.route.intravenous", "Intravenous", "Intravenosa", "MEDICATION_ROUTE", { abbreviation: "IV" }),
  entry("clinical.route.intramuscular", "Intramuscular", "Intramuscular", "MEDICATION_ROUTE", { abbreviation: "IM" }),
  entry("clinical.route.subcutaneous", "Subcutaneous", "Subcutánea", "MEDICATION_ROUTE", {
    abbreviation: "SC",
    notes: "SQ remains an accepted alias of SC; do not translate the code.",
  }),
  entry("clinical.route.sublingual", "Sublingual", "Sublingual", "MEDICATION_ROUTE", { abbreviation: "SL" }),
  entry("clinical.route.rectal", "Rectal", "Rectal", "MEDICATION_ROUTE", { abbreviation: "PR" }),
  entry("clinical.route.topical", "Topical", "Tópica", "MEDICATION_ROUTE"),
  entry("clinical.route.inhaled", "Inhaled", "Inhalada", "MEDICATION_ROUTE"),
  entry("clinical.route.intranasal", "Intranasal", "Intranasal", "MEDICATION_ROUTE"),
  entry("clinical.route.ophthalmic", "Ophthalmic", "Oftálmica", "MEDICATION_ROUTE"),
  entry("clinical.route.otic", "Otic", "Ótica", "MEDICATION_ROUTE"),
  entry("clinical.route.transdermal", "Transdermal", "Transdérmica", "MEDICATION_ROUTE"),
  entry("clinical.route.vaginal", "Vaginal", "Vaginal", "MEDICATION_ROUTE"),

  // F. Dosage forms
  entry("clinical.form.tablet", "Tablet", "Comprimido", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.capsule", "Capsule", "Cápsula", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.solution", "Solution", "Solución", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.suspension", "Suspension", "Suspensión", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.injection", "Injection", "Inyección", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.syrup", "Syrup", "Jarabe", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.cream", "Cream", "Crema", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.ointment", "Ointment", "Ungüento", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.gel", "Gel", "Gel", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.patch", "Patch", "Parche", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.drops", "Drops", "Gotas", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.suppository", "Suppository", "Supositorio", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.powder", "Powder", "Polvo", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.spray", "Spray", "Aerosol", "MEDICATION_DOSAGE_FORM"),
  entry("clinical.form.inhaler", "Inhaler", "Inhalador", "MEDICATION_DOSAGE_FORM"),

  // G. Medication ordering
  entry("clinical.medication.medication", "Medication", "Medicamento", "MEDICATION_ORDERING", {
    uiMessageKeys: ["common.medication"],
  }),
  entry("clinical.medication.dose", "Dose", "Dosis", "MEDICATION_ORDERING", {
    uiMessageKeys: ["common.dosage"],
  }),
  entry("clinical.medication.strength", "Strength", "Concentración", "MEDICATION_ORDERING"),
  entry("clinical.medication.route", "Route", "Vía", "MEDICATION_ORDERING"),
  entry("clinical.medication.frequency", "Frequency", "Frecuencia", "MEDICATION_ORDERING"),
  entry("clinical.medication.duration", "Duration", "Duración", "MEDICATION_ORDERING"),
  entry("clinical.medication.quantity", "Quantity", "Cantidad", "MEDICATION_ORDERING", {
    uiMessageKeys: ["common.quantity"],
  }),
  entry("clinical.medication.refills", "Refills", "Renovaciones", "MEDICATION_ORDERING", {
    uiMessageKeys: ["common.refills"],
  }),
  entry("clinical.medication.startDate", "Start Date", "Fecha de inicio", "MEDICATION_ORDERING"),
  entry("clinical.medication.stopDate", "Stop Date", "Fecha de término", "MEDICATION_ORDERING"),
  entry("clinical.medication.prn", "PRN", "PRN", "MEDICATION_ORDERING", {
    abbreviation: "PRN",
    esExpanded: "Según necesidad",
  }),
  entry("clinical.medication.asNeeded", "As Needed", "Según necesidad", "MEDICATION_ORDERING"),
  entry("clinical.medication.scheduled", "Scheduled", "Programado", "MEDICATION_ORDERING"),
  entry("clinical.medication.oneTimeDose", "One-time Dose", "Dosis única", "MEDICATION_ORDERING"),
  entry("clinical.medication.loadingDose", "Loading Dose", "Dosis de carga", "MEDICATION_ORDERING"),
  entry("clinical.medication.maintenanceDose", "Maintenance Dose", "Dosis de mantenimiento", "MEDICATION_ORDERING"),
  entry("clinical.medication.administer", "Administer", "Administrar", "MEDICATION_ORDERING"),
  entry("clinical.medication.administration", "Administration", "Administración", "MEDICATION_ORDERING"),
  entry("clinical.medication.hold", "Hold", "Suspender temporalmente", "MEDICATION_ORDERING"),
  entry("clinical.medication.resume", "Resume", "Reanudar", "MEDICATION_ORDERING"),
  entry("clinical.medication.discontinue", "Discontinue", "Suspender", "MEDICATION_ORDERING"),
  entry("clinical.medication.prescription", "Prescription", "Receta", "MEDICATION_ORDERING"),
  entry("clinical.medication.homeMedication", "Home Medication", "Medicamento habitual", "MEDICATION_ORDERING"),
  entry("clinical.medication.reconciliation", "Medication Reconciliation", "Conciliación de medicamentos", "MEDICATION_ORDERING"),

  // H. Laboratory
  entry("clinical.lab.laboratory", "Laboratory", "Laboratorio", "LABORATORY"),
  entry("clinical.lab.labOrder", "Lab Order", "Orden de laboratorio", "LABORATORY"),
  entry("clinical.lab.specimen", "Specimen", "Muestra", "LABORATORY"),
  entry("clinical.lab.collected", "Collected", "Recolectada", "LABORATORY"),
  entry("clinical.lab.collectionTime", "Collection Time", "Hora de recolección", "LABORATORY"),
  entry("clinical.lab.result", "Result", "Resultado", "LABORATORY"),
  entry("clinical.lab.finalResult", "Final Result", "Resultado final", "LABORATORY"),
  entry("clinical.lab.preliminary", "Preliminary", "Preliminar", "LABORATORY"),
  entry("clinical.lab.referenceRange", "Reference Range", "Intervalo de referencia", "LABORATORY"),
  entry("clinical.lab.abnormal", "Abnormal", "Anormal", "LABORATORY"),
  entry("clinical.lab.critical", "Critical", "Crítico", "LABORATORY"),
  entry("clinical.lab.high", "High", "Alto", "LABORATORY"),
  entry("clinical.lab.low", "Low", "Bajo", "LABORATORY"),
  entry("clinical.lab.positive", "Positive", "Positivo", "LABORATORY"),
  entry("clinical.lab.negative", "Negative", "Negativo", "LABORATORY"),
  entry("clinical.lab.detected", "Detected", "Detectado", "LABORATORY"),
  entry("clinical.lab.notDetected", "Not Detected", "No detectado", "LABORATORY"),
  entry("clinical.lab.pending", "Pending", "Pendiente", "LABORATORY"),
  entry("clinical.lab.panel", "Panel", "Panel", "LABORATORY"),
  entry("clinical.lab.analyte", "Analyte", "Analito", "LABORATORY"),
  entry("clinical.lab.culture", "Culture", "Cultivo", "LABORATORY"),
  entry("clinical.lab.sensitivity", "Sensitivity", "Sensibilidad", "LABORATORY"),
  entry("clinical.lab.labTest", "Lab test", "Prueba de laboratorio", "LABORATORY", {
    uiMessageKeys: ["common.labTest"],
  }),

  // I. Radiology
  entry("clinical.imaging.imaging", "Imaging", "Imagenología", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.radiology", "Radiology", "Radiología", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.study", "Study", "Estudio", "RADIOLOGY_IMAGING", {
    uiMessageKeys: ["common.study"],
  }),
  entry("clinical.imaging.exam", "Exam", "Examen", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.order", "Order", "Orden", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.result", "Result", "Resultado", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.report", "Report", "Informe", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.impression", "Impression", "Impresión diagnóstica", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.findings", "Findings", "Hallazgos", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.indication", "Indication", "Indicación", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.modality", "Modality", "Modalidad", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.bodyPart", "Body Part", "Región anatómica", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.laterality", "Laterality", "Lateralidad", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.contrast", "Contrast", "Contraste", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.withContrast", "With Contrast", "Con contraste", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.withoutContrast", "Without Contrast", "Sin contraste", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.withAndWithoutContrast", "With and Without Contrast", "Con y sin contraste", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.portable", "Portable", "Portátil", "RADIOLOGY_IMAGING"),
  entry("clinical.imaging.ct", "CT", "CT", "RADIOLOGY_IMAGING", { abbreviation: "CT", esExpanded: "Tomografía computarizada" }),
  entry("clinical.imaging.mri", "MRI", "MRI", "RADIOLOGY_IMAGING", { abbreviation: "MRI", esExpanded: "Resonancia magnética" }),
  entry("clinical.imaging.xr", "XR", "XR", "RADIOLOGY_IMAGING", { abbreviation: "XR", esExpanded: "Radiografía" }),
  entry("clinical.imaging.us", "US", "US", "RADIOLOGY_IMAGING", { abbreviation: "US", esExpanded: "Ecografía" }),
  entry("clinical.imaging.imagingStudy", "Imaging study", "Estudio de imagen", "RADIOLOGY_IMAGING", {
    uiMessageKeys: ["common.imagingStudy"],
  }),

  // J. Diagnosis / assessment — no bulk ICD dictionary
  entry("clinical.dx.diagnosis", "Diagnosis", "Diagnóstico", "DIAGNOSIS_ASSESSMENT"),
  entry("clinical.dx.primaryDiagnosis", "Primary Diagnosis", "Diagnóstico principal", "DIAGNOSIS_ASSESSMENT", {
    uiMessageKeys: ["printOutput.discharge.primaryDiagnosis"],
  }),
  entry("clinical.dx.secondaryDiagnosis", "Secondary Diagnosis", "Diagnóstico secundario", "DIAGNOSIS_ASSESSMENT"),
  entry("clinical.dx.principalDiagnosis", "Principal Diagnosis", "Diagnóstico principal de egreso", "DIAGNOSIS_ASSESSMENT", {
    notes: "Billing/principal-dx sense; distinct from primary working diagnosis.",
    status: "REVIEW_REQUIRED",
  }),
  entry("clinical.dx.problem", "Problem", "Problema", "DIAGNOSIS_ASSESSMENT"),
  entry("clinical.dx.activeProblem", "Active Problem", "Problema activo", "DIAGNOSIS_ASSESSMENT"),
  entry("clinical.dx.resolvedProblem", "Resolved Problem", "Problema resuelto", "DIAGNOSIS_ASSESSMENT"),
  entry("clinical.dx.differentialDiagnosis", "Differential Diagnosis", "Diagnóstico diferencial", "DIAGNOSIS_ASSESSMENT"),
  entry("clinical.dx.assessment", "Assessment", "Valoración", "DIAGNOSIS_ASSESSMENT"),
  entry("clinical.dx.clinicalImpression", "Clinical Impression", "Impresión clínica", "DIAGNOSIS_ASSESSMENT"),
  entry("clinical.dx.presentOnAdmission", "Present on Admission", "Presente al ingreso", "DIAGNOSIS_ASSESSMENT", {
    abbreviation: "POA",
  }),

  // K. Procedures
  entry("clinical.procedure.procedure", "Procedure", "Procedimiento", "PROCEDURES"),
  entry("clinical.procedure.performed", "Performed", "Realizado", "PROCEDURES"),
  entry("clinical.procedure.indication", "Indication", "Indicación", "PROCEDURES"),
  entry("clinical.procedure.timeout", "Time-out", "Pausa de seguridad", "PROCEDURES"),
  entry("clinical.procedure.laterality", "Laterality", "Lateralidad", "PROCEDURES"),
  entry("clinical.procedure.site", "Site", "Sitio", "PROCEDURES"),

  // L. Vitals
  entry("clinical.vitals.bloodPressure", "Blood Pressure", "Presión arterial", "VITAL_SIGNS", { abbreviation: "PA" }),
  entry("clinical.vitals.heartRate", "Heart Rate", "Frecuencia cardíaca", "VITAL_SIGNS", { abbreviation: "FC" }),
  entry("clinical.vitals.respiratoryRate", "Respiratory Rate", "Frecuencia respiratoria", "VITAL_SIGNS", {
    abbreviation: "FR",
  }),
  entry("clinical.vitals.temperature", "Temperature", "Temperatura", "VITAL_SIGNS"),
  entry("clinical.vitals.oxygenSaturation", "Oxygen Saturation", "Saturación de oxígeno", "VITAL_SIGNS", {
    abbreviation: "SpO2",
  }),
  entry("clinical.vitals.weight", "Weight", "Peso", "VITAL_SIGNS"),
  entry("clinical.vitals.height", "Height", "Talla", "VITAL_SIGNS"),
  entry("clinical.vitals.bmi", "BMI", "IMC", "VITAL_SIGNS", { abbreviation: "BMI", esExpanded: "Índice de masa corporal" }),
  entry("clinical.vitals.painScore", "Pain Score", "Puntuación del dolor", "VITAL_SIGNS"),

  // M. Allergies
  entry("clinical.allergy.allergies", "Allergies", "Alergias", "ALLERGIES"),
  entry("clinical.allergy.noKnownAllergies", "No Known Allergies", "Sin alergias conocidas", "ALLERGIES", {
    abbreviation: "NKA",
  }),
  entry("clinical.allergy.drugAllergy", "Drug Allergy", "Alergia a medicamentos", "ALLERGIES"),
  entry("clinical.allergy.foodAllergy", "Food Allergy", "Alergia alimentaria", "ALLERGIES"),
  entry("clinical.allergy.environmentalAllergy", "Environmental Allergy", "Alergia ambiental", "ALLERGIES"),
  entry("clinical.allergy.reaction", "Reaction", "Reacción", "ALLERGIES"),
  entry("clinical.allergy.severity", "Severity", "Gravedad", "ALLERGIES"),
  entry("clinical.allergy.unknown", "Unknown", "Desconocido", "ALLERGIES"),
  entry("clinical.allergy.mild", "Mild", "Leve", "ALLERGIES"),
  entry("clinical.allergy.moderate", "Moderate", "Moderada", "ALLERGIES"),
  entry("clinical.allergy.severe", "Severe", "Grave", "ALLERGIES"),

  // N. MAR
  entry("clinical.mar.record", "Medication Administration Record", "Registro de administración de medicamentos", "MAR_ADMINISTRATION", {
    abbreviation: "MAR",
  }),
  entry("clinical.mar.scheduled", "Scheduled", "Programado", "MAR_ADMINISTRATION"),
  entry("clinical.mar.due", "Due", "Pendiente de administrar", "MAR_ADMINISTRATION"),
  entry("clinical.mar.overdue", "Overdue", "Vencido", "MAR_ADMINISTRATION"),
  entry("clinical.mar.administered", "Administered", "Administrado", "MAR_ADMINISTRATION"),
  entry("clinical.mar.notGiven", "Not Given", "No administrado", "MAR_ADMINISTRATION"),
  entry("clinical.mar.held", "Held", "Retenido", "MAR_ADMINISTRATION"),
  entry("clinical.mar.refused", "Refused", "Rechazado", "MAR_ADMINISTRATION"),
  entry("clinical.mar.missed", "Missed", "Omitido", "MAR_ADMINISTRATION"),
  entry("clinical.mar.late", "Late", "Con retraso", "MAR_ADMINISTRATION", {
    notes:
      "MEDUI.ES.1H: administration-variance badge for a dose that WAS given after the on-time window (canonical LATE / LATE_ADMINISTRATION). Not DUE, not OVERDUE (not yet given), not HELD. Former REVIEW_REQUIRED 'Tardío' was rejected as ambiguous with overdue.",
    uiMessageKeys: ["marAdministrationVariance.badge.LATE"],
  }),
  entry("clinical.mar.administeredLate", "Administered late", "Administrado con retraso", "MAR_ADMINISTRATION", {
    notes:
      "MEDUI.ES.1H: MAR history event LATE_ADMINISTRATION — the dose was administered, after the scheduled window. Distinct from clinical.mar.late (short badge), clinical.mar.overdue (not yet given), and clinical.mar.administered (on-time or unspecified).",
    uiMessageKeys: ["marAdministrationHistory.eventType.LATE_ADMINISTRATION"],
  }),
  entry("clinical.mar.administrationTime", "Administration Time", "Hora de administración", "MAR_ADMINISTRATION"),
  entry("clinical.mar.administeredBy", "Administered By", "Administrado por", "MAR_ADMINISTRATION"),

  // O. Admission / observation / discharge — keep states distinct
  entry("clinical.aod.admit", "Admit", "Admitir", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.admission", "Admission", "Admisión", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.observation", "Observation", "Observación", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.placeInObservation", "Place in Observation", "Colocar en observación", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.discharge", "Discharge", "Alta", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.dischargeHome", "Discharge Home", "Alta a domicilio", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.transfer", "Transfer", "Traslado", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.disposition", "Disposition", "Disposición", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.admittingProvider", "Admitting Provider", "Profesional clínico que admite", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.receivingProvider", "Receiving Provider", "Profesional clínico receptor", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.receivingFacility", "Receiving Facility", "Establecimiento receptor", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.receivingUnit", "Receiving Unit", "Unidad receptora", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.dischargeInstructions", "Discharge Instructions", "Instrucciones de alta", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.followUp", "Follow-up", "Seguimiento", "ADMISSION_OBSERVATION_DISCHARGE", {
    uiMessageKeys: ["nav.followUps"],
  }),
  entry("clinical.aod.dischargeMedication", "Discharge Medication", "Medicamento al alta", "ADMISSION_OBSERVATION_DISCHARGE"),
  entry("clinical.aod.dischargeDiagnosis", "Discharge Diagnosis", "Diagnóstico de alta", "ADMISSION_OBSERVATION_DISCHARGE"),

  // P. Placement / bed
  entry("clinical.placement.placement", "Placement", "Colocación", "PLACEMENT_BED"),
  entry("clinical.placement.request", "Placement Request", "Solicitud de colocación", "PLACEMENT_BED"),
  entry("clinical.placement.underReview", "Under Review", "En revisión", "PLACEMENT_BED"),
  entry("clinical.placement.accepted", "Accepted", "Aceptado", "PLACEMENT_BED"),
  entry("clinical.placement.bedAssigned", "Bed Assigned", "Cama asignada", "PLACEMENT_BED"),
  entry("clinical.placement.readyForTransfer", "Ready for Transfer", "Listo para traslado", "PLACEMENT_BED"),
  entry("clinical.placement.departedEd", "Departed ED", "Salió de urgencias", "PLACEMENT_BED"),
  entry("clinical.placement.arrivedAtDestination", "Arrived at Destination", "Llegó al destino", "PLACEMENT_BED"),
  entry("clinical.placement.completed", "Completed", "Completado", "PLACEMENT_BED"),
  entry("clinical.placement.unit", "Unit", "Unidad", "PLACEMENT_BED"),
  entry("clinical.placement.room", "Room", "Habitación", "PLACEMENT_BED"),
  entry("clinical.placement.bed", "Bed", "Cama", "PLACEMENT_BED"),
  entry("clinical.placement.acceptingProvider", "Accepting Provider", "Profesional clínico que acepta", "PLACEMENT_BED", {
    uiMessageKeys: ["printOutput.inpatientDisposition.acceptingProvider"],
  }),
  entry("clinical.placement.receivingNurse", "Receiving Nurse", "Enfermero receptor", "PLACEMENT_BED"),

  // Q. Clinic
  entry("clinical.clinic.visit", "Visit", "Consulta", "CLINIC"),
  entry("clinical.clinic.appointment", "Appointment", "Cita", "CLINIC"),
  entry("clinical.clinic.reasonForVisit", "Reason for Visit", "Motivo de consulta", "CLINIC"),
  entry("clinical.clinic.chiefComplaint", "Chief Complaint", "Motivo de consulta", "CLINIC", {
    uiMessageKeys: ["common.chiefComplaintShort"],
  }),
  entry("clinical.clinic.followUpVisit", "Follow-up Visit", "Consulta de seguimiento", "CLINIC"),
  entry("clinical.clinic.newPatient", "New Patient", "Paciente nuevo", "CLINIC"),
  entry("clinical.clinic.establishedPatient", "Established Patient", "Paciente conocido", "CLINIC"),
  entry("clinical.clinic.history", "History", "Antecedentes", "CLINIC"),
  entry("clinical.clinic.exam", "Exam", "Examen", "CLINIC"),
  entry("clinical.clinic.assessment", "Assessment", "Valoración", "CLINIC"),
  entry("clinical.clinic.plan", "Plan", "Plan", "CLINIC"),
  entry("clinical.clinic.prescription", "Prescription", "Receta", "CLINIC"),

  // R. Dental — UI chrome only, not a CDT dictionary
  entry("clinical.dental.dental", "Dental", "Odontología", "DENTAL"),
  entry("clinical.dental.tooth", "Tooth", "Diente", "DENTAL"),
  entry("clinical.dental.teeth", "Teeth", "Dientes", "DENTAL"),
  entry("clinical.dental.surface", "Surface", "Superficie", "DENTAL"),
  entry("clinical.dental.quadrant", "Quadrant", "Cuadrante", "DENTAL"),
  entry("clinical.dental.procedure", "Procedure", "Procedimiento", "DENTAL"),
  entry("clinical.dental.dentalChart", "Dental Chart", "Odontograma", "DENTAL"),
  entry("clinical.dental.treatmentPlan", "Treatment Plan", "Plan de tratamiento", "DENTAL"),
  entry("clinical.dental.dentalHistory", "Dental History", "Antecedentes odontológicos", "DENTAL"),
  entry("clinical.dental.dentalExamination", "Dental Examination", "Examen odontológico", "DENTAL"),
  entry("clinical.dental.dentalDiagnosis", "Dental Diagnosis", "Diagnóstico odontológico", "DENTAL"),

  // S. Billing — codes unchanged; several labels REVIEW_REQUIRED
  entry("clinical.billing.billing", "Billing", "Facturación", "BILLING_CLAIM", {
    uiMessageKeys: ["nav.billing"],
  }),
  entry("clinical.billing.claim", "Claim", "Reclamación", "BILLING_CLAIM", {
    status: "REVIEW_REQUIRED",
    notes: "LatAm reclamo vs reclamación; do not treat as approved until billing review.",
  }),
  entry("clinical.billing.charge", "Charge", "Cargo", "BILLING_CLAIM"),
  entry("clinical.billing.chargeCapture", "Charge Capture", "Captura de cargos", "BILLING_CLAIM"),
  entry("clinical.billing.diagnosis", "Diagnosis", "Diagnóstico", "BILLING_CLAIM"),
  entry("clinical.billing.procedure", "Procedure", "Procedimiento", "BILLING_CLAIM"),
  entry("clinical.billing.modifier", "Modifier", "Modificador", "BILLING_CLAIM"),
  entry("clinical.billing.revenueCode", "Revenue Code", "Código de ingresos", "BILLING_CLAIM", {
    status: "REVIEW_REQUIRED",
  }),
  entry("clinical.billing.professional", "Professional", "Profesional", "BILLING_CLAIM", { status: "REVIEW_REQUIRED" }),
  entry("clinical.billing.facility", "Facility", "Establecimiento", "BILLING_CLAIM", {
    uiMessageKeys: ["common.facilityPrefix"],
  }),
  entry("clinical.billing.subscriber", "Subscriber", "Titular", "BILLING_CLAIM", { status: "REVIEW_REQUIRED" }),
  entry("clinical.billing.coverage", "Coverage", "Cobertura", "BILLING_CLAIM"),
  entry("clinical.billing.payer", "Payer", "Pagador", "BILLING_CLAIM"),
  entry("clinical.billing.primaryPayer", "Primary Payer", "Pagador principal", "BILLING_CLAIM"),
  entry("clinical.billing.secondaryPayer", "Secondary Payer", "Pagador secundario", "BILLING_CLAIM"),
  entry("clinical.billing.claimStatus", "Claim Status", "Estado de la reclamación", "BILLING_CLAIM", {
    status: "REVIEW_REQUIRED",
  }),
  entry("clinical.billing.readyForExport", "Ready for Export", "Listo para exportar", "BILLING_CLAIM"),
  entry("clinical.billing.validation", "Validation", "Validación", "BILLING_CLAIM"),
  entry("clinical.billing.error", "Error", "Error", "BILLING_CLAIM"),
  entry("clinical.billing.warning", "Warning", "Advertencia", "BILLING_CLAIM"),
  entry("clinical.billing.missingInformation", "Missing Information", "Información faltante", "BILLING_CLAIM"),

  // T. Print / consent / legal chrome — not legal-body translation
  entry("clinical.print.patient", "Patient", "Paciente", "PRINT_CONSENT_LEGAL", {
    uiMessageKeys: ["common.patient", "nav.patients"],
  }),
  entry("clinical.print.mrn", "Medical Record Number", "Número de historia clínica", "PRINT_CONSENT_LEGAL", {
    abbreviation: "MRN",
  }),
  entry("clinical.print.dateOfBirth", "Date of Birth", "Fecha de nacimiento", "PRINT_CONSENT_LEGAL"),
  entry("clinical.print.encounter", "Encounter", "Encuentro clínico", "PRINT_CONSENT_LEGAL"),
  entry("clinical.print.provider", "Provider", "Profesional clínico", "PRINT_CONSENT_LEGAL"),
  entry("clinical.print.nurse", "Nurse", "Enfermero", "PRINT_CONSENT_LEGAL"),
  entry("clinical.print.signature", "Signature", "Firma", "PRINT_CONSENT_LEGAL"),
  entry("clinical.print.signatureHeading", "Signature / clinician name", "Firma / nombre del clínico", "PRINT_CONSENT_LEGAL", {
    uiMessageKeys: ["printOutput.discharge.signatureHeading"],
  }),
  entry("clinical.print.date", "Date", "Fecha", "PRINT_CONSENT_LEGAL", {
    uiMessageKeys: ["common.date"],
  }),
  entry("clinical.print.time", "Time", "Hora", "PRINT_CONSENT_LEGAL"),
  entry("clinical.print.consent", "Consent", "Consentimiento", "PRINT_CONSENT_LEGAL"),
  entry("clinical.print.authorization", "Authorization", "Autorización", "PRINT_CONSENT_LEGAL"),
  entry("clinical.print.instructions", "Instructions", "Instrucciones", "PRINT_CONSENT_LEGAL"),
  entry("clinical.print.summary", "Summary", "Resumen", "PRINT_CONSENT_LEGAL"),
  entry("clinical.print.patientName", "Patient name", "Nombre del paciente", "PRINT_CONSENT_LEGAL", {
    uiMessageKeys: ["printOutput.discharge.patientName"],
  }),
  entry("clinical.print.status", "Status", "Estado", "PRINT_CONSENT_LEGAL", {
    uiMessageKeys: ["common.status"],
  }),
  entry("clinical.print.test", "Test", "Prueba", "PRINT_CONSENT_LEGAL", {
    uiMessageKeys: ["common.test"],
  }),
];

const BY_KEY = new Map(ES_MEDICAL_TERMINOLOGY.map((e) => [e.key, e]));

export function getSpanishMedicalTerminologyEntry(key: string): EsMedicalTerminologyEntry | undefined {
  return BY_KEY.get(key);
}

/**
 * Spanish lookup. Missing or REVIEW_REQUIRED → UNLOCALIZED_ES::<key>.
 * Never returns English or French catalog text.
 */
export function getSpanishMedicalTerm(key: string): string {
  const entry = BY_KEY.get(key);
  if (!entry || entry.status !== "APPROVED") return hiddenSpanishPlaceholder(key);
  const value = entry.es.trim();
  if (!value) return hiddenSpanishPlaceholder(key);
  return value;
}

/**
 * Locale-aware terminology helper. Not a parallel UI catalog.
 * FR is not sourced from this canon — missing FR returns the key path, never EN/ES.
 */
export function resolveMedicalTerminology(locale: ProductUiLanguage, key: string): string {
  const entry = BY_KEY.get(key);
  if (locale === "es") return getSpanishMedicalTerm(key);
  if (!entry) return key;
  if (locale === "en") return entry.en;
  return key;
}

export function listEsMedicalTerminologyByDomain(
  domain: EsMedicalTerminologyDomain
): readonly EsMedicalTerminologyEntry[] {
  return ES_MEDICAL_TERMINOLOGY.filter((e) => e.domain === domain);
}

export function esMedicalTerminologyCounts(): {
  total: number;
  approved: number;
  reviewRequired: number;
  byDomain: Record<EsMedicalTerminologyDomain, number>;
} {
  const byDomain = {} as Record<EsMedicalTerminologyDomain, number>;
  let approved = 0;
  let reviewRequired = 0;
  for (const e of ES_MEDICAL_TERMINOLOGY) {
    byDomain[e.domain] = (byDomain[e.domain] ?? 0) + 1;
    if (e.status === "APPROVED") approved += 1;
    else reviewRequired += 1;
  }
  return { total: ES_MEDICAL_TERMINOLOGY.length, approved, reviewRequired, byDomain };
}

function setStringPath(tree: unknown, path: string, value: string): boolean {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0 || tree === null || typeof tree !== "object") return false;
  let cur: Record<string, unknown> = tree as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cur[parts[i]!];
    if (next === null || typeof next !== "object") return false;
    cur = next as Record<string, unknown>;
  }
  const leafKey = parts[parts.length - 1]!;
  const current = cur[leafKey];
  if (typeof current !== "string" || !isHiddenSpanishPlaceholder(current)) return false;
  cur[leafKey] = value;
  return true;
}

/** Overlay APPROVED canon terms onto a hidden Spanish message tree. */
export function applyApprovedSpanishTerminology<T>(tree: T): { tree: T; replaced: number } {
  let replaced = 0;
  const seen = new Set<string>();
  for (const e of ES_MEDICAL_TERMINOLOGY) {
    if (e.status !== "APPROVED") continue;
    const es = e.es.trim();
    if (!es || isHiddenSpanishPlaceholder(es)) continue;
    for (const path of e.uiMessageKeys ?? []) {
      if (seen.has(path)) continue;
      seen.add(path);
      if (setStringPath(tree, path, es)) replaced += 1;
    }
  }
  return { tree, replaced };
}
