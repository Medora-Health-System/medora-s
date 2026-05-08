import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { buildVitalsRecordedPayloadJson } from "../utils/clinical-event-vitals.util";
import {
  dischargeSummarySavedEventPayload,
  dischargeSummarySnapshotChanged,
} from "../utils/clinical-event-discharge-summary.util";
import {
  admissionSummarySavedEventPayload,
  admissionSummarySnapshotChanged,
} from "../utils/clinical-event-admission-summary.util";
import {
  dispositionSupplementSavedEventPayload,
  dispositionSupplementSnapshotChanged,
  getDispositionSupplementSnapshot,
} from "../utils/clinical-event-disposition-supplement.util";
import {
  computeDisplayNameInitials,
  erNursingReassessmentEventPayload,
  getNursingAssessmentNamespace,
  NURSING_ASSESSMENT_NAMESPACE_ER_NURSING_REASSESSMENT_V1,
  NURSING_ASSESSMENT_NAMESPACE_ER_PROVIDER_MSE_V1,
  NURSING_ASSESSMENT_NAMESPACE_ER_TRAUMA_SURVEY_V1,
  NURSING_ASSESSMENT_NAMESPACE_NURSING_EVAL_V1,
  nursingAssessmentJsonSnapshotPayload,
  nursingAssessmentNamespaceChanged,
} from "../utils/clinical-event-nursing-assessment-json.util";
import {
  extractReassessmentDocumentedAt,
  nursingAssessmentHasBedsideSafety,
  nursingAssessmentHasNursingInterventions,
  nursingAssessmentHasTraumaDocumentation,
  reassessmentNamespaceMaterialChange,
  structuredReassessmentSectionsChanged,
  structuredReassessmentSectionsCompleted,
} from "../utils/nursing-reassessment-structured-summary.util";
import {
  providerDocumentationSignedPayloadJson,
  providerDocumentationUnlockedPayloadJson,
} from "../utils/clinical-event-provider-docs.util";
import { hasNonEmptyVitalsJson } from "../utils/patient-sex-map";
import { logBreakGlassAccessIfApplicable } from "../common/break-glass/break-glass-audit.helper";
import { AuditService } from "../common/services/audit.service";
import {
  AuditAction,
  EncounterBillingFinalizationStatus,
  EncounterClinicalEventType,
  EncounterStatus,
  EncounterType,
  EncounterWorkflowState,
  Prisma,
  RoleCode,
} from "@prisma/client";
import { isEncounterType } from "../common/utils/prisma-query-enum-guards";
import { assertCanTransitionEncounter } from "../common/workflow/encounter.transitions";
import { assertValidEncounterWorkflowTransition } from "../common/workflow/encounter-workflow-state.machine";
import {
  SIGNED_ENCOUNTER_MUTATION_BLOCKED_FR,
  assertEncounterNotSigned,
  assertOperationalUpdateAllowedWhenSigned,
} from "./encounter-sign-lock.util";
import {
  admissionSummaryFieldsSchema,
  ER_HANDOFF_V1_KEY,
  erHandoffV1SatisfiesInpatientTransferConfirm,
  type EncounterAdmissionCancelDto,
  type EncounterCloseDto,
  type EncounterCreateDto,
  type EncounterOperationalUpdateDto,
  type EncounterOutpatientCreateDto,
  type EncounterProviderAddendumCreateDto,
  type EncounterProviderDocumentationUnlockDto,
  type EncounterProviderHandoffCreateDto,
  type EncounterIvAccessInsertDto,
  type EncounterIvAccessRemoveDto,
  type EncounterProcedureDocumentDto,
  type EncounterUpdateDto,
  type EncounterCloseDocumentationCheckResult,
  type EncounterIntakeUpsertDto,
  buildEncounterDispositionCandidate,
  buildProcedureCaptureCandidate,
  findBillingCaptureProcedureDuplicate,
  isProcedureCodeLikeForSystem,
  PROCEDURE_DUPLICATE_BLOCKED,
  PROCEDURE_INVALID_CODE_FORMAT,
  readErHandoffV1FromNursingAssessment,
  readBillingCaptureV1,
  upsertBillingCaptureItem,
} from "@medora/shared";
import { handoffNursingEncounterPayload, handoffProviderEncounterPayload } from "../utils/clinical-event-handoff.util";
import { evaluateEncounterBillingReadinessFromData } from "../billing/billing-encounter-readiness.util";
import { enrichBillingCaptureItem } from "../billing/billing-capture.enrichment";
import { upsertBillingEventFromCaptureItem } from "../billing/billing-ledger.sync";
import { appendEmergencyEMBilling } from "../billing/billing-em.util";
import { appendBillingCaptureCandidate } from "../billing/billing-capture.append.util";
import { queueMedoraAlert } from "../common/logging/medoraAlert";
import { logError, logInfo } from "../common/logging/medoraLogger";
import type { AppendProcedureCaptureDto } from "../billing-procedure-codes/dto/append-procedure-capture.dto";

/** Champs alignés sur encounterDischargeFieldsSchema — fusion à la clôture pour ne pas écraser un brouillon. */
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

function admissionSummaryHasContent(data: Record<string, unknown>): boolean {
  return Object.values(data).some((v) => typeof v === "string" && v.trim().length > 0);
}

function hasPhysicianEvalV1Content(nursingAssessment: unknown): boolean {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return false;
  }
  const pe = (nursingAssessment as Record<string, unknown>).physicianEvalV1;
  if (!pe || typeof pe !== "object" || Array.isArray(pe)) return false;
  const o = pe as Record<string, unknown>;
  for (const k of ["hpi", "ros", "physicalExam", "mdm"]) {
    const v = o[k];
    if (typeof v === "string" && v.trim().length > 0) return true;
  }
  return false;
}

function encounterHasSignableProviderContent(enc: {
  providerNote: string | null;
  treatmentPlan: string | null;
  nursingAssessment: unknown;
}): boolean {
  if (enc.providerNote?.trim()) return true;
  if (enc.treatmentPlan?.trim()) return true;
  return hasPhysicianEvalV1Content(enc.nursingAssessment);
}

/** Sections structurées, lignes résumé ou procédure IV — aligné sur l’affichage dossier (V1). */
function nursingAssessmentHasContent(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  const inner = o.nursingEvalV1;
  if (!inner || typeof inner !== "object") return false;
  const ne = inner as Record<string, unknown>;
  const sections = ne.sections;
  if (sections && typeof sections === "object") {
    for (const v of Object.values(sections)) {
      if (v && typeof v === "object" && "text" in v && typeof (v as { text: unknown }).text === "string") {
        if ((v as { text: string }).text.trim().length > 0) return true;
      }
    }
  }
  const sl = ne.summaryLinesFr;
  if (Array.isArray(sl) && sl.some((x) => typeof x === "string" && x.trim().length > 0)) return true;
  const pv = ne.proceduresV1;
  if (pv && typeof pv === "object") {
    const iv = (pv as Record<string, unknown>).ivInsertion;
    if (iv && typeof iv === "object" && (iv as { performed?: boolean }).performed === true) return true;
  }
  return false;
}

function mergeDischargeSummaryJson(
  existing: unknown,
  incoming: EncounterCloseDto["discharge"]
): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
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
  }
  if (incoming) {
    const inc = incoming as Record<string, unknown>;
    for (const k of DISCHARGE_SUMMARY_STRING_KEYS) {
      const v = inc[k];
      if (v === undefined) continue;
      if (typeof v === "string") {
        if (v.trim() === "") delete out[k];
        else out[k] = v.trim();
      }
    }
    if (typeof inc.patientInstructionsGiven === "boolean") {
      out.patientInstructionsGiven = inc.patientInstructionsGiven;
      if (inc.patientInstructionsGiven === false) {
        delete out.instructionsGivenBy;
        delete out.instructionsGivenAt;
      }
    }
  }
  return Object.keys(out).length ? out : undefined;
}
import type { ListPatientEncountersQuery } from "./dto";
import { toEncounterClinicResponse } from "./encounter-response.util";
import {
  ENCOUNTER_AUDIT_TIMELINE_V1_ACTIONS,
  mapAuditLogRowToTimelineItem,
  metadataEncounterId,
} from "../patients/chart-audit-timeline.util";
import { throwEncounterConcurrentModification } from "./encounter-concurrency.util";
import { computeDispositionSafetyReadiness } from "./disposition-safety-readiness.util";

/** Aligné sur GET /encounters/:id — évite d’écraser le dossier patient côté client après PATCH. */
const encounterDetailPatientSelect = {
  id: true,
  firstName: true,
  lastName: true,
  mrn: true,
  dob: true,
  sexAtBirth: true,
} as const;

