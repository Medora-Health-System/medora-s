import {
  isMedicationDoseMarActionableForLifecycle,
  resolveMedicationOrderLifecycleStatus,
  isIvpbSessionDoseKind,
  isTerminalMedicationDoseStatus,
  mapDoseInstanceToPassQueueBucket,
  medicationIvpbDoseSchedulingEnabled,
  medicationSchedulingFeatureFlagsEnabled,
  parseMedicationDoseKind,
  parseMedicationDoseStatus,
  resolveIvpbSessionPassQueueClinicalAction,
  MEDICATION_PASS_QUEUE_IVPB_BADGE,
  type MedicationCatalogSnapshotJson,
  type MedicationFrequencySnapshotJson,
  type MedicationOrderedDoseSnapshotJson,
  type MedicationPassQueueBadge,
  type MedicationPassQueueBucket,
  type MedicationPassQueueClinicalAction,
  type MedicationSafetyGovernanceSnapshot,
} from "@medora/shared";
import { Injectable } from "@nestjs/common";
import { getMedicationSchedulingFeatureFlagsFromEnv } from "../medication-scheduling/medication-scheduling-feature-flags.util";
import { MEDICATION_PASS_QUEUE_DOSE_SELECT, type MedicationPassQueueDoseRow } from "./medication-pass-queue-dose.select";
import { loadMedicationSafetyGovernanceByCatalogIdSafe } from "../medication-safety/medication-governance-enrichment.util";
import { PrismaService } from "../prisma/prisma.service";

export type MedicationPassQueueQuery = {
  encounterId?: string;
  assignedToUserId?: string;
  shiftStart?: Date;
  shiftEnd?: Date;
  bucket?: MedicationPassQueueBucket;
  includeUpcoming?: boolean;
};

export type MedicationPassQueueHighAlertSummary = Pick<
  MedicationSafetyGovernanceSnapshot,
  "isHighAlert" | "highAlertClass" | "requiresDoubleSign" | "requiresWitness" | "isControlled"
>;

export type MedicationPassQueueItem = {
  medicationDoseInstanceId: string;
  orderItemId: string;
  orderId: string;
  medicationOrderScheduleId: string;
  encounterId: string;
  patientId: string;
  patientFirstName: string | null;
  patientLastName: string | null;
  patientMrn: string | null;
  roomLabel: string | null;
  bedLabel: null;
  medicationLabel: string | null;
  scheduledAt: string;
  dueWindowStartAt: string;
  dueWindowEndAt: string;
  doseKind: string;
  doseStatus: string;
  queueBucket: MedicationPassQueueBucket;
  route: string | null;
  frequencyCode: string | null;
  doseSnapshot: MedicationOrderedDoseSnapshotJson | null;
  highAlertSummary: MedicationPassQueueHighAlertSummary | null;
  responseDueAt: string | null;
  nurseAssignedUserId: string | null;
  infusionSessionId: string | null;
  terminalMedicationAdministrationId: string | null;
  queueBadge: MedicationPassQueueBadge | null;
  clinicalAction: MedicationPassQueueClinicalAction | null;
};

export type MedicationPassQueueResponse = {
  enabled: boolean;
  at: string;
  count: number;
  items: MedicationPassQueueItem[];
};

const DEFAULT_ACTIVE_STATUSES = ["DUE", "OVERDUE", "IN_PROGRESS", "HELD"] as const;
const UPCOMING_STATUS = "PLANNED" as const;

/** Max dose rows scanned for pass queue (post-filter count may be lower). */
export const MEDICATION_PASS_QUEUE_LIST_LIMIT = 500;

const MEDICATION_PASS_QUEUE_DEFAULT_LOOKBACK_HOURS = 2;
const MEDICATION_PASS_QUEUE_DEFAULT_LOOKAHEAD_HOURS = 24;

function passQueueDefaultShiftWindow(now: Date): { shiftStart: Date; shiftEnd: Date } {
  const shiftStart = new Date(now);
  shiftStart.setUTCHours(shiftStart.getUTCHours() - MEDICATION_PASS_QUEUE_DEFAULT_LOOKBACK_HOURS);
  const shiftEnd = new Date(now);
  shiftEnd.setUTCHours(shiftEnd.getUTCHours() + MEDICATION_PASS_QUEUE_DEFAULT_LOOKAHEAD_HOURS);
  return { shiftStart, shiftEnd };
}

function parseCatalogSnapshot(json: unknown): MedicationCatalogSnapshotJson | null {
  if (!json || typeof json !== "object") return null;
  return json as MedicationCatalogSnapshotJson;
}

