import { BadRequestException } from "@nestjs/common";
import { OrderStatus, type PrismaClient } from "@prisma/client";
import type { OrderCreateDto } from "@medora/shared";
import { getEncounterAllergyDocumentationSummary } from "@medora/shared";

/** Order line is still clinically « active » for duplicate catalog detection (same encounter). */
const ORDER_ITEM_ACTIVE_FOR_CATALOG_DEDUP: OrderStatus[] = [
  OrderStatus.DRAFT,
  OrderStatus.PLACED,
  OrderStatus.PENDING,
  OrderStatus.ACKNOWLEDGED,
  OrderStatus.IN_PROGRESS,
  OrderStatus.SIGNED,
];

function assertNoDuplicateCatalogLinesInPayload(data: OrderCreateDto) {
  const keyCounts = new Map<string, number>();
  for (const it of data.items) {
    const cid = it.catalogItemId?.trim();
    if (!cid) continue;
    const key = `${it.catalogItemType}:${cid}`;
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }
  for (const [, n] of keyCounts) {
    if (n > 1) {
      throw new BadRequestException(
        "Plusieurs lignes identiques au catalogue dans la même commande. Retirez le doublon."
      );
    }
  }
}

async function assertNoActiveDuplicateCatalogItems(
  prisma: PrismaClient,
  encounterId: string,
  facilityId: string,
  data: OrderCreateDto
) {
  const catalogPairs: {
    catalogItemId: string;
    catalogItemType: "LAB_TEST" | "IMAGING_STUDY" | "MEDICATION";
  }[] = [];
  for (const it of data.items) {
    const cid = it.catalogItemId?.trim();
    if (!cid) continue;
    if (
      it.catalogItemType === "LAB_TEST" ||
      it.catalogItemType === "IMAGING_STUDY" ||
      it.catalogItemType === "MEDICATION"
    ) {
      catalogPairs.push({ catalogItemId: cid, catalogItemType: it.catalogItemType });
    }
  }

  if (catalogPairs.length === 0) return;

  const requestedTypes = [...new Set(catalogPairs.map((p) => p.catalogItemType))];
  const requestedIds = [...new Set(catalogPairs.map((p) => p.catalogItemId))];

  const conflicts = await prisma.orderItem.findMany({
    where: {
      catalogItemId: { in: requestedIds },
      catalogItemType: { in: requestedTypes },
      status: { in: ORDER_ITEM_ACTIVE_FOR_CATALOG_DEDUP },
      order: {
        encounterId,
        facilityId,
        status: { not: OrderStatus.CANCELLED },
      },
    },
    select: { id: true },
    take: 1,
  });

  if (conflicts.length > 0) {
    throw new BadRequestException(
      "Une ligne catalogue identique est déjà en cours pour cette consultation (laboratoire, imagerie ou médicament). Terminez ou annulez la ligne existante avant d’en ajouter une autre."
    );
  }
}

function assertMedicationOrderAllergyAckIfNeeded(
  data: OrderCreateDto,
  encounterVitals: unknown,
  encounterNursingAssessment: unknown,
  triageVitalsJson: unknown | null | undefined
) {
  if (data.type !== "MEDICATION") return;
  const summary = getEncounterAllergyDocumentationSummary({
    vitals: encounterVitals,
    nursingAssessment: encounterNursingAssessment,
    triageVitalsJson: triageVitalsJson ?? null,
  });
  if (!summary) return;
  if (data.safetyAcknowledgedMedicationAllergies !== true) {
    throw new BadRequestException(
      "Des allergies ou intolérances sont documentées pour cette visite. Confirmez la relecture avant de prescrire un médicament."
    );
  }
}

/**
 * Pre-create clinical guards: duplicate catalog lines in payload, duplicate active catalog items on encounter,
 * medication allergy documentation acknowledgment.
 */
export async function assertOrderCreateClinicalSafety(
  prisma: PrismaClient,
  input: {
    encounterId: string;
    facilityId: string;
    data: OrderCreateDto;
    encounterVitals: unknown;
    encounterNursingAssessment: unknown;
    triageVitalsJson: unknown | null | undefined;
  }
): Promise<void> {
  assertNoDuplicateCatalogLinesInPayload(input.data);
  await assertNoActiveDuplicateCatalogItems(prisma, input.encounterId, input.facilityId, input.data);
  assertMedicationOrderAllergyAckIfNeeded(
    input.data,
    input.encounterVitals,
    input.encounterNursingAssessment,
    input.triageVitalsJson
  );
}