@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async create(patientId: string, facilityId: string, data: EncounterCreateDto, userId?: string, ip?: string, userAgent?: string) {
    // Verify patient exists and belongs to facility
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId: facilityId },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    // Check for existing OPEN encounter
    const existingOpen = await this.prisma.encounter.findFirst({
      where: {
        patientId,
        facilityId,
        status: "OPEN",
      },
    });

    if (existingOpen) {
      throw new BadRequestException("Patient already has an open encounter");
    }

    const chief =
      data.visitReason?.trim() ||
      data.chiefComplaint?.trim() ||
      undefined;

    const roomLabel =
      data.roomLabel != null && String(data.roomLabel).trim() !== ""
        ? String(data.roomLabel).trim().slice(0, 64)
        : "Salle d'attente";

    /** Médecin attribué (FK) — canonique pour dossier / trackboard ; providerId reste trace créateur / compat. */
    let physicianAssignedUserId: string | null = null;
    const physicianCandidate = data.physicianAssignedUserId ?? data.providerId ?? null;
    if (physicianCandidate) {
      await this.assertProviderAtFacility(facilityId, physicianCandidate);
      physicianAssignedUserId = physicianCandidate;
    }

    const encounter = await this.prisma.encounter.create({
      data: {
        patientId,
        facilityId,
        type: data.type,
        providerId: data.providerId ?? userId,
        chiefComplaint: chief,
        notes: data.notes?.trim() || undefined,
        roomLabel,
        physicianAssignedUserId,
        status: "OPEN",
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    await this.audit.log(AuditAction.ENCOUNTER_CREATE, "ENCOUNTER", {
      userId,
      facilityId,
      patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
    });

    return toEncounterClinicResponse(encounter);
  }

  async createOutpatientVisit(
    patientId: string,
    facilityId: string,
    data: EncounterOutpatientCreateDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    return this.create(
      patientId,
      facilityId,
      {
        type: "OUTPATIENT",
        visitReason: data.visitReason,
        notes: data.notes,
        roomLabel: data.roomLabel,
        physicianAssignedUserId: data.physicianAssignedUserId,
        providerId: data.providerId,
      },
      userId,
      ip,
      userAgent
    );
  }

  async findByPatient(
    patientId: string,
    facilityId: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
    query?: ListPatientEncountersQuery,
    breakGlassSessionId?: string
  ) {
    // Verify patient exists and belongs to facility
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
    });

    if (!patient) {
      throw new NotFoundException("Patient not found");
    }

    const where: Prisma.EncounterWhereInput = {
      patientId,
      facilityId,
    };
    if (query?.type !== undefined && isEncounterType(query.type)) {
      where.type = query.type;
    }

    const encounters = await this.prisma.encounter.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query?.limit,
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await logBreakGlassAccessIfApplicable(this.audit, {
      breakGlassSessionId,
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      context: "patient_encounters_list",
    });

    await this.audit.log(AuditAction.ENCOUNTER_VIEW, "ENCOUNTER", {
      userId,
      facilityId,
      patientId,
      ip,
      userAgent,
      metadata: query?.type ? { filterType: query.type } : undefined,
    });

    return encounters.map((e) => toEncounterClinicResponse(e));
  }

  private mapProviderAddendaForApi(
    rows: Array<{
      id: string;
      text: string;
      createdAt: Date;
      createdBy: { firstName: string; lastName: string };
    }>
  ) {
    return rows.map((a) => ({
      id: a.id,
      text: a.text,
      createdAt: a.createdAt,
      createdByDisplayFr: `${a.createdBy.firstName} ${a.createdBy.lastName}`.trim(),
    }));
  }

  async findOne(facilityId: string, id: string, userId?: string, ip?: string, userAgent?: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, facilityId },
      include: {
        patient: { select: encounterDetailPatientSelect },
        physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
        providerDocumentationSignedBy: { select: { id: true, firstName: true, lastName: true } },
        triage: { select: { vitalsJson: true } },
        providerAddenda: {
          orderBy: { createdAt: "asc" },
          include: {
            createdBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    await this.audit.log(AuditAction.ENCOUNTER_VIEW, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
    });

    let closedByDisplayFr: string | null = null;
    if (encounter.status === EncounterStatus.CLOSED) {
      const closeLog = await this.prisma.auditLog.findFirst({
        where: {
          action: AuditAction.ENCOUNTER_CLOSE,
          entityId: encounter.id,
        },
        orderBy: { createdAt: "desc" },
      });
      if (closeLog?.userId) {
        const closer = await this.prisma.user.findUnique({
          where: { id: closeLog.userId },
          select: { firstName: true, lastName: true },
        });
        if (closer) {
          closedByDisplayFr = `${closer.firstName} ${closer.lastName}`.trim();
        }
      }
    }

    const { providerAddenda: _rawAddenda, ...encounterForClinic } = encounter;
    const res = toEncounterClinicResponse(encounterForClinic as typeof encounter) as Record<string, unknown>;
    const signedByDisplayFr =
      encounter.providerDocumentationStatus === "SIGNED" && encounter.providerDocumentationSignedBy
        ? `${encounter.providerDocumentationSignedBy.firstName} ${encounter.providerDocumentationSignedBy.lastName}`.trim()
        : null;

    const withClosed =
      encounter.status === EncounterStatus.CLOSED
        ? { ...res, closedByDisplayFr }
        : res;

    const withAddenda = {
      ...withClosed,
      providerAddenda: this.mapProviderAddendaForApi(_rawAddenda ?? []),
    };

    return signedByDisplayFr
      ? { ...withAddenda, providerDocumentationSignedByDisplayFr: signedByDisplayFr }
      : withAddenda;
  }

  async addProviderAddendum(
    facilityId: string,
    encounterId: string,
    dto: EncounterProviderAddendumCreateDto,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentification requise pour ajouter un addendum.");
    }

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    if (encounter.providerDocumentationStatus !== "SIGNED") {
      throw new BadRequestException(
        "Un addendum n'est possible qu'après signature de l'évaluation médicale."
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.encounterProviderAddendum.create({
        data: {
          encounterId,
          facilityId,
          text: dto.text.trim(),
          createdByUserId: userId,
        },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      });
      await this.audit.log(AuditAction.PROVIDER_DOCUMENTATION_ADDENDUM, "ENCOUNTER_PROVIDER_ADDENDUM", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        entityId: row.id,
        ip,
        userAgent,
        critical: true,
        tx,
      });
      return row;
    });

    return {
      id: created.id,
      text: created.text,
      createdAt: created.createdAt,
      createdByDisplayFr: `${created.createdBy.firstName} ${created.createdBy.lastName}`.trim(),
    };
  }

  async signProviderDocumentation(
    facilityId: string,
    encounterId: string,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentification requise pour signer l'évaluation médicale.");
    }

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    if (encounter.status !== EncounterStatus.OPEN) {
      throw new BadRequestException("La consultation doit être ouverte pour signer l'évaluation.");
    }

    if (encounter.providerDocumentationStatus === "SIGNED") {
      throw new BadRequestException("L'évaluation médicale est déjà signée.");
    }

    if (!encounterHasSignableProviderContent(encounter)) {
      throw new BadRequestException(
        "Renseignez au moins une impression clinique, un plan de traitement ou la documentation médicale (HPI, ROS, examen, MDM) avant de signer."
      );
    }

    const previousSignedByUserId = encounter.providerDocumentationSignedByUserId;
    const previousSignedAt = encounter.providerDocumentationSignedAt;

    const signedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.encounter.updateMany({
        where: { id: encounterId, facilityId, version: encounter.version },
        data: {
          providerDocumentationStatus: "SIGNED",
          providerDocumentationSignedAt: signedAt,
          providerDocumentationSignedByUserId: userId,
          version: { increment: 1 },
        },
      });
      if (u.count === 0) throwEncounterConcurrentModification();
      await this.audit.log(AuditAction.PROVIDER_DOCUMENTATION_SIGN, "ENCOUNTER", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        entityId: encounter.id,
        ip,
        userAgent,
        critical: true,
        tx,
      });
      await tx.encounterClinicalEvent.create({
        data: {
          facilityId,
          encounterId: encounter.id,
          patientId: encounter.patientId,
          eventType: EncounterClinicalEventType.PROVIDER_SIGNED,
          payloadJson: providerDocumentationSignedPayloadJson({
            signedAt: signedAt.toISOString(),
            providerDocumentationStatus: "SIGNED",
            previousSignedByUserId,
            previousSignedAt: previousSignedAt?.toISOString() ?? null,
          }),
          createdByUserId: userId,
        },
      });
      const row = await tx.encounter.findFirst({
        where: { id: encounterId, facilityId },
        include: {
          patient: { select: encounterDetailPatientSelect },
          physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
          providerDocumentationSignedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!row) {
        throw new NotFoundException("Encounter not found");
      }
      return row;
    });

    const res = toEncounterClinicResponse(updated) as Record<string, unknown>;
    const signedByDisplayFr = updated.providerDocumentationSignedBy
      ? `${updated.providerDocumentationSignedBy.firstName} ${updated.providerDocumentationSignedBy.lastName}`.trim()
      : null;
    return signedByDisplayFr
      ? { ...res, providerDocumentationSignedByDisplayFr: signedByDisplayFr }
      : res;
  }

  async unlockProviderDocumentation(
    facilityId: string,
    encounterId: string,
    dto: EncounterProviderDocumentationUnlockDto,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentification requise pour déverrouiller l'évaluation médicale.");
    }

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    if (encounter.status !== EncounterStatus.OPEN) {
      throw new BadRequestException("La consultation doit être ouverte pour déverrouiller l'évaluation.");
    }

    if (encounter.providerDocumentationStatus !== "SIGNED") {
      throw new BadRequestException("L'évaluation médicale n'est pas verrouillée par signature.");
    }

    const reasonTrim = dto.reason?.trim() || undefined;

    const previousSignedByUserId = encounter.providerDocumentationSignedByUserId;
    const previousSignedAt = encounter.providerDocumentationSignedAt;
    const previousStatus = encounter.providerDocumentationStatus;

    const unlockedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.encounter.updateMany({
        where: { id: encounterId, facilityId, version: encounter.version },
        data: {
          providerDocumentationStatus: "DRAFT",
          providerDocumentationSignedAt: null,
          providerDocumentationSignedByUserId: null,
          version: { increment: 1 },
        },
      });
      if (u.count === 0) throwEncounterConcurrentModification();
      await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        entityId: encounter.id,
        ip,
        userAgent,
        metadata: {
          providerDocumentationUnlock: true,
          ...(reasonTrim ? { reason: reasonTrim } : {}),
        },
        critical: true,
        tx,
      });
      await tx.encounterClinicalEvent.create({
        data: {
          facilityId,
          encounterId: encounter.id,
          patientId: encounter.patientId,
          eventType: EncounterClinicalEventType.PROVIDER_UNLOCKED,
          payloadJson: providerDocumentationUnlockedPayloadJson({
            unlockedAt: unlockedAt.toISOString(),
            previousSignedByUserId,
            previousSignedAt: previousSignedAt?.toISOString() ?? null,
            previousStatus,
            reason: reasonTrim ?? null,
          }),
          createdByUserId: userId,
        },
      });
      const row = await tx.encounter.findFirst({
        where: { id: encounterId, facilityId },
        include: {
          patient: { select: encounterDetailPatientSelect },
          physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!row) {
        throw new NotFoundException("Encounter not found");
      }
      return row;
    });

    return toEncounterClinicResponse(updated);
  }

  async update(facilityId: string, id: string, data: EncounterUpdateDto, userId?: string, ip?: string, userAgent?: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, facilityId },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const dataKeys = (Object.keys(data) as (keyof EncounterUpdateDto)[]).filter(
      (k) => data[k] !== undefined
    );
    const billingCaptureOnly =
      dataKeys.length === 1 && dataKeys[0] === "billingCaptureJson";

    if (billingCaptureOnly && encounter.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED) {
      throw new BadRequestException(
        "Billing capture cannot be edited while the encounter is finalized for billing. Reopen billing to make changes."
      );
    }

    if (encounter.workflowState === EncounterWorkflowState.CLOSED && !billingCaptureOnly) {
      throw new BadRequestException("Le parcours de cette consultation est terminé.");
    }

    if (!billingCaptureOnly) {
      if (!userId) {
        throw new ForbiddenException("Authentication required.");
      }
      const clinicalRole = await this.prisma.userRole.findFirst({
        where: {
          userId,
          facilityId,
          isActive: true,
          role: { code: { in: [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN] } },
        },
      });
      if (!clinicalRole) {
        throw new ForbiddenException(
          "Clinical updates require RN, provider, or admin. Billing staff may send billing capture JSON only."
        );
      }
    }

    if (data.nursingAssessment !== undefined) {
      await this.validateErHandoffReceivingNurseUserId(facilityId, data.nursingAssessment);
    }

    const allowedWhenSigned: (keyof EncounterUpdateDto)[] = [
      "roomLabel",
      "physicianAssignedUserId",
      "billingCaptureJson",
    ];

    if (encounter.providerDocumentationStatus === "SIGNED") {
      const disallowed = dataKeys.filter((k) => !allowedWhenSigned.includes(k));
      if (disallowed.length > 0) {
        throw new BadRequestException(SIGNED_ENCOUNTER_MUTATION_BLOCKED_FR);
      }
      const updateData: Record<string, unknown> = {};
      if (data.roomLabel !== undefined) {
        updateData.roomLabel =
          data.roomLabel === null ? null : data.roomLabel?.toString().trim() || null;
      }
      if (data.physicianAssignedUserId !== undefined) {
        if (data.physicianAssignedUserId === null) {
          updateData.physicianAssignedUserId = null;
        } else {
          await this.assertProviderAtFacility(facilityId, data.physicianAssignedUserId);
          updateData.physicianAssignedUserId = data.physicianAssignedUserId;
        }
      }
      if (data.billingCaptureJson !== undefined) {
        updateData.billingCaptureJson = readBillingCaptureV1(data.billingCaptureJson);
      }
      if (Object.keys(updateData).length === 0) {
        const unchanged = await this.prisma.encounter.findFirst({
          where: { id, facilityId },
          include: {
            patient: { select: encounterDetailPatientSelect },
            physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        if (!unchanged) {
          throw new NotFoundException("Encounter not found");
        }
        return toEncounterClinicResponse(unchanged);
      }
      const u = await this.prisma.encounter.updateMany({
        where: { id, facilityId, version: encounter.version },
        data: {
          ...(updateData as Prisma.EncounterUpdateInput),
          version: { increment: 1 },
        },
      });
      if (u.count === 0) throwEncounterConcurrentModification();
      const updated = await this.prisma.encounter.findFirst({
        where: { id, facilityId },
        include: {
          patient: { select: encounterDetailPatientSelect },
          physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!updated) {
        throw new NotFoundException("Encounter not found");
      }
      await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        entityId: encounter.id,
        ip,
        userAgent,
        metadata: data.billingCaptureJson !== undefined ? { billingCaptureJsonUpdated: true } : undefined,
      });
      return toEncounterClinicResponse(updated);
    }

    const updateData: Record<string, unknown> = {};
    if (data.visitReason !== undefined || data.chiefComplaint !== undefined) {
      const v =
        data.visitReason !== undefined && data.visitReason !== null
          ? data.visitReason
          : data.chiefComplaint;
      updateData.chiefComplaint = v === null ? null : v?.toString().trim() || null;
    }
    if (data.triageAcuity !== undefined) updateData.triageAcuity = data.triageAcuity;
    if (data.vitals !== undefined) updateData.vitals = data.vitals;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.treatmentPlan !== undefined) {
      updateData.treatmentPlan =
        data.treatmentPlan === null ? null : data.treatmentPlan?.trim() || null;
    }
    if (data.followUpDate !== undefined) {
      updateData.followUpDate = data.followUpDate;
    }
    if (data.clinicianImpression !== undefined || data.providerNote !== undefined) {
      const imp =
        data.clinicianImpression !== undefined
          ? data.clinicianImpression
          : data.providerNote;
      updateData.providerNote =
        imp === null ? null : imp?.toString().trim() || null;
    }
    if (data.nursingAssessment !== undefined) {
      updateData.nursingAssessment = data.nursingAssessment;
    }
    if (data.dischargeSummaryJson !== undefined) {
      updateData.dischargeSummaryJson = data.dischargeSummaryJson;
    }
    if (data.admissionSummaryJson !== undefined) {
      if (encounter.status !== EncounterStatus.OPEN) {
        throw new BadRequestException(
          "L'admission ne peut être modifiée que sur une consultation ouverte."
        );
      }
      if (data.admissionSummaryJson === null) {
        updateData.admissionSummaryJson = null;
        updateData.admittedAt = null;
      } else {
        const parsedAdmission = admissionSummaryFieldsSchema.safeParse(data.admissionSummaryJson);
        if (!parsedAdmission.success) {
          throw new BadRequestException("Dossier d'admission invalide.");
        }
        const asRecord = parsedAdmission.data as Record<string, unknown>;
        if (!admissionSummaryHasContent(asRecord)) {
          throw new BadRequestException("Renseignez au moins un champ du dossier d'admission.");
        }
        updateData.admissionSummaryJson = parsedAdmission.data;
        if (!encounter.admittedAt) {
          updateData.admittedAt = new Date();
        }
        if (encounter.type !== EncounterType.INPATIENT && encounter.type !== EncounterType.EMERGENCY) {
          updateData.type = EncounterType.INPATIENT;
        }
      }
    }
    if (data.roomLabel !== undefined) {
      updateData.roomLabel =
        data.roomLabel === null ? null : data.roomLabel?.toString().trim() || null;
    }
    if (data.physicianAssignedUserId !== undefined) {
      if (data.physicianAssignedUserId === null) {
        updateData.physicianAssignedUserId = null;
      } else {
        await this.assertProviderAtFacility(facilityId, data.physicianAssignedUserId);
        updateData.physicianAssignedUserId = data.physicianAssignedUserId;
      }
    }
    if (data.billingCaptureJson !== undefined) {
      updateData.billingCaptureJson = readBillingCaptureV1(data.billingCaptureJson);
    }
    if (data.workflowState !== undefined) {
      if (encounter.status !== EncounterStatus.OPEN) {
        throw new BadRequestException("Le parcours ne peut être modifié que sur une consultation ouverte.");
      }
      assertValidEncounterWorkflowTransition(encounter.workflowState, data.workflowState);
      updateData.workflowState = data.workflowState;
    }

    const u = await this.prisma.encounter.updateMany({
      where: { id, facilityId, version: encounter.version },
      data: {
        ...(updateData as Prisma.EncounterUpdateInput),
        version: { increment: 1 },
      },
    });
    if (u.count === 0) throwEncounterConcurrentModification();
    const updated = await this.prisma.encounter.findFirst({
      where: { id, facilityId },
      include: {
        patient: { select: encounterDetailPatientSelect },
        physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!updated) {
      throw new NotFoundException("Encounter not found");
    }

    if (data.vitals !== undefined && hasNonEmptyVitalsJson(data.vitals)) {
      await this.prisma.patient.update({
        where: { id: encounter.patientId },
        data: {
          latestVitalsJson: data.vitals as object,
          latestVitalsAt: new Date(),
        },
      });
      if (userId) {
        await this.prisma.encounterClinicalEvent.create({
          data: {
            facilityId,
            encounterId: encounter.id,
            patientId: encounter.patientId,
            eventType: EncounterClinicalEventType.VITALS_RECORDED,
            payloadJson: buildVitalsRecordedPayloadJson(data.vitals, "ENCOUNTER_CHART"),
            createdByUserId: userId,
          },
        });
      }
    }

    /**
     * Outcome of the ER reassessment column lifecycle for this PATCH (set inside the
     * `data.nursingAssessment !== undefined && userId` block below). Used downstream to enrich
     * the PHI-safe audit metadata with the actual session mode. Stays `null` when the patch
     * didn't touch the reassessment namespace materially.
     */
    let reassessmentColumnSessionMode: "new" | "updated" | "auto-new" | null = null;
    let reassessmentAutoNewReason: "different_user" | "stale_session" | null = null;

    if (data.nursingAssessment !== undefined && userId) {
      const prevFull = encounter.nursingAssessment;
      const nextFull = data.nursingAssessment;
      if (nursingAssessmentNamespaceChanged(prevFull, nextFull, NURSING_ASSESSMENT_NAMESPACE_ER_PROVIDER_MSE_V1)) {
        await this.prisma.encounterClinicalEvent.create({
          data: {
            facilityId,
            encounterId: encounter.id,
            patientId: encounter.patientId,
            eventType: EncounterClinicalEventType.PROVIDER_MSE_SAVED,
            payloadJson: nursingAssessmentJsonSnapshotPayload(
              NURSING_ASSESSMENT_NAMESPACE_ER_PROVIDER_MSE_V1,
              getNursingAssessmentNamespace(nextFull, NURSING_ASSESSMENT_NAMESPACE_ER_PROVIDER_MSE_V1)
            ),
            createdByUserId: userId,
          },
        });
      }
      if (nursingAssessmentNamespaceChanged(prevFull, nextFull, NURSING_ASSESSMENT_NAMESPACE_NURSING_EVAL_V1)) {
        await this.prisma.encounterClinicalEvent.create({
          data: {
            facilityId,
            encounterId: encounter.id,
            patientId: encounter.patientId,
            eventType: EncounterClinicalEventType.NURSING_ASSESSMENT_SAVED,
            payloadJson: nursingAssessmentJsonSnapshotPayload(
              NURSING_ASSESSMENT_NAMESPACE_NURSING_EVAL_V1,
              getNursingAssessmentNamespace(nextFull, NURSING_ASSESSMENT_NAMESPACE_NURSING_EVAL_V1)
            ),
            createdByUserId: userId,
          },
        });
      }
      /**
       * ER nursing reassessment column lifecycle (append-only at the COLUMN level).
       *
       * A "column" is a single `EncounterClinicalEvent NURSING_ASSESSMENT_SAVED` row tagged with
       * the `erNursingReassessmentV1` namespace. Within an active reassessment session, repeated
       * saves UPDATE the most recent column's `payloadJson` in place rather than inserting a new
       * row — this prevents timeline spam when a nurse incrementally documents the same
       * reassessment over a few minutes. A NEW column is only opened when:
       *
       *   1. The frontend explicitly signals `reassessmentNewSession: true` (document-icon
       *      "Nouvelle séance" click), OR
       *   2. There is no existing reassessment event row yet (first save for this encounter).
       *
       * This honors:
       *   - "maintain append-only history guarantees" — closed/older columns are never edited.
       *     Only the most-recent (active) column row is mutable, and only while it remains the
       *     active session (i.e. until the next document-icon click freezes it).
       *   - "never erase prior persisted columns" — an UPDATE only ever touches the latest row.
       *   - "no destructive overwrite behavior" — prior columns stay byte-identical.
       *
       * The signature-excluded `reassessmentNamespaceMaterialChange` gate still applies first:
       * a save with no clinical content change touches no event row at all.
       */
      if (reassessmentNamespaceMaterialChange(prevFull, nextFull)) {
        const performer = await this.resolveErNursingReassessmentPerformer(facilityId, userId);
        const reassessmentSnapshot = getNursingAssessmentNamespace(
          nextFull,
          NURSING_ASSESSMENT_NAMESPACE_ER_NURSING_REASSESSMENT_V1
        );
        const traumaSnapshot = getNursingAssessmentNamespace(
          nextFull,
          NURSING_ASSESSMENT_NAMESPACE_ER_TRAUMA_SURVEY_V1
        );
        const docAtIso = extractReassessmentDocumentedAt(nextFull);
        const documentedAt = docAtIso ? new Date(docAtIso) : null;
        const safeDocumentedAt =
          documentedAt && !Number.isNaN(documentedAt.getTime()) ? documentedAt : null;

        const startsNewSession = data.reassessmentNewSession === true;
        const latestSession = await this.prisma.encounterClinicalEvent.findFirst({
          where: {
            encounterId: encounter.id,
            facilityId,
            eventType: EncounterClinicalEventType.NURSING_ASSESSMENT_SAVED,
            payloadJson: {
              path: ["namespace"],
              equals: NURSING_ASSESSMENT_NAMESPACE_ER_NURSING_REASSESSMENT_V1,
            },
          },
          orderBy: { createdAt: "desc" },
          /** Ownership + age fields drive the identity+recency guard below. */
          select: { id: true, createdByUserId: true, createdAt: true },
        });

        const payload = erNursingReassessmentEventPayload({
          snapshot: reassessmentSnapshot,
          traumaSnapshot,
          documentedAt: safeDocumentedAt,
          performerId: performer.performerId,
          performerDisplayName: performer.performerDisplayName,
          performerRoleTitle: performer.performerRoleTitle,
          performerInitials: performer.performerInitials,
        });

        /**
         * Identity + recency guard for the UPDATE branch (P1 safety hot-fix).
         *
         * Without this guard, ANY save by a different authenticated user would silently rewrite
         * the prior column's `payloadJson` — replacing the prior nurse's snapshot, performer
         * name, initials, role, and trauma documentation. That is unacceptable for an EMR
         * append-only audit guarantee.
         *
         * The UPDATE branch is now allowed ONLY when ALL of the following hold:
         *   1. There is an existing latest session row.
         *   2. `data.reassessmentNewSession !== true` (the caller did not explicitly request a
         *      new column — explicit-new always inserts).
         *   3. `latestSession.createdByUserId === userId` (the row's original creator is the
         *      current saver — same nurse continuing their own session).
         *   4. `latestSession.createdAt` is within the recency window (currently 60 minutes;
         *      mirrors the frontend `REASSESSMENT_NEW_SESSION_MINUTES` so a session left open
         *      from earlier in the shift still auto-opens a new column).
         *   5. Same namespace (already enforced by the where clause above; the explicit equality
         *      below is belt-and-braces against future query refactors).
         *
         * In every other case — different user, stale session, or explicit-new — we INSERT a
         * new immutable column row. Prior rows are NEVER touched. Cross-user / stale auto-new
         * inserts are tagged with `sessionMode: "auto-new"` in the audit metadata so QA can
         * distinguish them from explicit user-initiated new sessions.
         */
        const REASSESSMENT_RECENCY_WINDOW_MS = 60 * 60 * 1000;
        const sameOwner =
          !!latestSession && !!userId && latestSession.createdByUserId === userId;
        const recent =
          !!latestSession &&
          Date.now() - latestSession.createdAt.getTime() < REASSESSMENT_RECENCY_WINDOW_MS;
        const canUpdateInPlace =
          !!latestSession && !startsNewSession && sameOwner && recent;

        if (canUpdateInPlace) {
          /**
           * Same active session, same user, recent: rewrite the payloadJson on the existing
           * latest event row. `createdAt` and `createdByUserId` stay pinned. This is the only
           * mutable code path for `EncounterClinicalEvent` rows in this flow — older sessions,
           * different-user rows, and stale rows are never touched.
           */
          await this.prisma.encounterClinicalEvent.update({
            where: { id: latestSession.id },
            data: { payloadJson: payload },
          });
          reassessmentColumnSessionMode = "updated";
        } else {
          await this.prisma.encounterClinicalEvent.create({
            data: {
              facilityId,
              encounterId: encounter.id,
              patientId: encounter.patientId,
              eventType: EncounterClinicalEventType.NURSING_ASSESSMENT_SAVED,
              payloadJson: payload,
              createdByUserId: userId,
            },
          });
          if (!latestSession) {
            /** First reassessment for this encounter — counts as "new" (the original session). */
            reassessmentColumnSessionMode = "new";
          } else if (startsNewSession) {
            reassessmentColumnSessionMode = "new";
          } else {
            /**
             * Auto-fall-through: a different user is saving OR the same user's session is
             * stale (older than the recency window). Either way, the prior column is preserved
             * unchanged and a new column is opened automatically.
             */
            reassessmentColumnSessionMode = "auto-new";
            reassessmentAutoNewReason = !sameOwner ? "different_user" : "stale_session";
          }
        }
      }
      if (nursingAssessmentNamespaceChanged(prevFull, nextFull, ER_HANDOFF_V1_KEY)) {
        await this.prisma.encounterClinicalEvent.create({
          data: {
            facilityId,
            encounterId: encounter.id,
            patientId: encounter.patientId,
            eventType: EncounterClinicalEventType.HANDOFF_NURSING,
            payloadJson: handoffNursingEncounterPayload(
              getNursingAssessmentNamespace(nextFull, ER_HANDOFF_V1_KEY)
            ),
            createdByUserId: userId,
          },
        });
      }

      /**
       * Append-only DISPOSITION_SUPPLEMENT_SAVED event lifecycle (multi-user safety, S15C).
       *
       * Pre-existing behavior: PATCH replaces the full `Encounter.nursingAssessment` JSON in
       * place — the `erDispositionV1` namespace inside (LWBS narrative, transfer handoff note,
       * AMA risks discussed, deceased note, signature) is silently overwritten when a second
       * user saves. AMA / LWBS / transfer / deceased narratives are legal documentation; silent
       * overwrite by a second saver is unsafe.
       *
       * New behavior: every PATCH that materially changes the disposition supplement namespace
       * writes an INSERT-only EncounterClinicalEvent row with the deep-cloned snapshot at save
       * time and a denormalized performer identity snapshot. The flat-blob `nursingAssessment`
       * is still merged in place by the frontend and saved as before — Summary / print readers
       * continue to render the latest view unchanged.
       *
       * Material-change detection EXCLUDES the auto-stamped `signature` sub-object so that a
       * "click Save with no edits" does NOT emit a redundant event row (the signature is always
       * re-stamped on save). The signature IS preserved INSIDE `payloadJson.snapshot` so the
       * event row carries the full immutable record of who signed and when.
       *
       * INSERT-only by design: there is no UPDATE branch and no caller path mutates these rows.
       */
      if (dispositionSupplementSnapshotChanged(prevFull, nextFull)) {
        const performer = await this.resolveSummaryDocumentPerformer(facilityId, userId);
        await this.prisma.encounterClinicalEvent.create({
          data: {
            facilityId,
            encounterId: encounter.id,
            patientId: encounter.patientId,
            eventType: EncounterClinicalEventType.DISPOSITION_SUPPLEMENT_SAVED,
            payloadJson: dispositionSupplementSavedEventPayload({
              snapshot: getDispositionSupplementSnapshot(nextFull),
              savedAt: new Date(),
              performerId: performer.performerId,
              performerDisplayName: performer.performerDisplayName,
              performerRoleTitle: performer.performerRoleTitle,
              performerInitials: performer.performerInitials,
            }),
            createdByUserId: userId,
          },
        });
      }
    }

    /**
     * Append-only DISCHARGE_SUMMARY_SAVED event lifecycle (multi-user safety, S15A).
     *
     * Pre-existing behavior: PATCH replaces `Encounter.dischargeSummaryJson` in place — last
     * writer wins, prior content is lost, and no historical row preserves the previous author or
     * snapshot. This is the highest-risk overwrite path for patient-facing legal documents
     * (discharge instructions, medication reconciliation, follow-up).
     *
     * New behavior: every PATCH that materially changes the discharge JSON writes an INSERT-only
     * EncounterClinicalEvent row with the full snapshot at save time and a denormalized performer
     * identity snapshot. The flat-blob `dischargeSummaryJson` is still updated in place so
     * existing Summary / print readers continue to render the latest view unchanged.
     *
     * INSERT-only by design: there is no UPDATE branch and no caller path mutates these rows. A
     * non-material PATCH (no content change) does not write an event, to avoid timeline noise.
     * Failure to resolve performer identity does not block the event — it just records empty
     * identity fields, identical to the existing nursing-reassessment behavior.
     */
    if (data.dischargeSummaryJson !== undefined && userId) {
      const dischargeChanged = dischargeSummarySnapshotChanged(
        encounter.dischargeSummaryJson,
        data.dischargeSummaryJson
      );
      if (dischargeChanged) {
        const performer = await this.resolveSummaryDocumentPerformer(facilityId, userId);
        await this.prisma.encounterClinicalEvent.create({
          data: {
            facilityId,
            encounterId: encounter.id,
            patientId: encounter.patientId,
            eventType: EncounterClinicalEventType.DISCHARGE_SUMMARY_SAVED,
            payloadJson: dischargeSummarySavedEventPayload({
              snapshot: data.dischargeSummaryJson,
              savedAt: new Date(),
              performerId: performer.performerId,
              performerDisplayName: performer.performerDisplayName,
              performerRoleTitle: performer.performerRoleTitle,
              performerInitials: performer.performerInitials,
            }),
            createdByUserId: userId,
          },
        });
      }
    }

    /**
     * Append-only ADMISSION_SUMMARY_SAVED event lifecycle (multi-user safety, S15B).
     *
     * Pre-existing behavior: PATCH replaces `Encounter.admissionSummaryJson` in place — last
     * writer wins, prior content is lost, and no historical row preserves the previous author or
     * snapshot. Admission decisions are inpatient-care-defining clinical documentation; silent
     * overwrite by a second saver is unsafe.
     *
     * New behavior: every PATCH that materially changes the admission JSON writes an INSERT-only
     * EncounterClinicalEvent row with the (validated/normalized) snapshot at save time and a
     * denormalized performer identity snapshot. The flat-blob `admissionSummaryJson` is still
     * updated in place so existing Summary / print readers continue to render the latest view
     * unchanged.
     *
     * The snapshot used here is the post-validation value (`updateData.admissionSummaryJson`),
     * which is exactly what hits the DB — so unknown-key stripping by the Zod schema does not
     * cause false-positive "change" events.
     *
     * Out of scope for this PR: the dedicated `cancelAdmissionDecision` path, which already has
     * its own audit log + reason + performer; it can be migrated to also emit an event in a
     * follow-up if a pre-clear snapshot is needed.
     *
     * INSERT-only by design: there is no UPDATE branch and no caller path mutates these rows. A
     * non-material PATCH (no content change) does not write an event, to avoid timeline noise.
     */
    if (data.admissionSummaryJson !== undefined && userId) {
      const nextAdmissionForEvent =
        updateData.admissionSummaryJson === undefined ? null : updateData.admissionSummaryJson;
      const admissionChanged = admissionSummarySnapshotChanged(
        encounter.admissionSummaryJson,
        nextAdmissionForEvent
      );
      if (admissionChanged) {
        const performer = await this.resolveSummaryDocumentPerformer(facilityId, userId);
        await this.prisma.encounterClinicalEvent.create({
          data: {
            facilityId,
            encounterId: encounter.id,
            patientId: encounter.patientId,
            eventType: EncounterClinicalEventType.ADMISSION_SUMMARY_SAVED,
            payloadJson: admissionSummarySavedEventPayload({
              snapshot: nextAdmissionForEvent,
              savedAt: new Date(),
              performerId: performer.performerId,
              performerDisplayName: performer.performerDisplayName,
              performerRoleTitle: performer.performerRoleTitle,
              performerInitials: performer.performerInitials,
            }),
            createdByUserId: userId,
          },
        });
      }
    }

    /**
     * PHI-safe structured reassessment summary for audit metadata. Surfaced ONLY when the patch
     * touched `nursingAssessment` AND the reassessment namespace actually changed. Returns the
     * stable field codes (e.g. ["mentalStatus","skinCondition"]), `columnCount` (count of saved
     * reassessment events for this encounter), `latestDocumentedAt` (the clinical timestamp of
     * the just-saved reassessment), and three boolean shape indicators — never narrative,
     * values, or PHI. Used for QA review / pilot oversight / documentation completeness
     * analytics. The column count requires one extra count() query, so we only run it when we
     * actually wrote a column.
     */
    const reassessmentSectionsAuditMeta: Record<string, unknown> = {};
    const reassessmentNamespaceChangedThisPatch =
      data.nursingAssessment !== undefined &&
      reassessmentNamespaceMaterialChange(encounter.nursingAssessment, data.nursingAssessment);
    const sectionsChangedThisPatch =
      data.nursingAssessment !== undefined &&
      structuredReassessmentSectionsChanged(encounter.nursingAssessment, data.nursingAssessment);
    if (sectionsChangedThisPatch || reassessmentNamespaceChangedThisPatch) {
      const meta: Record<string, unknown> = {
        v: 1,
        structuredSectionsCompleted: structuredReassessmentSectionsCompleted(data.nursingAssessment),
      };
      if (reassessmentNamespaceChangedThisPatch) {
        const columnCount = await this.prisma.encounterClinicalEvent.count({
          where: {
            encounterId: encounter.id,
            facilityId,
            eventType: EncounterClinicalEventType.NURSING_ASSESSMENT_SAVED,
            payloadJson: {
              path: ["namespace"],
              equals: NURSING_ASSESSMENT_NAMESPACE_ER_NURSING_REASSESSMENT_V1,
            },
          },
        });
        meta.columnCount = columnCount;
        meta.latestDocumentedAt = extractReassessmentDocumentedAt(data.nursingAssessment);
        meta.hasTraumaDocumentation = nursingAssessmentHasTraumaDocumentation(data.nursingAssessment);
        meta.hasBedsideSafety = nursingAssessmentHasBedsideSafety(data.nursingAssessment);
        meta.hasNursingInterventions = nursingAssessmentHasNursingInterventions(
          data.nursingAssessment
        );
        /**
         * `sessionMode` clarifies for QA / pilot oversight whether this PATCH opened a fresh
         * reassessment column ("new"), refined the active session in place ("updated"), or
         * auto-opened a new column because the prior latest row belongs to a different user OR
         * is older than the recency window ("auto-new"). The auto-new tag protects against the
         * silent cross-user overwrite issue and is observable in audit metadata only — no PHI.
         *
         * Falls back to the prior simple binary when the lifecycle didn't run (defensive; the
         * lifecycle should always run when the namespace changed materially, but this keeps the
         * audit log complete even in edge cases).
         */
        meta.sessionMode =
          reassessmentColumnSessionMode ??
          (data.reassessmentNewSession === true ? "new" : "updated");
        if (reassessmentAutoNewReason) {
          /** Stable enum string. Field name only — no PHI, never narrative. */
          meta.autoNewReason = reassessmentAutoNewReason;
        }
      }
      reassessmentSectionsAuditMeta.reassessment = meta;
    }

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
      metadata: {
        ...(data.billingCaptureJson !== undefined ? { billingCaptureJsonUpdated: true } : {}),
        ...(data.workflowState !== undefined
          ? { workflowTransition: { from: encounter.workflowState, to: data.workflowState } }
          : {}),
        ...reassessmentSectionsAuditMeta,
      },
    });

    if (data.dischargeSummaryJson !== undefined) {
      logInfo("discharge_summary_saved", {
        userId: userId ?? null,
        encounterId: encounter.id,
        facilityId,
        action: "encounter.discharge_summary.update",
      });
    }

    return toEncounterClinicResponse(updated);
  }

  /**
   * Operational fields (`roomLabel`, `physicianAssignedUserId`, `confirmInpatientTransfer`) — see
   * `assertOperationalUpdateAllowedWhenSigned` for post-sign policy and audit `POST_SIGN_MODIFICATION`.
   */
  async updateOperational(
    facilityId: string,
    id: string,
    data: EncounterOperationalUpdateDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }
    if (encounter.workflowState === EncounterWorkflowState.CLOSED) {
      throw new BadRequestException("Le parcours de cette consultation est terminé.");
    }
    assertOperationalUpdateAllowedWhenSigned(encounter, data);
    const updateData: Record<string, unknown> = {};
    if (data.roomLabel !== undefined) {
      updateData.roomLabel =
        data.roomLabel === null ? null : data.roomLabel?.toString().trim() || null;
    }
    let resolvedPhysicianId: string | null = encounter.physicianAssignedUserId ?? null;
    if (data.physicianAssignedUserId !== undefined) {
      if (data.physicianAssignedUserId === null) {
        updateData.physicianAssignedUserId = null;
        resolvedPhysicianId = null;
      } else {
        await this.assertProviderAtFacility(facilityId, data.physicianAssignedUserId);
        updateData.physicianAssignedUserId = data.physicianAssignedUserId;
        resolvedPhysicianId = data.physicianAssignedUserId;
      }
    }

    if (data.confirmInpatientTransfer === true) {
      if (encounter.status !== EncounterStatus.OPEN) {
        throw new BadRequestException(
          "Le transfert vers l'hospitalisation n'est possible que sur une consultation ouverte."
        );
      }
      if (encounter.type !== EncounterType.EMERGENCY) {
        throw new BadRequestException(
          "La confirmation de transfert s'applique uniquement à une consultation d'urgence avec dossier d'admission."
        );
      }
      const adm = encounter.admissionSummaryJson;
      const admObj =
        adm && typeof adm === "object" && !Array.isArray(adm) ? (adm as Record<string, unknown>) : {};
      if (!admissionSummaryHasContent(admObj)) {
        throw new BadRequestException(
          "Enregistrez d'abord le dossier d'admission (décision de disposition), puis confirmez le transfert."
        );
      }
      if (!resolvedPhysicianId) {
        throw new BadRequestException(
          "Sélectionnez le médecin accepteur dans ce panneau avant de confirmer le transfert vers l'hospitalisation."
        );
      }
      /**
       * ER handoff (nursingAssessment.erHandoffV1): require explicit readiness before promoting to inpatient.
       * Rule: reportGiven === true OR readyForInpatientTransfer === true (see @medora/shared erHandoffV1).
       */
      if (!erHandoffV1SatisfiesInpatientTransferConfirm(encounter.nursingAssessment)) {
        throw new BadRequestException(
          "Documentation de transmission (urgences) requise : indiquez qu'un compte rendu a été donné ou cochez « prêt pour le transfert » avant la confirmation."
        );
      }
      updateData.type = EncounterType.INPATIENT;
    }

    if (Object.keys(updateData).length === 0) {
      const unchanged = await this.prisma.encounter.findFirst({
        where: { id, facilityId },
        include: {
          patient: { select: encounterDetailPatientSelect },
          physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!unchanged) {
        throw new NotFoundException("Encounter not found");
      }
      return toEncounterClinicResponse(unchanged);
    }
    const u = await this.prisma.encounter.updateMany({
      where: { id, facilityId, version: encounter.version },
      data: {
        ...(updateData as Prisma.EncounterUpdateInput),
        version: { increment: 1 },
      },
    });
    if (u.count === 0) throwEncounterConcurrentModification();
    const updated = await this.prisma.encounter.findFirst({
      where: { id, facilityId },
      include: {
        patient: { select: encounterDetailPatientSelect },
        physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!updated) {
      throw new NotFoundException("Encounter not found");
    }
    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
      metadata: {
        operational: true,
        ...(encounter.providerDocumentationStatus === "SIGNED"
          ? { event: "POST_SIGN_MODIFICATION" as const }
          : {}),
      },
    });
    return toEncounterClinicResponse(updated);
  }

  /**
   * Typeahead search for active PROVIDER or RN users at the facility (`q` must be ≥ 3 chars).
   */
  async searchClinicalUsers(facilityId: string, q: string, role: RoleCode) {
    const term = q.trim();
    if (term.length < 3) return [];
    const rows = await this.prisma.userRole.findMany({
      where: {
        facilityId,
        isActive: true,
        role: { code: role },
        user: {
          isActive: true,
          OR: [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
          ],
        },
      },
      take: 25,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const seen = new Set<string>();
    const out: { id: string; firstName: string; lastName: string }[] = [];
    for (const r of rows) {
      if (seen.has(r.userId)) continue;
      seen.add(r.userId);
      out.push({
        id: r.user.id,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
      });
    }
    out.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr"));
    return out;
  }

  async listProviders(facilityId: string) {
    const rows = await this.prisma.userRole.findMany({
      where: {
        facilityId,
        isActive: true,
        role: { code: RoleCode.PROVIDER },
        user: { isActive: true },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const seen = new Set<string>();
    const out: { id: string; firstName: string; lastName: string }[] = [];
    for (const r of rows) {
      if (seen.has(r.userId)) continue;
      seen.add(r.userId);
      out.push({
        id: r.user.id,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
      });
    }
    out.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "fr"));
    return out;
  }

  /** Append-only HANDOFF_PROVIDER clinical event (no encounter JSON mutation). */
  async recordProviderHandoff(
    facilityId: string,
    encounterId: string,
    dto: EncounterProviderHandoffCreateDto,
    userId?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentication required.");
    }
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }
    if (encounter.status !== EncounterStatus.OPEN) {
      throw new BadRequestException("La consultation doit être ouverte pour enregistrer une passation.");
    }
    assertEncounterNotSigned(encounter);
    await this.assertProviderAtFacility(facilityId, dto.toUserId);
    const toUser = await this.prisma.user.findFirst({
      where: { id: dto.toUserId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!toUser) {
      throw new BadRequestException("Utilisateur destinataire introuvable.");
    }
    const toDisplayName = `${toUser.firstName} ${toUser.lastName}`.trim();
    let reportGivenAtIso: string | null = null;
    if (dto.reportGivenAt != null && String(dto.reportGivenAt).trim()) {
      const d = new Date(String(dto.reportGivenAt));
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException("Date ou heure du compte rendu invalide.");
      }
      reportGivenAtIso = d.toISOString();
    }
    const notesTrim =
      dto.notes != null && String(dto.notes).trim()
        ? String(dto.notes).trim().slice(0, 4000)
        : null;

    await this.prisma.encounterClinicalEvent.create({
      data: {
        facilityId,
        encounterId: encounter.id,
        patientId: encounter.patientId,
        eventType: EncounterClinicalEventType.HANDOFF_PROVIDER,
        payloadJson: handoffProviderEncounterPayload({
          fromUserId: userId,
          toUserId: dto.toUserId,
          toDisplayName,
          reportGivenAt: reportGivenAtIso,
          notes: notesTrim,
        }),
        createdByUserId: userId,
      },
    });
    return { ok: true as const };
  }

  /**
   * Historique d’audit limité à une consultation — chronologique (plus ancien en premier).
   * Même périmètre d’actions que le bandeau dossier patient (pas de bruit CHART_ACCESS / ENCOUNTER_VIEW / ORDER_VIEW).
   */
  async getAuditTimeline(
    facilityId: string,
    encounterId: string,
    _userId?: string,
    _ip?: string,
    _userAgent?: string
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true, patientId: true },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const rows = await this.prisma.auditLog.findMany({
      where: {
        facilityId,
        patientId: encounter.patientId,
        action: { in: ENCOUNTER_AUDIT_TIMELINE_V1_ACTIONS },
        OR: [
          { encounterId: encounter.id },
          {
            metadata: {
              path: ["encounterId"],
              equals: encounter.id,
            },
          },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const forEncounter = rows.filter((row) => {
      const eid = row.encounterId ?? metadataEncounterId(row.metadata);
      return eid === encounter.id;
    });

    return forEncounter.map((row) => mapAuditLogRowToTimelineItem(row));
  }

  /**
   * Append-only vitals timeline for one encounter: triage readings + EncounterClinicalEvent VITALS_RECORDED.
   */
  async getVitalsHistory(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }

    const readings = await this.prisma.triageVitalsReading.findMany({
      where: { encounterId, facilityId },
      orderBy: { recordedAt: "asc" },
    });

    const events = await this.prisma.encounterClinicalEvent.findMany({
      where: {
        encounterId,
        facilityId,
        eventType: EncounterClinicalEventType.VITALS_RECORDED,
      },
      orderBy: { createdAt: "asc" },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    type Entry = {
      recordedAt: string;
      recordedBy: { userId: string | null; displayName: string | null };
      source: string;
      vitals: Record<string, unknown>;
    };

    const entries: Entry[] = [];

    for (const r of readings) {
      const vj = r.vitalsJson;
      if (!hasNonEmptyVitalsJson(vj)) continue;
      entries.push({
        recordedAt: r.recordedAt.toISOString(),
        recordedBy: { userId: null, displayName: null },
        source: "TRIAGE",
        vitals: vj,
      });
    }

    for (const e of events) {
      const raw = e.payloadJson;
      const payload =
        raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
      const vitalsRaw = payload.vitals;
      const vitals =
        vitalsRaw && typeof vitalsRaw === "object" && !Array.isArray(vitalsRaw)
          ? (vitalsRaw as Record<string, unknown>)
          : {};
      if (!hasNonEmptyVitalsJson(vitals)) continue;
      const src = typeof payload.source === "string" && payload.source.trim() ? payload.source.trim() : "ENCOUNTER_CHART";
      /** Triage path persists `TriageVitalsReading` + duplicate `VITALS_RECORDED`; keep readings as canonical. */
      if (src === "TRIAGE") continue;
      const displayName = `${e.createdBy.firstName} ${e.createdBy.lastName}`.trim();
      entries.push({
        recordedAt: e.createdAt.toISOString(),
        recordedBy: { userId: e.createdByUserId, displayName: displayName || null },
        source: src,
        vitals,
      });
    }

    entries.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    return { entries };
  }

  /**
   * Append-only clinical events for one encounter (newest first).
   * Reuses `EncounterClinicalEvent` — no separate migration.
   */
  async getClinicalTimeline(facilityId: string, encounterId: string, limit = 30) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }

    const rawTake = Number(limit);
    const take = Number.isFinite(rawTake) ? Math.min(Math.max(Math.trunc(rawTake), 1), 100) : 30;

    const rows = await this.prisma.encounterClinicalEvent.findMany({
      where: { encounterId, facilityId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      createdAt: r.createdAt.toISOString(),
      createdBy: {
        userId: r.createdByUserId,
        firstName: r.createdBy.firstName,
        lastName: r.createdBy.lastName,
      },
      payloadJson: r.payloadJson,
    }));
  }

  private parseOptionalIsoDate(input: string | undefined, fieldLabelFr: string): string | null {
    if (input == null || !String(input).trim()) return null;
    const d = new Date(String(input).trim());
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`${fieldLabelFr} invalide.`);
    }
    return d.toISOString();
  }

  private userDisplayName(u: { firstName: string | null; lastName: string | null }): string {
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  }

  /**
   * Resolve performer identity (display name + role title + initials) for an ER nursing
   * reassessment column event. RN-first ordering reflects who normally documents reassessments
   * at the bedside; PROVIDER / ADMIN are accepted fallbacks when an RN role isn't present (e.g.
   * a provider re-documenting nursing observations during a critical event).
   *
   * Returns a snapshot with `null`/empty fallbacks if the user record cannot be loaded — the
   * event is always written; absent identity simply renders as "—" in the bedside grid.
   */
  private async resolveErNursingReassessmentPerformer(
    facilityId: string,
    userId: string | null | undefined
  ): Promise<{
    performerId: string | null;
    performerDisplayName: string;
    performerRoleTitle: string;
    performerInitials: string;
  }> {
    if (!userId) {
      return {
        performerId: null,
        performerDisplayName: "",
        performerRoleTitle: "",
        performerInitials: "",
      };
    }
    const actor = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!actor) {
      return {
        performerId: userId,
        performerDisplayName: "",
        performerRoleTitle: "",
        performerInitials: "",
      };
    }
    const display = this.userDisplayName(actor) || "";
    const initials = computeDisplayNameInitials(display);

    const rows = await this.prisma.userRole.findMany({
      where: { userId, facilityId, isActive: true },
      select: { role: { select: { code: true } } },
    });
    const codes = new Set(rows.map((r) => r.role.code));
    const order: RoleCode[] = [RoleCode.RN, RoleCode.PROVIDER, RoleCode.ADMIN];
    let chosen: RoleCode | null = null;
    for (const rc of order) {
      if (codes.has(rc)) {
        chosen = rc;
        break;
      }
    }
    /** Stable, FR-localized title. Codes are ASCII and audit-friendly. */
    const title =
      chosen === RoleCode.RN
        ? "RN"
        : chosen === RoleCode.PROVIDER
        ? "MD"
        : chosen === RoleCode.ADMIN
        ? "ADMIN"
        : "";

    return {
      performerId: actor.id,
      performerDisplayName: display,
      performerRoleTitle: title,
      performerInitials: initials,
    };
  }

  /**
   * Resolve performer identity (display name + role title + initials) for a summary-document
   * clinical event (DISCHARGE_SUMMARY_SAVED, ADMISSION_SUMMARY_SAVED). Both documents are
   * typically authored / co-authored by the provider (medical content) and the RN (nursing
   * content), so PROVIDER is preferred first; RN and ADMIN are accepted fallbacks. The chosen
   * role is denormalized into the event row so historical signatures survive future user renames
   * or role changes.
   *
   * Returns a snapshot with `null`/empty fallbacks if the user record cannot be loaded — the event
   * row is still written; absent identity simply renders as "—" in any future history view.
   */
  private async resolveSummaryDocumentPerformer(
    facilityId: string,
    userId: string | null | undefined
  ): Promise<{
    performerId: string | null;
    performerDisplayName: string;
    performerRoleTitle: string;
    performerInitials: string;
  }> {
    if (!userId) {
      return {
        performerId: null,
        performerDisplayName: "",
        performerRoleTitle: "",
        performerInitials: "",
      };
    }
    const actor = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!actor) {
      return {
        performerId: userId,
        performerDisplayName: "",
        performerRoleTitle: "",
        performerInitials: "",
      };
    }
    const display = this.userDisplayName(actor) || "";
    const initials = computeDisplayNameInitials(display);

    const rows = await this.prisma.userRole.findMany({
      where: { userId, facilityId, isActive: true },
      select: { role: { select: { code: true } } },
    });
    const codes = new Set(rows.map((r) => r.role.code));
    const order: RoleCode[] = [RoleCode.PROVIDER, RoleCode.RN, RoleCode.ADMIN];
    let chosen: RoleCode | null = null;
    for (const rc of order) {
      if (codes.has(rc)) {
        chosen = rc;
        break;
      }
    }
    const title =
      chosen === RoleCode.PROVIDER
        ? "MD"
        : chosen === RoleCode.RN
        ? "RN"
        : chosen === RoleCode.ADMIN
        ? "ADMIN"
        : "";

    return {
      performerId: actor.id,
      performerDisplayName: display,
      performerRoleTitle: title,
      performerInitials: initials,
    };
  }

  /**
   * List ER nursing reassessment column events for an encounter (append-only history). Filters
   * the encounter's `NURSING_ASSESSMENT_SAVED` clinical events to those tagged with the
   * `erNursingReassessmentV1` namespace; ignores nursingEvalV1-namespaced rows (provider intake)
   * and other clinical event types.
   *
   * Performance: bounded `take`, `orderBy: createdAt desc` (matches the index on `(encounterId,
   * createdAt)`); shape is denormalized so the bedside grid never re-resolves performer identity.
   * Facility-scoped at every layer.
   */
  async listNursingReassessmentEvents(
    facilityId: string,
    encounterId: string,
    limit: number = 50
  ) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);
    const rows = await this.prisma.encounterClinicalEvent.findMany({
      where: {
        encounterId,
        facilityId,
        eventType: EncounterClinicalEventType.NURSING_ASSESSMENT_SAVED,
        payloadJson: {
          path: ["namespace"],
          equals: NURSING_ASSESSMENT_NAMESPACE_ER_NURSING_REASSESSMENT_V1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    return {
      entries: rows.map((r) => {
        const raw = r.payloadJson;
        const p =
          raw && typeof raw === "object" && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};
        const nameFromPayload =
          typeof p.performerDisplayName === "string" && p.performerDisplayName.trim()
            ? p.performerDisplayName.trim()
            : "";
        const display = nameFromPayload || this.userDisplayName(r.createdBy) || "";
        const initials =
          typeof p.performerInitials === "string" && p.performerInitials.trim()
            ? p.performerInitials.trim()
            : computeDisplayNameInitials(display);
        const roleTitle =
          typeof p.performerRoleTitle === "string" && p.performerRoleTitle.trim()
            ? p.performerRoleTitle.trim()
            : "";
        const docAt =
          typeof p.documentedAt === "string" && p.documentedAt.trim() ? p.documentedAt.trim() : null;
        const performerId =
          typeof p.performerId === "string" && p.performerId.trim() ? p.performerId.trim() : null;
        const snapshot =
          p.snapshot && typeof p.snapshot === "object" && !Array.isArray(p.snapshot)
            ? (p.snapshot as Record<string, unknown>)
            : null;
        const traumaSnapshot =
          p.traumaSnapshot &&
          typeof p.traumaSnapshot === "object" &&
          !Array.isArray(p.traumaSnapshot)
            ? (p.traumaSnapshot as Record<string, unknown>)
            : null;
        return {
          id: r.id,
          createdAt: r.createdAt.toISOString(),
          documentedAt: docAt,
          /**
           * Immutable row creator. Used by the bedside grid to detect when the latest persisted
           * column belongs to a different authenticated user — in which case the panel resets
           * its draft to empty and auto-arms `reassessmentNewSession` so the next save creates
           * a brand-new column instead of attempting to mutate someone else's row. Distinct
           * from `performerId` (which reflects whoever last wrote the payload before the
           * identity guard locked the UPDATE branch in apps/api/src/encounters/encounters.service.ts).
           */
          createdByUserId: r.createdByUserId,
          performerId,
          performerDisplayName: display,
          performerRoleTitle: roleTitle,
          performerInitials: initials,
          snapshot,
          traumaSnapshot,
        };
      }),
    };
  }

  /**
   * Structured IV access derived from append-only IV_INSERTED / IV_REMOVED clinical events (S13).
   */
  async getIvAccess(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }

    const rows = await this.prisma.encounterClinicalEvent.findMany({
      where: {
        encounterId,
        facilityId,
        eventType: {
          in: [EncounterClinicalEventType.IV_INSERTED, EncounterClinicalEventType.IV_REMOVED],
        },
      },
      orderBy: { createdAt: "asc" },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const insertions = new Map<string, (typeof rows)[number]>();
    const removedInsertionIds = new Set<string>();

    for (const r of rows) {
      if (r.eventType === EncounterClinicalEventType.IV_INSERTED) {
        insertions.set(r.id, r);
      } else if (r.eventType === EncounterClinicalEventType.IV_REMOVED) {
        const p = r.payloadJson as Record<string, unknown>;
        const insId = typeof p.insertionEventId === "string" ? p.insertionEventId.trim() : "";
        if (insId) removedInsertionIds.add(insId);
      }
    }

    const active: Array<{
      insertionEventId: string;
      site: string;
      gauge: string;
      insertedAt: string;
      recordedByUserId: string;
      recordedByDisplayName: string | null;
      notes: string | null;
    }> = [];

    for (const [id, row] of insertions) {
      if (removedInsertionIds.has(id)) continue;
      const p = (row.payloadJson && typeof row.payloadJson === "object" && !Array.isArray(row.payloadJson)
        ? (row.payloadJson as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      const site = typeof p.site === "string" ? p.site : "";
      const gauge = typeof p.gauge === "string" ? p.gauge : "";
      const insIso =
        typeof p.insertedAt === "string" && p.insertedAt.trim() ? p.insertedAt.trim() : row.createdAt.toISOString();
      active.push({
        insertionEventId: id,
        site,
        gauge,
        insertedAt: insIso,
        recordedByUserId: row.createdByUserId,
        recordedByDisplayName: this.userDisplayName(row.createdBy) || null,
        notes: typeof p.notes === "string" && p.notes.trim() ? p.notes.trim().slice(0, 4000) : null,
      });
    }

    const removed: Array<{
      removalEventId: string;
      insertionEventId: string;
      site: string;
      gauge: string;
      insertedAt: string;
      insertedByDisplayName: string | null;
      insertionNotes: string | null;
      removedAt: string;
      removedByDisplayName: string | null;
      removalReason: string | null;
      removalNotes: string | null;
      /** Same as removedByDisplayName (legacy field name). */
      recordedByDisplayName: string | null;
      /** Same as removalReason (legacy field name). */
      reason: string | null;
      /** Same as removalNotes (legacy field name). */
      notes: string | null;
    }> = [];

    for (const r of rows) {
      if (r.eventType !== EncounterClinicalEventType.IV_REMOVED) continue;
      const p = (r.payloadJson && typeof r.payloadJson === "object" && !Array.isArray(r.payloadJson)
        ? (r.payloadJson as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      const insId = typeof p.insertionEventId === "string" ? p.insertionEventId.trim() : "";
      const ins = insId ? insertions.get(insId) : undefined;
      const insPayload =
        ins && ins.payloadJson && typeof ins.payloadJson === "object" && !Array.isArray(ins.payloadJson)
          ? (ins.payloadJson as Record<string, unknown>)
          : {};
      const siteFromRemoval = typeof p.site === "string" ? p.site : "";
      const gaugeFromRemoval = typeof p.gauge === "string" ? p.gauge : "";
      const site =
        siteFromRemoval.trim() ||
        (typeof insPayload.site === "string" ? insPayload.site : "");
      const gauge =
        gaugeFromRemoval.trim() ||
        (typeof insPayload.gauge === "string" ? insPayload.gauge : "");
      const insertedAt =
        typeof insPayload.insertedAt === "string" && insPayload.insertedAt.trim()
          ? insPayload.insertedAt.trim()
          : ins?.createdAt.toISOString() ?? "";
      const removedAt =
        typeof p.removedAt === "string" && p.removedAt.trim() ? p.removedAt.trim() : r.createdAt.toISOString();
      const insertionNotesRaw =
        typeof insPayload.notes === "string" && insPayload.notes.trim()
          ? insPayload.notes.trim().slice(0, 4000)
          : null;
      const fromInsUser = ins ? this.userDisplayName(ins.createdBy).trim() : "";
      const fromInsPayload =
        typeof insPayload.performerDisplayName === "string" && insPayload.performerDisplayName.trim()
          ? insPayload.performerDisplayName.trim()
          : "";
      const insertedByDisplayName =
        fromInsUser || fromInsPayload || null;
      const removalReason =
        typeof p.reason === "string" && p.reason.trim() ? p.reason.trim().slice(0, 500) : null;
      const removalNotes =
        typeof p.notes === "string" && p.notes.trim() ? p.notes.trim().slice(0, 4000) : null;
      const removedByDisplayName = this.userDisplayName(r.createdBy) || null;
      removed.push({
        removalEventId: r.id,
        insertionEventId: insId,
        site,
        gauge,
        insertedAt,
        insertedByDisplayName,
        insertionNotes: insertionNotesRaw,
        removedAt,
        removedByDisplayName,
        removalReason,
        removalNotes,
        recordedByDisplayName: removedByDisplayName,
        reason: removalReason,
        notes: removalNotes,
      });
    }

    removed.sort((a, b) => new Date(b.removedAt).getTime() - new Date(a.removedAt).getTime());

    return { active, removed };
  }

  async recordIvInsertion(
    facilityId: string,
    encounterId: string,
    dto: EncounterIvAccessInsertDto,
    userId?: string
  ) {
    try {
      if (!userId) {
        throw new ForbiddenException("Authentication required.");
      }
      const encounter = await this.prisma.encounter.findFirst({
        where: { id: encounterId, facilityId },
      });
      if (!encounter) {
        throw new NotFoundException("Encounter not found");
      }
      if (encounter.status !== EncounterStatus.OPEN) {
        throw new BadRequestException("La consultation doit être ouverte pour documenter un accès IV.");
      }
      assertEncounterNotSigned(encounter);

      const actor = await this.prisma.user.findFirst({
        where: { id: userId, isActive: true },
        select: { id: true, firstName: true, lastName: true },
      });
      if (!actor) {
        throw new ForbiddenException("Utilisateur introuvable.");
      }
      const performerDisplayName = this.userDisplayName(actor);

      const insertedAtIso = this.parseOptionalIsoDate(dto.insertedAt, "Date ou heure d'insertion");
      const notesTrim =
        dto.notes != null && String(dto.notes).trim() ? String(dto.notes).trim().slice(0, 4000) : null;

      const payloadJson: Record<string, unknown> = {
        site: dto.site.trim(),
        gauge: dto.gauge.trim(),
        performerDisplayName: performerDisplayName || null,
      };
      if (insertedAtIso) payloadJson.insertedAt = insertedAtIso;
      if (notesTrim) payloadJson.notes = notesTrim;

      await this.prisma.encounterClinicalEvent.create({
        data: {
          facilityId,
          encounterId: encounter.id,
          patientId: encounter.patientId,
          eventType: EncounterClinicalEventType.IV_INSERTED,
          payloadJson: payloadJson as unknown as Prisma.InputJsonValue,
          createdByUserId: userId,
        },
      });

      logInfo("iv_inserted", {
        userId,
        encounterId,
        facilityId,
        action: "encounter.iv.insert",
      });
      return { ok: true as const };
    } catch (err: unknown) {
      logError("iv_insert_failed", {
        userId: userId ?? null,
        encounterId,
        facilityId,
        action: "encounter.iv.insert",
        errorName: err instanceof Error ? err.name : typeof err,
      });
      if (!(err instanceof HttpException)) {
        queueMedoraAlert({
          event: "iv_insert_failed",
          severity: "critical",
          userId: userId ?? undefined,
          encounterId,
          facilityId,
        });
      }
      throw err;
    }
  }

  async recordIvRemoval(
    facilityId: string,
    encounterId: string,
    insertionEventId: string,
    dto: EncounterIvAccessRemoveDto,
    userId?: string
  ) {
    try {
      if (!userId) {
        throw new ForbiddenException("Authentication required.");
      }
      const encounter = await this.prisma.encounter.findFirst({
        where: { id: encounterId, facilityId },
      });
      if (!encounter) {
        throw new NotFoundException("Encounter not found");
      }
      if (encounter.status !== EncounterStatus.OPEN) {
        throw new BadRequestException("La consultation doit être ouverte pour documenter le retrait IV.");
      }
      assertEncounterNotSigned(encounter);

      const insertion = await this.prisma.encounterClinicalEvent.findFirst({
        where: {
          id: insertionEventId,
          encounterId,
          facilityId,
          eventType: EncounterClinicalEventType.IV_INSERTED,
        },
      });
      if (!insertion) {
        throw new BadRequestException("Événement d'insertion IV introuvable pour cette consultation.");
      }
      const insPayload =
        insertion.payloadJson && typeof insertion.payloadJson === "object" && !Array.isArray(insertion.payloadJson)
          ? (insertion.payloadJson as Record<string, unknown>)
          : {};
      const siteSnap = typeof insPayload.site === "string" ? insPayload.site : "";
      const gaugeSnap = typeof insPayload.gauge === "string" ? insPayload.gauge : "";

      const dup = await this.prisma.encounterClinicalEvent.findFirst({
        where: {
          encounterId,
          facilityId,
          eventType: EncounterClinicalEventType.IV_REMOVED,
          payloadJson: {
            path: ["insertionEventId"],
            equals: insertionEventId,
          },
        },
        select: { id: true },
      });
      if (dup) {
        throw new BadRequestException("Ce site IV a déjà un retrait documenté.");
      }

      const actor = await this.prisma.user.findFirst({
        where: { id: userId, isActive: true },
        select: { id: true, firstName: true, lastName: true },
      });
      if (!actor) {
        throw new ForbiddenException("Utilisateur introuvable.");
      }
      const performerDisplayName = this.userDisplayName(actor);

      const removedAtIso = this.parseOptionalIsoDate(dto.removedAt, "Date ou heure de retrait");
      const reasonTrim =
        dto.reason != null && String(dto.reason).trim() ? String(dto.reason).trim().slice(0, 500) : null;
      const notesTrim =
        dto.notes != null && String(dto.notes).trim() ? String(dto.notes).trim().slice(0, 4000) : null;

      const payloadJson: Record<string, unknown> = {
        insertionEventId,
        performerDisplayName: performerDisplayName || null,
        site: siteSnap,
        gauge: gaugeSnap,
      };
      if (removedAtIso) payloadJson.removedAt = removedAtIso;
      if (reasonTrim) payloadJson.reason = reasonTrim;
      if (notesTrim) payloadJson.notes = notesTrim;

      await this.prisma.encounterClinicalEvent.create({
        data: {
          facilityId,
          encounterId: encounter.id,
          patientId: encounter.patientId,
          eventType: EncounterClinicalEventType.IV_REMOVED,
          payloadJson: payloadJson as unknown as Prisma.InputJsonValue,
          createdByUserId: userId,
        },
      });

      logInfo("iv_removed", {
        userId,
        encounterId,
        facilityId,
        action: "encounter.iv.remove",
        insertionEventId,
      });
      return { ok: true as const };
    } catch (err: unknown) {
      logError("iv_remove_failed", {
        userId: userId ?? null,
        encounterId,
        facilityId,
        action: "encounter.iv.remove",
        errorName: err instanceof Error ? err.name : typeof err,
      });
      if (!(err instanceof HttpException)) {
        queueMedoraAlert({
          event: "iv_remove_failed",
          severity: "critical",
          userId: userId ?? undefined,
          encounterId,
          facilityId,
        });
      }
      throw err;
    }
  }

  private static readonly PROCEDURE_PERFORMER_ROLE_ORDER: RoleCode[] = [
    RoleCode.PROVIDER,
    RoleCode.RN,
    RoleCode.RADIOLOGY,
    RoleCode.LAB,
    RoleCode.ADMIN,
  ];

  private procedurePerformerTitle(role: RoleCode): string {
    switch (role) {
      case RoleCode.PROVIDER:
        return "MD";
      case RoleCode.RN:
        return "RN";
      case RoleCode.LAB:
        return "LT";
      case RoleCode.RADIOLOGY:
        return "RD";
      case RoleCode.ADMIN:
        return "ADMIN";
      default:
        return "";
    }
  }

  private async resolveProcedurePerformerSnapshot(
    facilityId: string,
    userId: string,
    actor: { firstName: string | null; lastName: string | null }
  ): Promise<{
    performerRoleCode: string | null;
    performerTitle: string | null;
    performedByDisplayName: string | null;
  }> {
    const name = this.userDisplayName(actor)?.trim() || null;
    const rows = await this.prisma.userRole.findMany({
      where: { userId, facilityId, isActive: true },
      select: { role: { select: { code: true } } },
    });
    const codes = new Set(rows.map((r) => r.role.code));
    let chosen: RoleCode | null = null;
    for (const rc of EncountersService.PROCEDURE_PERFORMER_ROLE_ORDER) {
      if (codes.has(rc)) {
        chosen = rc;
        break;
      }
    }
    const titleRaw = chosen ? this.procedurePerformerTitle(chosen) : "";
    return {
      performerRoleCode: chosen,
      performerTitle: titleRaw ? titleRaw : null,
      performedByDisplayName: name,
    };
  }

  /** Append-only PROCEDURE_DOCUMENTED events for ED procedure launcher (S14A / S14B). */
  async getDocumentedProcedures(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true },
    });
    if (!enc) {
      throw new NotFoundException("Encounter not found");
    }

    const rows = await this.prisma.encounterClinicalEvent.findMany({
      where: {
        encounterId,
        facilityId,
        eventType: EncounterClinicalEventType.PROCEDURE_DOCUMENTED,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    return {
      entries: rows.map((r) => {
        const raw = r.payloadJson;
        const p =
          raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
        const nameFromPayload =
          (typeof p.performedByDisplayName === "string" && p.performedByDisplayName.trim()) ||
          (typeof p.performerDisplayName === "string" && p.performerDisplayName.trim()) ||
          "";
        const display = nameFromPayload || this.userDisplayName(r.createdBy) || null;
        const performedAt =
          typeof p.performedAt === "string" && p.performedAt.trim() ? p.performedAt.trim() : null;
        return {
          id: r.id,
          createdAt: r.createdAt.toISOString(),
          procedureType: typeof p.procedureType === "string" ? p.procedureType : "",
          site: typeof p.site === "string" ? p.site : "",
          performedAt,
          performerDisplayName: display,
          performerTitle:
            typeof p.performerTitle === "string" && p.performerTitle.trim() ? p.performerTitle.trim() : null,
          performerRoleCode:
            typeof p.performerRoleCode === "string" && p.performerRoleCode.trim()
              ? p.performerRoleCode.trim()
              : null,
          createdBy: r.createdBy,
          payload: p,
        };
      }),
    };
  }

  private procedureDocumentPayloadFromDto(
    dto: EncounterProcedureDocumentDto,
    performedAtIso: string | undefined,
    performer: {
      performerRoleCode: string | null;
      performerTitle: string | null;
      performedByDisplayName: string | null;
    }
  ): Record<string, unknown> {
    const plain = dto as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(plain)) {
      if (k === "performedAt") continue;
      if (v === undefined || v === null) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      out[k] = v;
    }
    if (performedAtIso) out.performedAt = performedAtIso;
    out.performedByDisplayName = performer.performedByDisplayName;
    out.performerDisplayName = performer.performedByDisplayName;
    out.performerTitle = performer.performerTitle;
    out.performerRoleCode = performer.performerRoleCode;
    return out;
  }

  async recordProcedureDocumented(
    facilityId: string,
    encounterId: string,
    dto: EncounterProcedureDocumentDto,
    userId?: string
  ) {
    if (!userId) {
      throw new ForbiddenException("Authentication required.");
    }
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }
    if (encounter.status !== EncounterStatus.OPEN) {
      throw new BadRequestException("La consultation doit être ouverte pour documenter une procédure.");
    }
    assertEncounterNotSigned(encounter);

    const actor = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!actor) {
      throw new ForbiddenException("Utilisateur introuvable.");
    }
    const performer = await this.resolveProcedurePerformerSnapshot(facilityId, userId, actor);

    const performedAtRaw =
      typeof (dto as { performedAt?: unknown }).performedAt === "string"
        ? (dto as { performedAt?: string }).performedAt?.trim()
        : undefined;
    const performedAtIso = performedAtRaw
      ? this.parseOptionalIsoDate(performedAtRaw, "Date ou heure de la procédure")
      : undefined;

    const payloadJson = this.procedureDocumentPayloadFromDto(dto, performedAtIso ?? undefined, performer);

    const created = await this.prisma.encounterClinicalEvent.create({
      data: {
        facilityId,
        encounterId: encounter.id,
        patientId: encounter.patientId,
        eventType: EncounterClinicalEventType.PROCEDURE_DOCUMENTED,
        payloadJson: payloadJson as unknown as Prisma.InputJsonValue,
        createdByUserId: userId,
      },
    });

    const storedPayload =
      created.payloadJson && typeof created.payloadJson === "object" && !Array.isArray(created.payloadJson)
        ? (created.payloadJson as Record<string, unknown>)
        : {};
    const procedureType =
      typeof storedPayload.procedureType === "string" ? storedPayload.procedureType.trim() : "";
    const performedAtAudit =
      typeof storedPayload.performedAt === "string" && storedPayload.performedAt.trim()
        ? storedPayload.performedAt.trim()
        : undefined;

    await this.audit.log(AuditAction.CREATE, "PROCEDURE_DOCUMENTED", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId,
      entityId: created.id,
      metadata: {
        procedureType,
        ...(performedAtAudit ? { performedAt: performedAtAudit } : {}),
        documentedAt: created.createdAt.toISOString(),
        source: "UI",
      },
    });

    return { ok: true as const };
  }

  private async assertProviderAtFacility(facilityId: string, userId: string | null | undefined) {
    if (userId === undefined || userId === null) return;
    const ok = await this.prisma.userRole.findFirst({
      where: {
        facilityId,
        userId,
        isActive: true,
        role: { code: RoleCode.PROVIDER },
      },
    });
    if (!ok) {
      throw new BadRequestException("L'utilisateur sélectionné n'est pas un médecin de cet établissement.");
    }
  }

  private async assertRnAtFacility(facilityId: string, userId: string) {
    const ok = await this.prisma.userRole.findFirst({
      where: {
        facilityId,
        userId,
        isActive: true,
        role: { code: RoleCode.RN },
      },
    });
    if (!ok) {
      throw new BadRequestException(
        "L'infirmier ou l'infirmière sélectionné(e) n'est pas actif(ve) dans cet établissement."
      );
    }
  }

  private async validateErHandoffReceivingNurseUserId(facilityId: string, nursingAssessment: unknown) {
    const read = readErHandoffV1FromNursingAssessment(nursingAssessment);
    const id = read.receivingNurseUserId?.trim();
    if (!id) return;
    await this.assertRnAtFacility(facilityId, id);
  }

  private evaluateEncounterDocumentationDeficiencies(
    encounter: {
      chiefComplaint: string | null;
      providerNote: string | null;
      treatmentPlan: string | null;
      nursingAssessment: unknown;
      dischargeSummaryJson: unknown;
      admissionSummaryJson: unknown;
      type: EncounterType;
    },
    dischargeIncoming: EncounterCloseDto["discharge"]
  ): EncounterCloseDocumentationCheckResult {
    const deficiencies: Array<{ code: string; labelFr: string }> = [];

    if (!encounter.chiefComplaint?.trim()) {
      deficiencies.push({
        code: "CHIEF_COMPLAINT",
        labelFr: "Motif de consultation ou raison de visite",
      });
    }

    if (!encounterHasSignableProviderContent(encounter)) {
      deficiencies.push({
        code: "PROVIDER_DOCUMENTATION",
        labelFr:
          "Évaluation médicale (au moins une impression clinique, un plan de traitement ou la documentation HPI/ROS/examen/MDM)",
      });
    }

    if (!nursingAssessmentHasContent(encounter.nursingAssessment)) {
      deficiencies.push({
        code: "NURSING_ASSESSMENT",
        labelFr: "Évaluation infirmière",
      });
    }

    const mergedDischarge = mergeDischargeSummaryJson(encounter.dischargeSummaryJson, dischargeIncoming);
    if (!mergedDischarge) {
      deficiencies.push({
        code: "DISCHARGE_SUMMARY",
        labelFr: "Dossier de sortie structuré",
      });
    }

    if (encounter.type === EncounterType.INPATIENT) {
      const adm = encounter.admissionSummaryJson;
      const admObj =
        adm && typeof adm === "object" && !Array.isArray(adm) ? (adm as Record<string, unknown>) : {};
      if (!admissionSummaryHasContent(admObj)) {
        deficiencies.push({
          code: "ADMISSION_SUMMARY",
          labelFr: "Dossier d'admission (hospitalisation)",
        });
      }
    }

    return { deficiencies, hasDeficiencies: deficiencies.length > 0 };
  }

  async getCloseDocumentationCheck(
    facilityId: string,
    encounterId: string,
    discharge?: EncounterCloseDto["discharge"]
  ): Promise<EncounterCloseDocumentationCheckResult> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    return this.evaluateEncounterDocumentationDeficiencies(encounter, discharge);
  }

  async getDispositionSafetyReadiness(
    facilityId: string,
    encounterId: string,
    incomingDischarge?: EncounterCloseDto["discharge"]
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      include: {
        patient: { select: { latestVitalsAt: true } },
      },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const mergedSummary = mergeDischargeSummaryJson(encounter.dischargeSummaryJson, incomingDischarge);

    const [orders, triageAgg, vitalsEventAgg] = await Promise.all([
      this.prisma.order.findMany({
        where: { encounterId, facilityId },
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
      this.prisma.triageVitalsReading.aggregate({
        where: { encounterId, facilityId },
        _max: { recordedAt: true },
      }),
      this.prisma.encounterClinicalEvent.aggregate({
        where: {
          encounterId,
          facilityId,
          eventType: EncounterClinicalEventType.VITALS_RECORDED,
        },
        _max: { createdAt: true },
      }),
    ]);

    return computeDispositionSafetyReadiness({
      encounter: {
        type: encounter.type,
        status: encounter.status,
        nursingAssessment: encounter.nursingAssessment,
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        admissionSummaryJson: encounter.admissionSummaryJson,
        providerDocumentationStatus: encounter.providerDocumentationStatus,
        providerDocumentationSignedAt: encounter.providerDocumentationSignedAt,
        providerNote: encounter.providerNote,
        treatmentPlan: encounter.treatmentPlan,
      },
      effectiveDischargeSummary: mergedSummary,
      patientLatestVitalsAt: encounter.patient?.latestVitalsAt ?? null,
      latestTriageVitalsRecordedAt: triageAgg._max.recordedAt ?? null,
      latestVitalsClinicalEventAt: vitalsEventAgg._max.createdAt ?? null,
      orders: orders.map((o) => ({
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
      })),
    });
  }

  async close(
    facilityId: string,
    id: string,
    data: EncounterCloseDto | undefined,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    logInfo("encounter_close_attempt", {
      userId: userId ?? null,
      encounterId: id,
      facilityId,
      action: "encounter.close.attempt",
      acknowledgeDeficiencies: data?.acknowledgeDeficiencies === true,
      acknowledgeDispositionSafety: data?.acknowledgeDispositionSafety === true,
    });
    try {
      return await this.executeEncounterClose(facilityId, id, data, userId, ip, userAgent);
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        throw err;
      }
      logError("encounter_close_failed", {
        userId: userId ?? null,
        encounterId: id,
        facilityId,
        action: "encounter.close",
        errorName: err instanceof Error ? err.name : typeof err,
      });
      queueMedoraAlert({
        event: "encounter_close_failed",
        severity: "critical",
        userId: userId ?? undefined,
        encounterId: id,
        facilityId,
      });
      throw err;
    }
  }

  private async executeEncounterClose(
    facilityId: string,
    id: string,
    data: EncounterCloseDto | undefined,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, facilityId },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    // Validate status transition
    assertCanTransitionEncounter(encounter.status, "CLOSED");

    const docCheck = this.evaluateEncounterDocumentationDeficiencies(encounter, data?.discharge);
    if (docCheck.hasDeficiencies && !data?.acknowledgeDeficiencies) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message:
            "La documentation est incomplète. Indiquez acknowledgeDeficiencies: true pour clôturer malgré les lacunes, ou complétez la documentation.",
          deficiencies: docCheck.deficiencies,
          code: "ENCOUNTER_CLOSE_DEFICIENCIES_NOT_ACKNOWLEDGED",
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const safetyReadiness = await this.getDispositionSafetyReadiness(facilityId, id, data?.discharge);
    if (!safetyReadiness.canClose && !data?.acknowledgeDispositionSafety) {
      const detail =
        safetyReadiness.blockers.map((b) => b.message).join(" ") ||
        "Clôture bloquée par les contrôles de sécurité disposition.";
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: detail,
          code: "ENCOUNTER_CLOSE_DISPOSITION_SAFETY_BLOCKED",
          readiness: safetyReadiness,
          blockers: safetyReadiness.blockers,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const closePayload: Record<string, unknown> = {
      status: "CLOSED",
      workflowState: EncounterWorkflowState.CLOSED,
      dischargedAt: new Date(),
    };
    const mergedDischarge = mergeDischargeSummaryJson(encounter.dischargeSummaryJson, data?.discharge);
    if (mergedDischarge) {
      closePayload.dischargeSummaryJson = mergedDischarge;
    }
    if (data?.dischargeStatus !== undefined) {
      closePayload.dischargeStatus = data.dischargeStatus;
    }

    const closedAtIso = new Date().toISOString();
    const dispositionCandidate = buildEncounterDispositionCandidate({
      encounterId: encounter.id,
      patientId: encounter.patientId,
      facilityId,
      dischargeStatus: data?.dischargeStatus ?? encounter.dischargeStatus,
      atIso: closedAtIso,
      createdByUserId: userId,
    });

    /**
     * Append-only DISCHARGE_SUMMARY_SAVED event for close() (multi-user safety, S15A).
     *
     * The close path is the most common save site for discharge content. We emit one INSERT-only
     * event per close call when the discharge JSON materially changed vs. the encounter's
     * pre-close blob. Performer identity is resolved BEFORE the transaction (the user/role reads
     * are stable for this short window) so the transaction stays compact; the INSERT itself runs
     * inside the same `$transaction` as the encounter update so a discharge save and its history
     * row commit atomically. INSERT-only by design — no UPDATE branch and no caller mutates these
     * rows.
     */
    const dischargeChangedForClose =
      !!userId &&
      mergedDischarge !== undefined &&
      dischargeSummarySnapshotChanged(encounter.dischargeSummaryJson, mergedDischarge);
    const dischargeSummaryPerformer = dischargeChangedForClose
      ? await this.resolveSummaryDocumentPerformer(facilityId, userId)
      : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const dispositionEnriched = await enrichBillingCaptureItem(tx, dispositionCandidate);
      closePayload.billingCaptureJson = upsertBillingCaptureItem(encounter.billingCaptureJson, dispositionEnriched);
      await upsertBillingEventFromCaptureItem(tx, dispositionEnriched);
      const effectiveDischarge =
        closePayload.dischargeStatus !== undefined
          ? closePayload.dischargeStatus
          : encounter.dischargeStatus;
      const [ledgerEvents, diagnosisCount] = await Promise.all([
        tx.billingEvent.findMany({
          where: { facilityId, encounterId: id },
          select: {
            reviewStatus: true,
            sourceModule: true,
            procedureCode: true,
            hcpcsCode: true,
            code: true,
            diagnosisCodes: true,
          },
        }),
        tx.diagnosis.count({
          where: { facilityId, encounterId: id, status: "ACTIVE" },
        }),
      ]);
      const readinessAfterClose = evaluateEncounterBillingReadinessFromData(
        {
          status: EncounterStatus.CLOSED,
          dischargeStatus: effectiveDischarge,
          physicianAssignedUserId: encounter.physicianAssignedUserId,
        },
        ledgerEvents,
        diagnosisCount
      );
      closePayload.billingFinalizationStatus = readinessAfterClose.isReady
        ? EncounterBillingFinalizationStatus.READY_FOR_REVIEW
        : EncounterBillingFinalizationStatus.NOT_READY;
      closePayload.billingReadinessSnapshotJson = {
        ...readinessAfterClose,
        source: "encounter_close",
        at: new Date().toISOString(),
      };
      const um = await tx.encounter.updateMany({
        where: { id, facilityId, version: encounter.version },
        data: {
          ...(closePayload as Prisma.EncounterUpdateInput),
          version: { increment: 1 },
        },
      });
      if (um.count === 0) throwEncounterConcurrentModification();
      const closeMetadata: Record<string, unknown> = {
        workflowStateBeforeClose: encounter.workflowState,
      };
      if (docCheck.hasDeficiencies && data?.acknowledgeDeficiencies) {
        closeMetadata.documentationGapOverride = true;
        closeMetadata.deficienciesAcknowledged = true;
        closeMetadata.deficiencyCodes = docCheck.deficiencies.map((d) => d.code);
        closeMetadata.missingItems = docCheck.deficiencies.map((d) => d.code);
      }
      if (!safetyReadiness.canClose && data?.acknowledgeDispositionSafety) {
        closeMetadata.dispositionSafetyOverride = true;
        closeMetadata.dispositionSafetyBlockerCodes = safetyReadiness.blockers.map((b) => b.code);
      }

      await this.audit.log(AuditAction.ENCOUNTER_CLOSE, "ENCOUNTER", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        entityId: encounter.id,
        ip,
        userAgent,
        metadata: closeMetadata,
        critical: true,
        tx,
      });
      if (dischargeChangedForClose && dischargeSummaryPerformer && userId) {
        await tx.encounterClinicalEvent.create({
          data: {
            facilityId,
            encounterId: encounter.id,
            patientId: encounter.patientId,
            eventType: EncounterClinicalEventType.DISCHARGE_SUMMARY_SAVED,
            payloadJson: dischargeSummarySavedEventPayload({
              snapshot: mergedDischarge,
              savedAt: new Date(),
              performerId: dischargeSummaryPerformer.performerId,
              performerDisplayName: dischargeSummaryPerformer.performerDisplayName,
              performerRoleTitle: dischargeSummaryPerformer.performerRoleTitle,
              performerInitials: dischargeSummaryPerformer.performerInitials,
            }),
            createdByUserId: userId,
          },
        });
      }
      const row = await tx.encounter.findFirst({
        where: { id, facilityId },
        include: {
          patient: { select: encounterDetailPatientSelect },
          physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!row) {
        throw new NotFoundException("Encounter not found");
      }
      return row;
    });

    void appendEmergencyEMBilling(this.prisma, facilityId, id);

    logInfo("encounter_close_completed", {
      userId: userId ?? null,
      encounterId: id,
      facilityId,
      action: "encounter.close.completed",
      documentationGapOverride: docCheck.hasDeficiencies && data?.acknowledgeDeficiencies === true,
      dispositionSafetyOverride: !safetyReadiness.canClose && data?.acknowledgeDispositionSafety === true,
    });
    return toEncounterClinicResponse(updated);
  }

  async upsertEncounterIntake(
    encounterId: string,
    facilityId: string,
    data: EncounterIntakeUpsertDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }

    const payload = {
      facilityId,
      arrivalAt: data.arrivalAt ?? null,
      modeOfArrival: data.modeOfArrival?.trim() ? data.modeOfArrival.trim() : null,
      initialChiefComplaint: data.initialChiefComplaint?.trim() ? data.initialChiefComplaint.trim() : null,
      initialAcuity: data.initialAcuity ?? null,
      initialRoom: data.initialRoom?.trim() ? data.initialRoom.trim() : null,
    };

    const row = await this.prisma.encounterIntake.upsert({
      where: { encounterId },
      create: {
        encounterId,
        ...payload,
      },
      update: {
        arrivalAt: payload.arrivalAt,
        modeOfArrival: payload.modeOfArrival,
        initialChiefComplaint: payload.initialChiefComplaint,
        initialAcuity: payload.initialAcuity,
        initialRoom: payload.initialRoom,
      },
    });

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
      metadata: { encounterIntake: true },
    });

    return row;
  }

  /**
   * ER-2 — append a structured PROCEDURE billing capture line (catalog or explicit manual).
   * Preserves existing capture + ledger flows via `appendBillingCaptureCandidate`.
   */
  async appendProcedureCapture(
    encounterId: string,
    facilityId: string,
    dto: AppendProcedureCaptureDto,
    userId?: string,
    ip?: string,
    userAgent?: string
  ): Promise<
    | { duplicateBlocked: true; reasonCode: typeof PROCEDURE_DUPLICATE_BLOCKED }
    | { duplicateBlocked: false; captureItemId: string }
  > {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        facilityId: true,
        providerDocumentationStatus: true,
        billingFinalizationStatus: true,
        billingCaptureJson: true,
      },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }
    assertEncounterNotSigned(encounter);
    if (encounter.billingFinalizationStatus === EncounterBillingFinalizationStatus.FINALIZED) {
      throw new BadRequestException(
        "billing capture cannot be edited while the encounter is finalized for billing"
      );
    }

    const atIso = new Date().toISOString();
    const stored = readBillingCaptureV1(encounter.billingCaptureJson);
    const unitsEff =
      dto.units != null && dto.units > 0 ? Math.min(Math.floor(dto.units), 999999) : 1;

    let item;

    const catId = dto.billingProcedureCodeId?.trim();
    if (catId) {
      const row = await this.prisma.billingProcedureCode.findFirst({
        where: { id: catId, isActive: true },
      });
      if (!row) {
        throw new BadRequestException("Unknown or inactive procedure catalog entry");
      }
      const sys = row.codeSystem === "CPT" ? "CPT" : "HCPCS";
      const dup = findBillingCaptureProcedureDuplicate(stored, {
        procedureCatalogId: row.id,
        codeSystem: sys,
        code: row.code,
        units: unitsEff,
        pendingCreatedAtIso: atIso,
      });
      if (dup) {
        await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
          userId,
          facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          entityId: encounter.id,
          ip,
          userAgent,
          metadata: {
            procedureCaptureDuplicateBlocked: true,
            reasonCode: PROCEDURE_DUPLICATE_BLOCKED,
            existingCaptureItemId: dup.id,
          },
        });
        logInfo("procedure_capture_duplicate_blocked", {
          userId: userId ?? null,
          encounterId: encounter.id,
          facilityId,
          action: "encounter.procedure.append.duplicate_blocked",
          fromCatalog: true,
        });
        return { duplicateBlocked: true, reasonCode: PROCEDURE_DUPLICATE_BLOCKED };
      }
      item = buildProcedureCaptureCandidate({
        encounterId: encounter.id,
        patientId: encounter.patientId,
        facilityId: encounter.facilityId,
        codeSystem: sys,
        code: row.code,
        shortDescription: row.shortDescription,
        billingProcedureCodeId: row.id,
        manualNonCatalog: false,
        modifiers: dto.modifiers,
        units: dto.units ?? undefined,
        atIso,
        createdByUserId: userId ?? null,
      });
    } else {
      const manual = dto.manualNonCatalog === true;
      const code = dto.code?.trim() ?? "";
      const sys = dto.codeSystem;
      if (!manual || !sys) {
        throw new BadRequestException("Invalid procedure capture payload");
      }
      if (!isProcedureCodeLikeForSystem(code, sys)) {
        throw new BadRequestException(PROCEDURE_INVALID_CODE_FORMAT);
      }
      const dupManual = findBillingCaptureProcedureDuplicate(stored, {
        procedureCatalogId: null,
        codeSystem: sys,
        code,
        units: unitsEff,
        pendingCreatedAtIso: atIso,
      });
      if (dupManual) {
        await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
          userId,
          facilityId,
          patientId: encounter.patientId,
          encounterId: encounter.id,
          entityId: encounter.id,
          ip,
          userAgent,
          metadata: {
            procedureCaptureDuplicateBlocked: true,
            reasonCode: PROCEDURE_DUPLICATE_BLOCKED,
            existingCaptureItemId: dupManual.id,
          },
        });
        logInfo("procedure_capture_duplicate_blocked", {
          userId: userId ?? null,
          encounterId: encounter.id,
          facilityId,
          action: "encounter.procedure.append.duplicate_blocked",
          fromCatalog: false,
        });
        return { duplicateBlocked: true, reasonCode: PROCEDURE_DUPLICATE_BLOCKED };
      }
      item = buildProcedureCaptureCandidate({
        encounterId: encounter.id,
        patientId: encounter.patientId,
        facilityId: encounter.facilityId,
        codeSystem: sys,
        code,
        shortDescription: dto.description?.trim() ?? null,
        manualNonCatalog: true,
        modifiers: dto.modifiers,
        units: dto.units ?? undefined,
        atIso,
        createdByUserId: userId ?? null,
      });
    }

    try {
      await appendBillingCaptureCandidate(this.prisma, encounterId, facilityId, item);

      await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
        userId,
        facilityId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        entityId: encounter.id,
        ip,
        userAgent,
        metadata: { procedureCapture: true, captureItemId: item.id },
      });

      logInfo("procedure_capture_appended", {
        userId: userId ?? null,
        encounterId: encounter.id,
        facilityId,
        action: "encounter.procedure.append",
        captureItemId: item.id,
        fromCatalog: Boolean(catId),
      });
      return { duplicateBlocked: false, captureItemId: item.id };
    } catch (err: unknown) {
      logError("procedure_capture_append_failed", {
        userId: userId ?? null,
        encounterId,
        facilityId,
        action: "encounter.procedure.append",
        errorName: err instanceof Error ? err.name : typeof err,
      });
      if (!(err instanceof HttpException)) {
        queueMedoraAlert({
          event: "procedure_capture_append_failed",
          severity: "critical",
          userId: userId ?? undefined,
          encounterId,
          facilityId,
        });
      }
      throw err;
    }
  }

  /**
   * Clinical cancellation of a saved admission decision (in-phase, no schema change).
   *
   * Effect: clears `admissionSummaryJson` + `admittedAt`, leaves `Encounter.status`,
   * `EncounterType`, and billing finalization untouched. Reason is required and persisted
   * on the audit log; admission billing is only emitted at close, so cancelling here
   * has no billing-side effect.
   *
   * Authority: ADMIN or PROVIDER (mirrors the admission save path on PATCH /encounters/:id).
   */
  async cancelAdmissionDecision(
    facilityId: string,
    encounterId: string,
    dto: EncounterAdmissionCancelDto,
    userId: string | undefined,
    ip?: string,
    userAgent?: string
  ) {
    if (!userId) {
      throw new ForbiddenException(
        "Authentification requise pour annuler la décision d'admission."
      );
    }

    const reason = dto.cancellationReason.trim();
    if (reason.length < 3) {
      throw new BadRequestException(
        "Le motif d'annulation est requis (3 caractères minimum)."
      );
    }
    if (reason.length > 500) {
      throw new BadRequestException(
        "Le motif d'annulation est limité à 500 caractères."
      );
    }

    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
    });
    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }
    assertEncounterNotSigned(encounter);
    if (encounter.status !== EncounterStatus.OPEN) {
      throw new BadRequestException(
        "L'annulation de la décision d'admission n'est possible que sur une consultation ouverte."
      );
    }

    const adm = encounter.admissionSummaryJson;
    const admObj =
      adm && typeof adm === "object" && !Array.isArray(adm)
        ? (adm as Record<string, unknown>)
        : null;
    if (!admObj || !admissionSummaryHasContent(admObj)) {
      throw new BadRequestException(
        "Aucune décision d'admission active à annuler pour cette consultation."
      );
    }

    /** PHI-safe: capture current performer identity for audit metadata (no patient name/MRN). */
    const performer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, facilityId, isActive: true },
      include: { role: { select: { code: true, name: true } } },
    });
    const roleRows = userRoles.flatMap((r) =>
      r.role ? [{ code: String(r.role.code), name: r.role.name ?? null }] : []
    );
    const requestorRoleCodes = roleRows.map((r) => r.code as RoleCode);
    if (
      !requestorRoleCodes.includes(RoleCode.PROVIDER) &&
      !requestorRoleCodes.includes(RoleCode.ADMIN)
    ) {
      throw new ForbiddenException(
        "L'annulation de la décision d'admission est réservée aux médecins et aux administrateurs."
      );
    }
    const sortedRoles = [...roleRows].sort((a, b) => a.code.localeCompare(b.code));
    const cancelledByDisplayFr = [
      performer?.firstName?.trim() ?? "",
      performer?.lastName?.trim() ?? "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
    const cancelledByTitle = sortedRoles[0]?.name?.trim() || sortedRoles[0]?.code || null;
    const cancelledByRoleSnapshot =
      [...new Set(sortedRoles.map((r) => r.code))].join("|") || "UNKNOWN";

    const cancelledAt = new Date();
    const cancelledAtIso = cancelledAt.toISOString();

    const u = await this.prisma.encounter.updateMany({
      where: { id: encounterId, facilityId, version: encounter.version },
      data: {
        admissionSummaryJson: Prisma.JsonNull,
        admittedAt: null,
        version: { increment: 1 },
      },
    });
    if (u.count === 0) throwEncounterConcurrentModification();

    const updated = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      include: {
        patient: { select: encounterDetailPatientSelect },
        physicianAssigned: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!updated) {
      throw new NotFoundException("Encounter not found");
    }

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
      userId,
      facilityId,
      patientId: encounter.patientId,
      encounterId: encounter.id,
      entityId: encounter.id,
      ip,
      userAgent,
      critical: true,
      metadata: {
        event: "ADMISSION_DECISION_CANCELLED",
        cancellationReason: reason,
        cancelledByUserId: userId,
        ...(cancelledByDisplayFr ? { cancelledByDisplayFr } : {}),
        ...(cancelledByTitle ? { cancelledByTitle } : {}),
        cancelledByRoleSnapshot,
        cancelledAt: cancelledAtIso,
        source: "DISPOSITION_ORDER_CANCEL",
      },
    });

    return toEncounterClinicResponse(updated);
  }
}

