import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  buildChartCertificationB1,
  enterpriseChartCertificationStageB1EnabledFromProcessEnv,
  isEdPhysicalDepartureCompleted,
  type ChartCertificationB1Context,
  type ChartCertificationB1Result,
  PROVIDER_DOCUMENTATION_NAMESPACE_KEY,
  ER_NURSING_REASSESSMENT_V1_KEY,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EncountersService } from "./encounters.service";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function namespaceHasContent(value: unknown): boolean {
  const obj = asObject(value);
  if (!obj) return false;
  return Object.values(obj).some((v) => {
    if (typeof v === "string") return v.trim().length > 0;
    if (v && typeof v === "object") return namespaceHasContent(v);
    return false;
  });
}

function nursingAssessmentPresent(raw: unknown): boolean {
  const o = asObject(raw);
  if (!o) return false;
  for (const key of ["nursingNote", "assessment", "note", "nursingAssessmentText"]) {
    if (hasNonEmptyString(o[key])) return true;
  }
  return namespaceHasContent(o.nursingEvalV1);
}

function physicianEvalSignals(nursingAssessment: unknown): {
  hasHistory: boolean;
  hasExam: boolean;
  hasMdm: boolean;
  supervisingRequired: boolean;
  supervisingPresent: boolean;
} {
  const nursing = asObject(nursingAssessment);
  const pe = asObject(nursing?.physicianEvalV1);
  const mse = asObject(nursing?.[PROVIDER_DOCUMENTATION_NAMESPACE_KEY]);
  const src = pe ?? mse;
  if (!src) {
    return {
      hasHistory: false,
      hasExam: false,
      hasMdm: false,
      supervisingRequired: false,
      supervisingPresent: false,
    };
  }
  const hasHistory = ["hpi", "history", "chiefComplaintNarrative", "historyOfPresentIllness"].some(
    (k) => hasNonEmptyString(src[k])
  );
  const hasExam = ["physicalExam", "exam", "physicalExamination", "examFindings"].some((k) =>
    hasNonEmptyString(src[k])
  );
  const hasMdm = [
    "mdm",
    "mdmWorkingAssessment",
    "mdmClinicalRationale",
    "mdmPlanSummary",
    "assessmentAndPlan",
  ].some((k) => hasNonEmptyString(src[k]));
  const supervisingRequired = src.supervisingAttestationRequired === true;
  const supervisingPresent =
    src.supervisingAttestationPresent === true || hasNonEmptyString(src.supervisingAttestationText);
  return { hasHistory, hasExam, hasMdm, supervisingRequired, supervisingPresent };
}

function ageYearsFromDob(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const ms = Date.now() - dob.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}

