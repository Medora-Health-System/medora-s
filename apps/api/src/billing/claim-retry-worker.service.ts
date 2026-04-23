import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ClaimSubmissionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { createStructuredLogger } from "../common/logging/structured-logger";
import { ClaimTransmissionService } from "./claim-transmission.service";
import type { ClearinghouseTransportHint } from "./clearinghouse-config.util";
import { isLatestAttemptDueForWorkerRetry } from "./clearinghouse-retry-policy.util";
import { isTerminalSubmissionStatus } from "./claim-submission-state-machine.util";
import { ClaimOperationalEventService } from "./claim-operational-event.service";

const log = createStructuredLogger("ClaimRetryWorker");

function readEnv(key: string): string | undefined {
  try {
    const v = process.env[key];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Env `true` enables; `false` disables; unset → enabled in non-production, disabled in production. */
export function clearinghouseRetryWorkerGloballyEnabled(): boolean {
  const raw = readEnv("CLEARINGHOUSE_RETRY_WORKER_ENABLED");
  if (raw === "true") return true;
  if (raw === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export type ClaimRetryWorkerLastSnapshot = {
  at: string;
  status: "ok" | "error" | "disabled";
  detail?: string;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
};

const TRANSPORT_HINTS = new Set<string>([
  "MANUAL",
  "DISABLED",
  "STUB_API",
  "SANDBOX_API",
  "SANDBOX_SFTP",
  "LIVE_API",
  "LIVE_SFTP",
]);

function normalizeTransportHint(raw: string): ClearinghouseTransportHint {
  return TRANSPORT_HINTS.has(raw) ? (raw as ClearinghouseTransportHint) : "MANUAL";
}

/**
 * Automated execution of due outbound retries (Phase 6.7).
 * Uses ClaimTransmissionService.retrySubmissionSend — no duplicate send logic.
 */
@Injectable()
export class ClaimRetryWorkerService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastSnapshot: ClaimRetryWorkerLastSnapshot | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly claimTransmissionService: ClaimTransmissionService,
    private readonly claimOperationalEventService: ClaimOperationalEventService
  ) {}

  getLastSnapshot(): ClaimRetryWorkerLastSnapshot | null {
    return this.lastSnapshot;
  }

  isGloballyEnabled(): boolean {
    return clearinghouseRetryWorkerGloballyEnabled();
  }

  onModuleInit(): void {
    if (!this.isGloballyEnabled()) {
      log.log("retry_worker_disabled", { reason: "CLEARINGHOUSE_RETRY_WORKER_ENABLED or NODE_ENV" });
      this.lastSnapshot = {
        at: new Date().toISOString(),
        status: "disabled",
        detail: "worker_disabled_by_config",
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
      };
      return;
    }
    const rawMs = readEnv("CLEARINGHOUSE_RETRY_WORKER_INTERVAL_MS");
    const ms = rawMs ? Number(rawMs) : 60_000;
    const interval = Number.isFinite(ms) && ms >= 5_000 ? ms : 60_000;
    this.timer = setInterval(() => {
      void this.runOnce().catch((e) => log.log("retry_worker_tick_error", { error: String(e) }));
    }, interval);
    log.log("retry_worker_scheduler_armed", { intervalMs: interval });
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** Manual / test hook — same logic as scheduled tick. */
  async runOnce(): Promise<ClaimRetryWorkerLastSnapshot> {
    if (!this.isGloballyEnabled()) {
      const snap: ClaimRetryWorkerLastSnapshot = {
        at: new Date().toISOString(),
        status: "disabled",
        detail: "worker_disabled_by_config",
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
      };
      this.lastSnapshot = snap;
      return snap;
    }

    const rawBatch = readEnv("CLEARINGHOUSE_RETRY_WORKER_BATCH_SIZE");
    const batchSize = Math.min(Math.max(rawBatch ? Number(rawBatch) : 20, 1), 100);
    const now = new Date();
    log.log("retry_worker_started", { batchSize });

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    try {
      const broad = await this.prisma.claimSubmission.findMany({
        where: {
          status: ClaimSubmissionStatus.READY_TO_SEND,
          attempts: {
            some: {
              ok: false,
              retryEligible: true,
              nextRetryAt: { lte: now },
            },
          },
        },
        include: {
          attempts: { orderBy: { createdAt: "desc" }, take: 8 },
        },
        take: batchSize * 15,
        orderBy: { updatedAt: "asc" },
      });

      const candidates = broad
        .filter((s) => {
          if (isTerminalSubmissionStatus(s.status)) return false;
          const last = s.attempts[0];
          return isLatestAttemptDueForWorkerRetry({ latestAttempt: last ?? null, now });
        })
        .slice(0, batchSize);

      const seen = new Set<string>();

      for (const sub of candidates) {
        if (seen.has(sub.id)) continue;
        seen.add(sub.id);
        processed += 1;

        const fresh = await this.prisma.claimSubmission.findUnique({
          where: { id: sub.id },
          include: { attempts: { orderBy: { createdAt: "desc" }, take: 1 } },
        });

        if (!fresh) {
          log.log("retry_attempt_skipped", {
            submissionId: sub.id,
            claimType: sub.claimType,
            reason: "RETRY_SKIPPED_NOT_FOUND",
          });
          skipped += 1;
          continue;
        }

        const emitSkip = (reasonCode: string) => {
          void this.claimOperationalEventService.append({
            facilityId: fresh.facilityId,
            encounterId: fresh.encounterId,
            submissionId: fresh.id,
            batchId: fresh.batchId,
            claimType: fresh.claimType,
            eventType: "RETRY_SKIPPED",
            statusBefore: fresh.status,
            statusAfter: fresh.status,
            reasonCode,
            message: reasonCode,
            metadata: { source: "retry_worker" },
          });
        };

        if (isTerminalSubmissionStatus(fresh.status)) {
          log.log("retry_attempt_skipped", {
            submissionId: fresh.id,
            claimType: fresh.claimType,
            reason: "RETRY_SKIPPED_TERMINAL",
          });
          emitSkip("RETRY_SKIPPED_TERMINAL");
          skipped += 1;
          continue;
        }

        if (fresh.status !== ClaimSubmissionStatus.READY_TO_SEND) {
          log.log("retry_attempt_skipped", {
            submissionId: fresh.id,
            claimType: fresh.claimType,
            reason: "RETRY_SKIPPED_STATUS_CHANGED",
            status: fresh.status,
          });
          emitSkip("RETRY_SKIPPED_STATUS_CHANGED");
          skipped += 1;
          continue;
        }

        const last = fresh.attempts[0];
        if (!last) {
          log.log("retry_attempt_skipped", {
            submissionId: fresh.id,
            claimType: fresh.claimType,
            reason: "RETRY_SKIPPED_NO_ATTEMPTS",
          });
          emitSkip("RETRY_SKIPPED_NO_ATTEMPTS");
          skipped += 1;
          continue;
        }

        if (last.ok) {
          log.log("retry_attempt_skipped", {
            submissionId: fresh.id,
            claimType: fresh.claimType,
            reason: "RETRY_SKIPPED_NEWER_ATTEMPT_EXISTS",
          });
          emitSkip("RETRY_SKIPPED_NEWER_ATTEMPT_EXISTS");
          skipped += 1;
          continue;
        }

        if (!isLatestAttemptDueForWorkerRetry({ latestAttempt: last, now })) {
          log.log("retry_attempt_skipped", {
            submissionId: fresh.id,
            claimType: fresh.claimType,
            reason: "RETRY_SKIPPED_NOT_DUE",
          });
          emitSkip("RETRY_SKIPPED_NOT_DUE");
          skipped += 1;
          continue;
        }

        log.log("retry_candidate_found", {
          submissionId: fresh.id,
          claimType: fresh.claimType,
          facilityId: fresh.facilityId,
          attemptId: last.id,
        });

        const hint = normalizeTransportHint(last.transport);

        try {
          log.log("retry_attempt_triggered", {
            submissionId: fresh.id,
            claimType: fresh.claimType,
            transport: hint,
          });
          void this.claimOperationalEventService.append({
            facilityId: fresh.facilityId,
            encounterId: fresh.encounterId,
            submissionId: fresh.id,
            batchId: fresh.batchId,
            claimType: fresh.claimType,
            eventType: "RETRY_TRIGGERED",
            metadata: {
              transport: hint,
              latestAttemptId: last.id,
              source: "retry_worker",
            },
          });
          const res = await this.claimTransmissionService.retrySubmissionSend(fresh.facilityId, fresh.id, hint, {
            attemptTrigger: "WORKER",
          });
          if (res && typeof res === "object" && "skipped" in res && (res as { skipped?: boolean }).skipped) {
            const reason = (res as { skipReason?: string }).skipReason ?? "RETRY_SKIPPED";
            const gateReason = (res as { sideGateReasonCode?: string | null }).sideGateReasonCode;
            log.log("retry_attempt_skipped", {
              submissionId: fresh.id,
              claimType: fresh.claimType,
              reason,
              sideGateReasonCode: gateReason ?? undefined,
            });
            void this.claimOperationalEventService.append({
              facilityId: fresh.facilityId,
              encounterId: fresh.encounterId,
              submissionId: fresh.id,
              batchId: fresh.batchId,
              claimType: fresh.claimType,
              eventType: "RETRY_SKIPPED",
              reasonCode: reason,
              message: gateReason ? `${reason}:${gateReason}` : reason,
              metadata: { source: "retry_worker", postRetrySend: true },
            });
            skipped += 1;
          } else {
            log.log("retry_attempt_succeeded", { submissionId: fresh.id, claimType: fresh.claimType });
            succeeded += 1;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          log.log("retry_attempt_failed", { submissionId: fresh.id, claimType: fresh.claimType, error: msg });
          void this.claimOperationalEventService.append({
            facilityId: fresh.facilityId,
            encounterId: fresh.encounterId,
            submissionId: fresh.id,
            batchId: fresh.batchId,
            claimType: fresh.claimType,
            eventType: "RETRY_SKIPPED",
            reasonCode: "RETRY_WORKER_EXCEPTION",
            message: msg.slice(0, 2_000),
            metadata: { source: "retry_worker" },
          });
          failed += 1;
        }
      }

      const snap: ClaimRetryWorkerLastSnapshot = {
        at: new Date().toISOString(),
        status: "ok",
        detail: `processed=${processed} succeeded=${succeeded} failed=${failed} skipped=${skipped}`,
        processed,
        succeeded,
        failed,
        skipped,
      };
      this.lastSnapshot = snap;
      log.log("retry_worker_finished", {
        processed,
        succeeded,
        failed,
        skipped,
      });
      return snap;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const snap: ClaimRetryWorkerLastSnapshot = {
        at: new Date().toISOString(),
        status: "error",
        detail: msg,
        processed,
        succeeded,
        failed,
        skipped,
      };
      this.lastSnapshot = snap;
      log.log("retry_worker_finished", { error: msg, processed, succeeded, failed, skipped });
      return snap;
    }
  }
}
