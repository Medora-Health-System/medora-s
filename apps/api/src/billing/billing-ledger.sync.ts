import { Logger } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  BillingCodeType,
  BillingReviewStatus,
  BillingSide,
  BillingSourceModule,
} from "@prisma/client";
import type { BillingBillClass, BillingCaptureItem, BillingEventStatus } from "@medora/shared";

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
  if (item.procedureCode?.trim()) return BillingCodeType.CPT;
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
        code: null,
        procedureCode: item.procedureCode?.trim() || null,
        hcpcsCode: item.hcpcsCode?.trim() || null,
        diagnosisCodes: diagnosisCodesStr,
        descriptionSnapshot: item.note?.trim() ? item.note.trim().slice(0, 8000) : null,
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
        procedureCode: item.procedureCode?.trim() || null,
        hcpcsCode: item.hcpcsCode?.trim() || null,
        diagnosisCodes: diagnosisCodesStr,
        descriptionSnapshot: item.note?.trim() ? item.note.trim().slice(0, 8000) : null,
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
