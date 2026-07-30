import { z } from "zod";
import { marClinicalActionSchema } from "../mar/marClinicalAction.js";
import { imInjectionSiteValues } from "../mar/medicationAdministrationInjectionSite.js";
import { MAR_PRN_REASON_CODES } from "../mar/medicationAdministrationPrnGovernance.js";
import {
  ENCOUNTER_CARE_UNIT_CODES,
  ENCOUNTER_ROOM_CHANGE_REASON_CODES,
  normalizeEncounterRoomUnitCodeInput,
  type EncounterCareUnitCode,
} from "../encounters/governedRoomLabel.js";
import {
  MEDICATION_ORDER_ROUTES,
  normalizeMedicationRoute,
  type MedicationOrderRoute,
} from "../medication/medicationOrderRoute.js";
import { MEDICATION_INFUSION_NURSE_STOP_REASON_CODES } from "../medication/medicationInfusionStopReasonGovernance.js";
import { medicationFrequencyCodeSchema } from "../medication/medicationFrequencyCatalog.js";
import { validateEnterpriseProcedureIdForOrderItem } from "../procedures/enterpriseProcedureOrderValidation.js";
import { enterpriseOrderSetProvenanceSchema } from "../orders/enterpriseOrderSetProvenance.js";

/** Corps JSON : `""` sur champs optionnels doit être traité comme absent. */
const emptyStrToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const sexAtBirthSchema = z.enum(["M", "F", "X", "U"]);
export type SexAtBirth = z.infer<typeof sexAtBirthSchema>;

/** Inscription : envoyé par le client ; mappé côté API vers Prisma `SexAtBirth` + `PatientSex`. L’âge n’est jamais persisté. */
export const patientRegistrationSexSchema = z.enum(["HOMME", "FEMME", "AUTRE", "INCONNU"], {
  errorMap: () => ({ message: "Sexe invalide" }),
});

export const patientCreateDtoSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  middleName: z.preprocess(emptyStrToUndefined, z.string().max(128).optional()),
  mrn: z.string().optional(),
  /** ISO date string (e.g. YYYY-MM-DD); stored as `dob` in DB. Age is never stored. */
  dateOfBirth: z
    .string()
    .min(1, "La date de naissance est requise")
    .refine((s) => !Number.isNaN(Date.parse(s.trim())), "Date de naissance invalide"),
  sex: patientRegistrationSexSchema,
  phone: z.string().min(5).max(32).optional(),
  email: z.string().email().optional(),
  nationalId: z.string().min(3).max(64).optional(),
  /** Ligne unique historique ; peut être dérivée des lignes structurées si vide. */
  address: z.preprocess(emptyStrToUndefined, z.string().max(2000).optional()),
  addressLine1: z.preprocess(emptyStrToUndefined, z.string().max(512).optional()),
  addressLine2: z.preprocess(emptyStrToUndefined, z.string().max(512).optional()),
  city: z.preprocess(emptyStrToUndefined, z.string().max(256).optional()),
  stateProvince: z.preprocess(emptyStrToUndefined, z.string().max(128).optional()),
  postalCode: z.preprocess(emptyStrToUndefined, z.string().max(32).optional()),
  country: z.preprocess(emptyStrToUndefined, z.string().max(128).optional()),
  language: z.preprocess(emptyStrToUndefined, z.string().max(64).optional()),
  emergencyContactName: z.preprocess(emptyStrToUndefined, z.string().max(256).optional()),
  emergencyContactRelationship: z.preprocess(emptyStrToUndefined, z.string().max(128).optional()),
  emergencyContactPhone: z.preprocess(emptyStrToUndefined, z.string().min(5).max(32).optional()),
  adminNotes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
});

export type PatientCreateDto = z.infer<typeof patientCreateDtoSchema>;

export const patientUpdateDtoSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  middleName: z.string().max(128).optional().nullable(),
  dob: z.coerce.date().optional(),
  phone: z.string().min(5).max(32).optional().nullable(),
  email: z.string().email().optional().nullable(),
  sexAtBirth: sexAtBirthSchema.optional().nullable(),
  nationalId: z.string().min(3).max(64).optional().nullable(),
  address: z.string().optional().nullable(),
  addressLine1: z.string().max(512).optional().nullable(),
  addressLine2: z.string().max(512).optional().nullable(),
  city: z.string().max(256).optional().nullable(),
  stateProvince: z.string().max(128).optional().nullable(),
  postalCode: z.string().max(32).optional().nullable(),
  country: z.string().max(128).optional().nullable(),
  language: z.string().max(64).optional().nullable(),
  emergencyContactName: z.string().max(256).optional().nullable(),
  emergencyContactRelationship: z.string().max(128).optional().nullable(),
  emergencyContactPhone: z.string().min(5).max(32).optional().nullable(),
  adminNotes: z.string().max(8000).optional().nullable(),
});

export type PatientUpdateDto = z.infer<typeof patientUpdateDtoSchema>;

export const insurancePayerSearchQuerySchema = z.object({
  q: z.string().min(1),
});

const optionalTrimmed = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((s) => (s === undefined ? undefined : s.trim() === "" ? undefined : s.trim()));

export const patientInsuranceCoverageUpsertDtoSchema = z
  .object({
    payerId: z
      .string()
      .optional()
      .nullable()
      .transform((s) => (s == null || String(s).trim() === "" ? null : String(s).trim())),
    payerNameFreeText: z
      .string()
      .optional()
      .nullable()
      .transform((s) => (s == null || String(s).trim() === "" ? null : String(s).trim())),
    planName: optionalTrimmed(512),
    memberId: optionalTrimmed(256),
    policyNumber: optionalTrimmed(256),
    groupNumber: optionalTrimmed(256),
    subscriberName: optionalTrimmed(512),
    relationToSubscriber: optionalTrimmed(128),
    phone: optionalTrimmed(64),
    notes: optionalTrimmed(8000),
    effectiveFrom: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.date().optional()),
    effectiveTo: z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.date().optional()),
    isActive: z.boolean().optional(),
    clear: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.effectiveFrom &&
      data.effectiveTo &&
      data.effectiveFrom.getTime() > data.effectiveTo.getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La date de fin de couverture doit être après la date de début.",
        path: ["effectiveTo"],
      });
    }
  })
  .superRefine((data, ctx) => {
    if (data.payerId && data.payerNameFreeText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ne pas combiner payeur catalogue et nom libre : choisissez l’un ou l’autre.",
        path: ["payerNameFreeText"],
      });
    }
  })
  .superRefine((data, ctx) => {
    if (data.clear === true) return;
    const hasPayer = Boolean(data.payerId) || Boolean(data.payerNameFreeText);
    const hasAncillary = Boolean(
      data.planName ||
        data.memberId ||
        data.policyNumber ||
        data.groupNumber ||
        data.subscriberName ||
        data.relationToSubscriber ||
        data.phone ||
        data.notes
    );
    if (!hasPayer && hasAncillary) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sélectionnez un payeur catalogue ou saisissez un nom libre avant les autres champs.",
        path: ["payerId"],
      });
    }
  });

