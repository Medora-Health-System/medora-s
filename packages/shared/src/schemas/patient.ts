import { z } from "zod";

export const sexAtBirthSchema = z.enum(["M", "F", "X", "U"]);
export type SexAtBirth = z.infer<typeof sexAtBirthSchema>;

/** Inscription : envoyé par le client ; mappé côté API vers Prisma `SexAtBirth` + `PatientSex`. L’âge n’est jamais persisté. */
export const patientRegistrationSexSchema = z.enum(["HOMME", "FEMME", "AUTRE", "INCONNU"], {
  errorMap: () => ({ message: "Sexe invalide" }),
});

export const patientCreateDtoSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
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
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
});

export type PatientCreateDto = z.infer<typeof patientCreateDtoSchema>;

export const patientUpdateDtoSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dob: z.coerce.date().optional(),
  phone: z.string().min(5).max(32).optional().nullable(),
  email: z.string().email().optional().nullable(),
  sexAtBirth: sexAtBirthSchema.optional().nullable(),
  nationalId: z.string().min(3).max(64).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
});

export type PatientUpdateDto = z.infer<typeof patientUpdateDtoSchema>;

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

/** Corps JSON : `""` sur champs optionnels doit être traité comme absent (sinon `uuid` / contraintes Zod échouent). */
const emptyStrToUndefined = (v: unknown) => (v === "" ? undefined : v);

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

export const encounterUpdateDtoSchema = z.object({
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
  dischargeSummaryJson: z.any().optional().nullable(),
  /** Décision d'admission structurée (JSON) — `admittedAt` défini côté API à la 1re sauvegarde */
  admissionSummaryJson: z.any().optional().nullable(),
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
});

export type EncounterDischargeFields = z.infer<typeof encounterDischargeFieldsSchema>;

/** Aligné sur Prisma `DischargeStatus` (Encounter.dischargeStatus). */
export const encounterDischargeStatusSchema = z.enum(["DISCHARGED", "AMA", "TRANSFERRED", "DECEASED"]);

export type EncounterDischargeStatus = z.infer<typeof encounterDischargeStatusSchema>;

export const encounterCloseDtoSchema = z.object({
  discharge: encounterDischargeFieldsSchema.optional(),
  /** Si la documentation est incomplète, doit être true pour autoriser la clôture (V1 — pas d’arrêt dur). */
  acknowledgeDeficiencies: z.boolean().optional(),
  dischargeStatus: encounterDischargeStatusSchema.optional(),
});

export type EncounterCloseDto = z.infer<typeof encounterCloseDtoSchema>;

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

export const orderStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderPrioritySchema = z.enum(["ROUTINE", "URGENT", "STAT"]);
export type OrderPriority = z.infer<typeof orderPrioritySchema>;

/** Single line item for POST /encounters/:id/orders — persisted fields depend on order `type` (service strips Rx-only fields for LAB/IMAGING). */
export const medicationFulfillmentIntentSchema = z.enum(["ADMINISTER_CHART", "PHARMACY_DISPENSE"]);
export type MedicationFulfillmentIntent = z.infer<typeof medicationFulfillmentIntentSchema>;

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
      });
      return;
    }
    if (!data.prescriberName?.trim()) {
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
});

export type OrderCancelDto = z.infer<typeof orderCancelDtoSchema>;

/** POST /encounters/:encounterId/medication-administrations — append-only MAR log. */
export const medicationAdministrationCreateDtoSchema = z.object({
  orderItemId: z.string().uuid().optional(),
  administeredAt: z.coerce.date().optional(),
  notes: z.preprocess(emptyStrToUndefined, z.string().max(8000).optional()),
});

export type MedicationAdministrationCreateDto = z.infer<typeof medicationAdministrationCreateDtoSchema>;

/** POST /encounters/:id/provider-addenda — append-only after signed provider documentation (V1). */
export const encounterProviderAddendumCreateDtoSchema = z.object({
  text: z.string().trim().min(1).max(5000),
});

export type EncounterProviderAddendumCreateDto = z.infer<typeof encounterProviderAddendumCreateDtoSchema>;

