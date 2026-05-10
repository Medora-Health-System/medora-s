import { Injectable, NotFoundException } from "@nestjs/common";
import {
  AuditAction,
  EncounterClinicalEventType,
  EncounterStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import {
  ENCOUNTER_AUDIT_TIMELINE_V1_ACTIONS,
  mapAuditLogRowToTimelineItem,
  metadataEncounterId,
} from "../patients/chart-audit-timeline.util";

/**
 * Phase 5D — Backend encounter chart export manifest.
 *
 * Read-only service that composes a deterministic JSON manifest of every
 * clinical domain MEDORA already persists for one encounter. The manifest is:
 *  - regenerated on each request (no persistence yet — Phase 5F);
 *  - PHI-safe in `metadata` for audit (only count/version flags, no names/MRN);
 *  - free of base64 attachment payloads (file metadata only);
 *  - facility-scoped (cross-facility reads return 404, never 403, to avoid
 *    leaking encounter existence outside the tenant);
 *  - additive — does not alter any existing read or mutation pathway.
 *
 * Audit:
 *  - One `CHART_ACCESS` log on `ENCOUNTER` per successful manifest read (no
 *    `RECORD_EXPORT` enum value introduced yet to avoid an enum migration; Phase
 *    5F will move to a dedicated action when the immutable snapshot lands).
 *
 * Open vs closed encounter:
 *  - We do NOT block OPEN encounters with 409. Returning the manifest with an
 *    explicit `livePreview: true` flag is safer for clinical workflows (handoff,
 *    transfer prep, teaching review) and aligns with the Phase 5C frontend
 *    "Live preview — not finalized legal export" stamp. CLOSED encounters
 *    return `livePreview: false`. Callers / UIs decide what to do with each.
 */

const CLINICAL_TIMELINE_CAP = 100;
const AUDIT_TIMELINE_CAP = 200;
const DIAGNOSES_CAP = 200;
const FOLLOW_UPS_CAP = 100;

const CLINICAL_DOC_EVENT_TYPES: EncounterClinicalEventType[] = [
  EncounterClinicalEventType.PROVIDER_MSE_SAVED,
  EncounterClinicalEventType.HANDOFF_NURSING,
  EncounterClinicalEventType.DISCHARGE_SUMMARY_SAVED,
  EncounterClinicalEventType.ADMISSION_SUMMARY_SAVED,
  EncounterClinicalEventType.DISPOSITION_SUPPLEMENT_SAVED,
  EncounterClinicalEventType.TRIAGE_ASSESSMENT_SAVED,
];

export const ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION = "encounter-chart-export-v1" as const;

type AnyRecord = Record<string, unknown>;

function asObjectOrNull(input: unknown): AnyRecord | null {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as AnyRecord) : null;
}

/**
 * Strip `dataBase64` (and other binary payload fields) from result attachments.
 * Keeps file metadata only (fileName, mimeType, sizeBytes when present).
 */
function sanitizeResultAttachments(resultData: unknown): {
  attachmentMetadata: Array<{
    fileName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
  }>;
  attachmentCount: number;
} {
  const obj = asObjectOrNull(resultData);
  if (!obj) return { attachmentMetadata: [], attachmentCount: 0 };
  const att = obj["attachments"];
  if (!Array.isArray(att)) return { attachmentMetadata: [], attachmentCount: 0 };
  const sanitized = att.map((raw) => {
    const o = asObjectOrNull(raw);
    if (!o) return { fileName: null, mimeType: null, sizeBytes: null };
    const fileName = typeof o.fileName === "string" && o.fileName.trim() ? o.fileName.trim() : null;
    const mimeType = typeof o.mimeType === "string" && o.mimeType.trim() ? o.mimeType.trim() : null;
    const sizeBytes =
      typeof o.sizeBytes === "number" && Number.isFinite(o.sizeBytes) ? Math.trunc(o.sizeBytes) : null;
    return { fileName, mimeType, sizeBytes };
  });
  return { attachmentMetadata: sanitized, attachmentCount: sanitized.length };
}

