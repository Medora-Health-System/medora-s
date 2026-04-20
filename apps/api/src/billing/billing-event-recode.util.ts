import type { Prisma } from "@prisma/client";
import {
  BillingCodeType,
  BillingReviewStatus,
  BillingSide,
  BillingSourceModule,
  EncounterBillingFinalizationStatus,
  EncounterType,
  type BillingEvent,
} from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import {
  mapImagingToBillingCode,
  mapLabToBillingCode,
  mapMedicationToBillingCode,
  mapProcedureToBillingCode,
  mapSupplyToBillingCode,
  type CatalogBillingMapping,
} from "./billing-map-from-event.util";
import { deriveMedicationCodeForBilling } from "./medication-code-derive.util";
import { inferEmergencyEMCode } from "./billing-em.util";
import { syncBillingCaptureItemFromLedgerRow } from "./billing-capture-sync-from-ledger.util";

export type RecodeBillingEventOutcome = "recoded" | "unchanged" | "skipped" | "error";

export type RecodeBillingEventOptions = {
  /** When true, do not write; return recoded if mapping would apply. */
  dryRun?: boolean;
};

function isUnmappedBillingEvent(row: Pick<BillingEvent, "procedureCode" | "hcpcsCode" | "code">): boolean {
  const u = (s: string | null | undefined) => s?.trim().toUpperCase() === "UNMAPPED";
  return u(row.procedureCode) || u(row.hcpcsCode) || u(row.code);
}

function billSideFromMapping(bc: CatalogBillingMapping["billClass"]): BillingSide {
  if (bc === "professional") return BillingSide.PROFESSIONAL;
  if (bc === "facility") return BillingSide.FACILITY;
  return BillingSide.BOTH;
}

function buildLedgerFieldsFromMapping(
  m: CatalogBillingMapping,
  descriptionFallback: string
): Pick<BillingEvent, "procedureCode" | "hcpcsCode" | "code" | "codeType" | "billingSide" | "descriptionSnapshot"> {
  const desc = (m.description || descriptionFallback).slice(0, 8000);
  const codePrimary = m.code.trim().slice(0, 32);
  if (m.system === "CPT") {
    return {
      procedureCode: m.code.trim().slice(0, 32),
      hcpcsCode: null,
      code: codePrimary,
      codeType: BillingCodeType.CPT,
      billingSide: billSideFromMapping(m.billClass),
      descriptionSnapshot: desc,
    };
  }
  return {
    procedureCode: null,
    hcpcsCode: m.code.trim().slice(0, 32),
    code: codePrimary,
    codeType: BillingCodeType.HCPCS,
    billingSide: billSideFromMapping(m.billClass),
    descriptionSnapshot: desc,
  };
}

/**
 * Safe backfill: retry BillingCatalog mapping for existing ledger rows that are still UNMAPPED.
 * Does not throw per row; skips finalized encounters, voided/skipped lines, and unsupported modules.
 */
