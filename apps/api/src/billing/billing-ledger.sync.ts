import { Logger } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  BillingCodeType,
  BillingReviewStatus,
  BillingSide,
  BillingSourceModule,
} from "@prisma/client";
import type { BillingBillClass, BillingCaptureItem, BillingEventStatus } from "@medora/shared";

function primaryBillingCodeForLedger(item: BillingCaptureItem): string | null {
  const p = item.procedureCode?.trim();
  if (p) return p.slice(0, 32);
  const h = item.hcpcsCode?.trim();
  if (h) return h.slice(0, 32);
  const d0 = item.diagnosisCodes?.[0]?.trim();
  if (d0) return d0.slice(0, 32);
  return null;
}

function buildLedgerDescriptionSnapshot(item: BillingCaptureItem): string | null {
  const note = item.note?.trim() ?? "";
  const cat = item.catalogLabel?.trim() ?? "";
  if (note && cat && !note.includes(cat)) {
    return `${note} (${cat})`.slice(0, 8000);
  }
  if (note) return note.slice(0, 8000);
  if (cat) return cat.slice(0, 8000);
  return null;
}

const log = new Logger("BillingLedger");

type BillingDb = Pick<PrismaClient, "billingEvent">;

function mapSourceType(st: string): BillingSourceModule {
  const m: Record<string, BillingSourceModule> = {
    DIAGNOSIS: BillingSourceModule.DIAGNOSIS,
    ORDER_ITEM: BillingSourceModule.ORDER_ITEM,
    MEDICATION_DISPENSE: BillingSourceModule.MEDICATION_DISPENSE,
    MEDICATION_ADMINISTRATION: BillingSourceModule.MEDICATION_ADMINISTRATION,
    ENCOUNTER_DISPOSITION: BillingSourceModule.ENCOUNTER_DISPOSITION,
    MANUAL: BillingSourceModule.MANUAL,
    VACCINE_ADMINISTRATION: BillingSourceModule.VACCINE_ADMINISTRATION,
    LAB_RESULT: BillingSourceModule.LAB_RESULT,
    IMAGING_RESULT: BillingSourceModule.IMAGING_RESULT,
    MED_ADMIN: BillingSourceModule.MED_ADMIN,
    PROCEDURE: BillingSourceModule.PROCEDURE,
    ENCOUNTER_EM: BillingSourceModule.ENCOUNTER_EM,
    SUPPLY: BillingSourceModule.SUPPLY,
  };
  return m[st] ?? BillingSourceModule.MANUAL;
}

function mapBillClass(bc: BillingBillClass | null | undefined): BillingSide {
  if (bc === "professional") return BillingSide.PROFESSIONAL;
  if (bc === "facility") return BillingSide.FACILITY;
  if (bc === "both") return BillingSide.BOTH;
  return BillingSide.UNKNOWN;
}

/** Maps shared capture row status to ledger review status (Phase 1). */
function mapReviewStatus(status: BillingEventStatus): BillingReviewStatus {
  if (status === "ready") return BillingReviewStatus.REVIEWED;
  return BillingReviewStatus.CAPTURED;
}

function inferCodeType(item: BillingCaptureItem): BillingCodeType {
  const pc = item.procedureCode?.trim();
  if (pc === "UNMAPPED") return BillingCodeType.INTERNAL;
  if (pc) return BillingCodeType.CPT;
  if (item.hcpcsCode?.trim()) return BillingCodeType.HCPCS;
  if (item.diagnosisCodes && item.diagnosisCodes.length > 0) return BillingCodeType.ICD10_CM;
  return BillingCodeType.UNKNOWN;
}

/**
 * Idempotent upsert keyed by (facilityId, sourceModule, sourceRecordId).
 * Best-effort: failures are logged and never thrown (clinical workflows must not fail).
 */
