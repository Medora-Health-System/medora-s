import { z } from "zod";
import {
  clinicalDocYesNo,
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";

export const BELONGINGS_INVENTORY_CARD_ID = "belongings_inventory" as const;
export const VALUABLES_INVENTORY_CARD_ID = "valuables_inventory" as const;
export const BELONGINGS_SECURED_BAGGED_CARD_ID = "belongings_secured_bagged" as const;
export const BELONGINGS_TRANSFER_SECURITY_CARD_ID = "belongings_transfer_security" as const;
export const BELONGINGS_RELEASE_REPRESENTATIVE_CARD_ID = "belongings_release_representative" as const;
export const BELONGINGS_RETURN_PATIENT_CARD_ID = "belongings_return_patient" as const;
export const BELONGINGS_ALTERED_PATIENT_CARD_ID = "belongings_altered_patient" as const;

export const EDOC9_BELONGINGS_VALUABLES_DOCUMENTATION_CARD_IDS = [
  BELONGINGS_INVENTORY_CARD_ID,
  VALUABLES_INVENTORY_CARD_ID,
  BELONGINGS_SECURED_BAGGED_CARD_ID,
  BELONGINGS_TRANSFER_SECURITY_CARD_ID,
  BELONGINGS_RELEASE_REPRESENTATIVE_CARD_ID,
  BELONGINGS_RETURN_PATIENT_CARD_ID,
  BELONGINGS_ALTERED_PATIENT_CARD_ID,
] as const;

export type Edoc9BelongingsValuablesDocumentationCardId =
  (typeof EDOC9_BELONGINGS_VALUABLES_DOCUMENTATION_CARD_IDS)[number];

const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const optionalNotes = z.string().trim().max(2000).optional();
const itemLine = z.string().trim().min(1).max(120);
const itemList = z.array(itemLine).max(40);
const bagId = z.string().trim().min(1).max(80);
const personName = z.string().trim().min(1).max(120);
const shortText = z.string().trim().min(1).max(500);
const cashAmountText = z.string().trim().min(1).max(40);

export const BELONGINGS_STORAGE_LOCATION_VALUES = [
  "WITH_PATIENT",
  "ED_LOCKER",
  "SECURITY",
  "FAMILY",
  "OTHER",
] as const;

export const BELONGINGS_RELEASE_REASON_VALUES = [
  "PATIENT_REQUEST",
  "PATIENT_INCAPACITATED",
  "DISCHARGE_PLANNING",
  "TRANSFER",
  "OTHER",
] as const;

export const BELONGINGS_ALTERED_PATIENT_CONDITION_VALUES = [
  "UNCONSCIOUS",
  "ALTERED_MENTAL_STATUS",
  "INTOXICATED",
  "SEDATED",
  "MINOR_WITHOUT_GUARDIAN",
  "OTHER",
] as const;

export const BELONGINGS_RECIPIENT_RELATIONSHIP_VALUES = [
  "SPOUSE",
  "PARENT",
  "CHILD",
  "SIBLING",
  "GUARDIAN",
  "FRIEND",
  "OTHER",
] as const;

export const BELONGINGS_STORAGE_LOCATION_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof BELONGINGS_STORAGE_LOCATION_VALUES)[number]
>[] = [
  { value: "WITH_PATIENT", labelEn: "With patient", labelFr: "Avec le patient" },
  { value: "ED_LOCKER", labelEn: "ED locker", labelFr: "Casier urgences" },
  { value: "SECURITY", labelEn: "Security", labelFr: "Sécurité" },
  { value: "FAMILY", labelEn: "Family", labelFr: "Famille" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const BELONGINGS_RELEASE_REASON_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof BELONGINGS_RELEASE_REASON_VALUES)[number]
>[] = [
  { value: "PATIENT_REQUEST", labelEn: "Patient request", labelFr: "Demande du patient" },
  {
    value: "PATIENT_INCAPACITATED",
    labelEn: "Patient incapacitated",
    labelFr: "Patient incapacité",
  },
  {
    value: "DISCHARGE_PLANNING",
    labelEn: "Discharge planning",
    labelFr: "Plan de sortie",
  },
  { value: "TRANSFER", labelEn: "Transfer", labelFr: "Transfert" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const BELONGINGS_ALTERED_CONDITION_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof BELONGINGS_ALTERED_PATIENT_CONDITION_VALUES)[number]
>[] = [
  { value: "UNCONSCIOUS", labelEn: "Unconscious", labelFr: "Inconscient" },
  {
    value: "ALTERED_MENTAL_STATUS",
    labelEn: "Altered mental status",
    labelFr: "État mental altéré",
  },
  { value: "INTOXICATED", labelEn: "Intoxicated", labelFr: "Intoxication" },
  { value: "SEDATED", labelEn: "Sedated", labelFr: "Sédation" },
  {
    value: "MINOR_WITHOUT_GUARDIAN",
    labelEn: "Minor without guardian",
    labelFr: "Mineur sans tuteur",
  },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

export const BELONGINGS_RECIPIENT_RELATIONSHIP_OPTIONS: ClinicalDocumentationFieldOption<
  (typeof BELONGINGS_RECIPIENT_RELATIONSHIP_VALUES)[number]
>[] = [
  { value: "SPOUSE", labelEn: "Spouse", labelFr: "Conjoint(e)" },
  { value: "PARENT", labelEn: "Parent", labelFr: "Parent" },
  { value: "CHILD", labelEn: "Child", labelFr: "Enfant" },
  { value: "SIBLING", labelEn: "Sibling", labelFr: "Frère / sœur" },
  { value: "GUARDIAN", labelEn: "Guardian", labelFr: "Tuteur" },
  { value: "FRIEND", labelEn: "Friend", labelFr: "Ami(e)" },
  { value: "OTHER", labelEn: "Other", labelFr: "Autre" },
];

const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/;
/** EDOC.9A — labeled undashed SSN (e.g. "SSN 123456789", "Social Security Number 123456789"). */
const SSN_LABELED_UNDASHED_PATTERN = /\bSSN\s*[:#]?\s*\d{9}\b/i;
const SOCIAL_SECURITY_LABELED_PATTERN =
  /\bSocial\s+Security(?:\s+Number)?\s*[:#]?\s*\d{9}\b/i;
const CARD_LIKE_PATTERN = /\b(?:\d[ -]*){15,19}\d\b/;
const CARD_DIGIT_RUN_PATTERN = /\b\d{13,19}\b/;
const BANK_ACCOUNT_PATTERN = /\b(routing|account)\s*(number|#)?\s*[:#]?\s*\d{6,}\b/i;

export function detectSensitiveIdentifierInText(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) return null;
  if (
    SSN_PATTERN.test(t) ||
    SSN_LABELED_UNDASHED_PATTERN.test(t) ||
    SOCIAL_SECURITY_LABELED_PATTERN.test(t)
  ) {
    return "SSN pattern not allowed";
  }
  const compact = t.replace(/\s/g, "");
  const digitsOnly = t.replace(/\D/g, "");
  if (
    CARD_LIKE_PATTERN.test(compact) ||
    CARD_DIGIT_RUN_PATTERN.test(compact) ||
    (digitsOnly.length >= 13 && digitsOnly.length <= 19)
  ) {
    return "Full payment card number not allowed";
  }
  if (BANK_ACCOUNT_PATTERN.test(t)) return "Bank account details not allowed";
  return null;
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectStrings(v, out);
    }
  }
}

export function assertBelongingsPayloadFreeOfSensitiveIdentifiers(
  payload: Record<string, unknown>
): void {
  const strings: string[] = [];
  collectStrings(payload, strings);
  for (const s of strings) {
    const err = detectSensitiveIdentifierInText(s);
    if (err) throw new Error(err);
  }
}

export const belongingsInventoryPayloadSchema = z
    .object({
      documentedAt: isoDateTimeString,
      patientAbleToParticipate: z.boolean(),
      clothingItems: itemList,
      personalItems: itemList,
      assistiveDevices: itemList,
      medicationsBroughtFromHome: z.boolean(),
      medicationDescription: z.string().trim().max(500).optional(),
      belongingsKeptWithPatient: z.boolean(),
      belongingsBagged: z.boolean(),
      bagIdentifier: z.string().trim().max(80).optional(),
      notes: optionalNotes,
    })
    .superRefine((data, ctx) => {
      if (data.belongingsBagged && !data.bagIdentifier?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bag identifier required when belongings bagged",
          path: ["bagIdentifier"],
        });
      }
    });

export const valuablesInventoryPayloadSchema = z
    .object({
      documentedAt: isoDateTimeString,
      cashPresent: z.boolean(),
      cashAmount: cashAmountText.optional(),
      jewelryPresent: z.boolean(),
      jewelryDescription: z.string().trim().max(500).optional(),
      electronicsPresent: z.boolean(),
      electronicsDescription: z.string().trim().max(500).optional(),
      walletOrPursePresent: z.boolean(),
      keysPresent: z.boolean(),
      identificationPresent: z.boolean(),
      otherValuablesDescription: z.string().trim().max(500).optional(),
      patientDeclinedValuablesInventory: z.boolean(),
      valuablesSecured: z.boolean(),
      securityBagIdentifier: z.string().trim().max(80).optional(),
      notes: optionalNotes,
    })
    .superRefine((data, ctx) => {
      if (data.cashPresent && !data.cashAmount?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cash amount required when cash present",
          path: ["cashAmount"],
        });
      }
      if (data.valuablesSecured && !data.securityBagIdentifier?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Security bag identifier required when valuables secured",
          path: ["securityBagIdentifier"],
        });
      }
    });