/**
 * Trace which result-payload keys (other than attachments / dataBase64) exist,
 * for downstream consumers that want to detect if a future structured field
 * was added without depending on raw JSON. Always PHI-free.
 */
function resultDataKeys(resultData: unknown): string[] {
  const obj = asObjectOrNull(resultData);
  if (!obj) return [];
  return Object.keys(obj).filter((k) => k !== "attachments");
}

function userDisplayFr(u: { firstName: string | null; lastName: string | null } | null | undefined): string | null {
  if (!u) return null;
  const display = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return display || null;
}

export type ChartExportManifest = {
  manifestVersion: typeof ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION;
  generatedAt: string;
  livePreview: boolean;
  caps: {
    clinicalTimeline: number;
    auditTimeline: number;
    diagnoses: number;
    followUps: number;
  };
  facility: { id: string; name: string | null };
  encounter: {
    id: string;
    type: string;
    status: string;
    workflowState: string;
    visitReason: string | null;
    chiefComplaint: string | null;
    roomLabel: string | null;
    physicianAssigned: { id: string; firstName: string; lastName: string } | null;
    createdAt: string;
    updatedAt: string;
    admittedAt: string | null;
    dischargedAt: string | null;
    dischargeStatus: string | null;
    closedByDisplayFr: string | null;
    closedAt: string | null;
    nursingAssessment: unknown;
    dischargeSummaryJson: unknown;
    admissionSummaryJson: unknown;
    treatmentPlan: string | null;
    clinicianImpression: string | null;
    providerNote: string | null;
    providerDocumentation: {
      status: string;
      signedAt: string | null;
      signedByDisplayFr: string | null;
    };
    providerAddenda: Array<{
      id: string;
      text: string;
      createdAt: string;
      createdByDisplayFr: string | null;
    }>;
  };
  patient: {
    id: string;
    mrn: string | null;
    globalMrn: string;
    nationalId: string | null;
    firstName: string;
    lastName: string;
    dob: string | null;
    sex: string;
    sexAtBirth: string | null;
  };
  triage: {
    chiefComplaint: string | null;
    esi: number | null;
    onsetAt: string | null;
    triageCompleteAt: string | null;
    vitalsJson: unknown;
    strokeScreen: unknown;
    sepsisScreen: unknown;
  } | null;
  vitalsHistory: {
    entries: Array<{
      recordedAt: string;
      source: string;
      vitals: AnyRecord;
      recordedBy: { userId: string | null; displayName: string | null };
    }>;
  };
  diagnoses: {
    items: Array<{
      id: string;
      code: string;
      description: string | null;
      status: string;
      onsetDate: string | null;
      sortOrder: number | null;
      codeSource: string | null;
      createdAt: string;
    }>;
    total: number;
  };
  documentationHistory: {
    entries: Array<{
      id: string;
      eventType: string;
      createdAt: string;
      createdBy: { userId: string | null; displayName: string | null };
      payloadJson: unknown;
    }>;
  };
  orders: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: string;
    cancelledAt: string | null;
    cancellationReason: string | null;
    items: Array<{
      id: string;
      catalogItemType: string;
      status: string;
      lifecycleState: string;
      manualLabel: string | null;
      manualSecondaryText: string | null;
      strength: string | null;
      notes: string | null;
      completedAt: string | null;
      completedBy: { userId: string | null; displayName: string | null } | null;
    }>;
  }>;
  results: Array<{
    orderItemId: string;
    catalogItemType: string;
    resultText: string | null;
    criticalValue: boolean;
    verifiedAt: string | null;
    acknowledgedByProviderAt: string | null;
    acknowledgedByDisplayFr: string | null;
    enteredByDisplayFr: string | null;
    attachmentCount: number;
    attachmentMetadata: Array<{
      fileName: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
    }>;
    resultDataKeys: string[];
    createdAt: string;
    updatedAt: string;
  }>;
  medicationAdministrations: Array<{
    id: string;
    orderItemId: string | null;
    medicationLabelSnapshot: string | null;
    route: string | null;
    doseValue: string | null;
    doseUnit: string | null;
    administeredQuantity: string | null;
    administeredAt: string;
    administeredByDisplayFr: string | null;
    marAction: string | null;
    notes: string | null;
  }>;
  procedures: {
    entries: Array<{
      id: string;
      createdAt: string;
      eventType: string;
      payloadJson: unknown;
      createdByDisplayFr: string | null;
    }>;
  };
  ivAccess: {
    entries: Array<{
      id: string;
      createdAt: string;
      eventType: string;
      payloadJson: unknown;
      createdByDisplayFr: string | null;
    }>;
  };
  clinicalTimeline: {
    items: Array<{
      id: string;
      eventType: string;
      createdAt: string;
      createdByDisplayFr: string | null;
      payloadJson: unknown;
    }>;
    capped: boolean;
  };
  auditTimelineSummary: {
    items: ReturnType<typeof mapAuditLogRowToTimelineItem>[];
    capped: boolean;
  };
  followUps: {
    items: Array<{
      id: string;
      dueDate: string;
      reason: string | null;
      status: string;
      notes: string | null;
      completedAt: string | null;
      createdAt: string;
    }>;
  };
  deferredDomains: Array<{ domain: string; reason: string }>;
};

