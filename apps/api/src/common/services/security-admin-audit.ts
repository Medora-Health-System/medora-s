import { AuditAction, type Prisma } from "@prisma/client";
import type { AuditService } from "./audit.service";

export type SecurityAuditSeverity = "CRITICAL" | "HIGH" | "MEDIUM";

const APPROVED_SEMANTIC_KEYS = new Set([
  "passwordcredentialchanged",
  "sessionsrevoked",
  "mfareset",
]);

const SENSITIVE_KEY_MARKERS = [
  "password",
  "token",
  "authorization",
  "apikey",
  "secret",
  "recoverycode",
] as const;

function canonicalizeMetadataKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isForbiddenSecurityMetadataKey(key: string): boolean {
  const canonical = canonicalizeMetadataKey(key);
  if (APPROVED_SEMANTIC_KEYS.has(canonical)) return false;
  return SENSITIVE_KEY_MARKERS.some((marker) => canonical.includes(marker));
}

/** Fail closed rather than persist security material in an authoritative admin audit row. */
export function assertSecurityAuditMetadataSafe(
  value: unknown,
  path = "metadata",
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertSecurityAuditMetadataSafe(entry, `${path}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (isForbiddenSecurityMetadataKey(key)) {
      throw new Error(`SECURITY_AUDIT_FORBIDDEN_METADATA_KEY:${path}.${key}`);
    }
    assertSecurityAuditMetadataSafe(child, `${path}.${key}`);
  }
}

type SecurityAdminAuditInput = {
  event: string;
  actorUserId: string;
  facilityId?: string;
  entityType: string;
  entityId: string;
  severity: SecurityAuditSeverity;
  outcome: "SUCCESS" | "DENIED";
  sourceOperation: string;
  denialReason?: string;
  evidence?: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
};

/** Consistent write semantics built on AuditService/AuditLog; it is not a second audit store. */
export async function logSecurityAdminAudit(
  audit: Pick<AuditService, "log">,
  action: AuditAction,
  input: SecurityAdminAuditInput,
): Promise<void> {
  const metadata = {
    event: input.event,
    outcome: input.outcome,
    severity: input.severity,
    sourceOperation: input.sourceOperation,
    ...(input.denialReason ? { denialReason: input.denialReason } : {}),
    ...(input.evidence ?? {}),
  };
  assertSecurityAuditMetadataSafe(metadata);
  await audit.log(action, input.entityType, {
    userId: input.actorUserId,
    facilityId: input.facilityId,
    entityId: input.entityId,
    metadata,
    critical: true,
    tx: input.tx,
  });
}