export const belongingsSecuredBaggedPayloadSchema = z
    .object({
      securedAt: isoDateTimeString,
      bagIdentifier: bagId,
      sealedByUserAcknowledged: z.boolean(),
      patientLabelApplied: z.boolean(),
      storageLocation: z.enum(BELONGINGS_STORAGE_LOCATION_VALUES),
      storageLocationOther: z.string().trim().max(200).optional(),
      witnessRequired: z.boolean(),
      notes: optionalNotes,
    })
    .superRefine((data, ctx) => {
      if (data.storageLocation === "OTHER" && !data.storageLocationOther?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Storage location detail required",
          path: ["storageLocationOther"],
        });
      }
    });

export const belongingsTransferSecurityPayloadSchema = z.object({
    transferredAt: isoDateTimeString,
    bagIdentifier: bagId,
    transferredByUserAcknowledged: z.boolean(),
    receivedBySecurityName: personName,
    securityReceiptNumber: z.string().trim().max(80).optional(),
    storageLocation: z.enum(BELONGINGS_STORAGE_LOCATION_VALUES),
    notes: optionalNotes,
  });

export const belongingsReleaseRepresentativePayloadSchema = z.object({
    releasedAt: isoDateTimeString,
    bagIdentifier: bagId,
    recipientName: personName,
    recipientRelationship: z.enum(BELONGINGS_RECIPIENT_RELATIONSHIP_VALUES),
    recipientPhone: z.string().trim().max(40).optional(),
    recipientIdChecked: z.boolean(),
    patientAuthorizedRelease: z.boolean(),
    releaseReason: z.enum(BELONGINGS_RELEASE_REASON_VALUES),
    notes: optionalNotes,
  });

