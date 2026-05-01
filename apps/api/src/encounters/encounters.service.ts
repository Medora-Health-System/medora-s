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
  getNursingAssessmentNamespace,
  NURSING_ASSESSMENT_NAMESPACE_ER_PROVIDER_MSE_V1,
  NURSING_ASSESSMENT_NAMESPACE_NURSING_EVAL_V1,
  nursingAssessmentJsonSnapshotPayload,
  nursingAssessmentNamespaceChanged,
} from "../utils/clinical-event-nursing-assessment-json.util";
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
import type { AppendProcedureCaptureDto } from "../billing-procedure-codes/dto/append-procedure-capture.dto";

/** Champs alignés sur encounterDischargeFieldsSchema — fusion à la clôture pour ne pas écraser un brouillon. */
const DISCHARGE_SUMMARY_KEYS = [
  "disposition",
  "exitCondition",
  "dischargeInstructions",
  "medicationsGiven",
  "followUp",
  "returnIfWorse",
  "patientDestination",
  "dischargeMode",
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
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const o = existing as Record<string, unknown>;
    for (const k of DISCHARGE_SUMMARY_KEYS) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) {
        out[k] = v.trim();
      }
    }
  }
  if (incoming) {
    const inc = incoming as Record<string, unknown>;
    for (const k of DISCHARGE_SUMMARY_KEYS) {
      const v = inc[k];
      if (v !== undefined && String(v).trim() !== "") {
        out[k] = String(v).trim();
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
      },
    });

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

    return { ok: true as const };
  }

  async recordIvRemoval(
    facilityId: string,
    encounterId: string,
    insertionEventId: string,
    dto: EncounterIvAccessRemoveDto,
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

    return { ok: true as const };
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

    await this.prisma.encounterClinicalEvent.create({
      data: {
        facilityId,
        encounterId: encounter.id,
        patientId: encounter.patientId,
        eventType: EncounterClinicalEventType.PROCEDURE_DOCUMENTED,
        payloadJson: payloadJson as unknown as Prisma.InputJsonValue,
        createdByUserId: userId,
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

    return { duplicateBlocked: false, captureItemId: item.id };
  }
}