export async function upsertBillingEventFromCaptureItem(db: BillingDb, item: BillingCaptureItem): Promise<void> {
  const facilityId = item.facilityId?.trim();
  const patientId = item.patientId?.trim();
  const encounterId = item.encounterId?.trim();
  const sourceRecordId = (item.sourceId && item.sourceId.trim()) || item.id;
  if (!facilityId || !patientId || !encounterId || !sourceRecordId) {
    log.warn("Ledger sync skipped: missing facilityId, patientId, encounterId, or sourceRecordId");
    return;
  }

  const sourceModule = mapSourceType(item.sourceType);
  const serviceDate =
    item.serviceDate && !Number.isNaN(Date.parse(item.serviceDate)) ? new Date(item.serviceDate) : null;
  const mods = item.modifiers ?? [];
  const diagnosisCodesStr =
    item.diagnosisCodes && item.diagnosisCodes.length > 0 ? item.diagnosisCodes.join(";").slice(0, 4000) : null;

  const metadata: Prisma.InputJsonValue = {
    capturePipeline: "billingCaptureV1",
    sourceType: item.sourceType,
    linkedDiagnosisIds: item.linkedDiagnosisIds ?? [],
    renderingProviderId: item.renderingProviderId ?? null,
    department: item.department ?? null,
    catalogEnriched: item.catalogEnriched === true,
    catalogLabel: item.catalogLabel?.trim() ?? null,
    procedureCatalogId: item.procedureCatalogId?.trim() ?? null,
    procedureManualNonCatalog: item.procedureManualNonCatalog === true,
    ndc11: item.ndc11?.trim() ?? null,
    ndcDisplay: item.ndcDisplay?.trim() ?? null,
    doseValue: item.doseValue ?? null,
    doseUnit: item.doseUnit?.trim() ?? null,
    administeredQuantity: item.administeredQuantity ?? null,
    billingQuantity: item.billingQuantity ?? null,
    quantityUnit: item.quantityUnit?.trim() ?? null,
    billingOrderItemId: item.billingOrderItemId?.trim() ?? null,
    infusionSessionKey: item.infusionSessionKey?.trim() ?? null,
    infusionStartedAt: item.infusionStartedAt?.trim() ?? null,
    infusionStoppedAt: item.infusionStoppedAt?.trim() ?? null,
    infusionDurationMinutes: item.infusionDurationMinutes ?? null,
    infusionDurationBillingManualReview: item.infusionDurationBillingManualReview === true,
    infusionBillingSuggestion: item.infusionBillingSuggestion ?? null,
  };

  try {
    await db.billingEvent.upsert({
      where: {
        facilityId_sourceModule_sourceRecordId: {
          facilityId,
          sourceModule,
          sourceRecordId,
        },
      },
      create: {
        facilityId,
        patientId,
        encounterId,
        captureItemId: item.id,
        sourceModule,
        sourceRecordId,
        eventType: "CHARGE_CAPTURE",
        serviceDate,
        units: item.units != null ? Math.min(Math.floor(item.units), 999999) : null,
        codeType: inferCodeType(item),
        code: primaryBillingCodeForLedger(item),
        procedureCode: item.procedureCode?.trim() || null,
        hcpcsCode: item.hcpcsCode?.trim() || null,
        diagnosisCodes: diagnosisCodesStr,
        descriptionSnapshot: buildLedgerDescriptionSnapshot(item),
        priceSnapshot: null,
        modifier1: mods[0]?.slice(0, 8) || null,
        modifier2: mods[1]?.slice(0, 8) || null,
        revenueCode: item.revenueCode?.trim() || null,
        billingSide: mapBillClass(item.billClass),
        reviewStatus: mapReviewStatus(item.status),
        metadata,
      },
      update: {
        encounterId,
        patientId,
        captureItemId: item.id,
        serviceDate,
        units: item.units != null ? Math.min(Math.floor(item.units), 999999) : null,
        codeType: inferCodeType(item),
        code: primaryBillingCodeForLedger(item),
        procedureCode: item.procedureCode?.trim() || null,
        hcpcsCode: item.hcpcsCode?.trim() || null,
        diagnosisCodes: diagnosisCodesStr,
        descriptionSnapshot: buildLedgerDescriptionSnapshot(item),
        modifier1: mods[0]?.slice(0, 8) || null,
        modifier2: mods[1]?.slice(0, 8) || null,
        revenueCode: item.revenueCode?.trim() || null,
        billingSide: mapBillClass(item.billClass),
        reviewStatus: mapReviewStatus(item.status),
        metadata,
      },
    });
  } catch (e) {
    log.warn(
      `Ledger upsert failed (${sourceModule}/${sourceRecordId}): ${e instanceof Error ? e.message : String(e)}`
    );
  }
}
