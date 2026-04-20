import type { BillingCaptureItem } from "@medora/shared";
import type { PrismaClient } from "@prisma/client";

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
          if (lab?.name) catalogLabel = catalogLabel ?? lab.name;
        } else if (cit === "IMAGING_STUDY") {
          const img = await db.catalogImagingStudy.findUnique({ where: { id: oi.catalogItemId } });
          if (img?.billingCodeDefault?.trim()) {
            next.procedureCode = img.billingCodeDefault.trim();
            appliedCatalogCode = true;
          }
          if (img?.name) catalogLabel = catalogLabel ?? img.name;
        } else if (cit === "MEDICATION") {
          const med = await db.catalogMedication.findUnique({ where: { id: oi.catalogItemId } });
          if (med?.billingCodeDefault?.trim()) {
            next.hcpcsCode = med.billingCodeDefault.trim();
            appliedCatalogCode = true;
          }
          if (med?.name) catalogLabel = catalogLabel ?? med.name;
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
          catalogLabel = catalogLabel ?? cm.name;
        } else if (d.orderItem?.catalogItemId && d.orderItem.catalogItemType === "MEDICATION") {
          const med = await db.catalogMedication.findUnique({ where: { id: d.orderItem.catalogItemId } });
          if (med?.billingCodeDefault?.trim()) {
            next.hcpcsCode = med.billingCodeDefault.trim();
            appliedCatalogCode = true;
          }
          if (med?.name) catalogLabel = catalogLabel ?? med.name;
        }
        break;
      }
      case "MEDICATION_ADMINISTRATION": {
        const sid = item.sourceId?.trim();
        if (!sid) break;
        const adm = await db.medicationAdministration.findFirst({
          where: { id: sid, facilityId: fid, encounterId: encId },
          include: { orderItem: true },
        });
        if (!adm?.orderItem?.catalogItemId || adm.orderItem.catalogItemType !== "MEDICATION") break;
        const med = await db.catalogMedication.findUnique({ where: { id: adm.orderItem.catalogItemId } });
        if (med?.billingCodeDefault?.trim()) {
          next.hcpcsCode = med.billingCodeDefault.trim();
          appliedCatalogCode = true;
        }
        if (med?.name) catalogLabel = catalogLabel ?? med.name;
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