export const belongingsReturnPatientPayloadSchema = z
    .object({
      returnedAt: isoDateTimeString,
      bagIdentifier: bagId,
      patientReceived: z.boolean(),
      patientUnableToSign: z.boolean(),
      discrepancyReported: z.boolean(),
      discrepancyDescription: z.string().trim().max(500).optional(),
      notes: optionalNotes,
    })
    .superRefine((data, ctx) => {
      if (data.discrepancyReported && !data.discrepancyDescription?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Discrepancy description required",
          path: ["discrepancyDescription"],
        });
      }
    });

export const belongingsAlteredPatientPayloadSchema = z
    .object({
      documentedAt: isoDateTimeString,
      patientCondition: z.enum(BELONGINGS_ALTERED_PATIENT_CONDITION_VALUES),
      belongingsInventoriedByTwoStaff: z.boolean(),
      bagIdentifier: bagId,
      valuablesPresent: z.boolean(),
      securityNotified: z.boolean(),
      securityReceiptNumber: z.string().trim().max(80).optional(),
      familyNotified: z.boolean(),
      notes: optionalNotes,
    })
    .superRefine((data, ctx) => {
      if (!data.belongingsInventoriedByTwoStaff) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Two-staff inventory required",
          path: ["belongingsInventoriedByTwoStaff"],
        });
      }
    });

