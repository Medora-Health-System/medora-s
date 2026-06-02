import type { Prisma } from "@prisma/client";
import {
  buildMedicationGovernanceChartSummariesForEncounter,
  buildMedicationGovernanceTimelineEvents,
  type MedicationGovernanceMarArtifacts,
  type MedicationGovernancePharmacySnapshot,
  type MedicationGovernanceChartSummary,
  type MedicationGovernanceTimelineEvent,
} from "@medora/shared";

export type MedicationGovernanceEncounterBundle = {
  artifactsByMarId: Map<string, MedicationGovernanceMarArtifacts>;
  pharmacyByOrderItemId: Map<string, MedicationGovernancePharmacySnapshot>;
  summaries: MedicationGovernanceChartSummary[];
  timelineEvents: MedicationGovernanceTimelineEvent[];
};

function overrideKindFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const k = (metadata as Record<string, unknown>).overrideKind;
  return typeof k === "string" ? k : null;
}

function groupByMarId<T extends { medicationAdministrationId: string }>(
  rows: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.medicationAdministrationId) ?? [];
    list.push(row);
    map.set(row.medicationAdministrationId, list);
  }
  return map;
}

/**
 * Batch-load MAR governance artifacts for chart export / legal chart (no N+1 per administration).
 */
export async function loadMedicationGovernanceEncounterBundle(
  prisma: {
    medicationAdministrationVerification: {
      findMany: (args: Prisma.MedicationAdministrationVerificationFindManyArgs) => Promise<
        Array<{
          medicationAdministrationId: string;
          verificationType: string;
          verificationStatus: string;
          createdAt: Date;
        }>
      >;
    };
    medicationWasteDocumentation: {
      findMany: (args: Prisma.MedicationWasteDocumentationFindManyArgs) => Promise<
        Array<{
          medicationAdministrationId: string;
          status: string;
          witnessUserId: string | null;
          createdAt: Date;
        }>
      >;
    };
    medicationAdministrationOverride: {
      findMany: (args: Prisma.MedicationAdministrationOverrideFindManyArgs) => Promise<
        Array<{
          medicationAdministrationId: string;
          overrideType: string;
          metadata: unknown;
          createdAt: Date;
        }>
      >;
    };
    pharmacyVerification: {
      findMany: (args: Prisma.PharmacyVerificationFindManyArgs) => Promise<
        Array<{
          orderItemId: string;
          verificationStatus: string;
          updatedAt: Date;
        }>
      >;
    };
  },
  facilityId: string,
  encounterId: string,
  marRows: Array<{
    id: string;
    orderItemId: string | null;
    medicationLabelSnapshot: string | null;
    doseValue: { toString(): string } | string | null;
    doseUnit: string | null;
    route: string | null;
    administeredAt: Date;
  }>
): Promise<MedicationGovernanceEncounterBundle> {
  if (marRows.length === 0) {
    return {
      artifactsByMarId: new Map(),
      pharmacyByOrderItemId: new Map(),
      summaries: [],
      timelineEvents: [],
    };
  }

  const marIds = marRows.map((m) => m.id);
  const orderItemIds = [...new Set(marRows.map((m) => m.orderItemId).filter((id): id is string => Boolean(id)))];

  const [verifications, wasteRows, overrides, pharmacyRows] = await Promise.all([
    prisma.medicationAdministrationVerification.findMany({
      where: { facilityId, encounterId, medicationAdministrationId: { in: marIds } },
      select: {
        medicationAdministrationId: true,
        verificationType: true,
        verificationStatus: true,
        createdAt: true,
      },
    }),
    prisma.medicationWasteDocumentation.findMany({
      where: { facilityId, encounterId, medicationAdministrationId: { in: marIds } },
      select: {
        medicationAdministrationId: true,
        status: true,
        witnessUserId: true,
        createdAt: true,
      },
    }),
    prisma.medicationAdministrationOverride.findMany({
      where: { facilityId, encounterId, medicationAdministrationId: { in: marIds } },
      select: {
        medicationAdministrationId: true,
        overrideType: true,
        metadata: true,
        createdAt: true,
      },
    }),
    orderItemIds.length > 0
      ? prisma.pharmacyVerification.findMany({
          where: { facilityId, encounterId, orderItemId: { in: orderItemIds } },
          orderBy: { updatedAt: "desc" },
          select: {
            orderItemId: true,
            verificationStatus: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const verificationsByMar = groupByMarId(verifications);
  const wasteByMar = groupByMarId(wasteRows);
  const overridesByMar = groupByMarId(overrides);

  const pharmacyByOrderItemId = new Map<string, MedicationGovernancePharmacySnapshot>();
  for (const row of pharmacyRows) {
    if (!pharmacyByOrderItemId.has(row.orderItemId)) {
      pharmacyByOrderItemId.set(row.orderItemId, {
        verificationStatus: row.verificationStatus,
        updatedAtIso: row.updatedAt.toISOString(),
      });
    }
  }

  const artifactsByMarId = new Map<string, MedicationGovernanceMarArtifacts>();
  for (const mar of marRows) {
    const pharmacy =
      (mar.orderItemId && pharmacyByOrderItemId.get(mar.orderItemId)) || null;
    artifactsByMarId.set(mar.id, {
      verifications: (verificationsByMar.get(mar.id) ?? []).map((v) => ({
        verificationType: v.verificationType,
        verificationStatus: v.verificationStatus,
        createdAtIso: v.createdAt.toISOString(),
      })),
      waste: (wasteByMar.get(mar.id) ?? []).map((w) => ({
        status: w.status,
        witnessUserId: w.witnessUserId,
        createdAtIso: w.createdAt.toISOString(),
      })),
      overrides: (overridesByMar.get(mar.id) ?? []).map((o) => ({
        overrideType: o.overrideType,
        createdAtIso: o.createdAt.toISOString(),
        overrideKind: overrideKindFromMetadata(o.metadata),
      })),
      pharmacy,
    });
  }

  const marExportRows = marRows.map((m) => ({
    id: m.id,
    orderItemId: m.orderItemId,
    medicationLabelSnapshot: m.medicationLabelSnapshot,
    doseValue: m.doseValue != null ? String(m.doseValue) : null,
    doseUnit: m.doseUnit,
    route: m.route,
    administeredAtIso: m.administeredAt.toISOString(),
  }));

  const summaries = buildMedicationGovernanceChartSummariesForEncounter(
    marExportRows,
    artifactsByMarId,
    pharmacyByOrderItemId
  );

  const timelineEvents: MedicationGovernanceTimelineEvent[] = [];
  for (const mar of marExportRows) {
    const artifacts = artifactsByMarId.get(mar.id)!;
    timelineEvents.push(
      ...buildMedicationGovernanceTimelineEvents({
        medicationAdministrationId: mar.id,
        orderItemId: mar.orderItemId,
        medicationLabel: mar.medicationLabelSnapshot,
        artifacts,
      })
    );
  }
  timelineEvents.sort((a, b) => a.documentedAtIso.localeCompare(b.documentedAtIso));

  return {
    artifactsByMarId,
    pharmacyByOrderItemId,
    summaries,
    timelineEvents,
  };
}