@Injectable()
export class ChartCertificationB1Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encountersService: EncountersService
  ) {}

  isEnabled(): boolean {
    return enterpriseChartCertificationStageB1EnabledFromProcessEnv(process.env);
  }

  async getChartCertification(
    facilityId: string,
    encounterId: string,
    opts?: { encounterVersion?: number }
  ): Promise<ChartCertificationB1Result> {
    const loadVersion = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true, version: true },
    });
    if (!loadVersion) {
      throw new NotFoundException("Encounter not found");
    }

    if (
      opts?.encounterVersion != null &&
      Number.isFinite(opts.encounterVersion) &&
      opts.encounterVersion !== loadVersion.version
    ) {
      const stale = await this.evaluate(facilityId, encounterId);
      return {
        ...stale,
        coverageStatus: "ERROR",
        evaluationErrors: [
          ...stale.evaluationErrors,
          {
            code: "STALE_ENCOUNTER_VERSION",
            messageKey: "edLifecycle.certification.b1.errors.staleEncounterVersion",
            details: `requested=${opts.encounterVersion};current=${loadVersion.version}`,
          },
        ],
        evaluatedReadiness: {
          registrationReady: null,
          triageReady: null,
          nursingReady: null,
          providerReady: null,
          dispositionDocumentationReady: null,
        },
        authoritativeReadiness: {
          ...stale.authoritativeReadiness,
          clinicalClosureReady: null,
          dispositionReady: null,
          sourceStatus: "ERROR",
        },
      };
    }

    const result = await this.evaluate(facilityId, encounterId);

    const recheck = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { version: true },
    });
    if (!recheck) {
      throw new NotFoundException("Encounter not found");
    }
    if (recheck.version !== result.encounterVersion) {
      // Single bounded retry
      const retried = await this.evaluate(facilityId, encounterId);
      const finalCheck = await this.prisma.encounter.findFirst({
        where: { id: encounterId, facilityId },
        select: { version: true },
      });
      if (!finalCheck || finalCheck.version !== retried.encounterVersion) {
        return {
          ...retried,
          coverageStatus: "ERROR",
          evaluationErrors: [
            ...retried.evaluationErrors,
            {
              code: "STALE_EVALUATION",
              messageKey: "edLifecycle.certification.b1.errors.staleEvaluation",
            },
          ],
          evaluatedReadiness: {
            registrationReady: null,
            triageReady: null,
            nursingReady: null,
            providerReady: null,
            dispositionDocumentationReady: null,
          },
          authoritativeReadiness: {
            ...retried.authoritativeReadiness,
            clinicalClosureReady: null,
            dispositionReady: null,
            sourceStatus: "ERROR",
          },
        };
      }
      return retried;
    }

    return result;
  }

  private async evaluate(
    facilityId: string,
    encounterId: string
  ): Promise<ChartCertificationB1Result> {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        facilityId: true,
        version: true,
        status: true,
        workflowState: true,
        type: true,
        createdAt: true,
        dischargedAt: true,
        dischargeStatus: true,
        disposition: true,
        chiefComplaint: true,
        providerDocumentationStatus: true,
        providerDocumentationSignedAt: true,
        providerDocumentationSignedByUserId: true,
        providerNote: true,
        treatmentPlan: true,
        physicianAssignedUserId: true,
        nurseAssignedUserId: true,
        roomLabel: true,
        billingFinalizationStatus: true,
        billingReadinessSnapshotJson: true,
        dischargeSummaryJson: true,
        admissionSummaryJson: true,
        nursingAssessment: true,
        patient: {
          select: {
            dob: true,
            sexAtBirth: true,
            mrn: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        triage: {
          select: {
            id: true,
            triageCompleteAt: true,
            esi: true,
            chiefComplaint: true,
            vitalsJson: true,
            strokeScreen: true,
            sepsisScreen: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            diagnoses: true,
            clinicalDocumentationEntries: { where: { voidedAt: null } },
            encounterNotes: { where: { voidedAt: null } },
          },
        },
      },
    });

    if (!encounter) {
      throw new NotFoundException("Encounter not found");
    }
    if (encounter.facilityId !== facilityId) {
      throw new ForbiddenException("Facility scope violation");
    }

    let dispositionCanClose: boolean | null = null;
    let dispositionBlockers: Array<{ code: string; message: string }> = [];
    let dispositionLoadError = false;
    try {
      const readiness = await this.encountersService.getDispositionSafetyReadiness(
        facilityId,
        encounterId,
        undefined
      );
      dispositionCanClose = readiness.canClose === true;
      dispositionBlockers = (readiness.blockers ?? []).map((b) => ({
        code: String(b.code),
        message: String(b.message ?? b.code),
      }));
    } catch {
      dispositionLoadError = true;
    }

    const activeVitalsReadingCount = encounter.triage
      ? await this.prisma.triageVitalsReading.count({
          where: {
            encounterId,
            facilityId,
            triageId: encounter.triage.id,
            status: "ACTIVE",
          },
        })
      : 0;

    const billingSnapshot =
      encounter.billingReadinessSnapshotJson &&
      typeof encounter.billingReadinessSnapshotJson === "object" &&
      !Array.isArray(encounter.billingReadinessSnapshotJson)
        ? (encounter.billingReadinessSnapshotJson as { isReady?: boolean; requiresManualReview?: boolean })
        : null;

    const signals = physicianEvalSignals(encounter.nursingAssessment);
    const providerNotePresent = Boolean((encounter.providerNote ?? "").trim());
    const treatmentPlanPresent = Boolean((encounter.treatmentPlan ?? "").trim());
    const contentPresent =
      providerNotePresent || treatmentPlanPresent || signals.hasHistory || signals.hasExam || signals.hasMdm;

    const physicalDepartureComplete = isEdPhysicalDepartureCompleted({
      dischargeSummaryJson: encounter.dischargeSummaryJson,
      admissionSummaryJson: encounter.admissionSummaryJson,
      nursingAssessment: encounter.nursingAssessment,
    });

    const nursing = asObject(encounter.nursingAssessment);
    const registrationExceptions = asObject(nursing?.registrationExceptions);
    const demographicExceptionRaw = registrationExceptions?.demographicException;
    const demographicException =
      demographicExceptionRaw === "UNKNOWN" || demographicExceptionRaw === "UNABLE_TO_PROVIDE"
        ? demographicExceptionRaw
        : null;

    const context: ChartCertificationB1Context = {
      encounterId: encounter.id,
      facilityId: encounter.facilityId,
      encounterVersion: encounter.version,
      evaluatedAt: new Date().toISOString(),
      encounter: {
        status: encounter.status,
        workflowState: encounter.workflowState,
        type: encounter.type,
        createdAt: encounter.createdAt?.toISOString() ?? null,
        dischargedAt: encounter.dischargedAt?.toISOString() ?? null,
        dischargeStatus: encounter.dischargeStatus,
        disposition: encounter.disposition,
        chiefComplaint: encounter.chiefComplaint,
        providerDocumentationStatus: encounter.providerDocumentationStatus,
        providerDocumentationSignedAt:
          encounter.providerDocumentationSignedAt?.toISOString() ?? null,
        providerDocumentationSignedByUserId: encounter.providerDocumentationSignedByUserId,
        providerNotePresent,
        treatmentPlanPresent,
        physicianAssignedUserId: encounter.physicianAssignedUserId,
        nurseAssignedUserId: encounter.nurseAssignedUserId,
        roomLabel: encounter.roomLabel,
        billingFinalizationStatus: encounter.billingFinalizationStatus,
        billingReadinessSnapshot: billingSnapshot,
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        admissionSummaryJson: encounter.admissionSummaryJson,
        nursingAssessment: encounter.nursingAssessment,
      },
      patient: {
        dob: encounter.patient?.dob?.toISOString() ?? null,
        sexAtBirth: encounter.patient?.sexAtBirth ?? null,
        mrn: encounter.patient?.mrn ?? null,
        phone: encounter.patient?.phone ?? null,
        firstNamePresent: Boolean((encounter.patient?.firstName ?? "").trim()),
        lastNamePresent: Boolean((encounter.patient?.lastName ?? "").trim()),
        ageYears: ageYearsFromDob(encounter.patient?.dob),
        demographicException,
      },
      triage: encounter.triage
        ? {
            present: true,
            triageCompleteAt: encounter.triage.triageCompleteAt?.toISOString() ?? null,
            esi: encounter.triage.esi,
            chiefComplaint: encounter.triage.chiefComplaint,
            vitalsPresent: namespaceHasContent(encounter.triage.vitalsJson),
            activeVitalsReadingCount,
            strokeScreenPresent: namespaceHasContent(encounter.triage.strokeScreen),
            sepsisScreenPresent: namespaceHasContent(encounter.triage.sepsisScreen),
            updatedAt: encounter.triage.updatedAt?.toISOString() ?? null,
          }
        : {
            present: false,
            triageCompleteAt: null,
            esi: null,
            chiefComplaint: null,
            vitalsPresent: false,
            activeVitalsReadingCount: 0,
            strokeScreenPresent: false,
            sepsisScreenPresent: false,
            updatedAt: null,
          },
      nursing: {
        assessmentPresent: nursingAssessmentPresent(encounter.nursingAssessment),
        reassessmentPresent: namespaceHasContent(nursing?.[ER_NURSING_REASSESSMENT_V1_KEY]),
        clinicalDocActiveCount: encounter._count.clinicalDocumentationEntries,
        noteActiveCount: encounter._count.encounterNotes,
      },
      provider: {
        signed: (encounter.providerDocumentationStatus ?? "").trim() === "SIGNED",
        contentPresent,
        hasMdm: signals.hasMdm || treatmentPlanPresent,
        hasPhysicalExamSignal: signals.hasExam || providerNotePresent,
        hasHistorySignal: signals.hasHistory || providerNotePresent,
        diagnosisCount: encounter._count.diagnoses,
        supervisingAttestationRequired: signals.supervisingRequired,
        supervisingAttestationPresent: signals.supervisingPresent,
      },
      established: {
        dispositionCanClose,
        dispositionBlockers,
        dispositionLoadError,
        physicalDepartureComplete,
        closeCheckLoadError: false,
      },
    };

    return buildChartCertificationB1(context);
  }
}