@Injectable()
export class EncounterChartExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  /**
   * Compose the manifest. Throws `NotFoundException` when the encounter does
   * not exist for `facilityId` (cross-facility reads must not leak existence).
   */
  async getManifest(
    facilityId: string,
    encounterId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
  ): Promise<ChartExportManifest> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        facilityId: true,
        patientId: true,
        type: true,
        status: true,
        workflowState: true,
        chiefComplaint: true,
        roomLabel: true,
        treatmentPlan: true,
        providerNote: true,
        nursingAssessment: true,
        notes: true,
        dischargeSummaryJson: true,
        admissionSummaryJson: true,
        admittedAt: true,
        dischargedAt: true,
        dischargeStatus: true,
        followUpDate: true,
        createdAt: true,
        updatedAt: true,
        providerDocumentationStatus: true,
        providerDocumentationSignedAt: true,
        providerDocumentationSignedByUserId: true,
        physicianAssignedUserId: true,
        physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
        providerDocumentationSignedBy: { select: { firstName: true, lastName: true } },
        patient: {
          select: {
            id: true,
            mrn: true,
            globalMrn: true,
            nationalId: true,
            firstName: true,
            lastName: true,
            dob: true,
            sex: true,
            sexAtBirth: true,
          },
        },
        facility: { select: { id: true, name: true } },
        providerAddenda: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            text: true,
            createdAt: true,
            createdBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const livePreview = encounter.status !== EncounterStatus.CLOSED;

    const [
      triage,
      triageReadings,
      vitalsEvents,
      diagnoses,
      diagnosesTotal,
      docHistory,
      orders,
      results,
      medicationAdministrations,
      procedures,
      ivAccess,
      clinicalTimelineRows,
      auditRows,
      followUps,
    ] = await Promise.all([
      this.prisma.triage.findFirst({
        where: { encounterId, facilityId },
        select: {
          chiefComplaint: true,
          esi: true,
          onsetAt: true,
          triageCompleteAt: true,
          vitalsJson: true,
          strokeScreen: true,
          sepsisScreen: true,
        },
      }),
      this.prisma.triageVitalsReading.findMany({
        where: { encounterId, facilityId },
        orderBy: { recordedAt: "asc" },
      }),
      this.prisma.encounterClinicalEvent.findMany({
        where: {
          encounterId,
          facilityId,
          eventType: EncounterClinicalEventType.VITALS_RECORDED,
        },
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.diagnosis.findMany({
        where: { encounterId, facilityId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: DIAGNOSES_CAP,
        select: {
          id: true,
          code: true,
          description: true,
          status: true,
          onsetDate: true,
          sortOrder: true,
          codeSource: true,
          createdAt: true,
        },
      }),
      this.prisma.diagnosis.count({ where: { encounterId, facilityId } }),
      this.prisma.encounterClinicalEvent.findMany({
        where: {
          encounterId,
          facilityId,
          eventType: { in: CLINICAL_DOC_EVENT_TYPES },
        },
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.order.findMany({
        where: { encounterId, facilityId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          cancelledAt: true,
          cancellationReason: true,
          items: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              catalogItemType: true,
              status: true,
              lifecycleState: true,
              manualLabel: true,
              manualSecondaryText: true,
              strength: true,
              notes: true,
              completedAt: true,
              completedByUserId: true,
              completedByNurse: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      // Read all Result rows for this encounter via OrderItem -> Order facility scope.
      this.prisma.result.findMany({
        where: { facilityId, orderItem: { order: { encounterId, facilityId } } },
        orderBy: { updatedAt: "desc" },
        select: {
          orderItemId: true,
          resultText: true,
          resultData: true,
          criticalValue: true,
          verifiedAt: true,
          verifiedByUserId: true,
          acknowledgedByProviderAt: true,
          acknowledgedByUserId: true,
          createdAt: true,
          updatedAt: true,
          orderItem: { select: { id: true, catalogItemType: true } },
        },
      }),
      this.prisma.medicationAdministration.findMany({
        where: { encounterId, facilityId },
        orderBy: { administeredAt: "asc" },
        select: {
          id: true,
          orderItemId: true,
          medicationLabelSnapshot: true,
          route: true,
          doseValue: true,
          doseUnit: true,
          administeredQuantity: true,
          administeredAt: true,
          marAction: true,
          notes: true,
          administeredBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.encounterClinicalEvent.findMany({
        where: {
          encounterId,
          facilityId,
          eventType: EncounterClinicalEventType.PROCEDURE_DOCUMENTED,
        },
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.encounterClinicalEvent.findMany({
        where: {
          encounterId,
          facilityId,
          eventType: {
            in: [EncounterClinicalEventType.IV_INSERTED, EncounterClinicalEventType.IV_REMOVED],
          },
        },
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.encounterClinicalEvent.findMany({
        where: { encounterId, facilityId },
        orderBy: { createdAt: "desc" },
        take: CLINICAL_TIMELINE_CAP + 1,
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          facilityId,
          patientId: encounter.patientId,
          action: { in: ENCOUNTER_AUDIT_TIMELINE_V1_ACTIONS },
          OR: [
            { encounterId: encounter.id },
            { metadata: { path: ["encounterId"], equals: encounter.id } as Prisma.JsonFilter<"AuditLog"> },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: AUDIT_TIMELINE_CAP + 1,
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.followUp.findMany({
        where: { encounterId, facilityId },
        orderBy: { dueDate: "asc" },
        take: FOLLOW_UPS_CAP,
        select: {
          id: true,
          dueDate: true,
          reason: true,
          status: true,
          notes: true,
          completedAt: true,
          createdAt: true,
        },
      }),
    ]);

    /* ---------- Vitals history (triage readings + clinical events) ---------- */
    const vitalsEntries: ChartExportManifest["vitalsHistory"]["entries"] = [];
    for (const r of triageReadings) {
      const vj = asObjectOrNull(r.vitalsJson);
      if (!vj) continue;
      vitalsEntries.push({
        recordedAt: r.recordedAt.toISOString(),
        source: "TRIAGE",
        vitals: vj,
        recordedBy: { userId: null, displayName: null },
      });
    }
    for (const e of vitalsEvents) {
      const payload = asObjectOrNull(e.payloadJson);
      const vitals = asObjectOrNull(payload?.vitals);
      if (!vitals) continue;
      const src =
        typeof payload?.source === "string" && payload.source.trim()
          ? payload.source.trim()
          : "ENCOUNTER_CHART";
      if (src === "TRIAGE") continue;
      vitalsEntries.push({
        recordedAt: e.createdAt.toISOString(),
        source: src,
        vitals,
        recordedBy: {
          userId: e.createdByUserId,
          displayName: userDisplayFr(e.createdBy),
        },
      });
    }
    vitalsEntries.sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    /* ---------- Audit timeline (filter to this encounter) ---------- */
    const auditCapped = auditRows.length > AUDIT_TIMELINE_CAP;
    const auditForEncounter = auditRows
      .slice(0, AUDIT_TIMELINE_CAP)
      .filter((row) => {
        const eid = row.encounterId ?? metadataEncounterId(row.metadata);
        return eid === encounter.id;
      })
      .map((row) => mapAuditLogRowToTimelineItem(row));

    /* ---------- Clinical timeline (cap signaled separately) ---------- */
    const clinicalTimelineCapped = clinicalTimelineRows.length > CLINICAL_TIMELINE_CAP;
    const clinicalTimelineItems = clinicalTimelineRows.slice(0, CLINICAL_TIMELINE_CAP).map((r) => ({
      id: r.id,
      eventType: r.eventType as string,
      createdAt: r.createdAt.toISOString(),
      createdByDisplayFr: userDisplayFr(r.createdBy),
      payloadJson: r.payloadJson,
    }));

    /* ---------- Closed-by display (from ENCOUNTER_CLOSE audit row) ---------- */
    let closedByDisplayFr: string | null = null;
    let closedAtIso: string | null = null;
    if (encounter.status === EncounterStatus.CLOSED) {
      const closeLog = await this.prisma.auditLog.findFirst({
        where: { action: AuditAction.ENCOUNTER_CLOSE, entityId: encounter.id, facilityId },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { firstName: true, lastName: true } } },
      });
      if (closeLog?.user) {
        closedByDisplayFr = userDisplayFr(closeLog.user);
      }
      if (closeLog?.createdAt) {
        closedAtIso = closeLog.createdAt.toISOString();
      }
    }

    /* ---------- Sanitize results (strip base64) ---------- */
    const sanitizedResults: ChartExportManifest["results"] = [];
    for (const r of results) {
      const verifierLog = r.verifiedByUserId
        ? await this.prisma.user.findUnique({
            where: { id: r.verifiedByUserId },
            select: { firstName: true, lastName: true },
          })
        : null;
      const acknowledger = r.acknowledgedByUserId
        ? await this.prisma.user.findUnique({
            where: { id: r.acknowledgedByUserId },
            select: { firstName: true, lastName: true },
          })
        : null;
      const { attachmentMetadata, attachmentCount } = sanitizeResultAttachments(r.resultData);
      sanitizedResults.push({
        orderItemId: r.orderItem.id,
        catalogItemType: r.orderItem.catalogItemType,
        resultText: r.resultText,
        criticalValue: r.criticalValue,
        verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
        acknowledgedByProviderAt: r.acknowledgedByProviderAt
          ? r.acknowledgedByProviderAt.toISOString()
          : null,
        acknowledgedByDisplayFr: userDisplayFr(acknowledger),
        enteredByDisplayFr: userDisplayFr(verifierLog),
        attachmentCount,
        attachmentMetadata,
        resultDataKeys: resultDataKeys(r.resultData),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      });
    }

    /* ---------- Provider addenda ---------- */
    const providerAddenda = encounter.providerAddenda.map((ad) => ({
      id: ad.id,
      text: ad.text,
      createdAt: ad.createdAt.toISOString(),
      createdByDisplayFr: userDisplayFr(ad.createdBy),
    }));

    /* ---------- Deferred domains (Phase 5F backend manifest scope) ---------- */
    const deferredDomains: ChartExportManifest["deferredDomains"] = [
      {
        domain: "pharmacy.encounterDispenses",
        reason: "no_encounter_scoped_dispense_endpoint_phase_5d",
      },
      { domain: "pathways", reason: "deferred_to_phase_5f" },
      { domain: "publicHealth", reason: "deferred_to_phase_5f" },
      { domain: "vaccinations", reason: "patient_level_only_in_phase_5d" },
      { domain: "billing", reason: "out_of_scope_for_clinical_export" },
    ];

    const manifest: ChartExportManifest = {
      manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
      generatedAt: new Date().toISOString(),
      livePreview,
      caps: {
        clinicalTimeline: CLINICAL_TIMELINE_CAP,
        auditTimeline: AUDIT_TIMELINE_CAP,
        diagnoses: DIAGNOSES_CAP,
        followUps: FOLLOW_UPS_CAP,
      },
      facility: { id: encounter.facility.id, name: encounter.facility.name ?? null },
      encounter: {
        id: encounter.id,
        type: encounter.type as string,
        status: encounter.status as string,
        workflowState: encounter.workflowState as string,
        visitReason: null,
        chiefComplaint: encounter.chiefComplaint,
        roomLabel: encounter.roomLabel,
        physicianAssigned: encounter.physicianAssigned
          ? {
              id: encounter.physicianAssigned.id,
              firstName: encounter.physicianAssigned.firstName,
              lastName: encounter.physicianAssigned.lastName,
            }
          : null,
        createdAt: encounter.createdAt.toISOString(),
        updatedAt: encounter.updatedAt.toISOString(),
        admittedAt: encounter.admittedAt ? encounter.admittedAt.toISOString() : null,
        dischargedAt: encounter.dischargedAt ? encounter.dischargedAt.toISOString() : null,
        dischargeStatus: encounter.dischargeStatus ?? null,
        closedByDisplayFr,
        closedAt: closedAtIso,
        nursingAssessment: encounter.nursingAssessment,
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        admissionSummaryJson: encounter.admissionSummaryJson,
        treatmentPlan: encounter.treatmentPlan,
        clinicianImpression: null,
        providerNote: encounter.providerNote,
        providerDocumentation: {
          status: encounter.providerDocumentationStatus,
          signedAt: encounter.providerDocumentationSignedAt
            ? encounter.providerDocumentationSignedAt.toISOString()
            : null,
          signedByDisplayFr: userDisplayFr(encounter.providerDocumentationSignedBy),
        },
        providerAddenda,
      },
      patient: {
        id: encounter.patient.id,
        mrn: encounter.patient.mrn,
        globalMrn: encounter.patient.globalMrn,
        nationalId: encounter.patient.nationalId,
        firstName: encounter.patient.firstName,
        lastName: encounter.patient.lastName,
        dob: encounter.patient.dob ? encounter.patient.dob.toISOString() : null,
        sex: encounter.patient.sex as string,
        sexAtBirth: (encounter.patient.sexAtBirth as string | null) ?? null,
      },
      triage: triage
        ? {
            chiefComplaint: triage.chiefComplaint,
            esi: triage.esi,
            onsetAt: triage.onsetAt ? triage.onsetAt.toISOString() : null,
            triageCompleteAt: triage.triageCompleteAt ? triage.triageCompleteAt.toISOString() : null,
            vitalsJson: triage.vitalsJson,
            strokeScreen: triage.strokeScreen,
            sepsisScreen: triage.sepsisScreen,
          }
        : null,
      vitalsHistory: { entries: vitalsEntries },
      diagnoses: {
        items: diagnoses.map((d) => ({
          id: d.id,
          code: d.code,
          description: d.description,
          status: d.status as string,
          onsetDate: d.onsetDate ? d.onsetDate.toISOString() : null,
          sortOrder: d.sortOrder,
          codeSource: (d.codeSource as string | null) ?? null,
          createdAt: d.createdAt.toISOString(),
        })),
        total: diagnosesTotal,
      },
      documentationHistory: {
        entries: docHistory.map((e) => ({
          id: e.id,
          eventType: e.eventType as string,
          createdAt: e.createdAt.toISOString(),
          createdBy: {
            userId: e.createdByUserId,
            displayName: userDisplayFr(e.createdBy),
          },
          payloadJson: e.payloadJson,
        })),
      },
      orders: orders.map((o) => ({
        id: o.id,
        type: o.type as string,
        status: o.status as string,
        createdAt: o.createdAt.toISOString(),
        cancelledAt: o.cancelledAt ? o.cancelledAt.toISOString() : null,
        cancellationReason: o.cancellationReason ?? null,
        items: o.items.map((it) => ({
          id: it.id,
          catalogItemType: it.catalogItemType,
          status: it.status as string,
          lifecycleState: it.lifecycleState as string,
          manualLabel: it.manualLabel,
          manualSecondaryText: it.manualSecondaryText,
          strength: it.strength,
          notes: it.notes,
          completedAt: it.completedAt ? it.completedAt.toISOString() : null,
          completedBy: it.completedByUserId
            ? {
                userId: it.completedByUserId,
                displayName: userDisplayFr(it.completedByNurse),
              }
            : null,
        })),
      })),
      results: sanitizedResults,
      medicationAdministrations: medicationAdministrations.map((m) => ({
        id: m.id,
        orderItemId: m.orderItemId,
        medicationLabelSnapshot: m.medicationLabelSnapshot,
        route: m.route,
        doseValue: m.doseValue ? String(m.doseValue) : null,
        doseUnit: m.doseUnit,
        administeredQuantity: m.administeredQuantity ? String(m.administeredQuantity) : null,
        administeredAt: m.administeredAt.toISOString(),
        administeredByDisplayFr: userDisplayFr(m.administeredBy),
        marAction: (m.marAction as string | null) ?? null,
        notes: m.notes,
      })),
      procedures: {
        entries: procedures.map((p) => ({
          id: p.id,
          createdAt: p.createdAt.toISOString(),
          eventType: p.eventType as string,
          payloadJson: p.payloadJson,
          createdByDisplayFr: userDisplayFr(p.createdBy),
        })),
      },
      ivAccess: {
        entries: ivAccess.map((p) => ({
          id: p.id,
          createdAt: p.createdAt.toISOString(),
          eventType: p.eventType as string,
          payloadJson: p.payloadJson,
          createdByDisplayFr: userDisplayFr(p.createdBy),
        })),
      },
      clinicalTimeline: {
        items: clinicalTimelineItems,
        capped: clinicalTimelineCapped,
      },
      auditTimelineSummary: {
        items: auditForEncounter,
        capped: auditCapped,
      },
      followUps: {
        items: followUps.map((f) => ({
          id: f.id,
          dueDate: f.dueDate.toISOString(),
          reason: f.reason,
          status: f.status as string,
          notes: f.notes,
          completedAt: f.completedAt ? f.completedAt.toISOString() : null,
          createdAt: f.createdAt.toISOString(),
        })),
      },
      deferredDomains,
    };

    /**
     * Single PHI-safe `CHART_ACCESS` audit log. Metadata only includes counts /
     * version flags; never names, MRN, dates of birth, or clinical text.
     * Keeping `entityType: "ENCOUNTER"` makes downstream filters consistent
     * with `ENCOUNTER_VIEW`; the manifest version + livePreview flag let us
     * distinguish chart-export reads from regular chart-summary reads.
     */
    await this.audit.log(AuditAction.CHART_ACCESS, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
      metadata: {
        chartExport: true,
        manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
        livePreview,
        includedDomainCount: 14,
        deferredDomainCount: deferredDomains.length,
        clinicalTimelineCapped,
        auditTimelineCapped: auditCapped,
        encounterStatus: encounter.status,
      },
    });

    return manifest;
  }
}
