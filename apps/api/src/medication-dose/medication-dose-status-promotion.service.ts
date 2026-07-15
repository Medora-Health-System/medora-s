import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { medicationSchedulingFeatureFlagsEnabled } from "@medora/shared";
import { createLogDedupGate } from "../common/logging/log-dedup";
import { schedulerCompletionLevel } from "../common/logging/log-policy";
import { createStructuredLogger } from "../common/logging/structured-logger";
import { getMedicationSchedulingFeatureFlagsFromEnv } from "../medication-scheduling/medication-scheduling-feature-flags.util";
import { PrismaService } from "../prisma/prisma.service";

const log = createStructuredLogger("MedicationDoseStatusPromotion");
const disabledStateDedup = createLogDedupGate({ intervalMs: 24 * 60 * 60_000 });

function readEnv(key: string): string | undefined {
  try {
    const v = process.env[key];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Env `true` enables scheduler; `false` disables; unset → disabled in production, enabled in non-production. */
export function medicationDoseStatusPromotionSchedulerEnabled(): boolean {
  const raw = readEnv("MEDICATION_DOSE_STATUS_PROMOTION_ENABLED");
  if (raw === "true") return true;
  if (raw === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export type MedicationDoseStatusPromotionRunOptions = {
  now?: Date;
  facilityId?: string;
  encounterId?: string;
};

export type MedicationDoseStatusPromotionSnapshot = {
  at: string;
  status: "ok" | "disabled" | "error";
  detail?: string;
  durationMs: number;
  promotedToDue: number;
  promotedToOverdue: number;
};

@Injectable()
export class MedicationDoseStatusPromotionService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastSnapshot: MedicationDoseStatusPromotionSnapshot | null = null;

  constructor(private readonly prisma: PrismaService) {}

  getLastSnapshot(): MedicationDoseStatusPromotionSnapshot | null {
    return this.lastSnapshot;
  }

  isSchedulerEnabled(): boolean {
    const flags = getMedicationSchedulingFeatureFlagsFromEnv();
    return (
      medicationSchedulingFeatureFlagsEnabled(flags) &&
      medicationDoseStatusPromotionSchedulerEnabled()
    );
  }

  onModuleInit(): void {
    if (!this.isSchedulerEnabled()) {
      if (disabledStateDedup.allow("dose_status_promotion_scheduler_disabled")) {
        log.log("dose_status_promotion_scheduler_disabled", {
          reason: "scheduling_flags_or_PROMOTION_ENABLED",
        });
      }
      this.lastSnapshot = {
        at: new Date().toISOString(),
        status: "disabled",
        detail: "promotion_scheduler_disabled_by_config",
        durationMs: 0,
        promotedToDue: 0,
        promotedToOverdue: 0,
      };
      return;
    }

    const rawMs = readEnv("MEDICATION_DOSE_STATUS_PROMOTION_INTERVAL_MS");
    const ms = rawMs ? Number(rawMs) : 60_000;
    const interval = Number.isFinite(ms) && ms >= 15_000 ? ms : 60_000;
    this.timer = setInterval(() => {
      void this.runOnce().catch((e) =>
        log.error("dose_status_promotion_tick_error", { error: String(e) })
      );
    }, interval);
    log.log("dose_status_promotion_scheduler_armed", { intervalMs: interval });
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Promote dose statuses based on due windows (M1.8B.7I.3).
   * Idempotent — safe to call repeatedly. Manual hook may pass facilityId / encounterId scope.
   */
  async runOnce(
    options: MedicationDoseStatusPromotionRunOptions = {}
  ): Promise<MedicationDoseStatusPromotionSnapshot> {
    const now = options.now ?? new Date();
    const started = Date.now();
    const featureFlags = getMedicationSchedulingFeatureFlagsFromEnv();

    if (!medicationSchedulingFeatureFlagsEnabled(featureFlags)) {
      const snap: MedicationDoseStatusPromotionSnapshot = {
        at: now.toISOString(),
        status: "disabled",
        detail: "scheduling_feature_flags_off",
        durationMs: Date.now() - started,
        promotedToDue: 0,
        promotedToOverdue: 0,
      };
      this.lastSnapshot = snap;
      return snap;
    }

    const scopeWhere = {
      ...(options.facilityId ? { facilityId: options.facilityId } : {}),
      ...(options.encounterId ? { encounterId: options.encounterId } : {}),
    };

    let promotedToDue = 0;
    let promotedToOverdue = 0;

    try {
      const plannedResult = await this.prisma.medicationDoseInstance.updateMany({
        where: {
          ...scopeWhere,
          doseStatus: "PLANNED",
          dueWindowStartAt: { lte: now },
        },
        data: { doseStatus: "DUE" },
      });
      promotedToDue = plannedResult.count;

      const dueResult = await this.prisma.medicationDoseInstance.updateMany({
        where: {
          ...scopeWhere,
          doseStatus: "DUE",
          dueWindowEndAt: { lt: now },
        },
        data: { doseStatus: "OVERDUE" },
      });
      promotedToOverdue = dueResult.count;

      const snap: MedicationDoseStatusPromotionSnapshot = {
        at: now.toISOString(),
        status: "ok",
        durationMs: Date.now() - started,
        promotedToDue,
        promotedToOverdue,
      };
      this.lastSnapshot = snap;
      const changed = promotedToDue + promotedToOverdue;
      const level = schedulerCompletionLevel(changed);
      const meta = {
        durationMs: snap.durationMs,
        promotedToDue,
        promotedToOverdue,
        facilityId: options.facilityId ?? null,
        encounterId: options.encounterId ?? null,
      };
      if (level === "log") {
        log.log("dose_status_promotion_completed", meta);
      } else if (level === "debug") {
        log.debug("dose_status_promotion_completed", meta);
      }
      return snap;
    } catch (err) {
      const snap: MedicationDoseStatusPromotionSnapshot = {
        at: now.toISOString(),
        status: "error",
        detail: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
        promotedToDue,
        promotedToOverdue,
      };
      this.lastSnapshot = snap;
      log.error("dose_status_promotion_failed", {
        durationMs: snap.durationMs,
        promotedToDue,
        promotedToOverdue,
        error: snap.detail,
      });
      return snap;
    }
  }
}
