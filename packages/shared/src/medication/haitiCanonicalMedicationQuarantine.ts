/**
 * M1.5D — Quarantine deny-list for canonical linkage targets (no DB access).
 */

import type { HaitiQuarantineDecision } from "./haitiCanonicalMedicationLinkageTypes.js";

export type QuarantineClassId =
  | "Q_ACETAMINOPHEN_CLONE"
  | "Q_INSULIN_CLONE"
  | "Q_BLOCKED_MED_TEST"
  | "Q_BASELINE_PRODUCT"
  | "Q_IMPORT_ARTIFACT_PREFIX"
  | "Q_INACTIVE_CANONICAL_CHAIN"
  | "Q_DUPLICATE_NDC_CLUSTER";

export type QuarantineInspectInput = {
  conceptGenericName?: string | null;
  productCode?: string | null;
  packageNdc11?: string | null;
  productIsActive?: boolean;
  conceptIsActive?: boolean;
  baselineAvailable?: boolean;
  governanceStatus?: string | null;
  /** Known duplicate NDC11 values from M1.5B audit (local dev reference set). */
  knownDuplicateNdc11?: ReadonlySet<string>;
};

const IMPORT_PREFIX_DENY = ["PRI_ER_", "19G2-", "19G2C-", "19G1-"] as const;

const KNOWN_DUPLICATE_NDC11_DEFAULT = new Set([
  "04099093001",
  "06416190001",
  "25021106001",
  "25021107001",
]);

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function isAcetaminophenCloneGeneric(genericName: string | null | undefined): boolean {
  const g = norm(genericName ?? "");
  return g === "acetaminophen" || g.startsWith("acetaminophen ");
}

export function isRegularInsulinCloneGeneric(genericName: string | null | undefined): boolean {
  const g = norm(genericName ?? "");
  return g.startsWith("regular insulin");
}

export function isBlockedMedTestGeneric(genericName: string | null | undefined): boolean {
  return norm(genericName ?? "") === "blocked med";
}

export function isImportArtifactProductCode(productCode: string | null | undefined): boolean {
  const code = (productCode ?? "").trim().toUpperCase();
  return IMPORT_PREFIX_DENY.some((prefix) => code.startsWith(prefix));
}

export function classifyQuarantine(input: QuarantineInspectInput): QuarantineClassId | null {
  if (isBlockedMedTestGeneric(input.conceptGenericName)) return "Q_BLOCKED_MED_TEST";
  if (isAcetaminophenCloneGeneric(input.conceptGenericName)) return "Q_ACETAMINOPHEN_CLONE";
  if (isRegularInsulinCloneGeneric(input.conceptGenericName)) return "Q_INSULIN_CLONE";
  if (input.baselineAvailable === true) return "Q_BASELINE_PRODUCT";
  if (isImportArtifactProductCode(input.productCode)) return "Q_IMPORT_ARTIFACT_PREFIX";

  const ndcSet = input.knownDuplicateNdc11 ?? KNOWN_DUPLICATE_NDC11_DEFAULT;
  const ndc = (input.packageNdc11 ?? "").replace(/\D/g, "");
  if (ndc.length === 11 && ndcSet.has(ndc)) return "Q_DUPLICATE_NDC_CLUSTER";

  return null;
}

export function getQuarantineReason(classId: QuarantineClassId): string {
  const reasons: Record<QuarantineClassId, string> = {
    Q_ACETAMINOPHEN_CLONE: "Baseline/import acetaminophen clone — not a Haiti linkage target",
    Q_INSULIN_CLONE: "Regular insulin hash clone — not a Haiti linkage target",
    Q_BLOCKED_MED_TEST: "Governance test concept (Blocked Med)",
    Q_BASELINE_PRODUCT: "Global baseline product (baselineAvailable)",
    Q_IMPORT_ARTIFACT_PREFIX: "Priority ER / 19G import artifact code prefix",
    Q_INACTIVE_CANONICAL_CHAIN: "Inactive or blocked canonical chain",
    Q_DUPLICATE_NDC_CLUSTER: "NDC11 in known duplicate cluster",
  };
  return reasons[classId];
}

function decisionForClass(classId: QuarantineClassId | null): HaitiQuarantineDecision {
  if (!classId) return "ALLOW";
  if (classId === "Q_DUPLICATE_NDC_CLUSTER") return "MANUAL_REVIEW";
  return "QUARANTINE";
}

export function isQuarantinedCanonicalConcept(
  input: Pick<QuarantineInspectInput, "conceptGenericName">
): HaitiQuarantineDecision {
  return decisionForClass(
    classifyQuarantine({ conceptGenericName: input.conceptGenericName })
  );
}

export function isQuarantinedCanonicalProduct(
  input: Pick<
    QuarantineInspectInput,
    | "conceptGenericName"
    | "productCode"
    | "packageNdc11"
    | "baselineAvailable"
    | "productIsActive"
    | "conceptIsActive"
    | "governanceStatus"
  >
): HaitiQuarantineDecision {
  return decisionForClass(classifyQuarantine(input));
}

export function isQuarantinedCanonicalPackage(
  input: QuarantineInspectInput
): HaitiQuarantineDecision {
  return decisionForClass(classifyQuarantine(input));
}

export function getQuarantineReasonForInput(input: QuarantineInspectInput): string | null {
  const classId = classifyQuarantine(input);
  return classId ? getQuarantineReason(classId) : null;
}
