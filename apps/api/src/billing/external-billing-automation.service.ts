import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import { AuditService } from "../common/services/audit.service";
import { queueMedoraAlert } from "../common/logging/medoraAlert";
import { logError, logInfo } from "../common/logging/medoraLogger";
import { PrismaService } from "../prisma/prisma.service";
import type { ExternalExportUserContext } from "./external-billing-export.service";
import {
  auditActorMetaForExportContext,
  ExternalBillingExportService,
} from "./external-billing-export.service";

const AUTOMATION_USER_AGENT = "medora-external-billing-automation/1";
const AUDIT_ENTITY_AUTO = "EXTERNAL_BILLING_AUTO_EXPORT";

const AUTOMATION_USER_CTX: ExternalExportUserContext = {
  displayName: "Scheduled export",
  role: "AUTOMATION",
};

const SCHEDULED_AUTOMATION_AUDIT_META = { actorRole: "SYSTEM", source: "AUTOMATION" } as const;

function readAutomationEnabled(): boolean {
  const raw = process.env.MEDORA_EXTERNAL_BILLING_AUTO_EXPORT_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function readVendorWebhookUrl(): string | undefined {
  const u = process.env.MEDORA_EXTERNAL_BILLING_VENDOR_WEBHOOK_URL?.trim();
  return u && u.length > 0 ? u : undefined;
}

function readExportFormat(): "csv" | "json" {
  const raw = process.env.MEDORA_EXTERNAL_BILLING_EXPORT_FORMAT?.trim().toLowerCase();
  return raw === "json" ? "json" : "csv";
}

/** Parses `HH:mm` in UTC; defaults 02:00. */
function readExportTimeUtcMinutes(): number {
  const raw = process.env.MEDORA_EXTERNAL_BILLING_EXPORT_TIME_UTC?.trim() || "02:00";
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!m) return 2 * 60;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return h * 60 + min;
}

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Previous calendar day in UTC relative to `anchor`. */
function previousUtcCalendarDate(anchor: Date): string {
  const y = anchor.getUTCFullYear();
  const mo = anchor.getUTCMonth();
  const da = anchor.getUTCDate();
  const prev = new Date(Date.UTC(y, mo, da - 1));
  return utcDateString(prev);
}

function utcMinutesNow(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function mergeDailyCsvDocuments(parts: { facilityId: string; csv: string }[]): string {
  if (parts.length === 0) return "";
  const out: string[] = [];
  let header: string | null = null;
  for (const p of parts) {
    const rows = p.csv.split(/\r?\n/).filter((line) => line.length > 0);
    if (rows.length === 0) continue;
    const h = rows[0];
    if (header == null) {
      header = h;
      out.push(h);
    } else if (h !== header) {
      continue;
    }
    out.push(...rows.slice(1));
  }
  return out.join("\n");
}

async function postVendorPayload(url: string, body: unknown): Promise<void> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 60_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    if (!res.ok) {
      throw new Error(`vendor webhook status ${res.status}`);
    }
  } finally {
    clearTimeout(t);
  }
}

/**
 * S14E+ — optional daily UTC export of previous day’s closed encounters for all active facilities.
 * Does not mutate billing ledger, claims, or clinical data. Uses existing `exportDaily*` paths (same audits as manual).
 */
