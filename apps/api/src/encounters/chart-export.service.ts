import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditAction,
  EncounterClinicalEventType,
  EncounterStatus,
  Prisma,
} from "@prisma/client";
import {
  buildDocumentedProcedureSummaryMeta,
  legacyErNotesV1DisplayEntries,
  mapEncounterNoteForLegalChart,
  mapClinicalDocumentationEntryForLegalChart,
  readCanonicalProcedureTypeFromPayload,
  readLinkedProcedureEventIdFromPayload,
  readPayloadVersionFromPayload,
  clinicalTimelineDisplayLabelFr,
  computeObservationStaySummaryForExport,
  resolveClinicalTimelineDisplayEventType,
  type ObservationStaySummaryForExport,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";
import {
  ENCOUNTER_AUDIT_TIMELINE_V1_ACTIONS,
  mapAuditLogRowToTimelineItem,
  metadataEncounterId,
} from "../patients/chart-audit-timeline.util";
import { hashCanonicalJson, sha256Hex, canonicalizeForHash } from "./chart-export-hash.util";
import { buildEdClinicalTimelineForChartExport } from "./ed-clinical-timeline.util";
import { renderEncounterChartExportHtml } from "./chart-export-html.util";
import { UnifiedEncounterTimelineService } from "./unified-encounter-timeline.service";
import {
  CHART_EXPORT_SIGNATURE_ALGORITHM,
  CHART_EXPORT_SIGNATURE_VERSION,
  getChartExportSigningSecret,
  manifestSignatureVersion,
  signManifestHash,
  verifyManifestSignature,
} from "./chart-export-signature.util";

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

/**
 * Phase 5F — independent template/render version. Bumped only when the HTML
 * renderer (or any future format renderer) changes shape; lets us re-render
 * old snapshots without invalidating the original `manifestHash`.
 */
export const ENCOUNTER_CHART_EXPORT_TEMPLATE_VERSION = "encounter-chart-export-template-v1" as const;

/**
 * Returned to controllers / clients when the stored manifest hash no longer
 * matches its content, or — Phase 6 — when the stored HMAC signature does
 * not verify against the configured server secret. The single marker value
 * keeps the controller / client behavior identical for any integrity failure.
 */
export const RECORD_EXPORT_INTEGRITY_MISMATCH = "RECORD_EXPORT_INTEGRITY_MISMATCH" as const;

/**
 * Authoritative list of clinical-data domain keys included in the export manifest.
 *
 * Used to derive `includedDomainCount` for the PHI-safe `CHART_ACCESS` audit metadata
 * (no hardcoded number). Adding or removing a manifest section requires updating this
 * list, which keeps the audit metric honest as the manifest evolves.
 *
 * Excludes envelope/header keys (`manifestVersion`, `generatedAt`, `livePreview`,
 * `caps`, `facility`, `deferredDomains`) — those are not "clinical domains".
 */
export const ENCOUNTER_CHART_EXPORT_INCLUDED_DOMAIN_KEYS = [
  "encounter",
  "patient",
  "triage",
  "vitalsHistory",
  "diagnoses",
  "documentationHistory",
  "orders",
  "results",
  "medicationAdministrations",
  "procedures",
  "ivAccess",
  "clinicalTimeline",
  "auditTimelineSummary",
  "followUps",
] as const;
type IncludedDomainKey = (typeof ENCOUNTER_CHART_EXPORT_INCLUDED_DOMAIN_KEYS)[number];

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
    billingClassification: string | null;
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
      workspaceNote: {
        title: string;
        encounterMode: string;
        documentType: string;
        savedAt: string | null;
        savedBy: string | null;
        sections: Array<{ id: string; label: string; text: string }>;
      } | null;
    };
    /** Structured initial nursing documentation derived read-only from nursingEvalV1. */
    nursingDocumentation: {
      initialAssessment: {
        title: string;
        documentedBy: string | null;
        documentedAt: string | null;
        sections: Array<{ id: string; label: string; text: string }>;
      } | null;
      dischargeExecution: {
        documentedBy: string;
        documentedAt: string;
        executionNote: string | null;
      } | null;
    } | null;
    providerAddenda: Array<{
      id: string;
      text: string;
      createdAt: string;
      createdByDisplayFr: string | null;
    }>;
    /** MEDNOTE.1/2 — append-only encounter notes (legal chart record). */
    encounterNotes: Array<{
      id: string;
      noteType: string;
      body: string;
      authorDisplayName: string;
      authorRoleTitle: string;
      createdAt: string;
      legacy?: boolean;
      voidedAt?: string | null;
      voidReasonCode?: string | null;
      isAmendment?: boolean;
      amendedFromNoteId?: string | null;
      amendmentReason?: string | null;
      requiresCosign?: boolean;
      cosignedAt?: string | null;
      cosignRoleSnapshot?: string | null;
    }>;
    /** EDOC.2 — append-only structured clinical documentation entries. */
    clinicalDocumentationEntries: Array<{
      id: string;
      encounterId: string;
      category: string;
      cardId: string;
      cardTitleEn: string;
      cardTitleFr: string;
      authorDisplayName: string;
      authorRoleTitle: string;
      createdAt: string;
      payloadJson: Record<string, unknown>;
      payloadSummary: Array<{ key: string; value: string }>;
      voidedAt: string | null;
    }>;
    /** Phase 13C — additive operational LOS metadata for observation / short stay (INPATIENT only). Omitted on legacy stored snapshots. */
    observationStay?: ObservationStaySummaryForExport;
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
      procedureNameFr?: string | null;
      procedureNameEn?: string | null;
      performedAtIso?: string | null;
      documentedAtIso?: string | null;
      performedByDisplayFr?: string | null;
      documentedByDisplayFr?: string | null;
      performerTitle?: string | null;
      status?: string | null;
      clinicalSummaryFr?: string | null;
      clinicalSummaryEn?: string | null;
      documentationRole?: string | null;
      documentationRoleFr?: string | null;
      canonicalProcedureType?: string | null;
      linkedProcedureEventId?: string | null;
      payloadVersion?: number | null;
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
      displayEventType?: string;
      displayLabelFr?: string;
      createdAt: string;
      createdByDisplayFr: string | null;
      payloadJson: unknown;
    }>;
    capped: boolean;
  };
  /** Phase 15F-D.2 — optional cross-department unified read-model timeline. */
  unifiedTimeline: {
    items: Array<{
      id: string;
      sourceKind: string;
      displayGroup: string;
      displayEventType: string;
      documentedAtIso: string;
      effectiveClinicalAtIso: string | null;
      hasClinicalTimeCorrection: boolean;
      titleFr: string | null;
      summaryFr: string | null;
      actorDisplayName: string | null;
      actorDepartment: string | null;
      chips: string[];
    }>;
    capped: boolean;
  } | null;
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
  /** Phase 19W.2 — chronological ED clinical timeline (read-only aggregation). */
  edClinicalTimeline?: {
    items: Array<{
      id: string;
      sortKey: string;
      timestampIso: string | null;
      category: string;
      categoryLabel: string;
      actorName: string | null;
      actorRoleTitle: string | null;
      summary: string;
      sourceType: string;
      sourceId: string;
      isUndated: boolean;
    }>;
  } | null;
};

