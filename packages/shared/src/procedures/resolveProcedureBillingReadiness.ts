import {
  enterpriseProcedureById,
  type EnterpriseProcedureBillingMappingStatus,
} from "./enterpriseProcedureCatalog.js";
import { documentationTemplateIdToDocumentedProcedureType } from "./enterpriseProcedureDocumentationLinkage.js";
import type {
  EnterpriseProcedureChargeMapping,
  EnterpriseProcedureDefaultCodeCandidate,
  ProcedureBillingReadinessReason,
  ProcedureBillingReadinessStatus,
  ProcedureChargeCodeSystem,
  ProcedureChargeMappingSource,
  ProcedureChargeMappingStatus,
} from "./enterpriseProcedureBillingReadinessTypes.js";

export const FORBIDDEN_PROCEDURE_BILLING_READINESS_KEYS = [
  "patientName",
  "firstName",
  "lastName",
  "mrn",
  "manualLabel",
  "notes",
  "chiefComplaint",
  "memberId",
  "policyNumber",
  "payerName",
  "providerName",
  "diagnosisText",
] as const;

export type ResolveProcedureBillingReadinessInput = {
  enterpriseProcedureId?: string | null;
  orderItemStatus?: string | null;
  procedureCompleted?: boolean;
  documentationTemplateId?: string | null;
  documentationCompleted?: boolean;
  /** Canonical procedure types already documented on the encounter (no PHI). */
  documentedProcedureTypes?: readonly string[] | null;
  facilityChargeMasterLinked?: boolean;
  hasKnownEnterpriseDefaultCode?: boolean;
  facilityBillingIdentityComplete?: boolean;
  billingClassification?: string | null;
};

export type ResolveProcedureBillingReadinessOutput = {
  mappingStatus: ProcedureChargeMappingStatus;
  readinessStatus: ProcedureBillingReadinessStatus;
  reasons: ProcedureBillingReadinessReason[];
  warnings: string[];
  suggestedCodeSystems: ProcedureChargeCodeSystem[];
  requiresCoderReview: boolean;
  requiresFacilityChargeMaster: boolean;
  requiresDocumentationReview: boolean;
  previewOnly: true;
  mappingSource: ProcedureChargeMappingSource;
  defaultCodeCandidates: EnterpriseProcedureDefaultCodeCandidate[];
};

const TERMINAL_ORDER_STATUSES = new Set(["COMPLETED", "RESULTED", "VERIFIED"]);

function isProcedureCompleted(
  orderItemStatus: string | null | undefined,
  procedureCompleted?: boolean
): boolean {
  if (procedureCompleted === true) return true;
  return TERMINAL_ORDER_STATUSES.has(String(orderItemStatus ?? "").trim().toUpperCase());
}

function legacyBillingStatusToMappingStatus(
  legacy: EnterpriseProcedureBillingMappingStatus
): ProcedureChargeMappingStatus {
  switch (legacy) {
    case "FUTURE_CHARGE_MASTER":
      return "INSTITUTION_POLICY_REQUIRED";
    case "REVIEW_REQUIRED":
      return "CODER_REVIEW_REQUIRED";
    default:
      return "NOT_MAPPED";
  }
}

function resolveCatalogChargeMapping(
  entry: NonNullable<ReturnType<typeof enterpriseProcedureById>>
): EnterpriseProcedureChargeMapping {
  if (entry.chargeMapping) return entry.chargeMapping;
  return {
    status: legacyBillingStatusToMappingStatus(entry.billingMappingStatus),
    suggestedCodeSystems: entry.documentationTemplateId ? ["CPT"] : [],
    mappingSource: "NOT_CONFIGURED",
  };
}

function isProcedureDocumentedForBillingReview(
  input: ResolveProcedureBillingReadinessInput,
  documentationTemplateId: string | null,
  requiresProcedureNote: boolean
): boolean {
  if (!requiresProcedureNote && !documentationTemplateId) return true;
  if (input.documentationCompleted === true) return true;
  if (!documentationTemplateId) return false;
  const documentedType = documentationTemplateIdToDocumentedProcedureType(
    documentationTemplateId as Parameters<typeof documentationTemplateIdToDocumentedProcedureType>[0]
  );
  const target = documentedType.trim().toUpperCase();
  if (!target || !input.documentedProcedureTypes?.length) return false;
  return input.documentedProcedureTypes.some(
    (value) => String(value ?? "").trim().toUpperCase() === target
  );
}

/** Read-only facility charge master linkage check (metadata only; no PHI). */
export function resolveEnterpriseProcedureFacilityChargeMasterLinked(
  enterpriseProcedureId: string,
  billingCatalogProcedureExternalCodes: readonly string[] | null | undefined
): boolean {
  const id = enterpriseProcedureId.trim();
  if (!id || !billingCatalogProcedureExternalCodes?.length) return false;
  const normalized = new Set(
    billingCatalogProcedureExternalCodes.map((code) => String(code ?? "").trim()).filter(Boolean)
  );
  return normalized.has(id);
}

/**
 * MEDPROC.5 — enterprise procedure billing readiness (preview-only; no PHI; no BillingEvent).
 */