@Injectable()
export class ExternalBillingAutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExternalBillingAutomationService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  /** Last `exportDate` (YYYY-MM-DD) successfully completed end-to-end (including delivery when URL set). */
  private lastSuccessfulExportDate: string | null = null;
  private runInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly exportService: ExternalBillingExportService,
    private readonly audit: AuditService
  ) {}

  onModuleInit(): void {
    if (!readAutomationEnabled()) {
      this.logger.log("External billing auto-export disabled (MEDORA_EXTERNAL_BILLING_AUTO_EXPORT_ENABLED).");
      return;
    }
    this.timer = setInterval(() => {
      void this.tickSafe();
    }, 60_000);
    void this.tickSafe();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tickSafe(): Promise<void> {
    try {
      await this.maybeRunDailyExport();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`auto-export tick error: ${msg}`);
    }
  }

  private async maybeRunDailyExport(): Promise<void> {
    if (!readAutomationEnabled()) return;
    if (this.runInProgress) return;

    const now = new Date();
    const targetMin = readExportTimeUtcMinutes();
    if (utcMinutesNow(now) < targetMin) return;

    const exportDate = previousUtcCalendarDate(now);
    if (this.lastSuccessfulExportDate === exportDate) return;

    this.runInProgress = true;
    try {
      await this.runDailyExportForDate(exportDate);
      this.lastSuccessfulExportDate = exportDate;
    } finally {
      this.runInProgress = false;
    }
  }

  private async runDailyExportForDate(exportDate: string): Promise<void> {
    const facilities = await this.prisma.facility.findMany({
      where: { isActive: true },
      select: { id: true },
      orderBy: { id: "asc" },
    });

    logInfo("external_billing_auto_export_started", {
      action: "billing.external.auto_export",
      exportDate,
      facilityCount: facilities.length,
    });
    await this.audit.log(AuditAction.VIEW, AUDIT_ENTITY_AUTO, {
      metadata: {
        ...SCHEDULED_AUTOMATION_AUDIT_META,
        automationEvent: "external_billing_auto_export_started",
        exportDate,
        facilityCount: facilities.length,
      },
    });

    const format = readExportFormat();
    const vendorUrl = readVendorWebhookUrl();

    const jsonParts: { facilityId: string; encounterCount: number; payload: Record<string, unknown> }[] = [];
    const csvParts: { facilityId: string; csv: string }[] = [];
    let totalClosedEncounterCount = 0;
    let csvDataRowApprox = 0;

    try {
      for (const f of facilities) {
        if (format === "json") {
          const payload = await this.exportService.exportDailyJson({
            facilityId: f.id,
            date: exportDate,
            userCtx: AUTOMATION_USER_CTX,
            userAgent: AUTOMATION_USER_AGENT,
          });
          const meta = payload.exportMeta as Record<string, unknown> | undefined;
          const encounterCount =
            typeof meta?.encounterCount === "number" && Number.isFinite(meta.encounterCount)
              ? meta.encounterCount
              : 0;
          totalClosedEncounterCount += encounterCount;
          jsonParts.push({ facilityId: f.id, encounterCount, payload });
        } else {
          const { csv } = await this.exportService.exportDailyCsv({
            facilityId: f.id,
            date: exportDate,
            userCtx: AUTOMATION_USER_CTX,
            userAgent: AUTOMATION_USER_AGENT,
          });
          csvParts.push({ facilityId: f.id, csv });
          const lines = csv.split(/\r?\n/).filter((l) => l.length > 0);
          csvDataRowApprox += Math.max(0, lines.length - 1);
        }
      }
    } catch (err: unknown) {
      const errName = err instanceof Error ? err.name : typeof err;
      logError("external_billing_auto_export_failed", {
        action: "billing.external.auto_export",
        exportDate,
        facilityCount: facilities.length,
        format,
        phase: "export_build",
        errorName: errName,
      });
      await this.audit.log(AuditAction.VIEW, AUDIT_ENTITY_AUTO, {
        metadata: {
          ...SCHEDULED_AUTOMATION_AUDIT_META,
          automationEvent: "external_billing_auto_export_failed",
          exportDate,
          facilityCount: facilities.length,
          format,
          phase: "export_build",
        },
      });
      queueMedoraAlert({
        event: "external_billing_auto_export_failed",
        severity: "critical",
        route: "AUTOMATION external billing daily export",
      });
      throw err;
    }

    if (!vendorUrl) {
      logInfo("external_billing_auto_export_succeeded", {
        action: "billing.external.auto_export",
        exportDate,
        facilityCount: facilities.length,
        format,
        ...(format === "json"
          ? { closedEncounterCount: totalClosedEncounterCount }
          : { csvDataRowApprox }),
        delivery: "skipped_no_vendor_url",
      });
      await this.audit.log(AuditAction.VIEW, AUDIT_ENTITY_AUTO, {
        metadata: {
          ...SCHEDULED_AUTOMATION_AUDIT_META,
          automationEvent: "external_billing_auto_export_succeeded",
          exportDate,
          facilityCount: facilities.length,
          format,
          delivery: "skipped_no_vendor_url",
        },
      });
      console.warn(
        "[medora-external-billing-automation] MEDORA_EXTERNAL_BILLING_VENDOR_WEBHOOK_URL not set; export generated, delivery skipped."
      );
      return;
    }

    const automationBatchId = `AUTO-${exportDate.replace(/-/g, "")}-${Date.now().toString(36).toUpperCase()}`;
    const vendorBody =
      format === "json"
        ? {
            kind: "medora_external_billing_automation_v1",
            automationBatchId,
            exportDate,
            format: "json",
            facilityCount: jsonParts.length,
            facilities: jsonParts.map((p) => ({
              facilityId: p.facilityId,
              encounterCount: p.encounterCount,
              data: p.payload,
            })),
          }
        : {
            kind: "medora_external_billing_automation_v1",
            automationBatchId,
            exportDate,
            format: "csv",
            facilityCount: csvParts.length,
            csv: mergeDailyCsvDocuments(csvParts),
          };

    try {
      await postVendorPayload(vendorUrl, vendorBody);
    } catch (deliveryErr: unknown) {
      const errName = deliveryErr instanceof Error ? deliveryErr.name : typeof deliveryErr;
      logError("external_billing_auto_export_failed", {
        action: "billing.external.auto_export",
        exportDate,
        facilityCount: facilities.length,
        format,
        phase: "vendor_delivery",
        errorName: errName,
      });
      await this.audit.log(AuditAction.VIEW, AUDIT_ENTITY_AUTO, {
        metadata: {
          ...SCHEDULED_AUTOMATION_AUDIT_META,
          automationEvent: "external_billing_auto_export_failed",
          exportDate,
          facilityCount: facilities.length,
          format,
          phase: "vendor_delivery",
        },
      });
      queueMedoraAlert({
        event: "external_billing_auto_export_delivery_failed",
        severity: "critical",
        route: "AUTOMATION MEDORA_EXTERNAL_BILLING_VENDOR_WEBHOOK_URL",
      });
      throw deliveryErr;
    }

    logInfo("external_billing_auto_export_succeeded", {
      action: "billing.external.auto_export",
      exportDate,
      facilityCount: facilities.length,
      format,
      ...(format === "json"
        ? { closedEncounterCount: totalClosedEncounterCount }
        : { csvDataRowApprox }),
      delivery: "webhook",
    });
    await this.audit.log(AuditAction.VIEW, AUDIT_ENTITY_AUTO, {
      metadata: {
        ...SCHEDULED_AUTOMATION_AUDIT_META,
        automationEvent: "external_billing_auto_export_succeeded",
        exportDate,
        facilityCount: facilities.length,
        format,
        delivery: "webhook",
      },
    });
  }

  /**
   * Admin retry: rebuild daily export for one facility and POST to vendor.
   * Does not mutate billing ledger. Requires MEDORA_EXTERNAL_BILLING_VENDOR_WEBHOOK_URL.
   */
  async retryDailyVendorDeliveryForFacility(params: {
    facilityId: string;
    exportDate: string;
    format: "json" | "csv";
    userCtx: ExternalExportUserContext;
    ip?: string;
    userAgent?: string;
  }): Promise<{ automationBatchId: string }> {
    const vendorUrl = readVendorWebhookUrl();
    if (!vendorUrl) {
      throw new BadRequestException(
        "L’URL webhook prestataire (MEDORA_EXTERNAL_BILLING_VENDOR_WEBHOOK_URL) n’est pas configurée ; un nouvel envoi vers le prestataire est impossible."
      );
    }

    const automationBatchId = `RETRY-${params.exportDate.replace(/-/g, "")}-${Date.now().toString(36).toUpperCase()}`;

    await this.audit.log(AuditAction.VIEW, AUDIT_ENTITY_AUTO, {
      userId: params.userCtx.userId,
      facilityId: params.facilityId,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: {
        ...auditActorMetaForExportContext(params.userCtx),
        automationEvent: "external_billing_manual_retry_started",
        exportDate: params.exportDate,
        format: params.format,
        automationBatchId,
      },
    });

    try {
      let vendorBody: Record<string, unknown>;
      if (params.format === "json") {
        const payload = await this.exportService.exportDailyJson({
          facilityId: params.facilityId,
          date: params.exportDate,
          userCtx: params.userCtx,
          ip: params.ip,
          userAgent: params.userAgent ?? "medora-external-billing-manual-retry/1",
        });
        const meta = payload.exportMeta as Record<string, unknown> | undefined;
        const encounterCount =
          typeof meta?.encounterCount === "number" && Number.isFinite(meta.encounterCount) ? meta.encounterCount : 0;
        vendorBody = {
          kind: "medora_external_billing_automation_v1",
          automationBatchId,
          exportDate: params.exportDate,
          format: "json",
          facilityCount: 1,
          facilities: [{ facilityId: params.facilityId, encounterCount, data: payload }],
        };
      } else {
        const { csv } = await this.exportService.exportDailyCsv({
          facilityId: params.facilityId,
          date: params.exportDate,
          userCtx: params.userCtx,
          ip: params.ip,
          userAgent: params.userAgent ?? "medora-external-billing-manual-retry/1",
        });
        vendorBody = {
          kind: "medora_external_billing_automation_v1",
          automationBatchId,
          exportDate: params.exportDate,
          format: "csv",
          facilityCount: 1,
          csv,
        };
      }

      await postVendorPayload(vendorUrl, vendorBody);

      await this.audit.log(AuditAction.VIEW, AUDIT_ENTITY_AUTO, {
        userId: params.userCtx.userId,
        facilityId: params.facilityId,
        ip: params.ip,
        userAgent: params.userAgent,
        metadata: {
          ...auditActorMetaForExportContext(params.userCtx),
          automationEvent: "external_billing_manual_retry_succeeded",
          exportDate: params.exportDate,
          format: params.format,
          automationBatchId,
        },
      });

      logInfo("external_billing_manual_retry_succeeded", {
        action: "billing.external.manual_retry",
        exportDate: params.exportDate,
        facilityId: params.facilityId,
        format: params.format,
      });

      return { automationBatchId };
    } catch (err: unknown) {
      const errName = err instanceof Error ? err.name : typeof err;
      logError("external_billing_manual_retry_failed", {
        action: "billing.external.manual_retry",
        exportDate: params.exportDate,
        facilityId: params.facilityId,
        format: params.format,
        errorName: errName,
      });
      await this.audit.log(AuditAction.VIEW, AUDIT_ENTITY_AUTO, {
        userId: params.userCtx.userId,
        facilityId: params.facilityId,
        ip: params.ip,
        userAgent: params.userAgent,
        metadata: {
          ...auditActorMetaForExportContext(params.userCtx),
          automationEvent: "external_billing_manual_retry_failed",
          exportDate: params.exportDate,
          format: params.format,
          automationBatchId,
        },
      });
      queueMedoraAlert({
        event: "external_billing_manual_retry_failed",
        severity: "critical",
        route: "ADMIN MEDORA_EXTERNAL_BILLING_VENDOR_WEBHOOK_URL",
      });
      throw err;
    }
  }
}

