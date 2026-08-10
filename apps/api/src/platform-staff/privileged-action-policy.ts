import { createHash } from "node:crypto";
import type { PlatformCapabilityRiskLevel } from "@prisma/client";
import type { PlatformCapabilityCode } from "./platform-capabilities";

export const PRIVILEGED_ACTION_TTL_MS = Math.max(60_000, Number(process.env.PRIVILEGED_ACTION_TTL_SECONDS ?? "900") * 1000 || 900_000);
export const RECENT_MFA_MAX_AGE_MS = Math.max(1_000, Number(process.env.MFA_STEP_UP_MAX_AGE_SECONDS ?? "300") * 1000 || 300_000);
export type GovernedOperation = "STAFF_PROVISION" | "STAFF_GRANT_CAPABILITY";
export type PrivilegedScope =
  | { operationType: "STAFF_PROVISION"; targetUserId: string; persona: string }
  | { operationType: "STAFF_GRANT_CAPABILITY"; targetUserId: string; capabilityCode: PlatformCapabilityCode };

export const OPERATION_POLICY: Readonly<Record<GovernedOperation, { authority: PlatformCapabilityCode; dualControl: true; risk: "CRITICAL" }>> = {
  STAFF_PROVISION: { authority: "STAFF_PROVISION", dualControl: true, risk: "CRITICAL" },
  STAFF_GRANT_CAPABILITY: { authority: "STAFF_GRANT_CAPABILITIES", dualControl: true, risk: "CRITICAL" },
};

export function riskRequirements(risk: PlatformCapabilityRiskLevel) {
  return { recentMfa: risk === "HIGH" || risk === "CRITICAL", audit: risk !== "LOW", dualControlEligible: risk === "CRITICAL" };
}
export function canonicalScope(scope: PrivilegedScope): string {
  const ordered = scope.operationType === "STAFF_PROVISION"
    ? { operationType: scope.operationType, persona: scope.persona, targetUserId: scope.targetUserId }
    : { capabilityCode: scope.capabilityCode, operationType: scope.operationType, targetUserId: scope.targetUserId };
  return JSON.stringify(ordered);
}
export function scopeDigest(scope: PrivilegedScope): string {
  return createHash("sha256").update(canonicalScope(scope), "utf8").digest("hex");
}
export function hasFreshMfa(session: { mfaVerifiedAt: Date | null; mfaMethod: string | null; revokedAt?: Date | null; expiresAt: Date }, now = new Date()): boolean {
  return !session.revokedAt && session.expiresAt > now && !!session.mfaMethod && !!session.mfaVerifiedAt && now.getTime() - session.mfaVerifiedAt.getTime() <= RECENT_MFA_MAX_AGE_MS;
}