const BELONGINGS_PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [BELONGINGS_INVENTORY_CARD_ID]: belongingsInventoryPayloadSchema,
  [VALUABLES_INVENTORY_CARD_ID]: valuablesInventoryPayloadSchema,
  [BELONGINGS_SECURED_BAGGED_CARD_ID]: belongingsSecuredBaggedPayloadSchema,
  [BELONGINGS_TRANSFER_SECURITY_CARD_ID]: belongingsTransferSecurityPayloadSchema,
  [BELONGINGS_RELEASE_REPRESENTATIVE_CARD_ID]: belongingsReleaseRepresentativePayloadSchema,
  [BELONGINGS_RETURN_PATIENT_CARD_ID]: belongingsReturnPatientPayloadSchema,
  [BELONGINGS_ALTERED_PATIENT_CARD_ID]: belongingsAlteredPatientPayloadSchema,
};

export function isEdoc9BelongingsValuablesDocumentationCardId(
  cardId: string
): cardId is Edoc9BelongingsValuablesDocumentationCardId {
  return (EDOC9_BELONGINGS_VALUABLES_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}

/** EDOC.9 — immediate witness when payload triggers chain-of-custody risk. */
export function requiresImmediateWitnessCaptureForBelongingsPayload(
  cardId: string,
  payload: Record<string, unknown>
): boolean {
  if (cardId === BELONGINGS_TRANSFER_SECURITY_CARD_ID) return true;
  if (cardId === BELONGINGS_ALTERED_PATIENT_CARD_ID) return true;

  if (cardId === VALUABLES_INVENTORY_CARD_ID) {
    const p = valuablesInventoryPayloadSchema.safeParse(payload);
    return p.success && p.data.valuablesSecured === true;
  }
  if (cardId === BELONGINGS_SECURED_BAGGED_CARD_ID) {
    const p = belongingsSecuredBaggedPayloadSchema.safeParse(payload);
    return p.success && p.data.witnessRequired === true;
  }
  if (cardId === BELONGINGS_RELEASE_REPRESENTATIVE_CARD_ID) {
    const p = belongingsReleaseRepresentativePayloadSchema.safeParse(payload);
    if (!p.success) return false;
    return (
      p.data.patientAuthorizedRelease === false ||
      p.data.releaseReason === "PATIENT_INCAPACITATED"
    );
  }
  if (cardId === BELONGINGS_RETURN_PATIENT_CARD_ID) {
    const p = belongingsReturnPatientPayloadSchema.safeParse(payload);
    if (!p.success) return false;
    return p.data.patientUnableToSign === true || p.data.discrepancyReported === true;
  }
  return false;
}

export function validateBelongingsValuablesPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const schema = BELONGINGS_PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  if (!schema) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const sensitiveIssue = parsed.error.issues.find((i) =>
      /card number|SSN|Bank account|Sensitive identifier/i.test(i.message)
    );
    return {
      ok: false,
      message: sensitiveIssue?.message ?? "Invalid clinical documentation payload",
    };
  }
  try {
    assertBelongingsPayloadFreeOfSensitiveIdentifiers(parsed.data as Record<string, unknown>);
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Sensitive identifier not allowed",
    };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

const STORAGE_EN: Record<string, string> = {
  WITH_PATIENT: "With patient",
  ED_LOCKER: "ED locker",
  SECURITY: "Security",
  FAMILY: "Family",
  OTHER: "Other",
};
const STORAGE_FR: Record<string, string> = {
  WITH_PATIENT: "Avec le patient",
  ED_LOCKER: "Casier urgences",
  SECURITY: "Sécurité",
  FAMILY: "Famille",
  OTHER: "Autre",
};

