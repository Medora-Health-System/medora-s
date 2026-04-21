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
import { collectMedicationMarLookupOrder } from "./medication-code-derive.util";
import { inferMedicationAdministrationCpt } from "./medication-admin-cpt.util";
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
    let marAdministrationRoute: string | null = null;
    let medCatalogRoute: string | null = null;

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
        let labCat: { code: string | null; name: string } | null = null;
        if (oi.catalogItemId) {
          labCat = await prisma.catalogLabTest.findUnique({
            where: { id: oi.catalogItemId },
            select: { code: true, name: true },
          });
          if (labCat?.code?.trim()) {
            labCode = labCat.code.trim();
            labelFallback = labCat.name?.trim() || labelFallback;
          }
        }
        if (!labCode && oi.manualLabel?.trim()) labCode = oi.manualLabel.trim();
        if (!labCode) return "skipped";
        mapping = await mapLabToBillingCode(prisma, labCode);
        if (!mapping && labCat?.name?.trim() && labCat.name.trim() !== labCode) {
          mapping = await mapLabToBillingCode(prisma, labCat.name.trim());
        }
        if (!mapping && oi.manualLabel?.trim() && oi.manualLabel.trim() !== labCode) {
          mapping = await mapLabToBillingCode(prisma, oi.manualLabel.trim());
        }
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
        let imgCat: { code: string | null; name: string } | null = null;
        if (orderItem.catalogItemId) {
          imgCat = await prisma.catalogImagingStudy.findUnique({
            where: { id: orderItem.catalogItemId },
            select: { code: true, name: true },
          });
          if (imgCat?.code?.trim()) {
            studyCode = imgCat.code.trim();
            labelFallback = imgCat.name?.trim() || labelFallback;
          }
        }
        if (!studyCode && orderItem.manualLabel?.trim()) studyCode = orderItem.manualLabel.trim();
        if (!studyCode) return "skipped";
        mapping = await mapImagingToBillingCode(prisma, studyCode);
        if (!mapping && imgCat?.name?.trim() && imgCat.name.trim() !== studyCode) {
          mapping = await mapImagingToBillingCode(prisma, imgCat.name.trim());
        }
        if (!mapping && orderItem.manualLabel?.trim() && orderItem.manualLabel.trim() !== studyCode) {
          mapping = await mapImagingToBillingCode(prisma, orderItem.manualLabel.trim());
        }
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

        marAdministrationRoute = adm.route?.trim() ?? null;

        const oi = adm.orderItem;
        labelFallback =
          adm.medicationLabelSnapshot?.trim() || oi.manualLabel?.trim() || labelFallback;
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
            labelFallback = cat.displayNameFr?.trim() || cat.name?.trim() || labelFallback;
          }
          medCatalogRoute = cat?.route?.trim() ?? null;
        }

        const hasMedicationLookup =
          !!cat?.code?.trim() ||
          !!oi.manualLabel?.trim() ||
          !!adm.medicationLabelSnapshot?.trim() ||
          !!(cat?.genericName?.trim() != null && cat.genericName.trim().length > 0);
        if (!hasMedicationLookup) return "skipped";

        const deriveInput =
          cat?.genericName?.trim() != null && cat.genericName.trim().length > 0
            ? {
                genericName: cat.genericName,
                strength: cat.strength ?? "",
                dosageForm: cat.dosageForm ?? "comprimé",
                route: cat.route ?? "orale",
              }
            : null;

        mapping = null;
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
          let labCat2: { code: string | null; name: string } | null = null;
          if (orderItem.catalogItemId) {
            labCat2 = await prisma.catalogLabTest.findUnique({
              where: { id: orderItem.catalogItemId },
              select: { code: true, name: true },
            });
            if (labCat2?.code?.trim()) {
              labCode = labCat2.code.trim();
              labelFallback = labCat2.name?.trim() || labelFallback;
            }
          }
          if (!labCode && orderItem.manualLabel?.trim()) labCode = orderItem.manualLabel.trim();
          if (!labCode) return "skipped";
          mapping = await mapLabToBillingCode(prisma, labCode);
          if (!mapping && labCat2?.name?.trim() && labCat2.name.trim() !== labCode) {
            mapping = await mapLabToBillingCode(prisma, labCat2.name.trim());
          }
          if (!mapping && orderItem.manualLabel?.trim() && orderItem.manualLabel.trim() !== labCode) {
            mapping = await mapLabToBillingCode(prisma, orderItem.manualLabel.trim());
          }
        } else if (orderItem.catalogItemType === "IMAGING_STUDY") {
          let studyCode: string | null = null;
          labelFallback = orderItem.manualLabel?.trim() || "Imaging";
          let imgCat2: { code: string | null; name: string } | null = null;
          if (orderItem.catalogItemId) {
            imgCat2 = await prisma.catalogImagingStudy.findUnique({
              where: { id: orderItem.catalogItemId },
              select: { code: true, name: true },
            });
            if (imgCat2?.code?.trim()) {
              studyCode = imgCat2.code.trim();
              labelFallback = imgCat2.name?.trim() || labelFallback;
            }
          }
          if (!studyCode && orderItem.manualLabel?.trim()) studyCode = orderItem.manualLabel.trim();
          if (!studyCode) return "skipped";
          mapping = await mapImagingToBillingCode(prisma, studyCode);
          if (!mapping && imgCat2?.name?.trim() && imgCat2.name.trim() !== studyCode) {
            mapping = await mapImagingToBillingCode(prisma, imgCat2.name.trim());
          }
          if (!mapping && orderItem.manualLabel?.trim() && orderItem.manualLabel.trim() !== studyCode) {
            mapping = await mapImagingToBillingCode(prisma, orderItem.manualLabel.trim());
          }
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

    let ledgerFields = buildLedgerFieldsFromMapping(mapping, labelFallback);
    if (
      (row.sourceModule === BillingSourceModule.MED_ADMIN ||
        row.sourceModule === BillingSourceModule.MEDICATION_ADMINISTRATION) &&
      mapping.system === "HCPCS"
    ) {
      const admCpt = inferMedicationAdministrationCpt({
        administrationRoute: marAdministrationRoute,
        catalogRoute: medCatalogRoute,
      });
      if (admCpt) {
        ledgerFields = {
          ...ledgerFields,
          procedureCode: admCpt.cpt.slice(0, 32),
          code: admCpt.cpt.slice(0, 32),
          codeType: BillingCodeType.CPT,
          descriptionSnapshot: `${ledgerFields.descriptionSnapshot ?? ""}; ${admCpt.description}`.slice(0, 8000),
        };
      }
    }
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
