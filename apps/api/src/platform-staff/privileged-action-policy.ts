import { createHash } from "node:crypto";
import type { PlatformCapabilityRiskLevel } from "@prisma/client";
import type { PlatformCapabilityCode } from "./platform-capabilities";

export const PRIVILEGED_ACTION_TTL_MS = Math.max(60_000, Number(process.env.PRIVILEGED_ACTION_TTL_SECONDS ?? "900") * 1000 || 900_000);
export const RECENT_MFA_MAX_AGE_MS = Math.max(1_000, Number(process.env.MFA_STEP_UP_MAX_AGE_SECONDS ?? "300") * 1000 || 300_000);
export type GovernedOperation = "STAFF_PROVISION" | "STAFF_GRANT_CAPABILITY" | "FACILITY_ACTIVATION_CHANGE" | "MFA_RESET";
export type PrivilegedScope =
  | { operationType: "STAFF_PROVISION"; targetUserId: string; persona: string }
  | { operationType: "STAFF_GRANT_CAPABILITY"; targetUserId: string; capabilityCode: PlatformCapabilityCode }
  | { operationType: "FACILITY_ACTIVATION_CHANGE"; targetFacilityId: string; isActive: boolean }
  | { operationType: "MFA_RESET"; targetUserId: string };

export const OPERATION_POLICY: Readonly<Record<GovernedOperation, { authority: PlatformCapabilityCode; dualControl: boolean; risk: "CRITICAL" }>> = {
  STAFF_PROVISION: { authority: "STAFF_PROVISION", dualControl: false, risk: "CRITICAL" },
  STAFF_GRANT_CAPABILITY: { authority: "STAFF_GRANT_CAPABILITIES", dualControl: true, risk: "CRITICAL" },
  FACILITY_ACTIVATION_CHANGE: { authority: "FACILITY_ACTIVATE", dualControl: true, risk: "CRITICAL" },
  MFA_RESET: { authority: "SECURITY_MFA_RECOVERY", dualControl: true, risk: "CRITICAL" },
};

/** Fail-closed allow-list for operations explicitly classified as requiring an independent approver. */
export function requiresDualControl(operation: GovernedOperation): boolean {
  return OPERATION_POLICY[operation].dualControl === true;
}

export function riskRequirements(risk: PlatformCapabilityRiskLevel) {
  return { recentMfa: risk === "HIGH" || risk === "CRITICAL", audit: risk !== "LOW", dualControlEligible: risk === "CRITICAL" };
}
export function canonicalScope(scope: PrivilegedScope): string {
  const ordered = scope.operationType === "STAFF_PROVISION"
    ? { operationType: scope.operationType, persona: scope.persona, targetUserId: scope.targetUserId }
    : scope.operationType === "STAFF_GRANT_CAPABILITY"
      ? { capabilityCode: scope.capabilityCode, operationType: scope.operationType, targetUserId: scope.targetUserId }
      : scope.operationType === "FACILITY_ACTIVATION_CHANGE"
        ? { isActive: scope.isActive, operationType: scope.operationType, targetFacilityId: scope.targetFacilityId }
        : { operationType: scope.operationType, targetUserId: scope.targetUserId };
  return JSON.stringify(ordered);
}
export function scopeDigest(scope: PrivilegedScope): string {
  return createHash("sha256").update(canonicalScope(scope), "utf8").digest("hex");
}
export function hasFreshMfa(session: { mfaVerifiedAt: Date | null; mfaMethod: string | null; revokedAt?: Date | null; expiresAt: Date }, now = new Date()): boolean {
  return !session.revokedAt && session.expiresAt > now && !!session.mfaMethod && !!session.mfaVerifiedAt && now.getTime() - session.mfaVerifiedAt.getTime() <= RECENT_MFA_MAX_AGE_MS;
}
