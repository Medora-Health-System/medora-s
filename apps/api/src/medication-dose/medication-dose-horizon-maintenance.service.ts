import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  medicationSchedulingFeatureFlagsEnabled,
  resolveMedicationDoseMaintenanceHorizonEnd,
  shouldReplenishMedicationDoseHorizon,
} from "@medora/shared";
import { createLogDedupGate } from "../common/logging/log-dedup";
import { schedulerCompletionLevel } from "../common/logging/log-policy";
import { createStructuredLogger } from "../common/logging/structured-logger";
import { getMedicationSchedulingFeatureFlagsFromEnv } from "../medication-scheduling/medication-scheduling-feature-flags.util";
import { PrismaService } from "../prisma/prisma.service";
import {
  MEDICATION_ORDER_SCHEDULE_STATUS_ACTIVE,
  MedicationDoseExpansionService,
} from "./medication-dose-expansion.service";
import { resolveWorkerEnabledFlag } from "../common/runtime/background-workers-policy";

const log = createStructuredLogger("MedicationDoseHorizonMaintenance");
const disabledStateDedup = createLogDedupGate({ intervalMs: 24 * 60 * 60_000 });

const SKIPPED_DOSE_STATUSES = ["CANCELLED", "SUPERSEDED"] as const;

function readEnv(key: string): string | undefined {
  try {
    const v = process.env[key];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Env `true` enables; `false` disables;
 * unset → disabled in production/test, enabled in other non-production.
 */
export function medicationDoseHorizonMaintenanceEnabled(): boolean {
  return resolveWorkerEnabledFlag("MEDICATION_DOSE_HORIZON_MAINTENANCE_ENABLED", {
    legacyNonProductionDefault: true,
  });
}

export type MedicationDoseHorizonMaintenanceSnapshot = {
  at: string;
  status: "ok" | "disabled" | "error";
  detail?: string;
  durationMs: number;
  schedulesScanned: number;
  schedulesExpanded: number;
  schedulesSkipped: number;
  dosesCreated: number;
  dosesSkipped: number;
};

@Injectable()
export class MedicationDoseHorizonMaintenanceService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastSnapshot: MedicationDoseHorizonMaintenanceSnapshot | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly expansionService: MedicationDoseExpansionService
  ) {}

  getLastSnapshot(): MedicationDoseHorizonMaintenanceSnapshot | null {
    return this.lastSnapshot;
  }

  isGloballyEnabled(): boolean {
    const flags = getMedicationSchedulingFeatureFlagsFromEnv();
    return medicationSchedulingFeatureFlagsEnabled(flags) && medicationDoseHorizonMaintenanceEnabled();
  }

  onModuleInit(): void {
    if (!this.isGloballyEnabled()) {
      if (disabledStateDedup.allow("dose_horizon_maintenance_disabled")) {
        log.log("dose_horizon_maintenance_disabled", {
          reason: "scheduling_flags_or_MAINTENANCE_ENABLED",
        });
      }
      this.lastSnapshot = {
        at: new Date().toISOString(),
        status: "disabled",
        detail: "maintenance_disabled_by_config",
        durationMs: 0,
        schedulesScanned: 0,
        schedulesExpanded: 0,
        schedulesSkipped: 0,
        dosesCreated: 0,
        dosesSkipped: 0,
      };
      return;
    }

    const rawMs = readEnv("MEDICATION_DOSE_HORIZON_MAINTENANCE_INTERVAL_MS");
    const ms = rawMs ? Number(rawMs) : 3_600_000;
    const interval = Number.isFinite(ms) && ms >= 60_000 ? ms : 3_600_000;
    this.timer = setInterval(() => {
      void this.runOnce().catch((e) =>
        log.error("dose_horizon_maintenance_tick_error", { error: String(e) })
      );
    }, interval);
    log.log("dose_horizon_maintenance_scheduler_armed", { intervalMs: interval });
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** Manual / test hook — same logic as scheduled tick. */
  async runOnce(now: Date = new Date()): Promise<MedicationDoseHorizonMaintenanceSnapshot> {
    const started = Date.now();
    const featureFlags = getMedicationSchedulingFeatureFlagsFromEnv();

    if (!medicationSchedulingFeatureFlagsEnabled(featureFlags)) {
      const snap: MedicationDoseHorizonMaintenanceSnapshot = {
        at: now.toISOString(),
        status: "disabled",
        detail: "scheduling_feature_flags_off",
        durationMs: Date.now() - started,
        schedulesScanned: 0,
        schedulesExpanded: 0,
        schedulesSkipped: 0,
        dosesCreated: 0,
        dosesSkipped: 0,
      };
      this.lastSnapshot = snap;
      return snap;
    }

    if (!medicationDoseHorizonMaintenanceEnabled()) {
      const snap: MedicationDoseHorizonMaintenanceSnapshot = {
        at: now.toISOString(),
        status: "disabled",
        detail: "maintenance_disabled_by_config",
        durationMs: Date.now() - started,
        schedulesScanned: 0,
        schedulesExpanded: 0,
        schedulesSkipped: 0,
        dosesCreated: 0,
        dosesSkipped: 0,
      };
      this.lastSnapshot = snap;
      return snap;
    }

    let schedulesScanned = 0;
    let schedulesExpanded = 0;
    let schedulesSkipped = 0;
    let dosesCreated = 0;
    let dosesSkipped = 0;

    try {
      const schedules = await this.prisma.medicationOrderSchedule.findMany({
        where: {
          scheduleStatus: MEDICATION_ORDER_SCHEDULE_STATUS_ACTIVE,
          scheduleClassification: { in: ["RECURRING", "RECURRING_IVPB"] },
        },
        select: { id: true },
      });

      schedulesScanned = schedules.length;
      const horizonEndAt = resolveMedicationDoseMaintenanceHorizonEnd(now);
      const scheduleIds = schedules.map((schedule) => schedule.id);

      const latestFutureDoses =
        scheduleIds.length > 0
          ? await this.prisma.medicationDoseInstance.findMany({
              where: {
                medicationOrderScheduleId: { in: scheduleIds },
                scheduledAt: { gt: now },
                doseStatus: { notIn: [...SKIPPED_DOSE_STATUSES] },
              },
              orderBy: { scheduledAt: "desc" },
              select: { medicationOrderScheduleId: true, scheduledAt: true },
            })
          : [];

      const latestFutureByScheduleId = new Map<string, Date>();
      for (const dose of latestFutureDoses) {
        if (!latestFutureByScheduleId.has(dose.medicationOrderScheduleId)) {
          latestFutureByScheduleId.set(dose.medicationOrderScheduleId, dose.scheduledAt);
        }
      }

      const schedulesToExpand: string[] = [];
      for (const schedule of schedules) {
        const latestFutureAt = latestFutureByScheduleId.get(schedule.id);
        const futureCoverageMs = latestFutureAt ? latestFutureAt.getTime() - now.getTime() : 0;

        if (!shouldReplenishMedicationDoseHorizon(futureCoverageMs)) {
          schedulesSkipped += 1;
          dosesSkipped += 1;
          continue;
        }

        schedulesToExpand.push(schedule.id);
      }

      for (const scheduleId of schedulesToExpand) {
        const result = await this.expansionService.expandForSchedule(scheduleId, {
          horizonEndAt,
          featureFlags,
        });

        if (result.createdCount > 0) {
          schedulesExpanded += 1;
          dosesCreated += result.createdCount;
        } else {
          schedulesSkipped += 1;
          dosesSkipped += 1;
        }
      }

      const snap: MedicationDoseHorizonMaintenanceSnapshot = {
        at: now.toISOString(),
        status: "ok",
        durationMs: Date.now() - started,
        schedulesScanned,
        schedulesExpanded,
        schedulesSkipped,
        dosesCreated,
        dosesSkipped,
      };
      this.lastSnapshot = snap;
      const level = schedulerCompletionLevel(dosesCreated + schedulesExpanded);
      const meta = {
        durationMs: snap.durationMs,
        schedulesScanned,
        schedulesExpanded,
        schedulesSkipped,
        dosesCreated,
        dosesSkipped,
      };
      if (level === "log") {
        log.log("dose_horizon_maintenance_completed", meta);
      } else if (level === "debug") {
        log.debug("dose_horizon_maintenance_completed", meta);
      }
      return snap;
    } catch (err) {
      const snap: MedicationDoseHorizonMaintenanceSnapshot = {
        at: now.toISOString(),
        status: "error",
        detail: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - started,
        schedulesScanned,
        schedulesExpanded,
        schedulesSkipped,
        dosesCreated,
        dosesSkipped,
      };
      this.lastSnapshot = snap;
      log.error("dose_horizon_maintenance_failed", {
        durationMs: snap.durationMs,
        schedulesScanned,
        error: snap.detail,
      });
      return snap;
    }
  }
}