export type PatientInsuranceCoverageUpsertDto = z.infer<
  typeof patientInsuranceCoverageUpsertDtoSchema
>;

export const encounterTypeSchema = z.enum(["OUTPATIENT", "INPATIENT", "EMERGENCY", "URGENT_CARE"]);
export type EncounterType = z.infer<typeof encounterTypeSchema>;

export const encounterStatusSchema = z.enum(["OPEN", "CLOSED", "CANCELLED"]);
export type EncounterStatus = z.infer<typeof encounterStatusSchema>;

export const vitalsSchema = z.object({
  tempC: z.number().optional().nullable(),
  hr: z.number().int().positive().optional().nullable(),
  rr: z.number().int().positive().optional().nullable(),
  bpSys: z.number().int().positive().optional().nullable(),
  bpDia: z.number().int().positive().optional().nullable(),
  spo2: z.number().int().min(0).max(100).optional().nullable(),
  weightKg: z.number().positive().optional().nullable(),
  heightCm: z.number().positive().optional().nullable(),
  allergyNote: z.string().max(2000).optional().nullable(),
}).optional().nullable();

export type Vitals = z.infer<typeof vitalsSchema>;

export const encounterCreateDtoSchema = z.object({
  type: encounterTypeSchema,
  /** @deprecated Préférer physicianAssignedUserId — conservé pour compat ; sinon copié vers médecin attribué si fourni. */
  providerId: z.preprocess(emptyStrToUndefined, z.union([z.string().uuid(), z.null()]).optional()),
  /** Médecin attribué (référence User) — source canonique d’affichage dossier / trackboard. */
  physicianAssignedUserId: z.preprocess(
    emptyStrToUndefined,
    z.union([z.string().uuid(), z.null()]).optional()
  ),
  /** Reason for visit (clinic); stored as chiefComplaint */
  visitReason: z.preprocess(emptyStrToUndefined, z.string().max(4000).optional()),
  chiefComplaint: z.preprocess(emptyStrToUndefined, z.string().max(4000).optional()),
  notes: z.preprocess(emptyStrToUndefined, z.string().max(16000).optional()),
  /** Salle / lieu de consultation (accueil) */
  roomLabel: z.preprocess(emptyStrToUndefined, z.union([z.string().max(64), z.null()]).optional()),
  /** Accept suggested shared-room suffix when numbered room is occupied (ED). */
  confirmOccupiedRoomAssignment: z.boolean().optional(),
  roomOccupancyOverride: z
    .object({
      requestedRoom: z.string().max(64),
      acceptedRoom: z.string().max(64),
    })
    .optional(),
});

export type EncounterCreateDto = z.infer<typeof encounterCreateDtoSchema>;

/** POST /encounters/:id/intake — métadonnées d’accueil (aperçu, hors dossier clinique complet). */
export const encounterIntakeUpsertDtoSchema = z.object({
  arrivalAt: z.preprocess(emptyStrToUndefined, z.coerce.date().optional()),
  modeOfArrival: z.preprocess(emptyStrToUndefined, z.string().max(256).optional()),
  initialChiefComplaint: z.preprocess(emptyStrToUndefined, z.string().max(4000).optional()),
  initialAcuity: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(1).max(5).optional()
  ),
  initialRoom: z.preprocess(emptyStrToUndefined, z.string().max(64).optional()),
});

export type EncounterIntakeUpsertDto = z.infer<typeof encounterIntakeUpsertDtoSchema>;

/** Alias Phase 1 — même charge utile que l’upsert (tous les champs optionnels). */
export const encounterIntakeCreateDtoSchema = encounterIntakeUpsertDtoSchema;
export type EncounterIntakeCreateDto = z.infer<typeof encounterIntakeCreateDtoSchema>;

export const encounterOutpatientCreateDtoSchema = z.object({
  visitReason: z.preprocess(emptyStrToUndefined, z.string().max(4000).optional()),
  notes: z.preprocess(emptyStrToUndefined, z.string().max(16000).optional()),
  roomLabel: z.preprocess(emptyStrToUndefined, z.union([z.string().max(64), z.null()]).optional()),
  physicianAssignedUserId: z.preprocess(
    emptyStrToUndefined,
    z.union([z.string().uuid(), z.null()]).optional()
  ),
  providerId: z.preprocess(emptyStrToUndefined, z.union([z.string().uuid(), z.null()]).optional()),
});

export type EncounterOutpatientCreateDto = z.infer<
  typeof encounterOutpatientCreateDtoSchema
>;

/** Dossier d'admission depuis la consultation (MVP — une entrée par encounter) */
export const admissionSummaryFieldsSchema = z.object({
  admissionReason: z.string().max(4000).optional(),
  serviceUnit: z.string().max(512).optional(),
  admissionDiagnosis: z.string().max(4000).optional(),
  careLevel: z.string().max(256).optional(),
  conditionAtAdmission: z.string().max(8000).optional(),
  initialPlan: z.string().max(8000).optional(),
  /** Nom affiché du médecin responsable (MVP texte libre) */
  responsiblePhysicianName: z.string().max(256).optional(),
});

export type AdmissionSummaryFields = z.infer<typeof admissionSummaryFieldsSchema>;

/** Coded admission diagnoses — references existing encounter `Diagnosis` rows (no duplicate engine). */
export const admissionDiagnosesV1Schema = z.object({
  primaryDiagnosisId: z.string().uuid().nullable().optional(),
  secondaryDiagnosisIds: z.array(z.string().uuid()).max(20).optional().default([]),
  /** Denormalized display snapshot for chart/placement (code + description). */
  primaryDisplay: z.string().max(4000).optional().nullable(),
  secondaryDisplays: z.array(z.string().max(4000)).max(20).optional().default([]),
  clarificationText: z.string().max(4000).optional().nullable(),
});

export type AdmissionDiagnosesV1 = z.infer<typeof admissionDiagnosesV1Schema>;

/**
 * POST /encounters/:id/admission/decision — governed admission decision writer.
 * Preserves nested admissionSummaryJson keys (e.g. admissionCorrelation).
 * Does not close the ED encounter.
 */