function parseOrderedDoseSnapshot(json: unknown): MedicationOrderedDoseSnapshotJson | null {
  if (!json || typeof json !== "object") return null;
  return json as MedicationOrderedDoseSnapshotJson;
}

function parseFrequencySnapshot(json: unknown): MedicationFrequencySnapshotJson | null {
  if (!json || typeof json !== "object") return null;
  return json as MedicationFrequencySnapshotJson;
}

function resolveStatusFilter(query: MedicationPassQueueQuery): string[] {
  if (query.bucket) {
    switch (query.bucket) {
      case "UPCOMING":
        return [UPCOMING_STATUS];
      case "DUE":
        return ["DUE"];
      case "OVERDUE":
        return ["OVERDUE"];
      case "IN_PROGRESS":
        return ["IN_PROGRESS"];
      case "ACTIVE_INFUSION":
        return ["IN_PROGRESS"];
      case "HELD":
        return ["HELD"];
      default:
        return [];
    }
  }

  const statuses: string[] = [...DEFAULT_ACTIVE_STATUSES];
  if (query.includeUpcoming) {
    statuses.push(UPCOMING_STATUS);
  }
  return statuses;
}

function toHighAlertSummary(
  governance: MedicationSafetyGovernanceSnapshot | null | undefined
): MedicationPassQueueHighAlertSummary | null {
  if (!governance) return null;
  if (
    !governance.isHighAlert &&
    !governance.highAlertClass &&
    !governance.requiresDoubleSign &&
    !governance.requiresWitness &&
    !governance.isControlled
  ) {
    return null;
  }
  return {
    isHighAlert: governance.isHighAlert ?? null,
    highAlertClass: governance.highAlertClass ?? null,
    requiresDoubleSign: governance.requiresDoubleSign ?? null,
    requiresWitness: governance.requiresWitness ?? null,
    isControlled: governance.isControlled ?? null,
  };
}

