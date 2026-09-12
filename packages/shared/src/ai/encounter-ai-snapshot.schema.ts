import { z } from "zod";

export const aiEncounterCareSettingSchema = z.enum([
  "EMERGENCY_DEPARTMENT",
  "OFFICE_OUTPATIENT_CLINIC",
  "HOSPITAL_INPATIENT_OBSERVATION",
  "CRITICAL_CARE",
  "OTHER",
  "REVIEW_REQUIRED",
]);

export type AiEncounterCareSetting = z.infer<typeof aiEncounterCareSettingSchema>;

export const aiJurisdictionSchema = z.enum(["US", "DO", "HT", "OTHER"]);

export type AiJurisdiction = z.infer<typeof aiJurisdictionSchema>;

export const aiEncounterContextSchema = z.object({
  encounterId: z.string().uuid(),
  facilityId: z.string().uuid(),
  patientId: z.string().uuid(),
  country: aiJurisdictionSchema,
  encounterType: z.string(),
  status: z.string(),
  serviceLine: z.string().nullable().optional(),
  billingClassification: z.string().nullable().optional(),
  workflowState: z.string().nullable().optional(),
  careSetting: aiEncounterCareSettingSchema,
});

export type AiEncounterContext = z.infer<typeof aiEncounterContextSchema>;

export const aiPatientContextSchema = z.object({
  age: z.number().int().min(0).max(150).nullable().optional(),
  dateOfBirth: z.string().datetime().nullable().optional(),
  sexAtBirth: z.enum(["M", "F", "X", "U"]).nullable().optional(),
  relevantHistory: z.unknown().nullable().optional(),
});

export type AiPatientContext = z.infer<typeof aiPatientContextSchema>;

export const aiVitalsEntrySchema = z.object({
  recordedAt: z.string().datetime().nullable().optional(),
  source: z.string().nullable().optional(),
  values: z.record(z.unknown()).nullable().optional(),
});

export type AiVitalsEntry = z.infer<typeof aiVitalsEntrySchema>;

export const aiTriageContextSchema = z.object({
  esi: z.string().nullable().optional(),
  chiefComplaint: z.string().nullable().optional(),
  onset: z.string().nullable().optional(),
  modeOfArrival: z.string().nullable().optional(),
  triageNote: z.string().nullable().optional(),
});

export type AiTriageContext = z.infer<typeof aiTriageContextSchema>;

export const aiPresentationSchema = z.object({
  chiefComplaint: z.string().nullable().optional(),
  triage: aiTriageContextSchema.optional(),
  latestVitals: aiVitalsEntrySchema.nullable().optional(),
  vitalTrend: z.array(aiVitalsEntrySchema).max(50).optional(),
});

export type AiPresentation = z.infer<typeof aiPresentationSchema>;

export const aiStructuredDocumentationEntrySchema = z.object({
  id: z.string(),
  namespace: z.string(),
  documentedAt: z.string().datetime(),
  version: z.number().int().optional(),
  payloadSummary: z.record(z.unknown()).optional(),
});

export type AiStructuredDocumentationEntry = z.infer<typeof aiStructuredDocumentationEntrySchema>;

export const aiClinicalDocumentationSchema = z.object({
  providerDocumentationStatus: z.string().nullable().optional(),
  providerNote: z.string().max(50_000).nullable().optional(),
  treatmentPlan: z.string().max(50_000).nullable().optional(),
  structuredEntries: z.array(aiStructuredDocumentationEntrySchema).max(100).optional(),
  reassessments: z.array(aiStructuredDocumentationEntrySchema).max(100).optional(),
});

