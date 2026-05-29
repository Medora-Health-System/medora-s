import {
  BillingCodeType,
  BillingReviewStatus,
  BillingSide,
  BillingSourceModule,
  EncounterClinicalEventType,
  OrderItemLifecycleState,
  OrderStatus,
} from "@prisma/client";
import {
  buildEnterpriseProcedureBillableReviewMetadata,
  evaluateEnterpriseProcedureBillableReviewEligibility,
  evaluateFacilityBillingIdentityComplete,
  isEnterpriseProcedureBillableReviewMetadata,
  parseEnterpriseProcedureBillableReviewEventSummary,
  readCanonicalProcedureTypeFromPayload,
  resolveProcedureBillingReadiness,
} from "@medora/shared";
import type { PrismaService } from "../prisma/prisma.service";

const TERMINAL_STATUSES = new Set<string>([
  OrderStatus.COMPLETED,
  OrderStatus.RESULTED,
  OrderStatus.VERIFIED,
]);

function isOrderItemCompleted(status: string): boolean {
  return TERMINAL_STATUSES.has(String(status ?? "").trim().toUpperCase());
}

async function loadBillableReviewContext(
  prisma: PrismaService,
  orderItemId: string
): Promise<{
  orderItem: {
    id: string;
    status: string;
    lifecycleState: OrderItemLifecycleState;
    enterpriseProcedureId: string | null;
    completedAt: Date | null;
    order: {
      encounterId: string;
      patientId: string;
      status: string;
      encounter: {
        billingClassification: string | null;
        facility: {
          billingLegalName: string | null;
          billingAddressLine1: string | null;
          billingCity: string | null;
          billingStateProvince: string | null;
          billingPostalCode: string | null;
          billingCountry: string | null;
          billingNpi: string | null;
          taxIdEin: string | null;
        };
      };
    };
  };
  documentedProcedureTypes: string[];
  facilityChargeMasterLinked: boolean;
} | null> {
  const orderItem = await prisma.orderItem.findFirst({
    where: { id: orderItemId },
    select: {
      id: true,
      status: true,
      lifecycleState: true,
      enterpriseProcedureId: true,
      completedAt: true,
      catalogItemType: true,
      order: {
        select: {
          status: true,
          encounterId: true,
          patientId: true,
          encounter: {
            select: {
              billingClassification: true,
              facility: {
                select: {
                  billingLegalName: true,
                  billingAddressLine1: true,
                  billingCity: true,
                  billingStateProvince: true,
                  billingPostalCode: true,
                  billingCountry: true,
                  billingNpi: true,
                  taxIdEin: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!orderItem || orderItem.catalogItemType !== "CARE") return null;

  const clinicalEvents = await prisma.encounterClinicalEvent.findMany({
    where: {
      encounterId: orderItem.order.encounterId,
      eventType: EncounterClinicalEventType.PROCEDURE_DOCUMENTED,
    },
    select: { payloadJson: true },
  });
  const documentedProcedureTypes = clinicalEvents
    .map((event) => readCanonicalProcedureTypeFromPayload(event.payloadJson))
    .filter((value): value is string => Boolean(value));

  const enterpriseProcedureId = orderItem.enterpriseProcedureId?.trim() || null;
  let facilityChargeMasterLinked = false;
  if (enterpriseProcedureId) {
    const catalogRow = await prisma.billingCatalog.findFirst({
      where: {
        triggerSource: "PROCEDURE",
        externalCode: enterpriseProcedureId,
      },
      select: { id: true },
    });
    facilityChargeMasterLinked = Boolean(catalogRow);
  }

  return { orderItem, documentedProcedureTypes, facilityChargeMasterLinked };
}

/**
 * MEDPROC.6 — downstream enterprise procedure billable-review event generation.
 * Best-effort only: never throws; clinical completion must not depend on billing.
 */
export async function tryEnterpriseProcedureBillableReviewEvent(
  prisma: PrismaService,
  input: { facilityId: string; orderItemId: string }
): Promise<void> {
  try {
    const loaded = await loadBillableReviewContext(prisma, input.orderItemId);
    if (!loaded) return;

    const { orderItem, documentedProcedureTypes, facilityChargeMasterLinked } = loaded;
    const enterpriseProcedureId = orderItem.enterpriseProcedureId?.trim() || null;
    if (!enterpriseProcedureId) return;

    const orderCancelled =
      orderItem.lifecycleState === OrderItemLifecycleState.CANCELLED ||
      orderItem.status === OrderStatus.CANCELLED ||
      orderItem.order.status === OrderStatus.CANCELLED;
    const orderCompleted = isOrderItemCompleted(orderItem.status);
    if (!orderCompleted || orderCancelled) return;

    const facility = orderItem.order.encounter.facility;
    const readiness = resolveProcedureBillingReadiness({
      enterpriseProcedureId,
      orderItemStatus: orderItem.status,
      documentedProcedureTypes,
      facilityChargeMasterLinked,
      facilityBillingIdentityComplete: evaluateFacilityBillingIdentityComplete(facility),
      billingClassification: orderItem.order.encounter.billingClassification,
    });

    const eligible = evaluateEnterpriseProcedureBillableReviewEligibility({
      enterpriseProcedureId,
      readinessStatus: readiness.readinessStatus,
      orderCompleted,
      orderCancelled,
    });
    if (!eligible) return;

    const documentationLinked = !readiness.requiresDocumentationReview;
    const metadata = buildEnterpriseProcedureBillableReviewMetadata({
      enterpriseProcedureId,
      orderItemId: orderItem.id,
      encounterId: orderItem.order.encounterId,
      readiness,
      documentationLinked,
      facilityChargeMasterLinked,
    });

    const serviceDate =
      orderItem.completedAt instanceof Date && !Number.isNaN(orderItem.completedAt.getTime())
        ? orderItem.completedAt
        : new Date();

    await prisma.billingEvent.upsert({
      where: {
        facilityId_sourceModule_sourceRecordId: {
          facilityId: input.facilityId,
          sourceModule: BillingSourceModule.PROCEDURE,
          sourceRecordId: orderItem.id,
        },
      },
      create: {
        facilityId: input.facilityId,
        patientId: orderItem.order.patientId,
        encounterId: orderItem.order.encounterId,
        sourceModule: BillingSourceModule.PROCEDURE,
        sourceRecordId: orderItem.id,
        eventType: "PROCEDURE_ORDER_REVIEW",
        serviceDate,
        units: 1,
        codeType: BillingCodeType.INTERNAL,
        code: "UNMAPPED",
        procedureCode: "UNMAPPED",
        billingSide: BillingSide.UNKNOWN,
        reviewStatus: BillingReviewStatus.CAPTURED,
        descriptionSnapshot: `PROCEDURE_ORDER:${enterpriseProcedureId}`.slice(0, 8000),
        metadata,
      },
      update: {
        serviceDate,
        reviewStatus: BillingReviewStatus.CAPTURED,
        descriptionSnapshot: `PROCEDURE_ORDER:${enterpriseProcedureId}`.slice(0, 8000),
        metadata,
      },
    });
  } catch (e) {
    console.warn(
      "[billing-auto] tryEnterpriseProcedureBillableReviewEvent:",
      e instanceof Error ? e.message : e
    );
  }
}

export async function listEnterpriseProcedureBillableReviewEventsForEncounter(
  prisma: PrismaService,
  input: { facilityId: string; encounterId: string }
) {
  const rows = await prisma.billingEvent.findMany({
    where: {
      facilityId: input.facilityId,
      encounterId: input.encounterId,
      sourceModule: BillingSourceModule.PROCEDURE,
      reviewStatus: { not: BillingReviewStatus.VOIDED },
    },
    select: {
      id: true,
      sourceRecordId: true,
      metadata: true,
      reviewStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return rows
    .flatMap((row) => {
      if (!isEnterpriseProcedureBillableReviewMetadata(row.metadata)) return [];
      const createdAt =
        row.createdAt instanceof Date && !Number.isNaN(row.createdAt.getTime())
          ? row.createdAt.toISOString()
          : new Date(0).toISOString();
      const parsed = parseEnterpriseProcedureBillableReviewEventSummary({
        billingEventId: row.id,
        orderItemId: row.sourceRecordId,
        metadata: row.metadata,
        reviewStatus: row.reviewStatus,
        createdAt,
      });
      return parsed ? [parsed] : [];
    });
}