@Injectable()
export class MedicationPassQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async getPassQueue(
    facilityId: string,
    query: MedicationPassQueueQuery
  ): Promise<MedicationPassQueueResponse> {
    const at = new Date();
    const featureFlags = getMedicationSchedulingFeatureFlagsFromEnv();

    if (!medicationSchedulingFeatureFlagsEnabled(featureFlags)) {
      return { enabled: false, at: at.toISOString(), count: 0, items: [] };
    }

    const ivpbSchedulingEnabled = medicationIvpbDoseSchedulingEnabled(featureFlags);

    const statusFilter = resolveStatusFilter(query);
    if (statusFilter.length === 0) {
      return { enabled: true, at: at.toISOString(), count: 0, items: [] };
    }

    const shiftWindow =
      query.shiftStart && query.shiftEnd
        ? { shiftStart: query.shiftStart, shiftEnd: query.shiftEnd }
        : !query.encounterId
          ? passQueueDefaultShiftWindow(at)
          : null;

    const doses: MedicationPassQueueDoseRow[] = await this.prisma.medicationDoseInstance.findMany({
      where: {
        facilityId,
        doseStatus: { in: statusFilter },
        ...(query.encounterId ? { encounterId: query.encounterId } : {}),
        ...(shiftWindow
          ? {
              dueWindowStartAt: { lt: shiftWindow.shiftEnd },
              dueWindowEndAt: { gt: shiftWindow.shiftStart },
            }
          : {}),
        encounter: {
          ...(query.assignedToUserId
            ? { nurseAssignedUserId: query.assignedToUserId }
            : {}),
          ...(!query.encounterId ? { status: "OPEN" } : {}),
        },
      },
      select: MEDICATION_PASS_QUEUE_DOSE_SELECT,
      orderBy: [{ scheduledAt: "asc" }, { doseSequenceNumber: "asc" }],
      take: MEDICATION_PASS_QUEUE_LIST_LIMIT,
    });

    const catalogIds = [
      ...new Set(
        doses
          .map((d) => parseCatalogSnapshot(d.medicationCatalogSnapshotJson)?.catalogItemId)
          .filter((id): id is string => Boolean(id?.trim()))
      ),
    ];

    const governanceByCatalogId =
      catalogIds.length > 0
        ? await loadMedicationSafetyGovernanceByCatalogIdSafe(this.prisma, catalogIds)
        : new Map<string, MedicationSafetyGovernanceSnapshot>();

    const orderItemIds = [...new Set(doses.map((d) => d.orderItemId))];
    const lifecycleRows =
      orderItemIds.length > 0
        ? await this.prisma.orderItem.findMany({
            where: { id: { in: orderItemIds } },
            select: {
              id: true,
              medicationLifecycleStatus: true,
              medicationLifecycleAt: true,
            },
          })
        : [];
    const lifecycleByOrderItemId = new Map(
      lifecycleRows.map((row) => [row.id, row])
    );

    const items: MedicationPassQueueItem[] = [];

    for (const dose of doses) {
      const lifecycleRow = lifecycleByOrderItemId.get(dose.orderItemId);
      const lifecycleStatus = resolveMedicationOrderLifecycleStatus(
        lifecycleRow?.medicationLifecycleStatus ?? null
      );
      const hasActiveInfusion =
        dose.doseStatus === "IN_PROGRESS" && dose.infusionSessionId != null;
      if (
        !isMedicationDoseMarActionableForLifecycle({
          lifecycleStatus,
          doseStatus: dose.doseStatus,
          scheduledAt: dose.scheduledAt,
          effectiveAt: lifecycleRow?.medicationLifecycleAt ?? null,
          hasActiveInfusion,
        })
      ) {
        continue;
      }
      const parsedStatus = parseMedicationDoseStatus(dose.doseStatus);
      if (!parsedStatus || isTerminalMedicationDoseStatus(parsedStatus)) {
        continue;
      }

      if (dose.terminalMedicationAdministrationId?.trim()) {
        continue;
      }

      const parsedDoseKind = parseMedicationDoseKind(dose.doseKind);
      const queueBucket = mapDoseInstanceToPassQueueBucket({
        doseKind: dose.doseKind,
        doseStatus: parsedStatus,
        ivpbSchedulingEnabled,
      });
      if (!queueBucket) continue;

      if (query.bucket && queueBucket !== query.bucket) continue;
      if (!query.includeUpcoming && !query.bucket && queueBucket === "UPCOMING") continue;

      const catalogSnapshot = parseCatalogSnapshot(dose.medicationCatalogSnapshotJson);
      const orderedSnapshot = parseOrderedDoseSnapshot(dose.orderedDoseSnapshotJson);
      const frequencySnapshot = parseFrequencySnapshot(dose.frequencySnapshotJson);
      const catalogId = catalogSnapshot?.catalogItemId?.trim() || null;
      const governance = catalogId ? governanceByCatalogId.get(catalogId) : undefined;

      const medicationLabel =
        orderedSnapshot?.medicationLabel?.trim() ||
        catalogSnapshot?.displayNameFr?.trim() ||
        catalogSnapshot?.displayNameEn?.trim() ||
        catalogSnapshot?.genericName?.trim() ||
        null;

      const route =
        orderedSnapshot?.route?.trim() ||
        catalogSnapshot?.route?.trim() ||
        null;

      const isIvpbSession = isIvpbSessionDoseKind(parsedDoseKind ?? dose.doseKind);

      items.push({
        medicationDoseInstanceId: dose.id,
        orderItemId: dose.orderItemId,
        orderId: dose.orderId,
        medicationOrderScheduleId: dose.medicationOrderScheduleId,
        encounterId: dose.encounterId,
        patientId: dose.encounter.patient.id,
        patientFirstName: dose.encounter.patient.firstName,
        patientLastName: dose.encounter.patient.lastName,
        patientMrn: dose.encounter.patient.mrn,
        roomLabel: dose.encounter.roomLabel,
        bedLabel: null,
        medicationLabel,
        scheduledAt: dose.scheduledAt.toISOString(),
        dueWindowStartAt: dose.dueWindowStartAt.toISOString(),
        dueWindowEndAt: dose.dueWindowEndAt.toISOString(),
        doseKind: parsedDoseKind ?? dose.doseKind,
        doseStatus: parsedStatus,
        queueBucket,
        route,
        frequencyCode: frequencySnapshot?.frequencyCode ?? null,
        doseSnapshot: orderedSnapshot,
        highAlertSummary: toHighAlertSummary(governance),
        responseDueAt: dose.responseDueAt?.toISOString() ?? null,
        nurseAssignedUserId: dose.encounter.nurseAssignedUserId,
        infusionSessionId: dose.infusionSessionId ?? null,
        terminalMedicationAdministrationId: null,
        queueBadge: isIvpbSession ? MEDICATION_PASS_QUEUE_IVPB_BADGE : null,
        clinicalAction: isIvpbSession
          ? resolveIvpbSessionPassQueueClinicalAction(parsedStatus)
          : null,
      });
    }

    return {
      enabled: true,
      at: at.toISOString(),
      count: items.length,
      items,
    };
  }
}