export type AiClinicalDocumentation = z.infer<typeof aiClinicalDocumentationSchema>;
export const aiOrderItemSchema = z.object({
  id: z.string(),
  catalogItemType: z.string().nullable().optional(),
  displayLabel: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  lifecycleState: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  orderedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export type AiOrderItem = z.infer<typeof aiOrderItemSchema>;

export const aiOrderSchema = z.object({
  id: z.string(),
  status: z.string().nullable().optional(),
  orderedAt: z.string().datetime().nullable().optional(),
  items: z.array(aiOrderItemSchema).max(200).optional(),
});

export type AiOrder = z.infer<typeof aiOrderSchema>;

export const aiResultSchema = z.object({
  id: z.string(),
  orderItemId: z.string().optional(),
  resultText: z.string().max(50_000).nullable().optional(),
  criticalValue: z.boolean().nullable().optional(),
  acknowledgedByProviderAt: z.string().datetime().nullable().optional(),
  resultedAt: z.string().datetime().nullable().optional(),
  verifiedAt: z.string().datetime().nullable().optional(),
});

export type AiResult = z.infer<typeof aiResultSchema>;

export const aiDiagnosticsSchema = z.object({
  orders: z.array(aiOrderSchema).max(100).optional(),
  results: z.array(aiResultSchema).max(200).optional(),
  pendingTests: z.array(z.string()).max(200).optional(),
  criticalResults: z.array(aiResultSchema).max(50).optional(),
});

export type AiDiagnostics = z.infer<typeof aiDiagnosticsSchema>;

export const aiMedicationOrderSchema = z.object({
  id: z.string(),
  displayLabel: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  lifecycleState: z.string().nullable().optional(),
  route: z.string().nullable().optional(),
  frequencyCode: z.string().nullable().optional(),
  orderedAt: z.string().datetime().nullable().optional(),
});

export type AiMedicationOrder = z.infer<typeof aiMedicationOrderSchema>;

export const aiMedicationAdministrationSchema = z.object({
  id: z.string(),
  orderItemId: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  administeredAt: z.string().datetime().nullable().optional(),
  status: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
});

export type AiMedicationAdministration = z.infer<typeof aiMedicationAdministrationSchema>;

export const aiProcedureSchema = z.object({
  id: z.string(),
  catalogCode: z.string().nullable().optional(),
  displayLabel: z.string().nullable().optional(),
  performedAt: z.string().datetime().nullable().optional(),
  status: z.string().nullable().optional(),
});

export type AiProcedure = z.infer<typeof aiProcedureSchema>;

export const aiTreatmentsSchema = z.object({
  medicationOrders: z.array(aiMedicationOrderSchema).max(100).optional(),
  medicationAdministrations: z.array(aiMedicationAdministrationSchema).max(500).optional(),
  procedures: z.array(aiProcedureSchema).max(100).optional(),
});

export type AiTreatments = z.infer<typeof aiTreatmentsSchema>;

export const aiDocumentedDiagnosisSchema = z.object({
  id: z.string(),
  code: z.string().nullable().optional(),
  display: z.string().nullable().optional(),
  isPrimary: z.boolean().nullable().optional(),
  status: z.string().nullable().optional(),
});

export type AiDocumentedDiagnosis = z.infer<typeof aiDocumentedDiagnosisSchema>;

export const aiDiagnosesSchema = z.object({
  documentedDiagnoses: z.array(aiDocumentedDiagnosisSchema).max(50).optional(),
});

export type AiDiagnoses = z.infer<typeof aiDiagnosesSchema>;

export const aiFollowUpSchema = z.object({
  id: z.string(),
  type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  instructions: z.string().max(10_000).nullable().optional(),
});

export type AiFollowUp = z.infer<typeof aiFollowUpSchema>;

export const aiAppointmentSchema = z.object({
  id: z.string(),
  status: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  departmentCode: z.string().nullable().optional(),
  notes: z.string().max(10_000).nullable().optional(),
});

export type AiAppointment = z.infer<typeof aiAppointmentSchema>;

export const aiDispositionSchema = z.object({
  disposition: z.string().nullable().optional(),
  dischargeStatus: z.string().nullable().optional(),
  dischargeSummary: z.string().max(50_000).nullable().optional(),
  followUps: z.array(aiFollowUpSchema).max(50).optional(),
  appointments: z.array(aiAppointmentSchema).max(50).optional(),
});

export type AiDisposition = z.infer<typeof aiDispositionSchema>;

export const encounterAiSnapshotSchema = z.object({
  snapshotVersion: z.string(),
  generatedAt: z.string().datetime(),
  encounterContext: aiEncounterContextSchema,
  patientContext: aiPatientContextSchema,
  presentation: aiPresentationSchema,
  clinicalDocumentation: aiClinicalDocumentationSchema,
  diagnostics: aiDiagnosticsSchema,
  treatments: aiTreatmentsSchema,
  diagnoses: aiDiagnosesSchema,
  disposition: aiDispositionSchema,
});

export type EncounterAiSnapshot = z.infer<typeof encounterAiSnapshotSchema>;

