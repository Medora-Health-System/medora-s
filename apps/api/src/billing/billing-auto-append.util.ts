import { randomUUID } from "node:crypto";
import { BillingSourceModule } from "@prisma/client";
import type { BillingCaptureItem } from "@medora/shared";
import type { PrismaService } from "../prisma/prisma.service";
import { appendBillingCaptureCandidate } from "./billing-capture.append.util";
import {
  mapImagingToBillingCode,
  mapLabToBillingCode,
  mapMedicationToBillingCode,
  type CatalogBillingMapping,
} from "./billing-map-from-event.util";

export type AppendAutoBillingParams = {
  facilityId: string;
  encounterId: string;
  patientId: string;
  sourceModule: BillingSourceModule;
  sourceRecordId: string;
  captureSourceType: BillingCaptureItem["sourceType"];
  billingCode: string;
  system: "CPT" | "HCPCS";
  billClass: "professional" | "facility" | "both";
  description: string;
};

/**
 * Idempotent append: same facility + sourceModule + sourceRecordId as existing BillingEvent → no-op.
 * On success, delegates to existing `appendBillingCaptureCandidate` (does not modify that util).
 */
export async function appendBillingEventIfNotExists(
  prisma: PrismaService,
  params: AppendAutoBillingParams
): Promise<void> {
  const existing = await prisma.billingEvent.findUnique({
    where: {
      facilityId_sourceModule_sourceRecordId: {
        facilityId: params.facilityId,
        sourceModule: params.sourceModule,
        sourceRecordId: params.sourceRecordId,
      },
    },
  });
  if (existing) return;

  const now = new Date().toISOString();
  const item: BillingCaptureItem = {
    id: randomUUID(),
    encounterId: params.encounterId,
    patientId: params.patientId,
    facilityId: params.facilityId,
    sourceType: params.captureSourceType,
    sourceId: params.sourceRecordId,
    procedureCode: params.system === "CPT" ? params.billingCode : null,
    hcpcsCode: params.system === "HCPCS" ? params.billingCode : null,
    billClass: params.billClass,
    status: "needs_review",
    createdAt: now,
    note: params.description.slice(0, 4000),
    catalogEnriched: true,
    catalogLabel: params.description.slice(0, 512),
  };

  try {
    await appendBillingCaptureCandidate(prisma, params.encounterId, params.facilityId, item);
  } catch (e) {
    console.warn(
      `[billing-auto] appendBillingCaptureCandidate failed (${params.sourceModule}/${params.sourceRecordId}):`,
      e instanceof Error ? e.message : e
    );
  }
}

async function appendFromMapping(
  prisma: PrismaService,
  params: {
    facilityId: string;
    encounterId: string;
    patientId: string;
    sourceModule: BillingSourceModule;
    sourceRecordId: string;
    captureSourceType: BillingCaptureItem["sourceType"];
    mapping: CatalogBillingMapping;
    descriptionFallback: string;
  }
): Promise<void> {
  const desc = params.mapping.description || params.descriptionFallback;
  await appendBillingEventIfNotExists(prisma, {
    facilityId: params.facilityId,
    encounterId: params.encounterId,
    patientId: params.patientId,
    sourceModule: params.sourceModule,
    sourceRecordId: params.sourceRecordId,
    captureSourceType: params.captureSourceType,
    billingCode: params.mapping.code,
    system: params.mapping.system,
    billClass: params.mapping.billClass,
    description: desc,
  });
}

/** After a lab result is verified / stamped — catalog-driven line (distinct from ORDER_ITEM capture). */
export async function tryAutoLabResultBillingAfterVerify(
  prisma: PrismaService,
  input: { facilityId: string; resultId: string; orderItemId: string }
): Promise<void> {
  try {
    const orderItem = await prisma.orderItem.findFirst({
      where: { id: input.orderItemId },
      include: { order: true },
    });
    if (!orderItem || orderItem.catalogItemType !== "LAB_TEST") return;

    let labCode: string | null = null;
    let labelFallback = orderItem.manualLabel?.trim() || "Lab";
    if (orderItem.catalogItemId) {
      const cat = await prisma.catalogLabTest.findUnique({
        where: { id: orderItem.catalogItemId },
        select: { code: true, name: true },
      });
      if (cat?.code?.trim()) {
        labCode = cat.code.trim();
        labelFallback = cat.name?.trim() || labelFallback;
      }
    }
    if (!labCode && orderItem.manualLabel?.trim()) {
      labCode = orderItem.manualLabel.trim();
    }
    if (!labCode) return;

    const mapping = await mapLabToBillingCode(prisma, labCode);
    if (!mapping) return;

    await appendFromMapping(prisma, {
      facilityId: input.facilityId,
      encounterId: orderItem.order.encounterId,
      patientId: orderItem.order.patientId,
      sourceModule: BillingSourceModule.LAB_RESULT,
      sourceRecordId: input.resultId,
      captureSourceType: "LAB_RESULT",
      mapping,
      descriptionFallback: labelFallback,
    });
  } catch (e) {
    console.warn(
      "[billing-auto] tryAutoLabResultBillingAfterVerify:",
      e instanceof Error ? e.message : e
    );
  }
}

