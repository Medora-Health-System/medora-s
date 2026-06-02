import type { BillingCaptureItem } from "@medora/shared";
import type { PrismaClient } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import {
  applyMedicationAdministrationBillingResolutionToCaptureItem,
  resolveMedicationAdministrationBilling,
} from "./medication-administration-billing-resolve.util";

/** DB handle for enrichment (PrismaService or transaction client). */
export type BillingEnrichmentDb = Pick<
  PrismaClient,
  | "orderItem"
  | "catalogLabTest"
  | "catalogImagingStudy"
  | "catalogMedication"
  | "medicationDispense"
  | "medicationAdministration"
  | "vaccineAdministration"
  | "billingProcedureCode"
>;

/**
 * Best-effort: join catalog billing defaults and labels for capture items.
 * Never throws; clinical callers stay safe if catalogs are missing.
 */
export async function enrichBillingCaptureItem(db: BillingEnrichmentDb, item: BillingCaptureItem): Promise<BillingCaptureItem> {
  const next: BillingCaptureItem = { ...item };
  const fid = item.facilityId?.trim();
  const encId = item.encounterId?.trim();
  if (!fid || !encId) return next;

  let catalogLabel = next.catalogLabel?.trim();
  let appliedCatalogCode = false;

  try {
    switch (item.sourceType) {
      case "ORDER_ITEM": {
        const sid = item.sourceId?.trim();
        if (!sid) break;
        const oi = await db.orderItem.findFirst({
          where: {
            id: sid,
            order: { encounterId: encId, facilityId: fid },
          },
        });
        if (!oi?.catalogItemId) break;
        const cit = oi.catalogItemType?.trim();
        if (cit === "LAB_TEST") {
          const lab = await db.catalogLabTest.findUnique({ where: { id: oi.catalogItemId } });
          if (lab?.billingCodeDefault?.trim()) {
            next.procedureCode = lab.billingCodeDefault.trim();
            appliedCatalogCode = true;
          }
          if (lab) {
            const labLine = lab.displayNameEn?.trim() || lab.code?.trim() || null;
            if (labLine) catalogLabel = catalogLabel ?? labLine;
          }
        } else if (cit === "IMAGING_STUDY") {
          const img = await db.catalogImagingStudy.findUnique({ where: { id: oi.catalogItemId } });
          if (img?.billingCodeDefault?.trim()) {
            next.procedureCode = img.billingCodeDefault.trim();
            appliedCatalogCode = true;
          }
          if (img) {
            const imgLine = img.displayNameEn?.trim() || img.code?.trim() || null;
            if (imgLine) catalogLabel = catalogLabel ?? imgLine;
          }
        } else if (cit === "MEDICATION") {
          const med = await db.catalogMedication.findUnique({ where: { id: oi.catalogItemId } });
          if (med?.billingCodeDefault?.trim()) {
            next.hcpcsCode = med.billingCodeDefault.trim();
            appliedCatalogCode = true;
          }
          if (med) {
            const medLine = med.displayNameEn?.trim() || med.code?.trim() || null;
            if (medLine) catalogLabel = catalogLabel ?? medLine;
          }
        }
        break;
      }
      case "MEDICATION_DISPENSE": {
        const sid = item.sourceId?.trim();
        if (!sid) break;
        const d = await db.medicationDispense.findFirst({
          where: { id: sid, facilityId: fid, encounterId: encId },
          include: { catalogMedication: true, orderItem: true },
        });
        if (!d) break;
        if (d.catalogMedication) {
          const cm = d.catalogMedication;
          if (cm.billingCodeDefault?.trim()) {
            next.hcpcsCode = cm.billingCodeDefault.trim();
            appliedCatalogCode = true;
          }
          {
            const cmLine = cm.displayNameEn?.trim() || cm.code?.trim() || null;
            if (cmLine) catalogLabel = catalogLabel ?? cmLine;
          }
          if (!next.ndc11 && cm.ndc11?.trim()) next.ndc11 = cm.ndc11.trim();
          if (!next.ndcDisplay && cm.ndcDisplay?.trim()) next.ndcDisplay = cm.ndcDisplay.trim();
          if (!next.quantityUnit && cm.billingUnitType?.trim()) next.quantityUnit = cm.billingUnitType.trim();
        } else if (d.orderItem?.catalogItemId && d.orderItem.catalogItemType === "MEDICATION") {
          const med = await db.catalogMedication.findUnique({ where: { id: d.orderItem.catalogItemId } });
          if (med?.billingCodeDefault?.trim()) {
            next.hcpcsCode = med.billingCodeDefault.trim();
            appliedCatalogCode = true;
          }
          if (med) {
            const medLine = med.displayNameEn?.trim() || med.code?.trim() || null;
            if (medLine) catalogLabel = catalogLabel ?? medLine;
          }
          if (!next.ndc11 && med?.ndc11?.trim()) next.ndc11 = med.ndc11.trim();
          if (!next.ndcDisplay && med?.ndcDisplay?.trim()) next.ndcDisplay = med.ndcDisplay.trim();
          if (!next.quantityUnit && med?.billingUnitType?.trim()) next.quantityUnit = med.billingUnitType.trim();
        }
        break;
      }
      case "MEDICATION_ADMINISTRATION": {
        const sid = item.sourceId?.trim();
        if (!sid) break;
        const resolution = await resolveMedicationAdministrationBilling(db as unknown as PrismaService, {
          facilityId: fid,
          encounterId: encId,
          medicationAdministrationId: sid,
        });
        if (!resolution) break;
        Object.assign(
          next,
          applyMedicationAdministrationBillingResolutionToCaptureItem(next, resolution)
        );
        if (resolution.labelFallback) {
          catalogLabel = catalogLabel ?? resolution.labelFallback;
        }
        if (resolution.hcpcsCode) appliedCatalogCode = true;
        break;
      }
      case "VACCINE_ADMINISTRATION": {
        const sid = item.sourceId?.trim();
        if (!sid) break;
        const va = await db.vaccineAdministration.findFirst({
          where: { id: sid, facilityId: fid },
          include: { vaccineCatalog: true },
        });
        if (!va?.vaccineCatalog) break;
        if (encId && va.encounterId && va.encounterId !== encId) break;
        const vc = va.vaccineCatalog;
        if (vc.billingCodeDefault?.trim()) {
          next.procedureCode = vc.billingCodeDefault.trim();
          appliedCatalogCode = true;
        }
        catalogLabel = catalogLabel ?? vc.name;
        break;
      }
      case "PROCEDURE": {
        const pcid = next.procedureCatalogId?.trim();
        if (!pcid) break;
        const row = await db.billingProcedureCode.findFirst({
          where: { id: pcid, isActive: true },
        });
        if (!row) break;
        catalogLabel = catalogLabel ?? row.shortDescription;
        if (row.codeSystem === "CPT") {
          next.procedureCode = row.code.trim().slice(0, 32);
          next.hcpcsCode = null;
        } else {
          next.hcpcsCode = row.code.trim().slice(0, 32);
          next.procedureCode = null;
        }
        appliedCatalogCode = true;
        break;
      }
      default:
        break;
    }
  } catch {
    return next;
  }

  if (catalogLabel) next.catalogLabel = catalogLabel.slice(0, 512);
  if (appliedCatalogCode) next.catalogEnriched = true;
  return next;
}