/** D4A.2 / D4A.2.1 nested provenance packet — validated lightly; full shape in smartAdmissionPacketD4a2. */
export const admissionPacketV1DtoSchema = z
  .object({
    version: z.literal(1).optional(),
    admittingServiceCode: z.string().max(64).nullable().optional(),
    admittingServiceOtherClarification: z.string().max(1000).nullable().optional(),
    levelOfCareCode: z.string().max(64).nullable().optional(),
    levelOfCareOtherClarification: z.string().max(1000).nullable().optional(),
    requestedUnitCode: z.string().max(128).nullable().optional(),
    conditionStatus: z.string().max(64).nullable().optional(),
    fields: z.record(z.unknown()).optional(),
    structuredInitialPlan: z
      .object({
        items: z.array(z.record(z.unknown())).max(200).optional(),
      })
      .passthrough()
      .optional()
      .nullable(),
    certification: z.string().max(128).optional(),
  })
  .passthrough();

export const encounterAdmissionDecisionDtoSchema = z.object({
  mode: z.enum(["DRAFT", "SIGN"]).default("DRAFT"),
  admissionSummary: admissionSummaryFieldsSchema,
  admissionDiagnoses: admissionDiagnosesV1Schema.optional(),
  /** D4A.2 provenanced smart packet (nested; preserves correlation siblings). */
  admissionPacket: admissionPacketV1DtoSchema.optional().nullable(),
  /**
   * Placement destination type. When omitted, inferred from careLevel
   * (Observation → OBSERVATION, else INPATIENT).
   */
  requestedEncounterType: z.enum(["OBSERVATION", "INPATIENT"]).optional(),
  /** Optional unit code for placement (e.g. MS). */
  requestedUnitCode: z.string().max(128).optional().nullable(),
  clinicalPriority: z.string().max(256).optional().nullable(),
  /** D4A.2.1 — encounter.version for stale-write protection. */
  expectedVersion: z.number().int().nonnegative().optional(),
  /** Client idempotency key for repeated SIGN clicks (PHI-safe opaque string). */
  clientRequestId: z.string().max(128).optional().nullable(),
});

export type EncounterAdmissionDecisionDto = z.infer<typeof encounterAdmissionDecisionDtoSchema>;

/** Full Prisma `EncounterWorkflowState` (read model / responses). */
export const encounterWorkflowStateSchema = z.enum([
  "ARRIVED",
  "TRIAGE",
  "IN_TREATMENT",
  "RESULTS_PENDING",
  "DISPOSITION",
  "DISCHARGE_READY",
  "FINALIZED",
  "CLOSED",
]);

export type EncounterWorkflowStateDto = z.infer<typeof encounterWorkflowStateSchema>;

/** PATCH: `CLOSED` is set only by encounter close — not via generic update. */
export const encounterWorkflowTransitionSchema = z.enum([
  "ARRIVED",
  "TRIAGE",
  "IN_TREATMENT",
  "RESULTS_PENDING",
  "DISPOSITION",
  "DISCHARGE_READY",
  "FINALIZED",
]);

export const encounterUpdateDtoSchema = z.object({
  /** Explicit workflow transition; validated server-side against the state machine. */
  workflowState: encounterWorkflowTransitionSchema.optional(),
  visitReason: z.string().max(4000).optional().nullable(),
  chiefComplaint: z.string().max(4000).optional().nullable(),
  triageAcuity: z.number().int().min(1).max(5).optional().nullable(),
  vitals: vitalsSchema,
  notes: z.string().max(16000).optional().nullable(),
  /** Clinician impression; stored as providerNote */
  clinicianImpression: z.string().max(16000).optional().nullable(),
  providerNote: z.string().max(16000).optional().nullable(),
  treatmentPlan: z.string().max(32000).optional().nullable(),
  followUpDate: z.coerce.date().optional().nullable(),
  /** Structured nursing assessment (e.g. Évaluation infirmière sections) */
  nursingAssessment: z.any().optional().nullable(),
  /**
   * Frontend-controlled session marker for ER nursing reassessment column writes. When `true`,
   * the next material change to `nursingAssessment.erNursingReassessmentV1` opens a NEW
   * append-only column event (locks the prior session). When omitted / false, the backend
   * UPDATEs the most recent reassessment event row in place — i.e. continues the active
   * session — to avoid timeline spam from incremental bedside edits.
   */
  reassessmentNewSession: z.boolean().optional(),
  dischargeSummaryJson: z.any().optional().nullable(),
  /** Décision d'admission structurée (JSON) — `admittedAt` défini côté API à la 1re sauvegarde */
  admissionSummaryJson: z.any().optional().nullable(),
  /** U.S. billing — charge capture candidates (V1 JSON); no auto-final coding */
  billingCaptureJson: z.any().optional().nullable(),
  roomLabel: z.string().max(64).optional().nullable(),
  physicianAssignedUserId: z.string().uuid().optional().nullable(),
});

export type EncounterUpdateDto = z.infer<typeof encounterUpdateDtoSchema>;

/** Accueil / infirmière : salle et médecin attribué uniquement */
const emptyStrToNull = (v: unknown) => (v === "" ? null : v);

function preprocessEncounterRoomUnitCode(v: unknown): EncounterCareUnitCode | null | undefined {
  const normalized = normalizeEncounterRoomUnitCodeInput(emptyStrToNull(v));
  if (normalized !== undefined) return normalized;
  const raw = emptyStrToNull(v);
  if (raw === null || raw === undefined) return raw;
  return String(raw).trim().toUpperCase() as EncounterCareUnitCode;
}
export const encounterOperationalUpdateDtoSchema = z.object({
  roomLabel: z.preprocess(emptyStrToNull, z.union([z.string().max(64), z.null()]).optional()),
  physicianAssignedUserId: z.preprocess(
    emptyStrToNull,
    z.union([z.string().uuid(), z.null()]).optional()
  ),
  /**
   * Promotes an open EMERGENCY encounter with a saved admission packet to INPATIENT
   * (hospitalization board). Does not run on the first admission save from disposition.
   */
  confirmInpatientTransfer: z.boolean().optional(),
  confirmOccupiedRoomAssignment: z.boolean().optional(),
  roomOccupancyOverride: z
    .object({
      requestedRoom: z.string().max(64),
      acceptedRoom: z.string().max(64),
    })
    .optional(),
});

export type EncounterOperationalUpdateDto = z.infer<typeof encounterOperationalUpdateDtoSchema>;