export async function recodeBillingEventIfPossible(
  prisma: PrismaService,
  billingEventId: string,
  options?: RecodeBillingEventOptions
): Promise<RecodeBillingEventOutcome> {
  const dryRun = options?.dryRun === true;
  try {
    const row = await prisma.billingEvent.findFirst({
      where: { id: billingEventId },
    });
    if (!row) return "skipped";

    if (!isUnmappedBillingEvent(row)) return "unchanged";

    if (row.reviewStatus === BillingReviewStatus.VOIDED || row.reviewStatus === BillingReviewStatus.SKIPPED) {
      return "skipped";
    }

    const enc = await prisma.encounter.findFirst({
      where: { id: row.encounterId, facilityId: row.facilityId },
      select: { billingFinalizationStatus: true },
    });
    if (!enc) return "skipped";
    if (enc.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED) {
      return "skipped";
    }

    let mapping: CatalogBillingMapping | null = null;
    let labelFallback = row.descriptionSnapshot?.trim() || "Billing line";

    switch (row.sourceModule) {
      case BillingSourceModule.DIAGNOSIS:
        return "skipped";

      case BillingSourceModule.ENCOUNTER_DISPOSITION:
      case BillingSourceModule.MANUAL:
      case BillingSourceModule.VACCINE_ADMINISTRATION:
      case BillingSourceModule.MEDICATION_DISPENSE:
        return "skipped";

      case BillingSourceModule.LAB_RESULT: {
        const result = await prisma.result.findFirst({
          where: { id: row.sourceRecordId, facilityId: row.facilityId },
          include: {
            orderItem: { include: { order: true } },
          },
        });
        if (!result?.orderItem || result.orderItem.catalogItemType !== "LAB_TEST") return "skipped";

        const oi = result.orderItem;
        let labCode: string | null = null;
        labelFallback = oi.manualLabel?.trim() || labelFallback;
        if (oi.catalogItemId) {
          const cat = await prisma.catalogLabTest.findUnique({
            where: { id: oi.catalogItemId },
            select: { code: true, name: true },
          });
          if (cat?.code?.trim()) {
            labCode = cat.code.trim();
            labelFallback = cat.name?.trim() || labelFallback;
          }
        }
        if (!labCode && oi.manualLabel?.trim()) labCode = oi.manualLabel.trim();
        if (!labCode) return "skipped";
        mapping = await mapLabToBillingCode(prisma, labCode);
        if (!mapping) return "skipped";
        break;
      }

      case BillingSourceModule.IMAGING_RESULT: {
        const orderItem = await prisma.orderItem.findFirst({
          where: { id: row.sourceRecordId },
          include: { order: true },
        });
        if (!orderItem || orderItem.order.facilityId !== row.facilityId) return "skipped";
        if (orderItem.catalogItemType !== "IMAGING_STUDY") return "skipped";

        let studyCode: string | null = null;
        labelFallback = orderItem.manualLabel?.trim() || "Imaging";
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
        if (!studyCode) return "skipped";
        mapping = await mapImagingToBillingCode(prisma, studyCode);
        if (!mapping) return "skipped";
        break;
      }

      case BillingSourceModule.MED_ADMIN:
      case BillingSourceModule.MEDICATION_ADMINISTRATION: {
        const adm = await prisma.medicationAdministration.findFirst({
          where: { id: row.sourceRecordId, facilityId: row.facilityId },
          include: { orderItem: { include: { order: true } } },
        });
        if (!adm?.orderItem || adm.orderItem.catalogItemType !== "MEDICATION") return "skipped";

        const oi = adm.orderItem;
        let medCode: string | null = null;
        labelFallback = adm.medicationLabelSnapshot?.trim() || labelFallback;
        let cat: {
          code: string | null;
          genericName: string | null;
          strength: string | null;
          dosageForm: string | null;
          route: string | null;
          name: string;
          displayNameFr: string | null;
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
            medCode = cat.code.trim();
            labelFallback = cat.displayNameFr?.trim() || cat.name?.trim() || labelFallback;
          }
        }
        if (!medCode && oi.manualLabel?.trim()) medCode = oi.manualLabel.trim();
        if (!medCode) return "skipped";

        mapping = await mapMedicationToBillingCode(prisma, medCode);
        if (!mapping && cat?.genericName) {
          const derived = deriveMedicationCodeForBilling({
            genericName: cat.genericName,
            strength: cat.strength ?? "",
            dosageForm: cat.dosageForm ?? "comprimé",
            route: cat.route ?? "orale",
          });
          if (derived && derived !== medCode) {
            mapping = await mapMedicationToBillingCode(prisma, derived);
          }
        }
        if (!mapping) return "skipped";
        break;
      }

      case BillingSourceModule.PROCEDURE: {
        const orderItem = await prisma.orderItem.findFirst({
          where: { id: row.sourceRecordId },
          include: { order: true },
        });
        if (!orderItem || orderItem.order.facilityId !== row.facilityId) return "skipped";
        if (orderItem.catalogItemType !== "CARE") return "skipped";
        const procCode = orderItem.manualLabel?.trim();
        if (!procCode) return "skipped";
        labelFallback = procCode;
        mapping = await mapProcedureToBillingCode(prisma, procCode);
        if (!mapping) return "skipped";
        break;
      }

      case BillingSourceModule.SUPPLY: {
        const orderItem = await prisma.orderItem.findFirst({
          where: { id: row.sourceRecordId },
          include: { order: true },
        });
        if (!orderItem || orderItem.order.facilityId !== row.facilityId) return "skipped";
        if (orderItem.catalogItemType !== "SUPPLY") return "skipped";
        const supplyCode = orderItem.manualLabel?.trim();
        if (!supplyCode) return "skipped";
        labelFallback = supplyCode;
        mapping = await mapSupplyToBillingCode(prisma, supplyCode);
        if (!mapping) return "skipped";
        break;
      }

      case BillingSourceModule.ENCOUNTER_EM: {
        if (row.sourceRecordId !== row.encounterId) return "skipped";
        const full = await prisma.encounter.findFirst({
          where: { id: row.encounterId, facilityId: row.facilityId },
          select: {
            id: true,
            facilityId: true,
            type: true,
            triageAcuity: true,
            triage: { select: { esi: true } },
          },
        });
        if (!full || full.type !== EncounterType.EMERGENCY) return "skipped";
        const cpt = inferEmergencyEMCode({
          type: full.type,
          triage: full.triage,
          triageAcuity: full.triageAcuity,
        });
        if (!cpt) return "skipped";
        mapping = {
          code: cpt,
          system: "CPT",
          billClass: "professional",
          description: "Emergency visit E/M",
        };
        labelFallback = mapping.description;
        break;
      }

      case BillingSourceModule.ORDER_ITEM: {
        const orderItem = await prisma.orderItem.findFirst({
          where: { id: row.sourceRecordId },
          include: { order: true },
        });
        if (!orderItem || orderItem.order.facilityId !== row.facilityId) return "skipped";

        if (orderItem.catalogItemType === "LAB_TEST") {
          let labCode: string | null = null;
          labelFallback = orderItem.manualLabel?.trim() || labelFallback;
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
          if (!labCode && orderItem.manualLabel?.trim()) labCode = orderItem.manualLabel.trim();
          if (!labCode) return "skipped";
          mapping = await mapLabToBillingCode(prisma, labCode);
        } else if (orderItem.catalogItemType === "IMAGING_STUDY") {
          let studyCode: string | null = null;
          labelFallback = orderItem.manualLabel?.trim() || "Imaging";
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
          if (!studyCode) return "skipped";
          mapping = await mapImagingToBillingCode(prisma, studyCode);
        } else {
          return "skipped";
        }
        if (!mapping) return "skipped";
        break;
      }

      default:
        return "skipped";
    }

    if (!mapping) return "skipped";

    const ledgerFields = buildLedgerFieldsFromMapping(mapping, labelFallback);
    const prevMeta =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};

    if (dryRun) {
      return "recoded";
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.billingEvent.update({
        where: { id: row.id },
        data: {
          ...ledgerFields,
          metadata: {
            ...prevMeta,
            recodeBackfill: {
              at: new Date().toISOString(),
              phase: "4.8.1",
              previousProcedureCode: row.procedureCode,
              previousHcpcsCode: row.hcpcsCode,
              previousCode: row.code,
            },
          } as Prisma.InputJsonValue,
        },
      });
      await syncBillingCaptureItemFromLedgerRow(tx, updated);
    });

    return "recoded";
  } catch (e) {
    console.warn(
      `[billing-recode] recodeBillingEventIfPossible(${billingEventId}):`,
      e instanceof Error ? e.message : e
    );
    return "error";
  }
}

export function billingEventLooksUnmappedForBackfill(row: Pick<BillingEvent, "procedureCode" | "hcpcsCode" | "code">): boolean {
  return isUnmappedBillingEvent(row);
}
