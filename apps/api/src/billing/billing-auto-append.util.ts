import { randomUUID } from "node:crypto";
import { BillingSourceModule, Prisma } from "@prisma/client";
import type { BillingCaptureItem } from "@medora/shared";
import type { PrismaService } from "../prisma/prisma.service";
import { createFallbackBillingLine } from "./billing-fallback.util";
import { appendBillingCaptureCandidate } from "./billing-capture.append.util";
import {
  defaultBillClassForTrigger,
  mapImagingToBillingCode,
  mapLabToBillingCode,
  mapMedicationToBillingCode,
  mapProcedureToBillingCode,
  mapSupplyToBillingCode,
  type CatalogBillingMapping,
} from "./billing-map-from-event.util";
import { collectMedicationMarLookupOrder } from "./medication-code-derive.util";
import { resolveMedicationMarActionFromStorage } from "@medora/shared";
import { inferMedicationAdministrationCpt } from "./medication-admin-cpt.util";

export type AppendAutoBillingParams = {
  facilityId: string;
  encounterId: string;
  patientId: string;
  sourceModule: BillingSourceModule;
  sourceRecordId: string;
  captureSourceType: BillingCaptureItem["sourceType"];
  billingCode: string;
  system: "CPT" | "HCPCS" | "INTERNAL";
  billClass: "professional" | "facility" | "both";
  description: string;
  /** When `system` is HCPCS (drug), optional therapeutic/admin CPT on the same capture line (e.g. 96372 + J-code). */
  companionProcedureCpt?: string | null;
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
  const isInternal = params.system === "INTERNAL";
  const companion = params.companionProcedureCpt?.trim();
  const procedureForItem = isInternal
    ? params.billingCode
    : params.system === "CPT"
      ? params.billingCode
      : companion ?? null;
  const item: BillingCaptureItem = {
    id: randomUUID(),
    encounterId: params.encounterId,
    patientId: params.patientId,
    facilityId: params.facilityId,
    sourceType: params.captureSourceType,
    sourceId: params.sourceRecordId,
    procedureCode: procedureForItem,
    hcpcsCode: params.system === "HCPCS" ? params.billingCode : null,
    billClass: params.billClass,
    status: "needs_review",
    createdAt: now,
    note: params.description.slice(0, 4000),
    catalogEnriched: !isInternal,
    catalogLabel: params.description.slice(0, 512),
  };

  try {
    await appendBillingCaptureCandidate(prisma, params.encounterId, params.facilityId, item);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      console.warn(
        `[billing-auto] duplicate billing event ignored (unique idempotency) ${params.sourceModule}/${params.sourceRecordId}`
      );
      return;
    }
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
    companionProcedureCpt?: string | null;
    companionDescriptionNote?: string | null;
  }
): Promise<void> {
  const mapping = params.mapping;
  let desc = mapping.description || params.descriptionFallback;
  if (mapping.system === "HCPCS" && params.companionProcedureCpt?.trim()) {
    const note = params.companionDescriptionNote?.trim() ?? "Administration CPT";
    desc = `${desc}; ${note}`.slice(0, 4000);
  }
  await appendBillingEventIfNotExists(prisma, {
    facilityId: params.facilityId,
    encounterId: params.encounterId,
    patientId: params.patientId,
    sourceModule: params.sourceModule,
    sourceRecordId: params.sourceRecordId,
    captureSourceType: params.captureSourceType,
    billingCode: mapping.code,
    system: mapping.system,
    billClass: mapping.billClass,
    description: desc,
    companionProcedureCpt: mapping.system === "HCPCS" ? params.companionProcedureCpt?.trim() ?? null : null,
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
    let cat: { code: string | null; name: string } | null = null;
    if (orderItem.catalogItemId) {
      cat = await prisma.catalogLabTest.findUnique({
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
    if (!labCode) {
      await createFallbackBillingLine(prisma, {
        facilityId: input.facilityId,
        encounterId: orderItem.order.encounterId,
        patientId: orderItem.order.patientId,
        sourceModule: BillingSourceModule.LAB_RESULT,
        sourceRecordId: input.resultId,
        captureSourceType: "LAB_RESULT",
        description: labelFallback,
        billClass: defaultBillClassForTrigger("LAB"),
      });
      return;
    }

    let mapping = await mapLabToBillingCode(prisma, labCode);
    if (!mapping && cat?.name?.trim() && cat.name.trim() !== labCode) {
      mapping = await mapLabToBillingCode(prisma, cat.name.trim());
    }
    if (!mapping && orderItem.manualLabel?.trim() && orderItem.manualLabel.trim() !== labCode) {
      mapping = await mapLabToBillingCode(prisma, orderItem.manualLabel.trim());
    }
    if (!mapping) {
      await createFallbackBillingLine(prisma, {
        facilityId: input.facilityId,
        encounterId: orderItem.order.encounterId,
        patientId: orderItem.order.patientId,
        sourceModule: BillingSourceModule.LAB_RESULT,
        sourceRecordId: input.resultId,
        captureSourceType: "LAB_RESULT",
        description: labelFallback,
        billClass: defaultBillClassForTrigger("LAB"),
      });
      return;
    }

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

async function applyImagingCatalogFromOrderItem(
  prisma: PrismaService,
  facilityId: string,
  orderItem: { id: string; manualLabel: string | null; catalogItemId: string | null; order: { encounterId: string; patientId: string } }
): Promise<void> {
  let studyCode: string | null = null;
  let labelFallback = orderItem.manualLabel?.trim() || "Imaging";
  let cat: { code: string | null; name: string } | null = null;
  if (orderItem.catalogItemId) {
    cat = await prisma.catalogImagingStudy.findUnique({
      where: { id: orderItem.catalogItemId },
      select: { code: true, name: true },
    });
    if (cat?.code?.trim()) {
      studyCode = cat.code.trim();
      labelFallback = cat.name?.trim() || labelFallback;
    }
  }
  if (!studyCode && orderItem.manualLabel?.trim()) studyCode = orderItem.manualLabel.trim();
  if (!studyCode) {
    await createFallbackBillingLine(prisma, {
      facilityId,
      encounterId: orderItem.order.encounterId,
      patientId: orderItem.order.patientId,
      sourceModule: BillingSourceModule.IMAGING_RESULT,
      sourceRecordId: orderItem.id,
      captureSourceType: "IMAGING_RESULT",
      description: labelFallback,
      billClass: defaultBillClassForTrigger("IMAGING"),
    });
    return;
  }

  let mapping = await mapImagingToBillingCode(prisma, studyCode);
  if (!mapping && cat?.name?.trim() && cat.name.trim() !== studyCode) {
    mapping = await mapImagingToBillingCode(prisma, cat.name.trim());
  }
  if (!mapping && orderItem.manualLabel?.trim() && orderItem.manualLabel.trim() !== studyCode) {
    mapping = await mapImagingToBillingCode(prisma, orderItem.manualLabel.trim());
  }
  if (!mapping) {
    await createFallbackBillingLine(prisma, {
      facilityId,
      encounterId: orderItem.order.encounterId,
      patientId: orderItem.order.patientId,
      sourceModule: BillingSourceModule.IMAGING_RESULT,
      sourceRecordId: orderItem.id,
      captureSourceType: "IMAGING_RESULT",
      description: labelFallback,
      billClass: defaultBillClassForTrigger("IMAGING"),
    });
    return;
  }

  await appendFromMapping(prisma, {
    facilityId,
    encounterId: orderItem.order.encounterId,
    patientId: orderItem.order.patientId,
    sourceModule: BillingSourceModule.IMAGING_RESULT,
    sourceRecordId: orderItem.id,
    captureSourceType: "IMAGING_RESULT",
    mapping,
    descriptionFallback: labelFallback,
  });
}

/**
 * After imaging result is verified (substantive content) — same IMAGING_RESULT idempotency key as order-item path (`orderItemId`).
 */
export async function tryAutoImagingResultBillingAfterVerify(
  prisma: PrismaService,
  input: { facilityId: string; orderItemId: string }
): Promise<void> {
  try {
    const orderItem = await prisma.orderItem.findFirst({
      where: { id: input.orderItemId },
      include: { order: true },
    });
    if (!orderItem || orderItem.catalogItemType !== "IMAGING_STUDY") return;
    await applyImagingCatalogFromOrderItem(prisma, input.facilityId, orderItem);
  } catch (e) {
    console.warn(
      "[billing-auto] tryAutoImagingResultBillingAfterVerify:",
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

    const linkedResult = await prisma.result.findFirst({
      where: { orderItemId: orderItem.id },
      select: { id: true },
    });
    if (linkedResult) {
      // Result row exists: IMAGING_RESULT autobill is triggered on result verification; skip to avoid double work and prefer result as source
      return;
    }

    await applyImagingCatalogFromOrderItem(prisma, input.facilityId, orderItem);
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

    const marOutcome = resolveMedicationMarActionFromStorage({
      marAction: adm.marAction ?? null,
      notes: adm.notes,
    });
    if (marOutcome !== "administered") return;

    const oi = adm.orderItem;
    let labelFallback =
      adm.medicationLabelSnapshot?.trim() || oi.manualLabel?.trim() || "Medication";
    let cat: {
      code: string | null;
      name: string;
      displayNameFr: string | null;
      genericName: string | null;
      strength: string | null;
      dosageForm: string | null;
      route: string | null;
    } | null = null;
    if (oi.catalogItemId) {
      cat = await prisma.catalogMedication.findUnique({
        where: { id: oi.catalogItemId },
        select: {
          code: true,
          name: true,
          displayNameFr: true,
          genericName: true,
          strength: true,
          dosageForm: true,
          route: true,
        },
      });
      if (cat?.code?.trim()) {
        labelFallback = cat.name?.trim() || cat.displayNameFr?.trim() || labelFallback;
      }
    }

    const hasMedicationLookup =
      !!cat?.code?.trim() ||
      !!oi.manualLabel?.trim() ||
      !!adm.medicationLabelSnapshot?.trim() ||
      !!(cat?.genericName?.trim() != null && cat.genericName.trim().length > 0);

    if (!hasMedicationLookup) {
      await createFallbackBillingLine(prisma, {
        facilityId: input.facilityId,
        encounterId: adm.encounterId,
        patientId: adm.patientId,
        sourceModule: BillingSourceModule.MED_ADMIN,
        sourceRecordId: adm.id,
        captureSourceType: "MED_ADMIN",
        description: labelFallback,
        billClass: defaultBillClassForTrigger("MEDICATION"),
      });
      return;
    }

    const deriveInput =
      cat?.genericName?.trim() != null && cat.genericName.trim().length > 0
        ? {
            genericName: cat.genericName,
            strength: cat.strength ?? "",
            dosageForm: cat.dosageForm ?? "comprimé",
            route: cat.route ?? "orale",
          }
        : null;

    let mapping: CatalogBillingMapping | null = null;
    for (const key of collectMedicationMarLookupOrder({
      catalogMedicationCode: cat?.code?.trim() ? cat.code.trim() : null,
      orderManualLabel: oi.manualLabel?.trim() ?? null,
      medicationLabelSnapshot: adm.medicationLabelSnapshot?.trim() ?? null,
      deriveInput,
    })) {
      if (!key) continue;
      mapping = await mapMedicationToBillingCode(prisma, key);
      if (mapping) break;
    }

    if (!mapping) {
      await createFallbackBillingLine(prisma, {
        facilityId: input.facilityId,
        encounterId: adm.encounterId,
        patientId: adm.patientId,
        sourceModule: BillingSourceModule.MED_ADMIN,
        sourceRecordId: adm.id,
        captureSourceType: "MED_ADMIN",
        description: labelFallback,
        billClass: defaultBillClassForTrigger("MEDICATION"),
      });
      return;
    }

    const adminCptInf = inferMedicationAdministrationCpt({
      administrationRoute: adm.route ?? null,
      catalogRoute: cat?.route ?? null,
    });

    await appendFromMapping(prisma, {
      facilityId: input.facilityId,
      encounterId: adm.encounterId,
      patientId: adm.patientId,
      sourceModule: BillingSourceModule.MED_ADMIN,
      sourceRecordId: adm.id,
      captureSourceType: "MED_ADMIN",
      mapping,
      descriptionFallback: labelFallback,
      companionProcedureCpt: mapping.system === "HCPCS" ? adminCptInf?.cpt ?? null : null,
      companionDescriptionNote: adminCptInf?.description ?? null,
    });
  } catch (e) {
    console.warn(
      "[billing-auto] tryAutoMedicationAdministrationBilling:",
      e instanceof Error ? e.message : e
    );
  }
}

/** After a supply order line is completed (Phase 4.6). */
export async function tryAutoSupplyOrderItemCompleted(
  prisma: PrismaService,
  input: { facilityId: string; orderItemId: string }
): Promise<void> {
  try {
    const orderItem = await prisma.orderItem.findFirst({
      where: { id: input.orderItemId },
      include: { order: true },
    });
    if (!orderItem || orderItem.catalogItemType !== "SUPPLY") return;

    const labelFallback = orderItem.manualLabel?.trim() || "Supply";
    const supplyCode = orderItem.manualLabel?.trim() || null;
    if (!supplyCode) {
      await createFallbackBillingLine(prisma, {
        facilityId: input.facilityId,
        encounterId: orderItem.order.encounterId,
        patientId: orderItem.order.patientId,
        sourceModule: BillingSourceModule.SUPPLY,
        sourceRecordId: orderItem.id,
        captureSourceType: "SUPPLY",
        description: labelFallback,
        billClass: defaultBillClassForTrigger("SUPPLY"),
      });
      return;
    }

    const mapping = await mapSupplyToBillingCode(prisma, supplyCode);
    if (!mapping) {
      await createFallbackBillingLine(prisma, {
        facilityId: input.facilityId,
        encounterId: orderItem.order.encounterId,
        patientId: orderItem.order.patientId,
        sourceModule: BillingSourceModule.SUPPLY,
        sourceRecordId: orderItem.id,
        captureSourceType: "SUPPLY",
        description: labelFallback,
        billClass: defaultBillClassForTrigger("SUPPLY"),
      });
      return;
    }

    await appendFromMapping(prisma, {
      facilityId: input.facilityId,
      encounterId: orderItem.order.encounterId,
      patientId: orderItem.order.patientId,
      sourceModule: BillingSourceModule.SUPPLY,
      sourceRecordId: orderItem.id,
      captureSourceType: "SUPPLY",
      mapping,
      descriptionFallback: labelFallback,
    });
  } catch (e) {
    console.warn(
      "[billing-auto] tryAutoSupplyOrderItemCompleted:",
      e instanceof Error ? e.message : e
    );
  }
}

/** After a CARE (procedure) order line is completed — map `manualLabel` via BillingCatalog PROCEDURE (Phase 4.6). */
export async function tryAutoProcedureCareOrderItemCompleted(
  prisma: PrismaService,
  input: { facilityId: string; orderItemId: string }
): Promise<void> {
  try {
    const orderItem = await prisma.orderItem.findFirst({
      where: { id: input.orderItemId },
      include: { order: true },
    });
    if (!orderItem || orderItem.catalogItemType !== "CARE") return;

    const labelFallback = orderItem.manualLabel?.trim() || "Procedure / care";
    const procCode = orderItem.manualLabel?.trim() || null;
    if (!procCode) {
      await createFallbackBillingLine(prisma, {
        facilityId: input.facilityId,
        encounterId: orderItem.order.encounterId,
        patientId: orderItem.order.patientId,
        sourceModule: BillingSourceModule.PROCEDURE,
        sourceRecordId: orderItem.id,
        captureSourceType: "PROCEDURE",
        description: labelFallback,
        billClass: defaultBillClassForTrigger("PROCEDURE"),
      });
      return;
    }

    const mapping = await mapProcedureToBillingCode(prisma, procCode);
    if (!mapping) {
      await createFallbackBillingLine(prisma, {
        facilityId: input.facilityId,
        encounterId: orderItem.order.encounterId,
        patientId: orderItem.order.patientId,
        sourceModule: BillingSourceModule.PROCEDURE,
        sourceRecordId: orderItem.id,
        captureSourceType: "PROCEDURE",
        description: labelFallback,
        billClass: defaultBillClassForTrigger("PROCEDURE"),
      });
      return;
    }

    await appendFromMapping(prisma, {
      facilityId: input.facilityId,
      encounterId: orderItem.order.encounterId,
      patientId: orderItem.order.patientId,
      sourceModule: BillingSourceModule.PROCEDURE,
      sourceRecordId: orderItem.id,
      captureSourceType: "PROCEDURE",
      mapping,
      descriptionFallback: labelFallback,
    });
  } catch (e) {
    console.warn(
      "[billing-auto] tryAutoProcedureCareOrderItemCompleted:",
      e instanceof Error ? e.message : e
    );
  }
}
