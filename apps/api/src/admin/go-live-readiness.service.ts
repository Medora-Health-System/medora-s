import { Injectable } from "@nestjs/common";
import { AuditAction, EncounterClinicalEventType, EncounterStatus, EncounterType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ReportsService } from "../reports/reports.service";
import type { EdReportsQueryDto } from "../reports/dto/ed-reports-query.dto";
import { computeDispositionSafetyReadiness } from "../encounters/disposition-safety-readiness.util";
import { auditPresetWhere, classifyAuditUiCategory } from "./audit-category.util";
import { auditHighlightTags } from "./audit-metadata-summary.util";

/** Aligné sur la fusion côté `EncountersService` (brouillon sortie structuré seulement). */
const DISCHARGE_SUMMARY_STRING_KEYS = [
  "disposition",
  "exitCondition",
  "dischargeInstructions",
  "medicationsGiven",
  "followUp",
  "returnIfWorse",
  "patientDestination",
  "dischargeMode",
  "dischargeDiagnosisSummary",
  "medicationInstructions",
  "returnPrecautions",
  "followUpInstructions",
  "activityInstructions",
  "woundCareInstructions",
  "workSchoolNote",
  "instructionsGivenBy",
  "instructionsGivenAt",
] as const;

function dischargeSummaryFromEncounter(existing: unknown): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
    return undefined;
  }
  const o = existing as Record<string, unknown>;
  for (const k of DISCHARGE_SUMMARY_STRING_KEYS) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) {
      out[k] = v.trim();
    }
  }
  const g0 = o.patientInstructionsGiven;
  if (typeof g0 === "boolean") {
    out.patientInstructionsGiven = g0;
  }
  return Object.keys(out).length ? out : undefined;
}

function utcTodayRange(): EdReportsQueryDto {
  const day = new Date().toISOString().slice(0, 10);
  return { from: day, to: day, format: "json", limit: 500 };
}