const PROVIDER_DOCUMENTATION_NAMESPACE_KEY = "erProviderMseV1";
const PROVIDER_DOCUMENTATION_WORKSPACE_SOURCE = "PROVIDER_DOCUMENTATION_WORKSPACE";
const NURSING_EVAL_V1_KEY = "nursingEvalV1";
const ER_DISPOSITION_EXECUTION_V1_KEY = "erDispositionExecutionV1";

const NURSING_SECTION_LABELS_EN: Record<string, string> = {
  etatGeneral: "General appearance",
  neurologique: "Neurological",
  respiratoire: "Respiratory",
  cardiaque: "Cardiac",
  cardiovasculaire: "Cardiac",
  digestif: "Gastrointestinal",
  gastro: "Gastrointestinal",
  genito: "Genitourinary",
  musculo: "Musculoskeletal",
  peau: "Skin / wounds",
  douleur: "Pain",
  securite: "Safety / risks",
  observationsInfirmieres: "Nursing observations",
  interventionsInfirmieres: "Nursing interventions",
  notesInfirmieresLibres: "Other nursing notes",
  notesInfirmieres: "Nursing observations",
};

function nursingSectionLabelEn(key: string): string {
  return NURSING_SECTION_LABELS_EN[key] ?? key;
}

function initialNursingDocumentationFromAssessment(
  raw: unknown
): ChartExportManifest["encounter"]["nursingDocumentation"] {
  const root = asObjectOrNull(raw);
  const stored = asObjectOrNull(root?.[NURSING_EVAL_V1_KEY]);
  const sectionsObj = asObjectOrNull(stored?.sections);
  const sections: Array<{ id: string; label: string; text: string }> = [];
  if (sectionsObj) {
    for (const [id, value] of Object.entries(sectionsObj)) {
      const section = asObjectOrNull(value);
      const text = typeof section?.text === "string" ? section.text.trim() : "";
      if (!text) continue;
      sections.push({ id, label: nursingSectionLabelEn(id), text });
    }
  }
  const sig = asObjectOrNull(stored?.signature);
  const documentedBy =
    typeof sig?.savedByDisplayName === "string" && sig.savedByDisplayName.trim()
      ? sig.savedByDisplayName.trim()
      : null;
  const documentedAt = typeof sig?.savedAt === "string" ? sig.savedAt : null;
  const initialAssessment =
    sections.length > 0
      ? {
          title: "Initial nursing assessment",
          documentedBy,
          documentedAt,
          sections,
        }
      : null;

  const dischargeRoot = asObjectOrNull(root?.[ER_DISPOSITION_EXECUTION_V1_KEY]);
  const dischargeAt =
    typeof dischargeRoot?.dischargeSortieCompletedAt === "string"
      ? dischargeRoot.dischargeSortieCompletedAt
      : null;
  const dischargeBy =
    typeof dischargeRoot?.dischargeSortieCompletedByDisplayName === "string" &&
    dischargeRoot.dischargeSortieCompletedByDisplayName.trim()
      ? dischargeRoot.dischargeSortieCompletedByDisplayName.trim()
      : null;
  const executionNote =
    typeof dischargeRoot?.dischargeSortieExecutionNote === "string" &&
    dischargeRoot.dischargeSortieExecutionNote.trim()
      ? dischargeRoot.dischargeSortieExecutionNote.trim()
      : null;
  const dischargeExecution =
    dischargeAt && dischargeBy
      ? {
          documentedBy: dischargeBy,
          documentedAt: dischargeAt,
          executionNote,
        }
      : null;

  if (!initialAssessment && !dischargeExecution) return null;
  return { initialAssessment, dischargeExecution };
}