/** After imaging order line is completed — optional second line from BillingCatalog (IMAGING). */
export async function tryAutoImagingOrderItemCompleted(
  prisma: PrismaService,
  input: { facilityId: string; orderItemId: string }
): Promise<void> {
  try {
    const orderItem = await prisma.orderItem.findFirst({
      where: { id: input.orderItemId },
      include: { order: true },
    });
    if (!orderItem || orderItem.catalogItemType !== "IMAGING_STUDY") return;

    let studyCode: string | null = null;
    let labelFallback = orderItem.manualLabel?.trim() || "Imaging";
    if (orderItem.catalogItemId) {
      const cat = await prisma.catalogImagingStudy.findUnique({
        where: { id: orderItem.catalogItemId },
        select: { code: true, name: true },
      });
      if (cat?.code?.trim()) {
        studyCode = cat.code.trim();
        labelFallback = cat.name?.trim() || labelFallback;
      }
    }
    if (!studyCode && orderItem.manualLabel?.trim()) studyCode = orderItem.manualLabel.trim();
    if (!studyCode) return;

    const mapping = await mapImagingToBillingCode(prisma, studyCode);
    if (!mapping) return;

    await appendFromMapping(prisma, {
      facilityId: input.facilityId,
      encounterId: orderItem.order.encounterId,
      patientId: orderItem.order.patientId,
      sourceModule: BillingSourceModule.IMAGING_RESULT,
      sourceRecordId: orderItem.id,
      captureSourceType: "IMAGING_RESULT",
      mapping,
      descriptionFallback: labelFallback,
    });
  } catch (e) {
    console.warn(
      "[billing-auto] tryAutoImagingOrderItemCompleted:",
      e instanceof Error ? e.message : e
    );
  }
}

/** After MAR administration row is created — optional catalog line (MEDICATION / MED_ADMIN). */
export async function tryAutoMedicationAdministrationBilling(
  prisma: PrismaService,
  input: { facilityId: string; medicationAdministrationId: string }
): Promise<void> {
  try {
    const adm = await prisma.medicationAdministration.findFirst({
      where: { id: input.medicationAdministrationId, facilityId: input.facilityId },
      include: { orderItem: { include: { order: true } } },
    });
    if (!adm?.orderItem || adm.orderItem.catalogItemType !== "MEDICATION") return;

    const oi = adm.orderItem;
    let medCode: string | null = null;
    let labelFallback = adm.medicationLabelSnapshot?.trim() || "Medication";
    if (oi.catalogItemId) {
      const cat = await prisma.catalogMedication.findUnique({
        where: { id: oi.catalogItemId },
        select: { code: true, name: true, displayNameFr: true },
      });
      if (cat?.code?.trim()) {
        medCode = cat.code.trim();
        labelFallback = cat.displayNameFr?.trim() || cat.name?.trim() || labelFallback;
      }
    }
    if (!medCode && oi.manualLabel?.trim()) medCode = oi.manualLabel.trim();
    if (!medCode) return;

    const mapping = await mapMedicationToBillingCode(prisma, medCode);
    if (!mapping) return;

    await appendFromMapping(prisma, {
      facilityId: input.facilityId,
      encounterId: adm.encounterId,
      patientId: adm.patientId,
      sourceModule: BillingSourceModule.MED_ADMIN,
      sourceRecordId: adm.id,
      captureSourceType: "MED_ADMIN",
      mapping,
      descriptionFallback: labelFallback,
    });
  } catch (e) {
    console.warn(
      "[billing-auto] tryAutoMedicationAdministrationBilling:",
      e instanceof Error ? e.message : e
    );
  }
}
