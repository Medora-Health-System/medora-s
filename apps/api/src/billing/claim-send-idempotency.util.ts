import { ClaimSubmissionStatus } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";

/** Structured idempotency / duplicate-send outcomes (Phase 8.1). */
export type SendIdempotencyBlockCode =
  | "SEND_BLOCKED_TERMINAL"
  | "SEND_BLOCKED_ALREADY_SENT"
  | "SEND_BLOCKED_IN_FLIGHT"
  | "SEND_BLOCKED_RECENT_SUCCESS";

const NETWORK_TRANSPORTS = new Set(["LIVE_API", "LIVE_SFTP", "SANDBOX_API", "SANDBOX_SFTP"]);

export function isNetworkOutboundTransport(transportKey: string): boolean {
  return NETWORK_TRANSPORTS.has(transportKey);
}

function readEnvInt(key: string, defaultValue: number): number {
  try {
    const v = process.env[key];
    if (v === undefined || v.trim() === "") return defaultValue;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function recentSuccessWindowMs(): number {
  return Math.min(Math.max(readEnvInt("CLEARINGHOUSE_SEND_RECENT_SUCCESS_WINDOW_MS", 90_000), 5_000), 600_000);
}

/**
 * Extra duplicate protection beyond lifecycle status (UI double-clicks, races, retries).
 * Manual transport is never blocked here (audit repeats allowed).
 */
export async function evaluateOutboundSendIdempotency(
  prisma: PrismaService,
  input: {
    submissionId: string;
    transportKey: string;
    now: Date;
    retryFlow: boolean;
    submission: { status: ClaimSubmissionStatus; externalReference: string | null };
  }
): Promise<{ allowed: true } | { allowed: false; code: SendIdempotencyBlockCode }> {
  if (!isNetworkOutboundTransport(input.transportKey)) {
    return { allowed: true };
  }

  if (input.retryFlow) {
    return { allowed: true };
  }

  const windowMs = recentSuccessWindowMs();
  const since = new Date(input.now.getTime() - windowMs);

  const lastNetworkOk = await prisma.claimSubmissionAttempt.findFirst({
    where: {
      submissionId: input.submissionId,
      ok: true,
      transport: { in: [...NETWORK_TRANSPORTS] as string[] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  if (lastNetworkOk && lastNetworkOk.createdAt >= since) {
    return { allowed: false, code: "SEND_BLOCKED_RECENT_SUCCESS" };
  }

  if (lastNetworkOk && input.submission.status === ClaimSubmissionStatus.READY_TO_SEND) {
    return { allowed: false, code: "SEND_BLOCKED_ALREADY_SENT" };
  }

  return { allowed: true };
}

export function terminalSendBlockCode(status: ClaimSubmissionStatus): SendIdempotencyBlockCode | null {
  if (status === ClaimSubmissionStatus.READY_TO_SEND) return null;
  return "SEND_BLOCKED_TERMINAL";
}

export function stabilizationMetaFromBlock(
  code: SendIdempotencyBlockCode | string
): Record<string, unknown> {
  const f = stabilizationResponseFlagsForCode(code);
  return {
    stabilizationReasonCode: code,
    duplicateBlocked: f.duplicateBlocked,
    rateLimited: f.rateLimited,
    circuitOpen: f.circuitOpen,
    throttleDelayed: f.throttleDelayed,
    concurrentLimited: f.concurrentLimited,
    skipped: true,
  };
}

export function stabilizationOkFields() {
  return {
    duplicateBlocked: false,
    rateLimited: false,
    circuitOpen: false,
    throttleDelayed: false,
    concurrentLimited: false,
    stabilizationReasonCode: null as string | null,
  };
}

export function stabilizationResponseFlagsForCode(code: string | null) {
  if (!code) return stabilizationOkFields();
  return {
    stabilizationReasonCode: code,
    duplicateBlocked:
      code === "SEND_BLOCKED_ALREADY_SENT" ||
      code === "SEND_BLOCKED_RECENT_SUCCESS" ||
      code === "SEND_BLOCKED_IN_FLIGHT" ||
      code === "DUPLICATE_SEND_BLOCKED",
    rateLimited: code === "LIVE_SEND_RATE_LIMITED",
    circuitOpen: code === "LIVE_SEND_CIRCUIT_OPEN",
    throttleDelayed: code === "LIVE_SEND_THROTTLED",
    concurrentLimited: code === "LIVE_SEND_CONCURRENT_LIMIT",
  };
}
