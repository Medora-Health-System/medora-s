import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, EncounterClinicalEventType, EncounterStatus, RoleCode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import { computeEncounterBillingReadiness } from "./billing-encounter-readiness.util";
import { BillingService, getAutoBillDecision } from "./billing.service";
import {
  displayNameFrForDocumentedProcedureType,
  medoraCodeForDocumentedProcedureType,
} from "@medora/shared";

const EXPORT_SCHEMA_VERSION = "medora_external_billing_v1" as const;
const AUDIT_ENTITY = "EXTERNAL_BILLING_EXPORT" as const;

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function formatUserName(u: { firstName: string; lastName: string } | null | undefined): string {
  if (!u) return "";
  return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
}

function encounterNumberFromEncounter(enc: { id: string; type: string; createdAt: Date }): string {
  const y = enc.createdAt.getUTCFullYear();
  return `${enc.type}-${y}-${enc.id.slice(0, 8).toUpperCase()}`;
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function dobStr(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function jsonStable(o: unknown): string {
  return JSON.stringify(o ?? {});
}

function readProcedureTypeFromPayload(payloadJson: unknown): string | null {
  if (!payloadJson || typeof payloadJson !== "object" || Array.isArray(payloadJson)) return null;
  const pt = (payloadJson as Record<string, unknown>).procedureType;
  return typeof pt === "string" && pt.trim() ? pt.trim() : null;
}

function clinicalPayloadFromProcedureEvent(payloadJson: unknown): Record<string, unknown> {
  if (!payloadJson || typeof payloadJson !== "object" || Array.isArray(payloadJson)) return {};
  return { ...(payloadJson as Record<string, unknown>) };
}

function codingInstructionForExportLine(input: {
  exportCategory: string;
  billingStatus: string;
}): string {
  if (input.exportCategory === "PROCEDURE") {
    return "External billing company must assign CPT/HCPCS from licensed source.";
  }
  if (input.exportCategory === "LAB" && input.billingStatus === "official_validated") {
    return "Vendor may verify code before claim submission.";
  }
  if (input.exportCategory === "IMAGING") {
    return "External billing company must assign CPT/HCPCS from licensed source.";
  }
  if (input.exportCategory === "MEDICATION" || input.exportCategory === "MAR") {
    return "Medication line — verify HCPCS/NDC and units with payer policy before claim submission.";
  }
  if (input.exportCategory === "IV") {
    return "IV access documentation — assign appropriate supply/CPT per chargemaster if billable.";
  }
  return "External billing review recommended before claim submission.";
}

export type ExternalExportUserContext = {
  userId: string;
  displayName: string;
  role: string;
};

@Injectable()
export class ExternalBillingExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly billingService: BillingService
  ) {}

  private async userMayAllowOpenExport(userId: string, facilityId: string): Promise<boolean> {
    const row = await this.prisma.userRole.findFirst({
      where: {
        userId,
        facilityId,
        isActive: true,
        role: { code: { in: [RoleCode.ADMIN, RoleCode.BILLING] } },
      },
    });
    return Boolean(row);
  }

  private async assertEncounterAccess(
    facilityId: string,
    encounterId: string,
    allowOpen: boolean,
    userId: string
  ) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true, status: true },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    if (enc.status !== EncounterStatus.CLOSED) {
      if (!allowOpen) {
        throw new BadRequestException("Export is limited to closed encounters unless allowOpen=true.");
      }
      if (!(await this.userMayAllowOpenExport(userId, facilityId))) {
        throw new ForbiddenException("allowOpen=true requires ADMIN or BILLING role.");
      }
    }
  }

  async resolveExportUserContext(userId: string, roleFromGuard: string): Promise<ExternalExportUserContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
    const displayName = formatUserName(user ?? undefined) || user?.email?.trim() || userId;
    return { userId, displayName, role: roleFromGuard || "UNKNOWN" };
  }

  async exportEncounterJson(params: {
    facilityId: string;
    encounterId: string;
    allowOpen: boolean;
    userCtx: ExternalExportUserContext;
    ip?: string;
    userAgent?: string;
  }): Promise<Record<string, unknown>> {
    await this.assertEncounterAccess(params.facilityId, params.encounterId, params.allowOpen, params.userCtx.userId);
    const pkg = await this.buildEncounterPackage(params.facilityId, params.encounterId);
    const exportBatchId = `BATCH-${params.encounterId.slice(0, 8).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
    const out: Record<string, unknown> = {
      ...pkg.json,
      exportMeta: {
        ...(pkg.json.exportMeta as Record<string, unknown>),
        exportedBy: {
          userId: params.userCtx.userId,
          displayName: params.userCtx.displayName,
          role: params.userCtx.role,
        },
        exportBatchId,
      },
    };
    await this.audit.log(AuditAction.VIEW, AUDIT_ENTITY, {
      userId: params.userCtx.userId,
      facilityId: params.facilityId,
      patientId: pkg.patient.patientId as string,
      encounterId: params.encounterId,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: {
        scope: "ENCOUNTER",
        format: "json",
        encounterId: params.encounterId,
        exportBatchId,
        schemaVersion: EXPORT_SCHEMA_VERSION,
      },
    });
    return out;
  }

  async exportEncounterCsv(params: {
    facilityId: string;
    encounterId: string;
    allowOpen: boolean;
    userCtx: ExternalExportUserContext;
    ip?: string;
    userAgent?: string;
  }): Promise<{ csv: string; filename: string }> {
    await this.assertEncounterAccess(params.facilityId, params.encounterId, params.allowOpen, params.userCtx.userId);
    const pkg = await this.buildEncounterPackage(params.facilityId, params.encounterId);
    const batchId = `BATCH-${params.encounterId.slice(0, 8).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
    const csv = this.buildCsvDocument(batchId, new Date().toISOString(), pkg.csvRows);
    await this.audit.log(AuditAction.VIEW, AUDIT_ENTITY, {
      userId: params.userCtx.userId,
      facilityId: params.facilityId,
      patientId: pkg.patient.patientId as string,
      encounterId: params.encounterId,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: {
        scope: "ENCOUNTER",
        format: "csv",
        encounterId: params.encounterId,
        exportBatchId: batchId,
        schemaVersion: EXPORT_SCHEMA_VERSION,
      },
    });
    return { csv, filename: `external-billing-${params.encounterId}.csv` };
  }

  async exportDailyJson(params: {
    facilityId: string;
    date: string;
    userCtx: ExternalExportUserContext;
    ip?: string;
    userAgent?: string;
  }): Promise<Record<string, unknown>> {
    const { start, end } = parseUtcDay(params.date);
    const encounters = await this.listClosedEncountersForDay(params.facilityId, start, end);
    const batchId = `BATCH-${params.date.replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const exportedAt = new Date().toISOString();
    const facility = await this.prisma.facility.findFirst({
      where: { id: params.facilityId },
      select: { id: true, name: true },
    });
    const encounterPayloads: Record<string, unknown>[] = [];
    for (const e of encounters) {
      const pkg = await this.buildEncounterPackage(params.facilityId, e.id);
      const { exportMeta: _omit, ...rest } = pkg.json;
      encounterPayloads.push(rest);
    }
    const out = {
      exportMeta: {
        schemaVersion: EXPORT_SCHEMA_VERSION,
        exportedAt,
        exportedBy: {
          userId: params.userCtx.userId,
          displayName: params.userCtx.displayName,
          role: params.userCtx.role,
        },
        facility: {
          facilityId: params.facilityId,
          name: facility?.name ?? "",
        },
        exportScope: "DAILY",
        date: params.date,
        exportBatchId: batchId,
        encounterCount: encounterPayloads.length,
      },
      encounters: encounterPayloads,
    };
    await this.audit.log(AuditAction.VIEW, AUDIT_ENTITY, {
      userId: params.userCtx.userId,
      facilityId: params.facilityId,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: {
        scope: "DAILY",
        format: "json",
        date: params.date,
        exportBatchId: batchId,
        encounterIds: encounters.map((x) => x.id),
        schemaVersion: EXPORT_SCHEMA_VERSION,
      },
    });
    return out;
  }

  async exportDailyCsv(params: {
    facilityId: string;
    date: string;
    userCtx: ExternalExportUserContext;
    ip?: string;
    userAgent?: string;
  }): Promise<{ csv: string; filename: string }> {
    const { start, end } = parseUtcDay(params.date);
    const encounters = await this.listClosedEncountersForDay(params.facilityId, start, end);
    const batchId = `BATCH-${params.date.replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const exportedAt = new Date().toISOString();
    const allRows: CsvRow[] = [];
    for (const e of encounters) {
      const pkg = await this.buildEncounterPackage(params.facilityId, e.id);
      allRows.push(...pkg.csvRows);
    }
    const csv = this.buildCsvDocument(batchId, exportedAt, allRows);
    await this.audit.log(AuditAction.VIEW, AUDIT_ENTITY, {
      userId: params.userCtx.userId,
      facilityId: params.facilityId,
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: {
        scope: "DAILY",
        format: "csv",
        date: params.date,
        exportBatchId: batchId,
        encounterIds: encounters.map((x) => x.id),
        rowCount: allRows.length,
        schemaVersion: EXPORT_SCHEMA_VERSION,
      },
    });
    return { csv, filename: `external-billing-daily-${params.date}.csv` };
  }

  private buildCsvDocument(batchId: string, exportedAtIso: string, rows: CsvRow[]): string {
    const headers = [
      "export_batch_id",
      "exported_at",
      "facility_id",
      "facility_name",
      "patient_id",
      "mrn",
      "patient_name",
      "dob",
      "sex",
      "encounter_id",
      "encounter_number",
      "encounter_type",
      "encounter_status",
      "arrival_at",
      "closed_at",
      "primary_provider_name",
      "primary_provider_title",
      "primary_diagnosis_code",
      "primary_diagnosis_description",
      "line_id",
      "source_type",
      "category",
      "medora_code",
      "display_name",
      "status",
      "performed_at",
      "performed_by_name",
      "performed_by_title",
      "billing_status",
      "billing_code_default",
      "coding_instruction",
      "clinical_summary",
      "clinical_payload_json",
    ];
    const lines = rows.map((r) =>
      [
        batchId,
        exportedAtIso,
        r.facility_id,
        r.facility_name,
        r.patient_id,
        r.mrn,
        r.patient_name,
        r.dob,
        r.sex,
        r.encounter_id,
        r.encounter_number,
        r.encounter_type,
        r.encounter_status,
        r.arrival_at,
        r.closed_at,
        r.primary_provider_name,
        r.primary_provider_title,
        r.primary_diagnosis_code,
        r.primary_diagnosis_description,
        r.line_id,
        r.source_type,
        r.category,
        r.medora_code,
        r.display_name,
        r.status,
        r.performed_at,
        r.performed_by_name,
        r.performed_by_title,
        r.billing_status,
        r.billing_code_default,
        r.coding_instruction,
        r.clinical_summary,
        r.clinical_payload_json,
      ]
        .map(csvCell)
        .join(",")
    );
    return [headers.join(","), ...lines].join("\n");
  }

  private async listClosedEncountersForDay(facilityId: string, start: Date, end: Date) {
    return this.prisma.encounter.findMany({
      where: {
        facilityId,
        status: EncounterStatus.CLOSED,
        dischargedAt: { gte: start, lte: end },
      },
      select: { id: true },
      orderBy: { dischargedAt: "asc" },
    });
  }

  private async buildEncounterPackage(facilityId: string, encounterId: string): Promise<{
    json: Record<string, unknown>;
    csvRows: CsvRow[];
    patient: { patientId: string };
  }> {
    const exportedAt = new Date().toISOString();
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      include: {
        patient: true,
        facility: { select: { id: true, name: true } },
        physicianAssigned: { select: { id: true, firstName: true, lastName: true, billingTaxonomyCode: true } },
        intake: { select: { arrivalAt: true } },
      },
    });
    if (!enc) throw new NotFoundException("Encounter not found");

    const [readiness, diagnoses, orderItems, dispenses, marRows, clinicalEvents, exportRows] = await Promise.all([
      computeEncounterBillingReadiness(this.prisma, facilityId, encounterId),
      this.prisma.diagnosis.findMany({
        where: { encounterId, facilityId, status: "ACTIVE" },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.orderItem.findMany({
        where: { order: { encounterId, facilityId } },
        include: {
          order: { select: { id: true, type: true, status: true, createdAt: true } },
          result: { select: { id: true, resultText: true, resultData: true, verifiedAt: true, createdAt: true } },
          completedByNurse: { select: { id: true, firstName: true, lastName: true, billingTaxonomyCode: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.medicationDispense.findMany({
        where: { encounterId, facilityId },
        orderBy: { dispensedAt: "asc" },
        include: {
          dispensedBy: { select: { id: true, firstName: true, lastName: true, billingTaxonomyCode: true } },
        },
      }),
      this.prisma.medicationAdministration.findMany({
        where: { encounterId, facilityId },
        include: { administeredBy: { select: { id: true, firstName: true, lastName: true, billingTaxonomyCode: true } } },
        orderBy: { administeredAt: "asc" },
      }),
      this.prisma.encounterClinicalEvent.findMany({
        where: {
          encounterId,
          facilityId,
          eventType: {
            in: [
              EncounterClinicalEventType.IV_INSERTED,
              EncounterClinicalEventType.IV_REMOVED,
              EncounterClinicalEventType.PROCEDURE_DOCUMENTED,
            ],
          },
        },
        orderBy: { createdAt: "asc" },
        include: { createdBy: { select: { id: true, firstName: true, lastName: true, billingTaxonomyCode: true } } },
      }),
      this.billingService.getEncounterBillingExportRows(facilityId, encounterId),
    ]);

    const exportRowByOrderItemId = new Map(
      exportRows.filter((r) => !r.orderItemId.startsWith("proc-doc_")).map((r) => [r.orderItemId, r])
    );

    const primaryDx = diagnoses[0] ?? null;
    const primaryProviderName = formatUserName(enc.physicianAssigned);
    const primaryProviderTitle = enc.physicianAssigned?.billingTaxonomyCode?.trim() ?? "";

    const lineItemsJson: Record<string, unknown>[] = [];
    const csvRows: CsvRow[] = [];

    const buildBaseCsvRow = (): CsvRowBase => ({
      facility_id: facilityId,
      facility_name: enc.facility?.name ?? "",
      patient_id: enc.patientId,
      mrn: enc.patient.mrn ?? enc.patient.globalMrn,
      patient_name: `${enc.patient.firstName} ${enc.patient.lastName}`.trim(),
      dob: dobStr(enc.patient.dob) ?? "",
      sex: String(enc.patient.sex),
      encounter_id: encounterId,
      encounter_number: encounterNumberFromEncounter(enc),
      encounter_type: enc.type,
      encounter_status: enc.status,
      arrival_at: iso(enc.intake?.arrivalAt ?? enc.createdAt) ?? "",
      closed_at: iso(enc.dischargedAt) ?? "",
      primary_provider_name: primaryProviderName,
      primary_provider_title: primaryProviderTitle,
      primary_diagnosis_code: primaryDx?.code ?? "",
      primary_diagnosis_description: primaryDx?.description ?? "",
    });

    const pushLine = (row: { lineJson: Record<string, unknown>; csv: CsvLineFields }) => {
      lineItemsJson.push(row.lineJson);
      csvRows.push({ ...buildBaseCsvRow(), ...row.csv });
    };

    for (const it of orderItems) {
      const br = exportRowByOrderItemId.get(it.id);
      const auto = br ? getAutoBillDecision(br) : null;
      const orderType = it.order.type;
      const sourceType =
        orderType === "LAB" ? "LAB_ORDER" : orderType === "IMAGING" ? "IMAGING_ORDER" : "MEDICATION_ORDER";
      const exportCategory = orderType === "LAB" ? "LAB" : orderType === "IMAGING" ? "IMAGING" : "MEDICATION";
      const performedAt = it.completedAt ?? it.order.createdAt;
      const performer = it.completedByNurse;
      const clinicalPayload: Record<string, unknown> = {
        orderId: it.order.id,
        orderStatus: it.order.status,
        orderItemStatus: it.status,
        lifecycleState: it.lifecycleState,
        quantity: it.quantity,
        strength: it.strength,
        route: it.route,
        notes: it.notes,
      };
      if (it.result) {
        clinicalPayload.resultText = it.result.resultText;
        clinicalPayload.resultData = it.result.resultData;
        clinicalPayload.resultVerifiedAt = iso(it.result.verifiedAt);
      }
      const clinicalSummaryParts = [br?.displayName ?? it.manualLabel ?? ""];
      if (it.result?.resultText?.trim()) clinicalSummaryParts.push(it.result.resultText.trim().slice(0, 200));
      pushLine({
        lineJson: {
          lineId: `orderItem_${it.id}`,
          sourceType,
          medoraCode: br?.medoraCode ?? it.manualLabel ?? null,
          displayName: br?.displayName ?? it.manualLabel ?? "Order item",
          category: exportCategory,
          performedAt: iso(performedAt),
          performedBy: {
            userId: performer?.id ?? null,
            displayName: formatUserName(performer) || null,
            title: performer?.billingTaxonomyCode?.trim() || null,
          },
          status: String(it.lifecycleState ?? it.status),
          billingStatus: auto?.billingStatus ?? br?.billingStatus ?? "missing",
          billingCodeDefault: br?.billingCodeDefault ?? null,
          codingInstruction: codingInstructionForExportLine({
            exportCategory,
            billingStatus: auto?.billingStatus ?? br?.billingStatus ?? "missing",
          }),
          clinicalPayload,
        },
        csv: {
          line_id: `orderItem_${it.id}`,
          source_type: sourceType,
          category: exportCategory,
          medora_code: (br?.medoraCode ?? it.manualLabel ?? "").trim(),
          display_name: br?.displayName ?? it.manualLabel ?? "",
          status: String(it.lifecycleState ?? it.status),
          performed_at: iso(performedAt) ?? "",
          performed_by_name: formatUserName(performer),
          performed_by_title: performer?.billingTaxonomyCode?.trim() ?? "",
          billing_status: auto?.billingStatus ?? br?.billingStatus ?? "missing",
          billing_code_default: br?.billingCodeDefault ?? "",
          coding_instruction: codingInstructionForExportLine({
            exportCategory,
            billingStatus: auto?.billingStatus ?? br?.billingStatus ?? "missing",
          }),
          clinical_summary: clinicalSummaryParts.filter(Boolean).join(" — ").slice(0, 500),
          clinical_payload_json: jsonStable(clinicalPayload),
        },
      });
    }

    for (const d of dispenses) {
      const clinicalPayload: Record<string, unknown> = {
        dispenseId: d.id,
        quantityDispensed: d.quantityDispensed,
        ndc11Snapshot: d.ndc11Snapshot,
        manualMedicationLabel: d.manualMedicationLabel,
        orderItemId: d.orderItemId,
      };
      const dispUser = d.dispensedBy;
      pushLine({
        lineJson: {
          lineId: `medicationDispense_${d.id}`,
          sourceType: "MEDICATION_DISPENSE",
          medoraCode: d.manualMedicationLabel ?? d.catalogMedicationId ?? "MEDICATION_DISPENSE",
          displayName: d.manualMedicationLabel ?? "Medication dispense",
          category: "MEDICATION",
          performedAt: iso(d.dispensedAt),
          performedBy: {
            userId: d.dispensedByUserId,
            displayName: formatUserName(dispUser),
            title: dispUser?.billingTaxonomyCode?.trim() || null,
          },
          status: "COMPLETED",
          billingStatus: "candidate_only",
          billingCodeDefault: null,
          codingInstruction: codingInstructionForExportLine({
            exportCategory: "MEDICATION",
            billingStatus: "candidate_only",
          }),
          clinicalPayload,
        },
        csv: {
          line_id: `medicationDispense_${d.id}`,
          source_type: "MEDICATION_DISPENSE",
          category: "MEDICATION",
          medora_code: (d.manualMedicationLabel ?? d.catalogMedicationId ?? "").toString(),
          display_name: d.manualMedicationLabel ?? "Medication dispense",
          status: "COMPLETED",
          performed_at: iso(d.dispensedAt) ?? "",
          performed_by_name: formatUserName(dispUser),
          performed_by_title: dispUser?.billingTaxonomyCode?.trim() ?? "",
          billing_status: "candidate_only",
          billing_code_default: "",
          coding_instruction: codingInstructionForExportLine({
            exportCategory: "MEDICATION",
            billingStatus: "candidate_only",
          }),
          clinical_summary: (d.manualMedicationLabel ?? "Dispense").slice(0, 300),
          clinical_payload_json: jsonStable(clinicalPayload),
        },
      });
    }

    for (const m of marRows) {
      const u = m.administeredBy;
      const clinicalPayload: Record<string, unknown> = {
        administrationId: m.id,
        doseValue: m.doseValue != null ? String(m.doseValue) : null,
        doseUnit: m.doseUnit,
        route: m.route,
        marAction: m.marAction,
        notes: m.notes,
        ndc11Snapshot: m.ndc11Snapshot,
        orderItemId: m.orderItemId,
      };
      pushLine({
        lineJson: {
          lineId: `mar_${m.id}`,
          sourceType: "MAR_ADMINISTRATION",
          medoraCode: m.medicationLabelSnapshot ?? m.orderItemId ?? "MAR_ADMINISTRATION",
          displayName: m.medicationLabelSnapshot ?? "Medication administration",
          category: "MAR",
          performedAt: iso(m.administeredAt),
          performedBy: {
            userId: m.administeredByUserId,
            displayName: formatUserName(u),
            title: u.billingTaxonomyCode?.trim() || null,
          },
          status: "COMPLETED",
          billingStatus: "candidate_only",
          billingCodeDefault: null,
          codingInstruction: codingInstructionForExportLine({
            exportCategory: "MAR",
            billingStatus: "candidate_only",
          }),
          clinicalPayload,
        },
        csv: {
          line_id: `mar_${m.id}`,
          source_type: "MAR_ADMINISTRATION",
          category: "MAR",
          medora_code: (m.medicationLabelSnapshot ?? m.orderItemId ?? "MAR").toString(),
          display_name: m.medicationLabelSnapshot ?? "Medication administration",
          status: "COMPLETED",
          performed_at: iso(m.administeredAt) ?? "",
          performed_by_name: formatUserName(u),
          performed_by_title: u.billingTaxonomyCode?.trim() ?? "",
          billing_status: "candidate_only",
          billing_code_default: "",
          coding_instruction: codingInstructionForExportLine({
            exportCategory: "MAR",
            billingStatus: "candidate_only",
          }),
          clinical_summary: (m.medicationLabelSnapshot ?? "MAR").slice(0, 300),
          clinical_payload_json: jsonStable(clinicalPayload),
        },
      });
    }

    for (const ev of clinicalEvents) {
      if (ev.eventType === EncounterClinicalEventType.PROCEDURE_DOCUMENTED) {
        const pt = readProcedureTypeFromPayload(ev.payloadJson);
        const medora = pt ? medoraCodeForDocumentedProcedureType(pt) : null;
        if (!medora || !pt) continue;
        const display = displayNameFrForDocumentedProcedureType(pt);
        const clinicalPayload = clinicalPayloadFromProcedureEvent(ev.payloadJson);
        const u = ev.createdBy;
        const performedIso =
          typeof clinicalPayload.performedAt === "string" && (clinicalPayload.performedAt as string).trim()
            ? (clinicalPayload.performedAt as string)
            : iso(ev.createdAt) ?? "";
        pushLine({
          lineJson: {
            lineId: ev.id,
            sourceType: "PROCEDURE_DOCUMENTED",
            medoraCode: medora,
            displayName: display,
            category: "PROCEDURE",
            performedAt: performedIso,
            performedBy: {
              userId: ev.createdByUserId,
              displayName: formatUserName(u),
            title: u?.billingTaxonomyCode?.trim() || null,
          },
          status: "DOCUMENTED",
          billingStatus: "pending_license",
          billingCodeDefault: null,
          codingInstruction: codingInstructionForExportLine({
            exportCategory: "PROCEDURE",
            billingStatus: "pending_license",
          }),
          clinicalPayload,
        },
        csv: {
          line_id: ev.id,
          source_type: "PROCEDURE_DOCUMENTED",
          category: "PROCEDURE",
          medora_code: medora,
          display_name: display,
          status: "DOCUMENTED",
          performed_at: performedIso,
          performed_by_name: formatUserName(u),
            performed_by_title: u?.billingTaxonomyCode?.trim() ?? "",
            billing_status: "pending_license",
            billing_code_default: "",
            coding_instruction: codingInstructionForExportLine({
              exportCategory: "PROCEDURE",
              billingStatus: "pending_license",
            }),
            clinical_summary: `${display}`.slice(0, 400),
            clinical_payload_json: jsonStable(clinicalPayload),
          },
        });
      } else {
        const clinicalPayload = clinicalPayloadFromProcedureEvent(ev.payloadJson);
        const u = ev.createdBy;
        const st = ev.eventType === EncounterClinicalEventType.IV_INSERTED ? "IV_INSERTED" : "IV_REMOVED";
        pushLine({
          lineJson: {
            lineId: ev.id,
            sourceType: st,
            medoraCode: st,
            displayName: st.replace(/_/g, " "),
            category: "IV",
            performedAt: iso(ev.createdAt),
            performedBy: {
              userId: ev.createdByUserId,
              displayName: formatUserName(u),
              title: u?.billingTaxonomyCode?.trim() || null,
            },
            status: "DOCUMENTED",
            billingStatus: "pending_license",
            billingCodeDefault: null,
            codingInstruction: codingInstructionForExportLine({ exportCategory: "IV", billingStatus: "pending_license" }),
            clinicalPayload,
          },
          csv: {
            line_id: ev.id,
            source_type: st,
            category: "IV",
            medora_code: st,
            display_name: st.replace(/_/g, " "),
            status: "DOCUMENTED",
            performed_at: iso(ev.createdAt) ?? "",
            performed_by_name: formatUserName(u),
            performed_by_title: u?.billingTaxonomyCode?.trim() ?? "",
            billing_status: "pending_license",
            billing_code_default: "",
            coding_instruction: codingInstructionForExportLine({
              exportCategory: "IV",
              billingStatus: "pending_license",
            }),
            clinical_summary: st,
            clinical_payload_json: jsonStable(clinicalPayload),
          },
        });
      }
    }

    const exportWarnings: { code: string; message: string }[] = readiness.warnings.map((w) => ({
      code: w.code,
      message: w.detail ? `${w.code}: ${w.detail}` : w.code,
    }));
    const hasProcedure = clinicalEvents.some((e) => e.eventType === EncounterClinicalEventType.PROCEDURE_DOCUMENTED);
    if (hasProcedure && !exportWarnings.some((w) => w.code === "PROCEDURE_CPT_PENDING_LICENSE")) {
      exportWarnings.push({
        code: "PROCEDURE_CPT_PENDING_LICENSE",
        message: "Procedure requires external billing company coding review.",
      });
    }

    const billingReadinessJson = {
      readyForExternalBilling: readiness.isReady,
      blockers: readiness.blockers.map((b) => ({
        code: b.code,
        message: b.detail ? `${b.code}: ${b.detail}` : b.code,
      })),
      warnings: exportWarnings,
    };

    const diagnosesJson = diagnoses.map((dx) => ({
      diagnosisId: dx.id,
      icd10Code: dx.code,
      description: dx.description ?? "",
      isPrimary: Boolean(primaryDx && dx.id === primaryDx.id),
      documentedAt: iso(dx.createdAt),
      documentedBy: {
        userId: enc.physicianAssignedUserId,
        displayName: primaryProviderName || null,
        title: primaryProviderTitle || null,
      },
    }));

    const json: Record<string, unknown> = {
      exportMeta: {
        schemaVersion: EXPORT_SCHEMA_VERSION,
        exportedAt,
        facility: {
          facilityId,
          name: enc.facility?.name ?? "",
        },
        exportScope: "ENCOUNTER",
        encounterId,
      },
      patient: {
        patientId: enc.patientId,
        mrn: enc.patient.mrn ?? enc.patient.globalMrn,
        firstName: enc.patient.firstName,
        lastName: enc.patient.lastName,
        dateOfBirth: dobStr(enc.patient.dob),
        sex: String(enc.patient.sex),
        phone: enc.patient.phone,
        address: enc.patient.address ?? enc.patient.addressLine1 ?? null,
      },
      encounter: {
        encounterId,
        encounterNumber: encounterNumberFromEncounter(enc),
        type: enc.type,
        status: enc.status,
        arrivalAt: iso(enc.intake?.arrivalAt ?? enc.createdAt),
        closedAt: iso(enc.dischargedAt),
        chiefComplaint: enc.chiefComplaint,
        providerSigned: enc.providerDocumentationStatus === "SIGNED",
        providerSignedAt: iso(enc.providerDocumentationSignedAt),
        provider: {
          userId: enc.physicianAssignedUserId,
          displayName: primaryProviderName || null,
          title: primaryProviderTitle || null,
        },
      },
      billingReadiness: billingReadinessJson,
      diagnoses: diagnosesJson,
      lineItems: lineItemsJson,
    };

    return { json, csvRows, patient: { patientId: enc.patientId } };
  }
}

type CsvRowBase = {
  facility_id: string;
  facility_name: string;
  patient_id: string;
  mrn: string;
  patient_name: string;
  dob: string;
  sex: string;
  encounter_id: string;
  encounter_number: string;
  encounter_type: string;
  encounter_status: string;
  arrival_at: string;
  closed_at: string;
  primary_provider_name: string;
  primary_provider_title: string;
  primary_diagnosis_code: string;
  primary_diagnosis_description: string;
};

type CsvLineFields = {
  line_id: string;
  source_type: string;
  category: string;
  medora_code: string;
  display_name: string;
  status: string;
  performed_at: string;
  performed_by_name: string;
  performed_by_title: string;
  billing_status: string;
  billing_code_default: string;
  coding_instruction: string;
  clinical_summary: string;
  clinical_payload_json: string;
};

type CsvRow = CsvRowBase & CsvLineFields;

function parseUtcDay(date: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException("date must be YYYY-MM-DD");
  }
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime())) throw new BadRequestException("Invalid date");
  return { start, end };
}
