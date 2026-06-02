import { z } from "zod";

export const HAITI_LINKAGE_STATUS_VALUES = [
  "MISSING_CANONICAL_TARGET",
  "LINK_READY",
  "MANUAL_REVIEW",
  "DO_NOT_LINK",
] as const;

export const HAITI_LINKAGE_CONFIDENCE_VALUES = ["EXACT", "HIGH", "MEDIUM", "LOW"] as const;

export const HAITI_LINKAGE_TRANCHE_VALUES = ["T1", "T2", "T3", "T4", "T5"] as const;

export const HAITI_LINKAGE_MATCH_RULE_VALUES = [
  "CODE_EXACT",
  "DERIVED_CODE",
  "MANIFEST_HCPCS",
  "MANUAL",
] as const;

export const HAITI_QUARANTINE_DECISION_VALUES = ["ALLOW", "QUARANTINE", "MANUAL_REVIEW"] as const;

export const haitiLinkageStatusSchema = z.enum(HAITI_LINKAGE_STATUS_VALUES);
export const haitiLinkageConfidenceSchema = z.enum(HAITI_LINKAGE_CONFIDENCE_VALUES);
export const haitiLinkageTrancheSchema = z.enum(HAITI_LINKAGE_TRANCHE_VALUES);
export const haitiLinkageMatchRuleSchema = z.enum(HAITI_LINKAGE_MATCH_RULE_VALUES);
export const haitiQuarantineDecisionSchema = z.enum(HAITI_QUARANTINE_DECISION_VALUES);

export const haitiLinkageSafetyFlagsSchema = z.object({
  controlled: z.boolean(),
  highAlert: z.boolean(),
  lasa: z.boolean(),
  pediatricRisk: z.boolean(),
  anticoagulant: z.boolean(),
  opioid: z.boolean(),
  insulin: z.boolean(),
});

export const haitiLinkageBillingFlagsSchema = z.object({
  hasNdc: z.boolean(),
  hasHcpcs: z.boolean(),
  hasBillingCodeDefault: z.boolean(),
  billingReady: z.boolean(),
});

export const haitiCanonicalMedicationLinkageEntrySchema = z
  .object({
    catalogMedicationCode: z.string().min(1),
    genericName: z.string().min(1),
    displayName: z.string().min(1),
    strength: z.string().min(1),
    route: z.string().min(1),
    form: z.string().min(1),
    proposedConceptCode: z.string().min(1),
    proposedProductCode: z.string().min(1),
    proposedPackageCode: z.string().min(1),
    linkageStatus: haitiLinkageStatusSchema,
    confidence: haitiLinkageConfidenceSchema,
    safetyFlags: haitiLinkageSafetyFlagsSchema,
    billingFlags: haitiLinkageBillingFlagsSchema,
    rationale: z.string().min(1),
    sourcePhase: z.enum(["M1.5C", "M1.5D"]),
    reviewerRequired: z.boolean(),
    matchRule: haitiLinkageMatchRuleSchema.optional(),
    tranche: haitiLinkageTrancheSchema.optional(),
    displayNameEn: z.string().optional(),
  })
  .superRefine((entry, ctx) => {
    if (entry.linkageStatus === "LINK_READY" && entry.reviewerRequired) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "LINK_READY cannot have reviewerRequired=true",
        path: ["reviewerRequired"],
      });
    }
    if (entry.linkageStatus === "DO_NOT_LINK" && entry.reviewerRequired) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DO_NOT_LINK cannot have reviewerRequired=true",
        path: ["reviewerRequired"],
      });
    }
  });

export const haitiMedicationFormularyRowSchema = z.object({
  code: z.string().min(1),
  genericName: z.string().min(1),
  displayNameFr: z.string().min(1),
  displayNameEn: z.string().optional(),
  strength: z.string().min(1),
  dosageForm: z.string().min(1),
  route: z.string().min(1),
  therapeuticClass: z.string().min(1),
  isEssential: z.boolean(),
  isActive: z.boolean(),
  isControlled: z.boolean().default(false),
  controlledSchedule: z.string().nullable().optional(),
  requiresWitness: z.boolean().default(false),
  requiresDoubleSign: z.boolean().default(false),
  administrationType: z.string().nullable().optional(),
  billingClass: z.string().nullable().optional(),
  commonAliases: z.array(z.string()),
});

export const haitiCanonicalLinkageManifestSchema = z.array(haitiCanonicalMedicationLinkageEntrySchema).min(1);

export type HaitiLinkageStatus = z.infer<typeof haitiLinkageStatusSchema>;
export type HaitiLinkageConfidence = z.infer<typeof haitiLinkageConfidenceSchema>;
export type HaitiLinkageTranche = z.infer<typeof haitiLinkageTrancheSchema>;
export type HaitiLinkageMatchRule = z.infer<typeof haitiLinkageMatchRuleSchema>;
export type HaitiQuarantineDecision = z.infer<typeof haitiQuarantineDecisionSchema>;
export type HaitiLinkageSafetyFlags = z.infer<typeof haitiLinkageSafetyFlagsSchema>;
export type HaitiLinkageBillingFlags = z.infer<typeof haitiLinkageBillingFlagsSchema>;
export type HaitiCanonicalMedicationLinkageEntry = z.infer<typeof haitiCanonicalMedicationLinkageEntrySchema>;
export type HaitiMedicationFormularyRow = z.infer<typeof haitiMedicationFormularyRowSchema>;

export function parseHaitiCanonicalMedicationLinkageEntry(
  value: unknown
): HaitiCanonicalMedicationLinkageEntry {
  return haitiCanonicalMedicationLinkageEntrySchema.parse(value);
}

export function parseHaitiCanonicalLinkageManifest(
  value: unknown
): HaitiCanonicalMedicationLinkageEntry[] {
  return haitiCanonicalLinkageManifestSchema.parse(value);
}

export function serializeHaitiCanonicalMedicationLinkageEntry(
  entry: HaitiCanonicalMedicationLinkageEntry
): HaitiCanonicalMedicationLinkageEntry {
  return haitiCanonicalMedicationLinkageEntrySchema.parse(entry);
}
