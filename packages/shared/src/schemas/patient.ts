import { z } from "zod";
import { marClinicalActionSchema } from "../mar/marClinicalAction.js";

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
});

export type EncounterOperationalUpdateDto = z.infer<typeof encounterOperationalUpdateDtoSchema>;

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
  dischargeStatus: encounterDischargeStatusSchema.optional(),
});

export type EncounterCloseDto = z.infer<typeof encounterCloseDtoSchema>;

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
export const medicationRouteSchema = z.enum(["PO", "IM", "IVP", "IVPB"]);
export type MedicationRoute = z.infer<typeof medicationRouteSchema>;
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
  route: medicationRouteSchema.optional(),
  /** Prescription-only: ignored for LAB / IMAGING at persistence. */
  refillCount: z.number().int().min(0).max(99).optional(),
  /** MEDICATION only: default PHARMACY_DISPENSE when omitted (server). */
  medicationFulfillmentIntent: medicationFulfillmentIntentSchema.optional(),
  /** MEDICATION only: horaire d’administration prévu (optionnel). */
  intendedAdministrationAt: z.coerce.date().optional().nullable(),
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
    /** Explicit clinician acknowledgment when allergy-related documentation exists (server-enforced for MEDICATION orders). */
    safetyAcknowledgedMedicationAllergies: z.boolean().optional(),
    items: z.array(orderItemCreateDtoSchema).min(1),
  })
  .superRefine((data, ctx) => {
    data.items.forEach((it, i) => {
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
  /** Required when documented allergies exist on the visit and MAR outcome is administered (server-enforced). */
  safetyAcknowledgedMedicationAllergies: z.boolean().optional(),
});

export type MedicationAdministrationCreateDto = z.infer<typeof medicationAdministrationCreateDtoSchema>;

/** POST /orders/items/:id/infusion/stop — IVPB infusion end (Phase 1). */
export const medicationInfusionStopDtoSchema = z.object({
  stoppedAt: z.coerce.date().optional(),
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
  /** Passed through to MAR create when visit allergy documentation requires acknowledgment. */
  safetyAcknowledgedMedicationAllergies: z.boolean().optional(),
});

export type MedicationInfusionStopDto = z.infer<typeof medicationInfusionStopDtoSchema>;

/** POST /encounters/:id/provider-addenda — append-only after signed provider documentation (V1). */
export const encounterProviderAddendumCreateDtoSchema = z.object({
  text: z.string().trim().min(1).max(5000),
});

export type EncounterProviderAddendumCreateDto = z.infer<typeof encounterProviderAddendumCreateDtoSchema>;

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