export function resolveProcedureBillingReadiness(
  input: ResolveProcedureBillingReadinessInput
): ResolveProcedureBillingReadinessOutput {
  const base: ResolveProcedureBillingReadinessOutput = {
    mappingStatus: "NOT_MAPPED",
    readinessStatus: "NOT_APPLICABLE",
    reasons: [],
    warnings: [],
    suggestedCodeSystems: [],
    requiresCoderReview: false,
    requiresFacilityChargeMaster: false,
    requiresDocumentationReview: false,
    previewOnly: true,
    mappingSource: "NOT_CONFIGURED",
    defaultCodeCandidates: [],
  };

  const enterpriseProcedureId = String(input.enterpriseProcedureId ?? "").trim();
  if (!enterpriseProcedureId) {
    return {
      ...base,
      reasons: ["MISSING_ENTERPRISE_PROCEDURE_ID"],
    };
  }

  const entry = enterpriseProcedureById(enterpriseProcedureId);
  if (!entry) {
    return {
      ...base,
      readinessStatus: "NOT_READY",
      reasons: ["ENTERPRISE_PROCEDURE_NOT_MAPPED"],
    };
  }

  const chargeMapping = resolveCatalogChargeMapping(entry);
  const documentationTemplateId =
    input.documentationTemplateId?.trim() || entry.documentationTemplateId || null;
  const documentationCompleted = isProcedureDocumentedForBillingReview(
    input,
    documentationTemplateId,
    entry.requiresProcedureNote
  );

  const requiresDocumentationReview =
    Boolean(entry.requiresProcedureNote || documentationTemplateId) && !documentationCompleted;

  const facilityLinked = input.facilityChargeMasterLinked === true;
  const billableMapping =
    chargeMapping.status !== "NOT_BILLABLE" && chargeMapping.status !== "NOT_MAPPED";
  const requiresFacilityChargeMaster = billableMapping && !facilityLinked;

  const requiresCoderReview =
    chargeMapping.status === "CODER_REVIEW_REQUIRED" ||
    chargeMapping.status === "INSTITUTION_POLICY_REQUIRED" ||
    chargeMapping.defaultCodeCandidates?.some((candidate) => candidate.reviewRequired) === true;

  const reasons: ProcedureBillingReadinessReason[] = [];
  const warnings: string[] = [];

  if (chargeMapping.status === "NOT_BILLABLE") {
    reasons.push("PROCEDURE_NOT_BILLABLE");
  } else if (chargeMapping.status === "NOT_MAPPED") {
    reasons.push("ENTERPRISE_PROCEDURE_NOT_MAPPED");
  }

  if (requiresCoderReview) reasons.push("CODER_REVIEW_REQUIRED");
  if (requiresDocumentationReview) reasons.push("DOCUMENTATION_REQUIRED_FOR_BILLING_REVIEW");
  if (requiresFacilityChargeMaster && !facilityLinked) {
    reasons.push("FACILITY_CHARGE_MASTER_REQUIRED");
  }
  if (chargeMapping.status === "INSTITUTION_POLICY_REQUIRED") {
    reasons.push("INSTITUTION_POLICY_REQUIRED");
  }
  if (input.facilityBillingIdentityComplete === false) {
    reasons.push("FACILITY_BILLING_IDENTITY_INCOMPLETE");
  }

  let readinessStatus: ProcedureBillingReadinessStatus = "NOT_READY";
  if (chargeMapping.status === "NOT_BILLABLE") {
    readinessStatus = "NOT_APPLICABLE";
  } else {
    const blockingReasons = reasons.filter((reason) => reason !== "READY_FOR_BILLING_REVIEW_PREVIEW");
    if (blockingReasons.length === 0) {
      readinessStatus = "READY";
      if (!reasons.includes("READY_FOR_BILLING_REVIEW_PREVIEW")) {
        reasons.push("READY_FOR_BILLING_REVIEW_PREVIEW");
      }
    } else if (
      blockingReasons.some((reason) =>
        [
          "CODER_REVIEW_REQUIRED",
          "DOCUMENTATION_REQUIRED_FOR_BILLING_REVIEW",
          "FACILITY_CHARGE_MASTER_REQUIRED",
          "INSTITUTION_POLICY_REQUIRED",
          "FACILITY_BILLING_IDENTITY_INCOMPLETE",
        ].includes(reason)
      )
    ) {
      readinessStatus = "REVIEW_REQUIRED";
    }
  }

  if (chargeMapping.defaultCodeCandidates?.length) {
    warnings.push("DEFAULT_CODE_CANDIDATES_REQUIRE_REVIEW");
  }

  if (!isProcedureCompleted(input.orderItemStatus, input.procedureCompleted)) {
    warnings.push("PROCEDURE_NOT_COMPLETED");
  }

  return {
    mappingStatus: facilityLinked ? "CHARGE_MASTER_LINKED" : chargeMapping.status,
    readinessStatus,
    reasons: [...new Set(reasons)],
    warnings,
    suggestedCodeSystems: [...chargeMapping.suggestedCodeSystems],
    requiresCoderReview,
    requiresFacilityChargeMaster: requiresFacilityChargeMaster && !facilityLinked,
    requiresDocumentationReview,
    previewOnly: true,
    mappingSource: facilityLinked ? "FACILITY_CHARGE_MASTER" : chargeMapping.mappingSource,
    defaultCodeCandidates: chargeMapping.defaultCodeCandidates ?? [],
  };
}