function providerDocumentationWorkspaceNote(raw: unknown): ChartExportManifest["encounter"]["providerDocumentation"]["workspaceNote"] {
  const root = asObjectOrNull(raw);
  const stored = asObjectOrNull(root?.[PROVIDER_DOCUMENTATION_NAMESPACE_KEY]);
  const meta = asObjectOrNull(stored?.workspaceMetadata);
  if (!stored || meta?.source !== PROVIDER_DOCUMENTATION_WORKSPACE_SOURCE) return null;
  const encounterMode = meta.encounterMode === "OBSERVATION" ? "OBSERVATION" : "ED";
  const documentType =
    meta.documentType === "OBSERVATION_PROVIDER_PROGRESS_NOTE"
      ? "OBSERVATION_PROVIDER_PROGRESS_NOTE"
      : "INITIAL_PROVIDER_NOTE";
  const labels =
    encounterMode === "OBSERVATION"
      ? {
          title: "Observation provider progress note",
          hpi: "HPI",
          ros: "ROS",
          physicalExam: "Physical Exam",
          mdm: "MDM",
          impression: "Impression",
          plan: "Plan",
        }
      : {
          title: "ED provider documentation",
          hpi: "HPI",
          ros: "ROS",
          physicalExam: "Physical Exam",
          mdm: "MDM",
          impression: "Impression",
          plan: "Plan",
        };
  const str = (key: string): string => {
    const value = stored[key];
    return typeof value === "string" ? value.trim() : "";
  };
  const join = (values: string[]): string => values.map((value) => value.trim()).filter(Boolean).join("\n");
  const sections = [
    { id: "hpi", label: labels.hpi, text: join([str("chiefConcern"), str("hpiNarrative")]) },
    {
      id: "ros",
      label: labels.ros,
      text: join([str("focusedImpression"), str("importantPositives"), str("importantNegatives"), str("redFlagsText")]),
    },
    {
      id: "physicalExam",
      label: labels.physicalExam,
      text: join([
        str("examGeneralAppearance"),
        str("examHeent"),
        str("examCardiac"),
        str("examRespiratory"),
        str("examAbdomen"),
        str("examNeuroMental"),
        str("examMusculoskeletal"),
        str("examSkin"),
        str("examReassessmentExtra"),
      ]),
    },
    {
      id: "mdm",
      label: labels.mdm,
      text: join([
        str("mdmWorkingAssessment"),
        str("differentialAssessmentText"),
        str("mdmDataReviewed"),
        str("mdmRiskLevel"),
        str("mdmClinicalRationale"),
        str("mdmPlanSummary"),
        str("mdmImmediateActionsRationale"),
        str("mdmConsultsDiscussed"),
        str("mdmAdmitObserveDischarge"),
      ]),
    },
    { id: "impression", label: labels.impression, text: str("clinicalImpression") },
    { id: "plan", label: labels.plan, text: join([str("treatmentPlan"), str("followUpDisposition"), str("mdmProviderAddendum")]) },
  ].filter((section) => section.text.trim());
  if (sections.length === 0) return null;
  return {
    title: labels.title,
    encounterMode,
    documentType,
    savedAt: typeof meta.savedAt === "string" ? meta.savedAt : null,
    savedBy: typeof meta.savedBy === "string" ? meta.savedBy : null,
    sections,
  };
}