/** K.10B.10 — lightweight room assignment from dashboards / MAR (no full chart). */
export const encounterRoomUpdateDtoSchema = z.object({
  room: z.preprocess(emptyStrToNull, z.union([z.string().max(64), z.null()]).optional()),
  unitCode: z.preprocess(
    preprocessEncounterRoomUnitCode,
    z
      .union([z.enum(ENCOUNTER_CARE_UNIT_CODES as unknown as [string, ...string[]]), z.null()])
      .optional()
  ),
  reason: z.preprocess(
    emptyStrToNull,
    z
      .union([z.enum(ENCOUNTER_ROOM_CHANGE_REASON_CODES as unknown as [string, ...string[]]), z.null()])
      .optional()
  ),
  reasonOther: z.preprocess(
    emptyStrToNull,
    z.union([z.string().trim().max(500), z.null()]).optional()
  ),
  confirmOccupiedRoomAssignment: z.boolean().optional(),
  roomOccupancyOverride: z
    .object({
      requestedRoom: z.string().max(64),
      acceptedRoom: z.string().max(64),
    })
    .optional(),
  confirmBedStatusOverride: z.boolean().optional(),
  bedStatusOverrideReasonCode: z.string().trim().max(64).optional(),
  bedStatusOverrideReasonText: z.string().trim().max(500).optional(),
});

export type EncounterRoomUpdateDto = z.infer<typeof encounterRoomUpdateDtoSchema>;

export const encounterDischargeFieldsSchema = z.object({
  disposition: z.string().max(4000).optional(),
  exitCondition: z.string().max(4000).optional(),
  dischargeInstructions: z.string().max(8000).optional(),
  medicationsGiven: z.string().max(8000).optional(),
  followUp: z.string().max(4000).optional(),
  returnIfWorse: z.string().max(4000).optional(),
  /** Destination du patient (domicile, famille, autre établissement, etc.) */
  patientDestination: z.string().max(4000).optional(),
  /** Libellé français (ex. Domicile, Transfert, Admission) — souvent choisi dans une liste */
  dischargeMode: z.string().max(256).optional(),
  /** S16A — structured patient-facing discharge instructions (JSON only, no DB migration). */
  dischargeDiagnosisSummary: z.string().max(4000).optional(),
  medicationInstructions: z.string().max(8000).optional(),
  returnPrecautions: z.string().max(4000).optional(),
  followUpInstructions: z.string().max(4000).optional(),
  activityInstructions: z.string().max(4000).optional(),
  woundCareInstructions: z.string().max(4000).optional(),
  workSchoolNote: z.string().max(2000).optional(),
  patientInstructionsGiven: z.boolean().optional(),
  instructionsGivenBy: z.string().max(256).optional(),
  /** ISO-8601 timestamp string */
  instructionsGivenAt: z.string().max(48).optional(),
  /** Phase 19Y — provider discharge documentation (JSON only). */
  patientLeftEdAt: z.string().max(48).optional(),
  providerDischargeDiagnosisRefs: z.array(z.record(z.string(), z.unknown())).max(32).optional(),
  /** Phase 19Y.1A — per-diagnosis provider discharge documentation cards. */
  providerDischargeDiagnosisDocs: z.array(z.record(z.string(), z.unknown())).max(32).optional(),
  providerDischargeFollowUps: z.array(z.record(z.string(), z.unknown())).max(16).optional(),
  providerDischargeMedicationLines: z.array(z.record(z.string(), z.unknown())).max(32).optional(),
  providerDischargeDocumentedAt: z.string().max(48).optional(),
  providerDischargeDocumentedByDisplayName: z.string().max(256).optional(),
  providerDischargeDocumentedByTitle: z.string().max(128).optional(),
});

export type EncounterDischargeFields = z.infer<typeof encounterDischargeFieldsSchema>;

/** Aligné sur Prisma `DischargeStatus` (Encounter.dischargeStatus). */
export const encounterDischargeStatusSchema = z.enum(["DISCHARGED", "AMA", "TRANSFERRED", "DECEASED"]);

export type EncounterDischargeStatus = z.infer<typeof encounterDischargeStatusSchema>;

export const encounterCloseDtoSchema = z.object({
  discharge: encounterDischargeFieldsSchema.optional(),
  /** Si la documentation est incomplète, doit être true pour autoriser la clôture (V1 — pas d’arrêt dur). */
  acknowledgeDeficiencies: z.boolean().optional(),
  /** S11 — forcer la clôture malgré les blocages sécurité disposition (contrôle explicite côté client). */
  acknowledgeDispositionSafety: z.boolean().optional(),
  /**
   * MEDUI.D4C.7F — acknowledge overridable pending clinical items (orders/results/follow-up).
   * Does not authorize non-overridable safety blockers (e.g. active infusion).
   */
  acknowledgePendingItems: z.boolean().optional(),
  acknowledgementVersion: z.string().trim().max(64).optional(),
  pendingItemsOverrideReason: z.string().trim().max(120).optional(),
  dischargeStatus: encounterDischargeStatusSchema.optional(),
  /**
   * MEDUI.D4C.7J — canonical advisory acknowledgement. Pending clinical work is advisory:
   * an authorized treating provider acknowledges it and closes. Nothing is completed,
   * cancelled, finalized, or administered by closing.
   */
  acknowledgePendingClinicalItems: z.boolean().optional(),
  acknowledgementReason: z.string().trim().max(240).optional(),
  /** Client-generated id so a repeated submission is recognizable in audit/observability. */
  clientRequestId: z.string().trim().max(64).optional(),
  /** Optimistic-concurrency guard: reject when the encounter changed under the provider. */
  expectedVersion: z.coerce.number().int().nonnegative().optional(),
});

export type EncounterCloseDto = z.infer<typeof encounterCloseDtoSchema>;

/**
 * MEDUI.D4C.7K — POST /encounters/:id/reopen
 * Administrative correction: restores OPEN; never erases the original close event.
 */
export const encounterReopenDtoSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Le motif de réouverture doit comporter au moins 3 caractères.")
    .max(500, "Le motif de réouverture est limité à 500 caractères."),
  reasonCode: z.string().trim().max(64).optional(),
  expectedVersion: z.coerce.number().int().nonnegative().optional(),
  clientRequestId: z.string().trim().max(64).optional(),
  facilityId: z.string().trim().uuid().optional(),
});

export type EncounterReopenDto = z.infer<typeof encounterReopenDtoSchema>;

/**
 * POST /encounters/:id/admission/cancel — clinical cancellation of a saved admission decision
 * (clears `admissionSummaryJson` + `admittedAt`). Reason is mandatory and persisted in the audit log.
 * No record is deleted; encounter status / type are not changed by this endpoint.
 */
export const encounterAdmissionCancelDtoSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(3, "Le motif d'annulation doit comporter au moins 3 caractères.")
    .max(500, "Le motif d'annulation est limité à 500 caractères."),
});

export type EncounterAdmissionCancelDto = z.infer<typeof encounterAdmissionCancelDtoSchema>;

/** POST /encounters/:id/close-check — même charge utile que la clôture pour fusionner le dossier de sortie. */
export const encounterCloseCheckDtoSchema = z.object({
  discharge: encounterDischargeFieldsSchema.optional(),
  dischargeStatus: encounterDischargeStatusSchema.optional(),
});

export type EncounterCloseCheckDto = z.infer<typeof encounterCloseCheckDtoSchema>;

export type EncounterCloseDocumentationCheckResult = {
  hasDeficiencies: boolean;
  deficiencies: Array<{ code: string; labelFr: string }>;
};

/** GET /encounters/:id/disposition-readiness (S11). */
export type DispositionSafetyIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
};

export type DispositionSafetyReadinessResponse = {
  canClose: boolean;
  blockers: DispositionSafetyIssue[];
  warnings: DispositionSafetyIssue[];
  lastVitalsAt?: string;
  activeOrderCounts: { lab: number; imaging: number; medication: number; care: number };
};

export const orderStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderPrioritySchema = z.enum(["ROUTINE", "URGENT", "STAT"]);
export type OrderPriority = z.infer<typeof orderPrioritySchema>;

/** Single line item for POST /encounters/:id/orders — persisted fields depend on order `type` (service strips Rx-only fields for LAB/IMAGING). */
export const medicationFulfillmentIntentSchema = z.enum(["ADMINISTER_CHART", "PHARMACY_DISPENSE"]);
export type MedicationFulfillmentIntent = z.infer<typeof medicationFulfillmentIntentSchema>;
export const medicationRouteSchema = z.enum(MEDICATION_ORDER_ROUTES);
export type MedicationRoute = z.infer<typeof medicationRouteSchema>;

/** Accept catalog/UI aliases (IV, intraveineuse, IV push) before enum validation. */
function preprocessMedicationOrderRoute(v: unknown): MedicationOrderRoute | undefined {
  if (v === "" || v === null || v === undefined) return undefined;
  return normalizeMedicationRoute(String(v)) ?? undefined;
}
export const orderSourceSchema = z.enum(["PROVIDER_ORDER", "VERBAL_ORDER", "NURSING_PROTOCOL"]);
export type OrderSource = z.infer<typeof orderSourceSchema>;

export const orderItemCreateDtoSchema = z.object({
  /** Absent ou null si saisie manuelle (`manualLabel` requis). */
  catalogItemId: z.string().uuid().optional().nullable(),
  catalogItemType: z.enum(["LAB_TEST", "IMAGING_STUDY", "MEDICATION", "CARE"]),
  /** Libellé libre lorsque l’article n’est pas au catalogue. */
  manualLabel: z.string().min(1).max(512).optional(),
  /**
   * Snapshot libellé affiché (ex. client hors-ligne) — non persisté en base ; ignoré côté API à l’écriture Prisma.
   * Accepté pour les lignes catalogue LAB / IMAGING afin que la file d’attente locale affiche le nom exact.
   */
  displayLabelFr: z.string().max(512).optional(),
  manualSecondaryText: z.string().max(2000).optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().max(8000).optional(),
  /** Prescription-only: ignored for LAB / IMAGING at persistence. */
  strength: z.string().max(512).optional(),
  /** MEDICATION only: structured route snapshot. */
  route: z.preprocess(preprocessMedicationOrderRoute, medicationRouteSchema.optional()),
  /** Prescription-only: ignored for LAB / IMAGING at persistence. */
  refillCount: z.number().int().min(0).max(99).optional(),
  /** MEDICATION only: default PHARMACY_DISPENSE when omitted (server). */
  medicationFulfillmentIntent: medicationFulfillmentIntentSchema.optional(),
  /** MEDICATION only: horaire d’administration prévu (optionnel). */
  intendedAdministrationAt: z.coerce.date().optional().nullable(),
  /** MEDICATION only (M1.8B.7A.1): structured frequency; null/absent = legacy direct MAR. */
  frequencyCode: medicationFrequencyCodeSchema.optional().nullable(),
  /**
   * CARE only (MEDPROC.2): canonical enterprise procedure catalog id.
   * manualLabel remains localized display snapshot — not billing/reporting identity.
   */
  enterpriseProcedureId: z.string().max(128).optional(),
});

export type OrderItemCreateDto = z.infer<typeof orderItemCreateDtoSchema>;

