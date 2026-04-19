import { AuditAction } from "@prisma/client";
import type { AuditService } from "../services/audit.service";

/**
 * Logs BREAK_GLASS_ACCESS when chart-style routes are used under an active break-glass session.
 * Does nothing when `breakGlassSessionId` is absent (normal RBAC path).
 */
export async function logBreakGlassAccessIfApplicable(
  audit: AuditService,
  input: {
    breakGlassSessionId?: string;
    userId?: string;
    facilityId: string;
    patientId: string;
    ip?: string;
    userAgent?: string;
    context: string;
  }
): Promise<void> {
  if (!input.breakGlassSessionId || !input.userId) return;
  await audit.log(AuditAction.BREAK_GLASS_ACCESS, "BREAK_GLASS_SESSION", {
    userId: input.userId,
    facilityId: input.facilityId,
    patientId: input.patientId,
    entityId: input.breakGlassSessionId,
    ip: input.ip,
    userAgent: input.userAgent,
    metadata: { context: input.context },
  });
}
