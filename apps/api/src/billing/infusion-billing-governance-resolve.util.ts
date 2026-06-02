import {
  buildInfusionBillingGovernanceSnapshot,
  computeInfusionDurationFromMarRows,
  type InfusionBillingGovernanceSnapshot,
  type InfusionMarRowForDuration,
} from "@medora/shared";
import type { PrismaService } from "../prisma/prisma.service";

export async function resolveInfusionBillingGovernanceForAdministration(
  prisma: PrismaService,
  input: {
    facilityId: string;
    encounterId: string;
    medicationAdministrationId: string;
    marAction?: string | null;
    notes?: string | null;
    infusionPhase?: string | null;
    infusionSessionKey?: string | null;
    route?: string | null;
    orderItemId?: string | null;
    catalogMedicationId?: string | null;
    catalogAdministrationType?: string | null;
    catalogMedicationBillingClass?: string | null;
    medicationLabel?: string | null;
    catalogCode?: string | null;
    genericName?: string | null;
    administeredAtIso: string;
    effectiveAdministeredAtIso?: string | null;
    existingDurationMinutes?: number | null;
  }
): Promise<InfusionBillingGovernanceSnapshot> {
  const sessionKey = input.infusionSessionKey?.trim();
  const orderItemId = input.orderItemId?.trim();

  let siblingRows: InfusionMarRowForDuration[] = [];

  if (sessionKey || orderItemId) {
    const rows = await prisma.medicationAdministration.findMany({
      where: {
        facilityId: input.facilityId,
        encounterId: input.encounterId,
        ...(orderItemId ? { orderItemId } : {}),
        ...(sessionKey ? { infusionSessionKey: sessionKey } : {}),
      },
      select: {
        id: true,
        encounterId: true,
        orderItemId: true,
        infusionSessionKey: true,
        infusionPhase: true,
        notes: true,
        administeredAt: true,
        effectiveAdministeredAt: true,
        orderItem: { select: { catalogItemId: true } },
      },
      orderBy: { administeredAt: "asc" },
      take: 50,
    });

    siblingRows = rows.map((r) => ({
      id: r.id,
      encounterId: r.encounterId,
      orderItemId: r.orderItemId,
      catalogMedicationId: r.orderItem?.catalogItemId ?? input.catalogMedicationId ?? null,
      infusionSessionKey: r.infusionSessionKey,
      infusionPhase: r.infusionPhase,
      notes: r.notes,
      administeredAtIso: r.administeredAt.toISOString(),
      effectiveAdministeredAtIso: r.effectiveAdministeredAt?.toISOString() ?? null,
    }));
  }

  if (!siblingRows.some((r) => r.id === input.medicationAdministrationId)) {
    siblingRows.push({
      id: input.medicationAdministrationId,
      encounterId: input.encounterId,
      orderItemId: input.orderItemId ?? null,
      catalogMedicationId: input.catalogMedicationId ?? null,
      infusionSessionKey: input.infusionSessionKey ?? null,
      infusionPhase: input.infusionPhase ?? null,
      notes: input.notes ?? null,
      administeredAtIso: input.administeredAtIso,
      effectiveAdministeredAtIso: input.effectiveAdministeredAtIso ?? null,
    });
  }

  const duration = computeInfusionDurationFromMarRows(
    siblingRows,
    input.medicationAdministrationId
  );

  return buildInfusionBillingGovernanceSnapshot({
    classification: {
      marAction: input.marAction,
      notes: input.notes,
      infusionPhase: input.infusionPhase,
      route: input.route,
      catalogAdministrationType: input.catalogAdministrationType,
      catalogMedicationBillingClass: input.catalogMedicationBillingClass,
      medicationLabel: input.medicationLabel,
      catalogCode: input.catalogCode,
      genericName: input.genericName,
    },
    duration,
    existingDurationMinutes: input.existingDurationMinutes ?? duration.durationMinutes,
  });
}
