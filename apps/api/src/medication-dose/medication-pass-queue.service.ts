import {
  isTerminalMedicationDoseStatus,
  mapMedicationDoseStatusToPassQueueBucket,
  medicationSchedulingFeatureFlagsEnabled,
  parseMedicationDoseStatus,
  type MedicationCatalogSnapshotJson,
  type MedicationOrderedDoseSnapshotJson,
  type MedicationPassQueueBucket,
  type MedicationSafetyGovernanceSnapshot,
} from "@medora/shared";
import { Injectable } from "@nestjs/common";
import { getMedicationSchedulingFeatureFlagsFromEnv } from "../medication-scheduling/medication-scheduling-feature-flags.util";
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
  doseStatus: string;
  queueBucket: MedicationPassQueueBucket;
  route: string | null;
  doseSnapshot: MedicationOrderedDoseSnapshotJson | null;
  highAlertSummary: MedicationPassQueueHighAlertSummary | null;
  responseDueAt: string | null;
  nurseAssignedUserId: string | null;
};

export type MedicationPassQueueResponse = {
  enabled: boolean;
  at: string;
  count: number;
  items: MedicationPassQueueItem[];
};

const DEFAULT_ACTIVE_STATUSES = ["DUE", "OVERDUE", "IN_PROGRESS", "HELD"] as const;
const UPCOMING_STATUS = "PLANNED" as const;

function parseCatalogSnapshot(json: unknown): MedicationCatalogSnapshotJson | null {
  if (!json || typeof json !== "object") return null;
  return json as MedicationCatalogSnapshotJson;
}

function parseOrderedDoseSnapshot(json: unknown): MedicationOrderedDoseSnapshotJson | null {
  if (!json || typeof json !== "object") return null;
  return json as MedicationOrderedDoseSnapshotJson;
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

    const statusFilter = resolveStatusFilter(query);
    if (statusFilter.length === 0) {
      return { enabled: true, at: at.toISOString(), count: 0, items: [] };
    }

    const doses = await this.prisma.medicationDoseInstance.findMany({
      where: {
        facilityId,
        doseStatus: { in: statusFilter },
        ...(query.encounterId ? { encounterId: query.encounterId } : {}),
        ...(query.shiftStart && query.shiftEnd
          ? {
              dueWindowStartAt: { lt: query.shiftEnd },
              dueWindowEndAt: { gt: query.shiftStart },
            }
          : {}),
        encounter: {
          ...(query.assignedToUserId
            ? { nurseAssignedUserId: query.assignedToUserId }
            : {}),
          ...(!query.encounterId ? { status: "OPEN" } : {}),
        },
      },
      include: {
        encounter: {
          select: {
            id: true,
            roomLabel: true,
            nurseAssignedUserId: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                mrn: true,
              },
            },
          },
        },
      },
      orderBy: [{ scheduledAt: "asc" }, { doseSequenceNumber: "asc" }],
    });

    const catalogIds = [
      ...new Set(
        doses
          .map((d) => parseCatalogSnapshot(d.medicationCatalogSnapshotJson)?.catalogItemId)
          .filter((id): id is string => Boolean(id?.trim()))
      ),
    ];

    const governanceByCatalogId = await loadMedicationSafetyGovernanceByCatalogIdSafe(
      this.prisma,
      catalogIds
    );

    const items: MedicationPassQueueItem[] = [];

    for (const dose of doses) {
      const parsedStatus = parseMedicationDoseStatus(dose.doseStatus);
      if (!parsedStatus || isTerminalMedicationDoseStatus(parsedStatus)) {
        continue;
      }

      const queueBucket = mapMedicationDoseStatusToPassQueueBucket(parsedStatus);
      if (!queueBucket) continue;

      if (query.bucket && queueBucket !== query.bucket) continue;
      if (!query.includeUpcoming && !query.bucket && queueBucket === "UPCOMING") continue;

      const catalogSnapshot = parseCatalogSnapshot(dose.medicationCatalogSnapshotJson);
      const orderedSnapshot = parseOrderedDoseSnapshot(dose.orderedDoseSnapshotJson);
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

      items.push({
        medicationDoseInstanceId: dose.id,
        orderItemId: dose.orderItemId,
        orderId: dose.orderId,
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
        doseStatus: parsedStatus,
        queueBucket,
        route,
        doseSnapshot: orderedSnapshot,
        highAlertSummary: toHighAlertSummary(governance),
        responseDueAt: dose.responseDueAt?.toISOString() ?? null,
        nurseAssignedUserId: dose.encounter.nurseAssignedUserId,
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