export type ChartExportRequestOptions = {
  /** Defaults to `json`. HTML uses the same manifest composition path; only the HTTP response differs. */
  exportFormat?: "json" | "html";
  /**
   * Phase 15F-D.2 — include read-model unified longitudinal timeline in manifest (additive).
   * Defaults to true; set false to preserve legacy export shape only.
   */
  includeUnifiedTimeline?: boolean;
  /**
   * Internal use only. When `true`, suppresses the `CHART_ACCESS` audit emission
   * so the calling site (e.g. `createSnapshot`) can log a more specific action
   * such as `RECORD_EXPORT` instead. Never expose this to HTTP callers.
   */
  skipAudit?: boolean;
};

export type ChartExportSnapshotSummary = {
  id: string;
  manifestVersion: string;
  manifestHash: string;
  templateVersion: string | null;
  createdAt: string;
};

@Injectable()
export class EncounterChartExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly unifiedTimelineService: UnifiedEncounterTimelineService
  ) {}

  private async buildUnifiedTimelineForExport(facilityId: string, encounterId: string) {
    const res = await this.unifiedTimelineService.getUnifiedTimeline(facilityId, encounterId, 120);
    return {
      capped: res.capped,
      items: res.items.map((i) => ({
        id: i.id,
        sourceKind: i.sourceKind,
        displayGroup: i.displayGroup,
        displayEventType: i.displayEventType,
        documentedAtIso: i.documentedAtIso,
        effectiveClinicalAtIso: i.effectiveClinicalAtIso,
        hasClinicalTimeCorrection: i.hasClinicalTimeCorrection,
        titleFr: i.titleFr,
        summaryFr: i.summaryFr,
        actorDisplayName: i.actor.displayName,
        actorDepartment: i.actor.department,
        chips: i.chips,
      })),
    };
  }

  /**
   * Compose the manifest. Throws `NotFoundException` when the encounter does
   * not exist for `facilityId` (cross-facility reads must not leak existence).
   *
   * @param options.exportFormat — included in PHI-safe audit metadata (`json` | `html`).
   */
  async getManifest(
    facilityId: string,
    encounterId: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
    options?: ChartExportRequestOptions
  ): Promise<ChartExportManifest> {
    const exportFormat = options?.exportFormat === "html" ? "html" : "json";
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
        encounterNotes: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            noteType: true,
            body: true,
            authorDisplayNameSnapshot: true,
            authorRoleSnapshot: true,
            createdAt: true,
            voidedAt: true,
            voidedByUserId: true,
            voidReasonCode: true,
            isAmendment: true,
            amendedFromNoteId: true,
            amendmentReason: true,
            requiresCosign: true,
            cosignedAt: true,
            cosignedByUserId: true,
            cosignRoleSnapshot: true,
          },
        },
        clinicalDocumentationEntries: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            encounterId: true,
            category: true,
            cardId: true,
            authorDisplayNameSnapshot: true,
            authorRoleSnapshot: true,
            createdAt: true,
            payloadJson: true,
            voidedAt: true,
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
    const clinicalTimelineItems = clinicalTimelineRows.slice(0, CLINICAL_TIMELINE_CAP).map((r) => {
      const storedType = r.eventType as string;
      const displayEventType = resolveClinicalTimelineDisplayEventType({
        eventType: storedType,
        payloadJson: r.payloadJson,
      });
      return {
        id: r.id,
        eventType: storedType,
        displayEventType,
        displayLabelFr: clinicalTimelineDisplayLabelFr(displayEventType),
        createdAt: r.createdAt.toISOString(),
        createdByDisplayFr: userDisplayFr(r.createdBy),
        payloadJson: r.payloadJson,
      };
    });

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

    const relationalEncounterNotes = (encounter.encounterNotes ?? []).map((n) =>
      mapEncounterNoteForLegalChart({
        ...n,
        authorDisplayNameSnapshot: n.authorDisplayNameSnapshot,
        authorRoleSnapshot: n.authorRoleSnapshot,
      })
    );
    const legacyEncounterNotes = legacyErNotesV1DisplayEntries(
      encounter.nursingAssessment,
      encounter.id
    ).map((n) => mapEncounterNoteForLegalChart({ ...n, legacy: true }));
    const encounterNotes = [...relationalEncounterNotes, ...legacyEncounterNotes].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );

    const clinicalDocumentationEntries = (encounter.clinicalDocumentationEntries ?? []).map((row) =>
      mapClinicalDocumentationEntryForLegalChart({
        ...row,
        payloadJson: row.payloadJson,
      })
    );

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

    const observationStay = computeObservationStaySummaryForExport({
      encounterType: encounter.type as string,
      admittedAt: encounter.admittedAt,
      createdAt: encounter.createdAt,
      dischargedAt: encounter.dischargedAt,
      previewNowMs: encounter.status === EncounterStatus.OPEN ? Date.now() : null,
    });

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
        billingClassification: (encounter as { billingClassification?: string }).billingClassification ?? null,
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
          workspaceNote: providerDocumentationWorkspaceNote(encounter.nursingAssessment),
        },
        nursingDocumentation: initialNursingDocumentationFromAssessment(encounter.nursingAssessment),
        providerAddenda,
        encounterNotes,
        clinicalDocumentationEntries,
        observationStay,
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
        entries: procedures.map((p) => {
          const createdByDisplayFr = userDisplayFr(p.createdBy);
          const base = {
            id: p.id,
            createdAt: p.createdAt.toISOString(),
            eventType: p.eventType as string,
            payloadJson: p.payloadJson,
            createdByDisplayFr,
          };
          if (p.eventType !== EncounterClinicalEventType.PROCEDURE_DOCUMENTED) {
            return base;
          }
          const summaryMeta = buildDocumentedProcedureSummaryMeta({
            payloadJson: p.payloadJson,
            documentedAtIso: p.createdAt.toISOString(),
            documentedByDisplayName: createdByDisplayFr,
          });
          if (!summaryMeta) return base;
          return {
            ...base,
            procedureNameFr: summaryMeta.procedureNameFr,
            procedureNameEn: summaryMeta.procedureNameEn,
            performedAtIso: summaryMeta.performedAtIso,
            documentedAtIso: summaryMeta.documentedAtIso,
            performedByDisplayFr: summaryMeta.performedByDisplayName,
            documentedByDisplayFr: summaryMeta.documentedByDisplayName,
            performerTitle: summaryMeta.performerTitle,
            status: summaryMeta.status,
            clinicalSummaryFr: summaryMeta.clinicalSummaryFr,
            clinicalSummaryEn: summaryMeta.clinicalSummaryEn,
            documentationRole: summaryMeta.documentationRole,
            documentationRoleFr:
              summaryMeta.documentationRole === "NURSING"
                ? "Documentation infirmière"
                : "Documentation médicale",
            canonicalProcedureType: readCanonicalProcedureTypeFromPayload(p.payloadJson),
            linkedProcedureEventId: readLinkedProcedureEventIdFromPayload(p.payloadJson),
            payloadVersion: readPayloadVersionFromPayload(p.payloadJson),
          };
        }),
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
      unifiedTimeline:
        options?.includeUnifiedTimeline === false
          ? null
          : await this.buildUnifiedTimelineForExport(facilityId, encounter.id),
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
     * Derive `includedDomainCount` from the actual manifest. Non-null clinical
     * domain keys count as included; nullable headers like `triage` only count
     * when populated. This avoids drift if a domain is added/removed later.
     */
    const includedDomainCount = ENCOUNTER_CHART_EXPORT_INCLUDED_DOMAIN_KEYS.reduce<number>(
      (acc, key: IncludedDomainKey) => {
        const v = manifest[key];
        return acc + (v === null || typeof v === "undefined" ? 0 : 1);
      },
      0
    );

    /**
     * Single PHI-safe `CHART_ACCESS` audit log. Metadata only includes counts /
     * version flags; never names, MRN, dates of birth, or clinical text.
     * Keeping `entityType: "ENCOUNTER"` makes downstream filters consistent
     * with `ENCOUNTER_VIEW`; the manifest version + livePreview flag let us
     * distinguish chart-export reads from regular chart-summary reads.
     *
     * Phase 5F — `skipAudit: true` lets `createSnapshot` suppress this row and
     * write a `RECORD_EXPORT` audit instead (one canonical action per request).
     */
    if (!options?.skipAudit) {
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
          exportFormat,
          manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
          livePreview,
          includedDomainCount,
          deferredDomainCount: deferredDomains.length,
          clinicalTimelineCapped,
          auditTimelineCapped: auditCapped,
          encounterStatus: encounter.status,
        },
      });
    }

    manifest.edClinicalTimeline = buildEdClinicalTimelineForChartExport(manifest, "en");

    return manifest;
  }

  /**
   * Phase 5F — create an immutable encounter chart export snapshot.
   *
   * Behavior:
   *  - CLOSED-only. OPEN encounters retain the live preview path and cannot
   *    produce a snapshot (avoids creating "immutable" records that race
   *    with ongoing clinical writes).
   *  - Composes the manifest via the existing `getManifest` pipeline (single
   *    source of truth). `skipAudit: true` is set internally so we emit
   *    exactly one audit row — `RECORD_EXPORT` — for this operation.
   *  - Persists the canonicalized JSON manifest plus its SHA-256 hash; HTML
   *    is intentionally NOT stored (template evolves independently).
   *  - Emits a fail-closed `RECORD_EXPORT` audit with PHI-safe metadata.
   *
   * @throws ConflictException when the encounter is not CLOSED (livePreview).
   * @throws NotFoundException when the encounter is not visible to `facilityId`.
   */
  async createSnapshot(
    facilityId: string,
    encounterId: string,
    userId?: string,
    ip?: string,
    userAgent?: string
  ): Promise<ChartExportSnapshotSummary> {
    const manifest = await this.getManifest(facilityId, encounterId, userId, ip, userAgent, {
      exportFormat: "json",
      skipAudit: true,
    });

    if (manifest.livePreview || manifest.encounter.status !== EncounterStatus.CLOSED) {
      throw new ConflictException(
        "Encounter must be CLOSED to create an immutable chart export snapshot"
      );
    }

    const { canonicalJson, hash: manifestHash } = hashCanonicalJson(manifest);
    /**
     * Persist the canonicalized form so a JSONB round-trip cannot drift the
     * stored value relative to the hashed input. We re-hash on retrieval.
     */
    const storedManifest = JSON.parse(canonicalJson) as Prisma.JsonObject;

    /**
     * Phase 6 — server-side HMAC signature.
     * Fail-closed: in production, missing `CHART_EXPORT_SIGNING_SECRET` aborts
     * snapshot creation BEFORE any DB write, so we never persist an unsigned
     * "official" snapshot. In non-production, the secret is optional so dev /
     * CI workflows still function and `manifestSignature` is stored as `null`.
     */
    const signingSecret = getChartExportSigningSecret();
    const manifestSignature = signingSecret
      ? signManifestHash(signingSecret, manifestHash)
      : null;

    const includedDomainCount = ENCOUNTER_CHART_EXPORT_INCLUDED_DOMAIN_KEYS.reduce<number>(
      (acc, key: IncludedDomainKey) => {
        const v = manifest[key];
        return acc + (v === null || typeof v === "undefined" ? 0 : 1);
      },
      0
    );

    const created = await this.prisma.encounterChartExport.create({
      data: {
        facilityId,
        encounterId: manifest.encounter.id,
        patientId: manifest.patient.id,
        exportedByUserId: userId ?? null,
        manifestVersion: manifest.manifestVersion,
        manifestHash,
        manifestSignature,
        manifestJson: storedManifest,
        renderedFormat: "json",
        templateVersion: ENCOUNTER_CHART_EXPORT_TEMPLATE_VERSION,
        livePreview: false,
      },
      select: {
        id: true,
        manifestVersion: true,
        manifestHash: true,
        templateVersion: true,
        createdAt: true,
      },
    });

    /**
     * `critical: true` — under `AUDIT_FAILURE_MODE=fail_closed`, an audit-write
     * failure aborts the request. The clinical row already committed by the
     * preceding `prisma.encounterChartExport.create`, so the operator gets a
     * 503 and a clear log; the snapshot remains queryable. This matches the
     * existing precedent for legally significant actions.
     */
    await this.audit.log(AuditAction.RECORD_EXPORT, "ENCOUNTER_CHART_EXPORT", {
      userId,
      facilityId,
      patientId: manifest.patient.id,
      encounterId: manifest.encounter.id,
      entityId: created.id,
      ip,
      userAgent,
      critical: true,
      metadata: {
        chartExport: true,
        snapshotId: created.id,
        manifestVersion: manifest.manifestVersion,
        manifestHash,
        templateVersion: ENCOUNTER_CHART_EXPORT_TEMPLATE_VERSION,
        format: "json",
        livePreview: false,
        includedDomainCount,
        deferredDomainCount: manifest.deferredDomains.length,
        encounterStatus: manifest.encounter.status,
        signaturePresent: manifestSignature !== null,
        signatureAlgorithm: manifestSignature ? CHART_EXPORT_SIGNATURE_ALGORITHM : null,
        signatureVersion: manifestSignature ? CHART_EXPORT_SIGNATURE_VERSION : null,
      },
    });

    return {
      id: created.id,
      manifestVersion: created.manifestVersion,
      manifestHash: created.manifestHash,
      templateVersion: created.templateVersion,
      createdAt: created.createdAt.toISOString(),
    };
  }

  /**
   * Phase 5F — retrieve an immutable snapshot, verifying its hash before use.
   *
   * Renders HTML from the **stored** manifest (never recomputes from the live
   * chart) so the artifact is reproducible from the row alone. A hash mismatch
   * throws an integrity error rather than returning suspicious data silently.
   */
  async getSnapshot(
    facilityId: string,
    encounterId: string,
    snapshotId: string,
    format: "json" | "html",
    userId?: string,
    ip?: string,
    userAgent?: string,
    options?: { skipRecordExportViewAudit?: boolean }
  ): Promise<{ manifest: ChartExportManifest; html?: string; row: ChartExportSnapshotSummary }> {
    const row = await this.prisma.encounterChartExport.findFirst({
      where: { id: snapshotId, encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        encounterId: true,
        manifestVersion: true,
        manifestHash: true,
        manifestSignature: true,
        manifestJson: true,
        templateVersion: true,
        createdAt: true,
      },
    });
    if (!row) {
      throw new NotFoundException("Snapshot not found");
    }

    /** Re-canonicalize the stored value (JSONB strips key order) and re-hash. */
    const recomputedHash = sha256Hex(canonicalizeForHash(row.manifestJson));
    const hashOk = recomputedHash === row.manifestHash;

    /**
     * Phase 6 — verify the HMAC signature when one is stored. Pre-Phase-6
     * snapshots have `manifestSignature: null`; we still accept them so legacy
     * rows remain readable. New (signed) rows must verify against the current
     * server secret. A signed row in production with a missing secret is
     * treated as an integrity failure (we cannot prove authorship); we
     * deliberately surface the same `RECORD_EXPORT_INTEGRITY_MISMATCH` marker
     * regardless of cause so the API contract stays consistent.
     */
    let signatureChecked = false;
    let signatureOk = true;
    let signatureSecretAvailable = true;
    if (row.manifestSignature) {
      signatureChecked = true;
      let secret: string | null = null;
      try {
        secret = getChartExportSigningSecret();
      } catch {
        signatureSecretAvailable = false;
      }
      signatureOk = !!secret
        && verifyManifestSignature(secret, row.manifestHash, row.manifestSignature);
    }

    if (!hashOk || !signatureOk) {
      /**
       * Best-effort PHI-safe audit before raising. If the audit write itself
       * fails, prefer surfacing the integrity error to the caller — swallow
       * the audit error here so it does not mask the security signal.
       */
      try {
        await this.audit.log(
          AuditAction.RECORD_EXPORT_INTEGRITY_FAILURE,
          "ENCOUNTER_CHART_EXPORT",
          {
            userId,
            facilityId,
            patientId: row.patientId,
            encounterId: row.encounterId,
            entityId: row.id,
            ip,
            userAgent,
            critical: true,
            metadata: {
              chartExport: true,
              snapshotId: row.id,
              manifestVersion: row.manifestVersion,
              templateVersion: row.templateVersion,
              format,
              hashMismatch: !hashOk,
              signatureChecked,
              signatureMismatch: signatureChecked && !signatureOk,
              signatureSecretAvailable,
              signatureVersion: manifestSignatureVersion(row.manifestSignature),
            },
          }
        );
      } catch {
        /* audit write failure must not mask integrity error */
      }
      throw new InternalServerErrorException(RECORD_EXPORT_INTEGRITY_MISMATCH);
    }

    const manifest = row.manifestJson as unknown as ChartExportManifest;
    const html = format === "html" ? renderEncounterChartExportHtml(manifest) : undefined;

    /**
     * Non-critical view audit. Metadata stays PHI-safe — only ids, version,
     * and hash. Patient name / MRN / DOB never appear here.
     *
     * Phase 5G — callers that emit `ROI_EXPORT_VIEW` (ROI-governed retrieval) set
     * `skipRecordExportViewAudit: true` to avoid double-logging a clinical read.
     */
    if (!options?.skipRecordExportViewAudit) {
      await this.audit.log(AuditAction.RECORD_EXPORT_VIEW, "ENCOUNTER_CHART_EXPORT", {
        userId,
        facilityId,
        patientId: row.patientId,
        encounterId: row.encounterId,
        entityId: row.id,
        ip,
        userAgent,
        metadata: {
          chartExport: true,
          snapshotId: row.id,
          manifestVersion: row.manifestVersion,
          manifestHash: row.manifestHash,
          templateVersion: row.templateVersion,
          format,
          signaturePresent: row.manifestSignature !== null,
          signatureVerified: signatureChecked && signatureOk,
          signatureVersion: manifestSignatureVersion(row.manifestSignature),
        },
      });
    }

    return {
      manifest,
      html,
      row: {
        id: row.id,
        manifestVersion: row.manifestVersion,
        manifestHash: row.manifestHash,
        templateVersion: row.templateVersion,
        createdAt: row.createdAt.toISOString(),
      },
    };
  }
}