export const orderCreateDtoSchema = z
  .object({
    type: z.enum(["LAB", "IMAGING", "MEDICATION", "CARE"]),
    priority: orderPrioritySchema.optional(),
    notes: z.string().max(16000).optional(),
    prescriberName: z.string().max(256).optional(),
    prescriberLicense: z.string().max(128).optional(),
    prescriberContact: z.string().max(256).optional(),
    orderSource: orderSourceSchema.optional(),
    readbackConfirmed: z.boolean().optional(),
    protocolName: z.string().max(256).optional(),
    /** Observation template apply: stable line id when one CARE order is created per template row. */
    observationTemplateItemId: z.string().max(128).optional(),
    /** Observation template apply: correlates sibling single-line orders from one apply action. */
    observationTemplateGroupId: z.string().max(128).optional(),
    /** Explicit clinician acknowledgment when allergy-related documentation exists (server-enforced for MEDICATION orders). */
    safetyAcknowledgedMedicationAllergies: z.boolean().optional(),
    /** Enterprise order set provenance (Create Order modal apply → per-domain submit). */
    enterpriseOrderSetProvenance: enterpriseOrderSetProvenanceSchema.optional(),
    items: z.array(orderItemCreateDtoSchema).min(1),
  })
  .superRefine((data, ctx) => {
    data.items.forEach((it, i) => {
      const enterpriseValidation = validateEnterpriseProcedureIdForOrderItem({
        orderType: data.type,
        catalogItemType: it.catalogItemType,
        enterpriseProcedureId: it.enterpriseProcedureId,
      });
      if (!enterpriseValidation.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: enterpriseValidation.message,
          path: ["items", i, "enterpriseProcedureId"],
        });
      }
      const hasCatalog = Boolean(it.catalogItemId);
      const hasManual = Boolean(it.manualLabel?.trim());
      if (!hasCatalog && !hasManual) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Chaque ligne doit référencer le catalogue ou un libellé manuel.",
          path: ["items", i, "manualLabel"],
        });
      }
      if (hasCatalog && hasManual) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ne pas combiner catalogue et libellé manuel sur la même ligne.",
          path: ["items", i, "manualLabel"],
        });
      }
    });
    if (data.type === "LAB") {
      data.items.forEach((it, i) => {
        if (it.catalogItemType !== "LAB_TEST") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Chaque ligne doit être une analyse (LAB_TEST).",
            path: ["items", i, "catalogItemType"],
          });
        }
        if (it.route) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La voie est réservée aux lignes médicament.",
            path: ["items", i, "route"],
          });
        }
      });
      return;
    }
    if (data.type === "IMAGING") {
      data.items.forEach((it, i) => {
        if (it.catalogItemType !== "IMAGING_STUDY") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Chaque ligne doit être un examen d'imagerie (IMAGING_STUDY).",
            path: ["items", i, "catalogItemType"],
          });
        }
        if (it.route) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La voie est réservée aux lignes médicament.",
            path: ["items", i, "route"],
          });
        }
      });
      return;
    }
    if (data.type === "CARE") {
      data.items.forEach((it, i) => {
        if (it.catalogItemType !== "CARE") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Chaque ligne doit être un soin (CARE).",
            path: ["items", i, "catalogItemType"],
          });
        }
        if (!it.manualLabel?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Libellé requis pour chaque ligne de soin.",
            path: ["items", i, "manualLabel"],
          });
        }
        if (it.route) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La voie est réservée aux lignes médicament.",
            path: ["items", i, "route"],
          });
        }
      });
      return;
    }
    if (data.orderSource !== "NURSING_PROTOCOL" && !data.prescriberName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le prescripteur est requis pour une ordonnance.",
        path: ["prescriberName"],
      });
    }
    data.items.forEach((it, i) => {
      if (it.catalogItemType !== "MEDICATION") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Chaque ligne doit être un médicament (MEDICATION).",
          path: ["items", i, "catalogItemType"],
        });
        return;
      }
      if (it.quantity == null || it.quantity < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La quantité est requise pour chaque médicament.",
          path: ["items", i, "quantity"],
        });
      }
    });
  });

/** Inferred from `orderCreateDtoSchema` — canonical API shape for order creation. */
export type OrderCreateDto = z.infer<typeof orderCreateDtoSchema>;

/** Alias matching API docs / frontend naming. */
export type CreateOrderDto = OrderCreateDto;

export const orderUpdateDtoSchema = z.object({
  status: orderStatusSchema.optional(),
  priority: orderPrioritySchema.optional(),
  notes: z.string().optional().nullable(),
});

export type OrderUpdateDto = z.infer<typeof orderUpdateDtoSchema>;

/** Motifs prédéfinis pour annulation de commande entière (V1 — pas de champ auteur manuel). */
export const ORDER_CANCELLATION_REASON_VALUES = [
  "Erreur de saisie",
  "Doublon",
  "Changement clinique",
  "Demande annulée",
  "Autre",
] as const;

export const orderCancelDtoSchema = z.object({
  cancellationReason: z.enum(ORDER_CANCELLATION_REASON_VALUES, {
    errorMap: () => ({ message: "Motif d'annulation invalide." }),
  }),
  /** Optional non-PHI context; stored in OrderEvent/audit metadata only (not Order row). */
  cancellationDetails: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().trim().max(500).optional()
  ),
});

export type OrderCancelDto = z.infer<typeof orderCancelDtoSchema>;

/** POST /encounters/:encounterId/medication-administrations — append-only MAR log. */
export const medicationAdministrationCreateDtoSchema = z.object({
  orderItemId: z.string().uuid().optional(),
  /** Clinical outcome from MAR modal; defaults to administered when omitted (legacy clients). */
  marAction: marClinicalActionSchema.optional(),
  administeredAt: z.coerce.date().optional(),
  /// Route at administration (IV, IM, SQ, PO, etc.); optional, preferred for billing CPT inference over catalog.
  route: z.preprocess(emptyStrToUndefined, z.string().trim().max(128).optional()),
  /// ER-3: administration dose value.
  doseValue: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().finite().nonnegative().optional()
  ),
  /// ER-3: administration dose unit (mg, mL, unit, each, etc.).
  doseUnit: z.preprocess(emptyStrToUndefined, z.string().trim().max(32).optional()),
  /// ER-3: administered quantity (clinical).
  administeredQuantity: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().finite().nonnegative().optional()
  ),
  /// ER-3: explicit billing quantity if known at capture time.
  billingQuantity: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().finite().nonnegative().optional()
  ),
  /// ER-3: quantity unit (tablet, mL, vial, each, etc.).
  quantityUnit: z.preprocess(emptyStrToUndefined, z.string().trim().max(32).optional()),
  /// ER-3: optional NDC string (accepted formats normalized server-side).
  ndc: z.preprocess(emptyStrToUndefined, z.string().trim().max(64).optional()),
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
  /** IM administration site (required server-side when marAction=administered and route is IM). */
  injectionSite: z.preprocess(
    emptyStrToUndefined,
    z.enum(imInjectionSiteValues).optional()
  ),
  /** K.10B.7 — structured PRN reason when administering PRN medication. */
  prnReasonCode: z.preprocess(
    emptyStrToUndefined,
    z.enum(MAR_PRN_REASON_CODES).optional()
  ),
  /** K.10B.7 — free-text when prnReasonCode is other. */
  prnReasonOther: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  /** K.10B.7 — pain score 0–10 for pain PRN medications. */
  painScore: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).max(10).optional()
  ),
  /** K.10B.7 — optional pain location for pain PRN. */
  painLocation: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
  /** K.10B.7 — optional reassessment reminder (clinical flag at capture). */
  prnReassessReminder: z.boolean().optional(),
  /** Required when documented allergies exist on the visit and MAR outcome is administered (server-enforced). */
  safetyAcknowledgedMedicationAllergies: z.boolean().optional(),
  /** Phase 15F-B: optional clinical administration time at create (ISO-8601 UTC); `administeredAt` stays documented time. */
  effectiveAdministeredAt: z.preprocess(emptyStrToUndefined, z.string().trim().optional()),
  effectiveAdministeredAtReason: z.preprocess(emptyStrToUndefined, z.string().max(500).optional()),
  /** M1.3F.4 — witness user id (facility staff) when controlled substance requires witness. */
  witnessUserId: z.preprocess(emptyStrToUndefined, z.string().uuid().optional()),
  /** M1.3F.4 — witness display name when staff directory id is unavailable. */
  witnessDisplayName: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
  /** M1.3F.4 — controlled-substance waste amount (partial dose / discard). */
  wasteAmount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().finite().nonnegative().optional()
  ),
  wasteUnit: z.preprocess(emptyStrToUndefined, z.string().trim().max(32).optional()),
  wasteReason: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  wasteWitnessUserId: z.preprocess(emptyStrToUndefined, z.string().uuid().optional()),
  /** M1.3F.4 — required when administering controlled med without witness. */
  overrideReason: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  controlledOverrideAcknowledged: z.boolean().optional(),
  /** M1.3F.5 — second verifier user id for high-alert double-check. */
  highAlertVerifierUserId: z.preprocess(emptyStrToUndefined, z.string().uuid().optional()),
  /** M1.3F.5 — verifier display name when staff directory id is unavailable. */
  highAlertVerifierDisplayName: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
  /** M1.3F.5 — required when administering high-alert med without double-check verifier. */
  highAlertOverrideReason: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  highAlertOverrideAcknowledged: z.boolean().optional(),
  /** M1.3F.5 — optional hint: INDEPENDENT_DOUBLE_CHECK | DUAL_VERIFICATION | COSIGN */
  highAlertVerificationType: z.preprocess(
    emptyStrToUndefined,
    z.enum(["INDEPENDENT_DOUBLE_CHECK", "DUAL_VERIFICATION", "COSIGN"]).optional()
  ),
  /** M1.3F.6 — LASA warning acknowledged at MAR. */
  lasaAcknowledged: z.boolean().optional(),
  /** M1.3F.6 — confirms correct medication selected (LASA). */
  lasaMedicationSelectionConfirmed: z.boolean().optional(),
  lasaSecondReadUserId: z.preprocess(emptyStrToUndefined, z.string().uuid().optional()),
  lasaSecondReadDisplayName: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
  lasaOverrideReason: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  lasaOverrideAcknowledged: z.boolean().optional(),
  /** M1.3F.7 — override when pharmacy verification not VERIFIED. */
  pharmacyVerificationOverrideReason: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  pharmacyVerificationOverrideAcknowledged: z.boolean().optional(),
  /** M1.8B.7I.2 — optional dose instance gate for recurring scheduled MAR. */
  medicationDoseInstanceId: z.preprocess(emptyStrToUndefined, z.string().uuid().optional()),
  /** K.10B.9A — structured early/late schedule timing reason (optional; notes prefix also accepted). */
  scheduleTimingReasonCode: z.preprocess(emptyStrToUndefined, z.string().trim().max(64).optional()),
  scheduleTimingReasonText: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  /** K.10B.9A — structured missed-dose reason (optional; Missed: notes prefix also accepted). */
  missedReasonCode: z.preprocess(emptyStrToUndefined, z.string().trim().max(64).optional()),
  missedReasonText: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
});