function avgMinutesNumeric(vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((m): m is number => m != null && Number.isFinite(m));
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function readAlertWebhookConfigured(): boolean {
  const u = process.env.MEDORA_ALERT_WEBHOOK_URL?.trim();
  return Boolean(u && u.length > 0);
}

function readAlertsEnabled(): boolean {
  const raw = process.env.MEDORA_ALERT_ENABLED?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no" || raw === "off") return false;
  return true;
}

function readExternalBillingAutoExportEnabled(): boolean {
  const raw = process.env.MEDORA_EXTERNAL_BILLING_AUTO_EXPORT_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function readExternalBillingVendorWebhookConfigured(): boolean {
  return Boolean(process.env.MEDORA_EXTERNAL_BILLING_VENDOR_WEBHOOK_URL?.trim());
}

export type GoLiveCheckStatus = "pass" | "warn" | "fail";
export type GoLiveOverallStatus = "ready" | "attention" | "blocked";

export type GoLiveReadinessCheck = {
  key: string;
  label: string;
  status: GoLiveCheckStatus;
  value: string | number | boolean | null;
  /** Optional i18n slug for `goLiveReadiness.details.*` on the web (no free text). */
  detail: string | null;
};

type GoLiveDoorProvMetricRow = { minutesToProvider?: number | null };
type GoLiveDoorDoorMetricRow = { durationMinutes?: number };
type GoLiveCriticalAuditRow = {
  id: string;
  createdAt: Date;
  action: AuditAction;
  entityType: string;
  encounterId: string | null;
  metadata: Prisma.JsonValue | null;
};

@Injectable()
export class GoLiveReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService
  ) {}

  async getSnapshot(facilityId: string) {
    const generatedAt = new Date().toISOString();
    const todayQuery = utcTodayRange();

    const [
      openEdEncounters,
      doorProv,
      doorDoor,
      medMar,
      lastBillingExport,
      billingFailureAudits,
      criticalAudits,
    ] = await Promise.all([
      this.loadOpenEdEncountersWithSafety(facilityId),
      this.reports.doorToProviderJson(facilityId, todayQuery),
      this.reports.doorToDoorJson(facilityId, todayQuery),
      this.reports.medicationAdministrationJson(facilityId, todayQuery),
      this.prisma.auditLog.findFirst({
        where: {
          facilityId,
          entityType: { in: ["EXTERNAL_BILLING_EXPORT", "EXTERNAL_BILLING_AUTO_EXPORT"] },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, metadata: true, entityType: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 48 * 3600_000) },
          entityType: "EXTERNAL_BILLING_AUTO_EXPORT",
        },
        orderBy: { createdAt: "desc" },
        take: 80,
        select: { metadata: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          facilityId,
          createdAt: { gte: new Date(Date.now() - 72 * 3600_000) },
          ...auditPresetWhere("critical_events"),
        },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          createdAt: true,
          action: true,
          entityType: true,
          encounterId: true,
          metadata: true,
        },
      }),
    ]);

    const openEncounters = openEdEncounters.length;
    let blockedClosure = 0;
    let missingVitals = 0;
    let unsignedProviderDocs = 0;
    let unresolvedOrderLines = 0;

    for (const row of openEdEncounters) {
      const readiness = computeDispositionSafetyReadiness({
        encounter: row.encounterSlice,
        effectiveDischargeSummary: row.mergedDischarge,
        patientLatestVitalsAt: row.patientLatestVitalsAt,
        latestTriageVitalsRecordedAt: row.latestTriageVitalsRecordedAt,
        latestVitalsClinicalEventAt: row.latestVitalsClinicalEventAt,
        orders: row.orders,
      });
      if (!readiness.canClose) blockedClosure += 1;
      const codes = new Set(readiness.blockers.map((b) => b.code));
      if (codes.has("VITALS_MISSING") || codes.has("VITALS_STALE")) missingVitals += 1;
      if (codes.has("PROVIDER_DOCUMENTATION_UNSIGNED")) unsignedProviderDocs += 1;
      if (codes.has("ACTIVE_ORDERS_UNRESOLVED")) {
        const c = readiness.activeOrderCounts;
        unresolvedOrderLines += c.lab + c.imaging + c.medication + c.care;
      }
    }

    const doorProvRows = (doorProv as { rows?: GoLiveDoorProvMetricRow[] }).rows ?? [];
    const doorToProviderAvgMinutes = avgMinutesNumeric(
      doorProvRows.map((r: GoLiveDoorProvMetricRow) => r.minutesToProvider ?? null)
    );
    const doorDoorRows = (doorDoor as { rows?: GoLiveDoorDoorMetricRow[] }).rows ?? [];
    const doorToDoorAvgMinutes = avgMinutesNumeric(
      doorDoorRows.map((r: GoLiveDoorDoorMetricRow) => r.durationMinutes)
    );
    const medicationAdministrationsToday = (medMar as { rows: unknown[] }).rows?.length ?? 0;

    let billingFailures48h = 0;
    for (const a of billingFailureAudits) {
      const m = a.metadata as Record<string, unknown> | null;
      if (m?.automationEvent === "external_billing_auto_export_failed") billingFailures48h += 1;
    }

    const alertWebhookConfigured = readAlertWebhookConfigured();
    const alertsEnabled = readAlertsEnabled();
    const extAuto = readExternalBillingAutoExportEnabled();
    const extVendor = readExternalBillingVendorWebhookConfigured();

    const lastExternalBillingExportAt = lastBillingExport?.createdAt.toISOString() ?? null;

    const recentCriticalEvents = (criticalAudits as GoLiveCriticalAuditRow[]).map((r: GoLiveCriticalAuditRow) => {
      const tags = auditHighlightTags({
        action: r.action,
        entityType: r.entityType,
        metadataRaw: r.metadata,
      });
      return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        action: String(r.action),
        entityType: r.entityType,
        encounterId: r.encounterId,
        category: classifyAuditUiCategory(r.action, r.entityType),
        highlightTags: tags,
      };
    });

    const doorProvTrunc = Boolean((doorProv as { truncated?: boolean }).truncated);
    const doorDoorTrunc = Boolean((doorDoor as { truncated?: boolean }).truncated);

    const checks: GoLiveReadinessCheck[] = [];

    checks.push({
      key: "open_ed_encounters",
      label: "Open ED encounters",
      status: openEncounters > 35 ? "warn" : "pass",
      value: openEncounters,
      detail: openEncounters > 35 ? "ed_volume_high" : null,
    });

    checks.push({
      key: "disposition_blockers",
      label: "Encounters not disposition-ready (cannot close without override)",
      status: blockedClosure === 0 ? "pass" : blockedClosure >= 10 ? "fail" : "warn",
      value: blockedClosure,
      detail: blockedClosure > 0 ? "disposition_safety_hint" : null,
    });

    checks.push({
      key: "missing_recent_vitals",
      label: "Open ED encounters missing or stale vitals (4h)",
      status: missingVitals === 0 ? "pass" : missingVitals >= 8 ? "fail" : "warn",
      value: missingVitals,
      detail: null,
    });

    checks.push({
      key: "unsigned_provider_documentation",
      label: "Open ED encounters with unsigned provider documentation",
      status: unsignedProviderDocs === 0 ? "pass" : unsignedProviderDocs >= 8 ? "fail" : "warn",
      value: unsignedProviderDocs,
      detail: null,
    });

    checks.push({
      key: "unresolved_order_lines",
      label: "Unresolved clinical order lines (open ED)",
      status: unresolvedOrderLines === 0 ? "pass" : unresolvedOrderLines >= 25 ? "fail" : "warn",
      value: unresolvedOrderLines,
      detail: null,
    });

    checks.push({
      key: "door_to_provider_today",
      label: "Door-to-provider average (UTC day, closed subset)",
      status:
        doorProvTrunc ? "warn" : doorToProviderAvgMinutes == null ? "pass" : doorToProviderAvgMinutes > 180 ? "warn" : "pass",
      value: doorToProviderAvgMinutes,
      detail: doorProvTrunc ? "report_truncated" : null,
    });

    checks.push({
      key: "door_to_door_today",
      label: "Door-to-door average (UTC day)",
      status:
        doorDoorTrunc ? "warn" : doorToDoorAvgMinutes == null ? "pass" : doorToDoorAvgMinutes > 480 ? "warn" : "pass",
      value: doorToDoorAvgMinutes,
      detail: doorDoorTrunc ? "report_truncated" : null,
    });

    checks.push({
      key: "operational_alerts",
      label: "Operational alert webhook (S17)",
      status: !alertsEnabled ? "warn" : alertWebhookConfigured ? "pass" : "warn",
      value: alertWebhookConfigured,
      detail: !alertsEnabled ? "alerts_disabled" : !alertWebhookConfigured ? "alert_webhook_missing" : null,
    });

    checks.push({
      key: "external_billing_automation_config",
      label: "External billing automation (env)",
      status: "pass",
      value: extAuto,
      detail: extAuto ? (extVendor ? "ext_billing_auto_ok" : "ext_billing_vendor_missing") : "ext_billing_auto_off",
    });

    checks.push({
      key: "external_billing_export_recency",
      label: "Last external billing export audit (this facility)",
      status: lastExternalBillingExportAt ? "pass" : extAuto ? "warn" : "pass",
      value: lastExternalBillingExportAt,
      detail: !lastExternalBillingExportAt && extAuto ? "ext_billing_no_facility_audit" : null,
    });

    checks.push({
      key: "external_billing_failures_48h",
      label: "External billing auto-export failures (48h, all facilities)",
      status: billingFailures48h === 0 ? "pass" : "fail",
      value: billingFailures48h,
      detail: billingFailures48h > 0 ? "ext_billing_failures_hint" : null,
    });

    const hasFail = checks.some((c) => c.status === "fail");
    const hasWarn = checks.some((c) => c.status === "warn");
    let status: GoLiveOverallStatus = "ready";
    if (hasFail) status = "blocked";
    else if (hasWarn) status = "attention";

    return {
      status,
      generatedAt,
      facilityId,
      checks,
      metrics: {
        openEncounters,
        blockedClosure,
        missingVitals,
        unsignedProviderDocs,
        unresolvedOrders: unresolvedOrderLines,
        doorToProviderAvgMinutes,
        doorToDoorAvgMinutes,
        medicationAdministrationsToday,
        lastExternalBillingExportAt,
        alertWebhookConfigured,
      },
      recentCriticalEvents,
    };
  }

  private async loadOpenEdEncountersWithSafety(facilityId: string) {
    const encounters = await this.prisma.encounter.findMany({
      where: {
        facilityId,
        status: EncounterStatus.OPEN,
        type: { in: [EncounterType.EMERGENCY, EncounterType.URGENT_CARE] },
      },
      select: {
        id: true,
        patientId: true,
        type: true,
        status: true,
        nursingAssessment: true,
        dischargeSummaryJson: true,
        admissionSummaryJson: true,
        providerDocumentationStatus: true,
        providerDocumentationSignedAt: true,
        providerNote: true,
        treatmentPlan: true,
        patient: { select: { latestVitalsAt: true } },
      },
    });

    if (encounters.length === 0) return [];

    const encounterIds = encounters.map((e) => e.id);

    const [ordersRaw, triageGroups, vitalsEventGroups] = await Promise.all([
      this.prisma.order.findMany({
        where: { facilityId, encounterId: { in: encounterIds } },
        include: {
          items: {
            include: {
              result: { select: { verifiedAt: true } },
              pharmacyDispenseRecord: { select: { id: true } },
              medicationAdministrations: {
                orderBy: { administeredAt: "desc" },
                take: 1,
                select: { marAction: true, notes: true },
              },
            },
          },
        },
      }),
      this.prisma.triageVitalsReading.groupBy({
        by: ["encounterId"],
        where: { facilityId, encounterId: { in: encounterIds } },
        _max: { recordedAt: true },
      }),
      this.prisma.encounterClinicalEvent.groupBy({
        by: ["encounterId"],
        where: {
          facilityId,
          encounterId: { in: encounterIds },
          eventType: EncounterClinicalEventType.VITALS_RECORDED,
        },
        _max: { createdAt: true },
      }),
    ]);

    const triageMap = new Map<string, Date | null>(
      triageGroups.map((g) => [g.encounterId, g._max.recordedAt ?? null])
    );
    const vitalsEventMap = new Map<string, Date | null>(
      vitalsEventGroups.map((g) => [g.encounterId, g._max.createdAt ?? null])
    );

    const bucket = new Map<string, typeof ordersRaw>();
    for (const o of ordersRaw) {
      const list = bucket.get(o.encounterId) ?? [];
      list.push(o);
      bucket.set(o.encounterId, list);
    }

    type OrderSafety = {
      status: string;
      type: string;
      items: Array<{
        status: string;
        catalogItemType: string | null;
        medicationFulfillmentIntent: string | null;
        result: { verifiedAt: Date | null } | null;
        pharmacyDispenseRecord: { id: string } | null;
        medicationAdministrations: Array<{ marAction: string | null; notes: string | null }>;
      }>;
    };

    return encounters.map((enc) => {
      const encOrders = bucket.get(enc.id) ?? [];
      const orders: OrderSafety[] = encOrders.map((o) => ({
        status: o.status,
        type: o.type,
        items: o.items.map((it) => ({
          status: it.status,
          catalogItemType: it.catalogItemType,
          medicationFulfillmentIntent: it.medicationFulfillmentIntent,
          result: it.result,
          pharmacyDispenseRecord: it.pharmacyDispenseRecord,
          medicationAdministrations: it.medicationAdministrations,
        })),
      }));

      return {
        encounterSlice: {
          type: enc.type,
          status: enc.status,
          nursingAssessment: enc.nursingAssessment,
          dischargeSummaryJson: enc.dischargeSummaryJson,
          admissionSummaryJson: enc.admissionSummaryJson,
          providerDocumentationStatus: enc.providerDocumentationStatus,
          providerDocumentationSignedAt: enc.providerDocumentationSignedAt,
          providerNote: enc.providerNote,
          treatmentPlan: enc.treatmentPlan,
        },
        mergedDischarge: dischargeSummaryFromEncounter(enc.dischargeSummaryJson),
        patientLatestVitalsAt: enc.patient?.latestVitalsAt ?? null,
        latestTriageVitalsRecordedAt: triageMap.get(enc.id) ?? null,
        latestVitalsClinicalEventAt: vitalsEventMap.get(enc.id) ?? null,
        orders,
      };
    });
  }
}