const RELEASE_REASON_EN: Record<string, string> = {
  PATIENT_REQUEST: "Patient request",
  PATIENT_INCAPACITATED: "Patient incapacitated",
  DISCHARGE_PLANNING: "Discharge planning",
  TRANSFER: "Transfer",
  OTHER: "Other",
};
const RELEASE_REASON_FR: Record<string, string> = {
  PATIENT_REQUEST: "Demande du patient",
  PATIENT_INCAPACITATED: "Patient incapacité",
  DISCHARGE_PLANNING: "Plan de sortie",
  TRANSFER: "Transfert",
  OTHER: "Autre",
};

const RELATIONSHIP_EN: Record<string, string> = {
  SPOUSE: "Spouse",
  PARENT: "Parent",
  CHILD: "Child",
  SIBLING: "Sibling",
  GUARDIAN: "Guardian",
  FRIEND: "Friend",
  OTHER: "Other",
};
const RELATIONSHIP_FR: Record<string, string> = {
  SPOUSE: "Conjoint(e)",
  PARENT: "Parent",
  CHILD: "Enfant",
  SIBLING: "Frère / sœur",
  GUARDIAN: "Tuteur",
  FRIEND: "Ami(e)",
  OTHER: "Autre",
};

const CONDITION_EN: Record<string, string> = {
  UNCONSCIOUS: "Unconscious",
  ALTERED_MENTAL_STATUS: "Altered mental status",
  INTOXICATED: "Intoxicated",
  SEDATED: "Sedated",
  MINOR_WITHOUT_GUARDIAN: "Minor without guardian",
  OTHER: "Other",
};
const CONDITION_FR: Record<string, string> = {
  UNCONSCIOUS: "Inconscient",
  ALTERED_MENTAL_STATUS: "État mental altéré",
  INTOXICATED: "Intoxication",
  SEDATED: "Sédation",
  MINOR_WITHOUT_GUARDIAN: "Mineur sans tuteur",
  OTHER: "Autre",
};

function listCountLabel(count: number, locale: ClinicalDocumentationSummaryLocale): string {
  return locale === "en" ? `${count} item(s)` : `${count} article(s)`;
}

export function summarizeBelongingsValuablesDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case BELONGINGS_INVENTORY_CARD_ID: {
      const p = belongingsInventoryPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Documented" : "Documenté",
          value: p.data.documentedAt,
        },
        {
          key: locale === "en" ? "Patient participated" : "Participation patient",
          value: clinicalDocYesNo(p.data.patientAbleToParticipate, locale),
        },
        {
          key: locale === "en" ? "Belongings bagged" : "Effets ensachés",
          value: clinicalDocYesNo(p.data.belongingsBagged, locale),
        },
        ...(p.data.bagIdentifier
          ? [
              {
                key: locale === "en" ? "Bag ID" : "N° sac",
                value: p.data.bagIdentifier,
              },
            ]
          : []),
        {
          key: locale === "en" ? "Kept with patient" : "Avec le patient",
          value: clinicalDocYesNo(p.data.belongingsKeptWithPatient, locale),
        },
        {
          key: locale === "en" ? "Clothing items" : "Vêtements",
          value: listCountLabel(p.data.clothingItems.length, locale),
        },
      ];
    }
    case VALUABLES_INVENTORY_CARD_ID: {
      const p = valuablesInventoryPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const lines: Array<{ key: string; value: string }> = [
        {
          key: locale === "en" ? "Documented" : "Documenté",
          value: p.data.documentedAt,
        },
        {
          key: locale === "en" ? "Cash present" : "Argent présent",
          value: clinicalDocYesNo(p.data.cashPresent, locale),
        },
        {
          key: locale === "en" ? "Jewelry present" : "Bijoux présents",
          value: clinicalDocYesNo(p.data.jewelryPresent, locale),
        },
        {
          key: locale === "en" ? "Electronics present" : "Électronique présente",
          value: clinicalDocYesNo(p.data.electronicsPresent, locale),
        },
        {
          key: locale === "en" ? "Wallet / purse" : "Portefeuille / sac",
          value: clinicalDocYesNo(p.data.walletOrPursePresent, locale),
        },
        {
          key: locale === "en" ? "Valuables secured" : "Objets de valeur sécurisés",
          value: clinicalDocYesNo(p.data.valuablesSecured, locale),
        },
      ];
      if (p.data.securityBagIdentifier) {
        lines.push({
          key: locale === "en" ? "Security bag ID" : "N° sac sécurité",
          value: p.data.securityBagIdentifier,
        });
      }
      return lines;
    }
    case BELONGINGS_SECURED_BAGGED_CARD_ID: {
      const p = belongingsSecuredBaggedPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: locale === "en" ? "Bag ID" : "N° sac", value: p.data.bagIdentifier },
        {
          key: locale === "en" ? "Storage location" : "Lieu de stockage",
          value: pickLocalizedEnumLabel(
            STORAGE_EN,
            STORAGE_FR,
            p.data.storageLocation,
            locale
          ),
        },
        {
          key: locale === "en" ? "Sealed" : "Scellé",
          value: clinicalDocYesNo(p.data.sealedByUserAcknowledged, locale),
        },
        {
          key: locale === "en" ? "Label applied" : "Étiquette apposée",
          value: clinicalDocYesNo(p.data.patientLabelApplied, locale),
        },
      ];
    }
    case BELONGINGS_TRANSFER_SECURITY_CARD_ID: {
      const p = belongingsTransferSecurityPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const lines: Array<{ key: string; value: string }> = [
        { key: locale === "en" ? "Bag ID" : "N° sac", value: p.data.bagIdentifier },
        {
          key: locale === "en" ? "Received by security" : "Reçu par sécurité",
          value: p.data.receivedBySecurityName,
        },
      ];
      if (p.data.securityReceiptNumber) {
        lines.push({
          key: locale === "en" ? "Receipt number" : "N° reçu",
          value: p.data.securityReceiptNumber,
        });
      }
      return lines;
    }
    case BELONGINGS_RELEASE_REPRESENTATIVE_CARD_ID: {
      const p = belongingsReleaseRepresentativePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Recipient" : "Destinataire",
          value: p.data.recipientName,
        },
        {
          key: locale === "en" ? "Relationship" : "Lien",
          value: pickLocalizedEnumLabel(
            RELATIONSHIP_EN,
            RELATIONSHIP_FR,
            p.data.recipientRelationship,
            locale
          ),
        },
        {
          key: locale === "en" ? "ID checked" : "Identité vérifiée",
          value: clinicalDocYesNo(p.data.recipientIdChecked, locale),
        },
        {
          key: locale === "en" ? "Patient authorized" : "Autorisation patient",
          value: clinicalDocYesNo(p.data.patientAuthorizedRelease, locale),
        },
        { key: locale === "en" ? "Bag ID" : "N° sac", value: p.data.bagIdentifier },
      ];
    }
    case BELONGINGS_RETURN_PATIENT_CARD_ID: {
      const p = belongingsReturnPatientPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        { key: locale === "en" ? "Bag ID" : "N° sac", value: p.data.bagIdentifier },
        {
          key: locale === "en" ? "Patient received" : "Reçu par le patient",
          value: clinicalDocYesNo(p.data.patientReceived, locale),
        },
        {
          key: locale === "en" ? "Discrepancy" : "Écart",
          value: clinicalDocYesNo(p.data.discrepancyReported, locale),
        },
      ];
    }
    case BELONGINGS_ALTERED_PATIENT_CARD_ID: {
      const p = belongingsAlteredPatientPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [
        {
          key: locale === "en" ? "Patient condition" : "État du patient",
          value: pickLocalizedEnumLabel(
            CONDITION_EN,
            CONDITION_FR,
            p.data.patientCondition,
            locale
          ),
        },
        {
          key: locale === "en" ? "Two-staff inventory" : "Inventaire à deux",
          value: clinicalDocYesNo(p.data.belongingsInventoriedByTwoStaff, locale),
        },
        {
          key: locale === "en" ? "Security notified" : "Sécurité avisée",
          value: clinicalDocYesNo(p.data.securityNotified, locale),
        },
        { key: locale === "en" ? "Bag ID" : "N° sac", value: p.data.bagIdentifier },
      ];
    }
    default:
      return [];
  }
}