export type MedicationAdministrationCreateDto = z.infer<typeof medicationAdministrationCreateDtoSchema>;

/** POST /orders/items/:id/infusion/start — IVPB infusion start note (manual action only). */
export const medicationInfusionStartDtoSchema = z.object({
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
  /** M1.8B.7J.3 — optional explicit IVPB_SESSION dose (auto-resolved when omitted). */
  medicationDoseInstanceId: z.preprocess(emptyStrToUndefined, z.string().uuid().optional()),
  /** M1.8B.7E.1 — second verifier for high-alert insulin/heparin IVPB START. */
  highAlertVerifierUserId: z.preprocess(emptyStrToUndefined, z.string().uuid().optional()),
  highAlertVerifierDisplayName: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
  highAlertOverrideReason: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  highAlertOverrideAcknowledged: z.boolean().optional(),
  /** Optional clinical start instant (defaults to server time at confirmation). */
  startedAt: z.coerce.date().optional(),
});

export type MedicationInfusionStartDto = z.infer<typeof medicationInfusionStartDtoSchema>;

/** POST /orders/items/:id/infusion/stop — IVPB infusion end (Phase 1 / H6C structured reason). */
export const medicationInfusionStopDtoSchema = z.object({
  stoppedAt: z.coerce.date().optional(),
  stopReasonCode: z
    .enum(MEDICATION_INFUSION_NURSE_STOP_REASON_CODES)
    .default("COMPLETED"),
  reasonDetail: z.preprocess(emptyStrToUndefined, z.string().max(500).optional()),
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
  /** M1.8B.7J.3 — optional explicit IVPB_SESSION dose (resolved from active session when omitted). */
  medicationDoseInstanceId: z.preprocess(emptyStrToUndefined, z.string().uuid().optional()),
  /** Passed through to MAR create when visit allergy documentation requires acknowledgment. */
  safetyAcknowledgedMedicationAllergies: z.boolean().optional(),
});

export type MedicationInfusionStopDto = z.infer<typeof medicationInfusionStopDtoSchema>;

/** POST /orders/items/:id/infusion/rate-change — continuous infusion rate change (MEDUI pulmonary/infusion completion). */
export const medicationInfusionRateChangeDtoSchema = z.object({
  actionAt: z.coerce.date().optional(),
  currentRate: z.preprocess(emptyStrToUndefined, z.string().trim().max(120)),
  previousRate: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
  rateChangeReason: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
  titrationGoalType: z.preprocess(emptyStrToUndefined, z.string().trim().max(64).optional()),
  titrationGoalValueBefore: z.preprocess(emptyStrToUndefined, z.string().trim().max(64).optional()),
  titrationGoalValueAfter: z.preprocess(emptyStrToUndefined, z.string().trim().max(64).optional()),
  titrationGoalTarget: z.preprocess(emptyStrToUndefined, z.string().trim().max(64).optional()),
});

export type MedicationInfusionRateChangeDto = z.infer<typeof medicationInfusionRateChangeDtoSchema>;

/** POST /orders/items/:id/infusion/pause|restart — continuous infusion pause/restart. */
export const medicationInfusionPauseRestartDtoSchema = z.object({
  actionAt: z.coerce.date().optional(),
  reason: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
});

export type MedicationInfusionPauseRestartDto = z.infer<typeof medicationInfusionPauseRestartDtoSchema>;

/** POST /orders/items/:id/infusion/bag-change|pump-change|line-change — device changes (MEDUI infusion runtime). */
export const medicationInfusionDeviceChangeDtoSchema = z.object({
  actionAt: z.coerce.date().optional(),
  reason: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
  previousValue: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
  newValue: z.preprocess(emptyStrToUndefined, z.string().trim().max(120).optional()),
});

export type MedicationInfusionDeviceChangeDto = z.infer<typeof medicationInfusionDeviceChangeDtoSchema>;

/** POST /orders/items/:id/fluid/start — continuous IV fluid start (K.10B.8). */
export const continuousFluidStartDtoSchema = z.object({
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
  startedAt: z.coerce.date().optional(),
  bagSizeMl: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().positive().optional()
  ),
});

export type ContinuousFluidStartDto = z.infer<typeof continuousFluidStartDtoSchema>;

/** POST /orders/items/:id/fluid/pause|resume — continuous IV fluid pause/resume (K.10B.8). */
export const continuousFluidPauseResumeDtoSchema = z.object({
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
  actionAt: z.coerce.date().optional(),
});

export type ContinuousFluidPauseResumeDto = z.infer<typeof continuousFluidPauseResumeDtoSchema>;

/** POST /orders/items/:id/fluid/stop — continuous IV fluid stop (K.10B.8). */
export const continuousFluidStopDtoSchema = z.object({
  stoppedAt: z.coerce.date().optional(),
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
});

export type ContinuousFluidStopDto = z.infer<typeof continuousFluidStopDtoSchema>;

/** POST /orders/items/:id/fluid/bolus/start — IV fluid bolus start (K.10B.8A). */
export const fluidBolusStartDtoSchema = z.object({
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
  startedAt: z.coerce.date().optional(),
  bolusVolumeMl: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().positive().optional()
  ),
});

export type FluidBolusStartDto = z.infer<typeof fluidBolusStartDtoSchema>;

/** POST /orders/items/:id/fluid/bolus/complete — IV fluid bolus complete (K.10B.8A). */
export const fluidBolusCompleteDtoSchema = z.object({
  completedAt: z.coerce.date().optional(),
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
});

export type FluidBolusCompleteDto = z.infer<typeof fluidBolusCompleteDtoSchema>;

/** POST /encounters/:id/provider-addenda — append-only after signed provider documentation (V1). */
export const encounterProviderAddendumCreateDtoSchema = z.object({
  text: z.string().trim().min(1).max(5000),
});

export type EncounterProviderAddendumCreateDto = z.infer<typeof encounterProviderAddendumCreateDtoSchema>;

/** POST /encounters/:id/sign-provider-documentation — explicit provider legal attestation. */
export const encounterProviderDocumentationSignDtoSchema = z.object({
  attestationAccepted: z.literal(true),
});

export type EncounterProviderDocumentationSignDto = z.infer<
  typeof encounterProviderDocumentationSignDtoSchema
>;

/** POST /encounters/:id/unlock-provider-documentation — provider/admin only; audited (metadata on ENCOUNTER_UPDATE). */
export const encounterProviderDocumentationUnlockDtoSchema = z.object({
  reason: z.preprocess(emptyStrToUndefined, z.string().trim().max(2000).optional()),
});

export type EncounterProviderDocumentationUnlockDto = z.infer<
  typeof encounterProviderDocumentationUnlockDtoSchema
>;

/** POST /encounters/:id/provider-handoff — append-only EncounterClinicalEvent HANDOFF_PROVIDER. */
export const encounterProviderHandoffCreateDtoSchema = z.object({
  toUserId: z.string().uuid(),
  reportGivenAt: z.union([z.string().max(48), z.null()]).optional(),
  notes: z.union([z.string().max(4000), z.null()]).optional(),
});

export type EncounterProviderHandoffCreateDto = z.infer<typeof encounterProviderHandoffCreateDtoSchema>;

/** POST /encounters/:id/iv-access/insert — append-only IV_INSERTED (S13). */
export const encounterIvAccessInsertDtoSchema = z.object({
  site: z.string().trim().min(1).max(240),
  gauge: z.string().trim().min(1).max(80),
  insertedAt: z.preprocess(emptyStrToUndefined, z.string().trim().max(48).optional()),
  notes: z.preprocess(emptyStrToUndefined, z.string().trim().max(4000).optional()),
});

export type EncounterIvAccessInsertDto = z.infer<typeof encounterIvAccessInsertDtoSchema>;

/** POST /encounters/:id/iv-access/:eventId/remove — append-only IV_REMOVED; eventId = insertion event. */
export const encounterIvAccessRemoveDtoSchema = z.object({
  removedAt: z.preprocess(emptyStrToUndefined, z.string().trim().max(48).optional()),
  reason: z.preprocess(emptyStrToUndefined, z.string().trim().max(500).optional()),
  notes: z.preprocess(emptyStrToUndefined, z.string().trim().max(4000).optional()),
});

export type EncounterIvAccessRemoveDto = z.infer<typeof encounterIvAccessRemoveDtoSchema>;

export {
  lacerationProcedureDocumentDtoSchema,
  type LacerationProcedureDocumentDto,
  LACERATION_SITE_VALUES,
  LACERATION_WOUND_LENGTH_VALUES,
  LACERATION_ANESTHESIA_VALUES,
  LACERATION_IRRIGATION_VALUES,
  LACERATION_CLOSURE_VALUES,
  LACERATION_SUTURES_VALUES,
  LACERATION_SITE_UI_VALUES,
  LACERATION_WOUND_LENGTH_UI_VALUES,
  LACERATION_ANESTHESIA_UI_VALUES,
  LACERATION_IRRIGATION_UI_VALUES,
  LACERATION_CLOSURE_UI_VALUES,
  LACERATION_SUTURES_UI_VALUES,
  isKnownLacerationSite,
  isKnownLacerationWoundLength,
  isKnownLacerationAnesthesia,
  isKnownLacerationIrrigation,
  isKnownLacerationClosure,
  isKnownLacerationSutures,
} from "./encounterProcedureLaceration.js";

export * from "./encounterProcedureDocument.js";

/** GET /roster/clinical-users — role filter for PROVIDER vs RN search. */
export const rosterClinicalUserRoleQuerySchema = z.enum(["PROVIDER", "RN"]);

export type RosterClinicalUserRoleQuery = z.infer<typeof rosterClinicalUserRoleQuerySchema>;

/** POST /patients/:id/break-glass/start — emergency chart access (audited, time-limited). */
export const breakGlassStartDtoSchema = z.object({
  reason: z.string().trim().min(10).max(4000),
  encounterId: z.preprocess(emptyStrToUndefined, z.union([z.string().uuid(), z.null()]).optional()),
});

export type BreakGlassStartDto = z.infer<typeof breakGlassStartDtoSchema>;

