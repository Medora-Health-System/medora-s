/**
 * D4A.2.6B — Clinical Synthesis Service.
 * Reusable read-model projection over authoritative enterprise domains.
 * Does not write orders, diagnoses, acknowledgements, or signed notes.
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EncounterType } from "@prisma/client";
import {
  PROVIDER_CLINICAL_SYNTHESIS_CERTIFICATION_ID,
  PROVIDER_LEGAL_RECORD_SYNTHESIS_CERTIFICATION_ID,
  emptyInpatientProviderWorkspaceV1,
  readInpatientProviderWorkspace,
  readInpatientClinicalOpsFromAdmissionSummary,
  readMedSurgNursingAdmissionFromSummary,
  resolveAuthoritativeCodeStatus,
  resolveAuthoritativeIsolation,
  computeProviderHospitalDay,
  computeProviderLosHours,
  projectProviderVitals,
  projectIntakeOutputSynthesis,
  projectLabLines,
  projectRadiologyStudies,
  projectMedicationSnapshot,
  projectDischargeReadiness,
  attachWorkspaceSlices,
  emptyProviderClinicalSynthesis,
  resolveEncounterCanonicalBedKey,
  parseCanonicalBedKey,
  resolveClinicianIdentity,
  PROVIDER_CENSUS_UNSUPPORTED_FACETS,
  providerCensusFacetSupport,
  filterProviderCensusRows,
  sortProviderCensusRows,
  type ProviderCensusFilter,
  type ProviderCensusSort,
  type HospitalCensusPatientRow,
  type CommandCenterSynthesisLiteV1,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ClinicalSynthesisService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * D4A.2.6B — Reusable encounter synthesis (read-only).
   * Provider Workspace and Command Center both consume this service.
   */
  async buildProviderProjection(
    facilityId: string,
    encounterId: string,
    query?: { audience?: string; include?: string[] }
  ) {
    void query;

    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        facilityId: true,
        patientId: true,
        type: true,
        status: true,
        admittedAt: true,
        roomLabel: true,
        physicianAssignedUserId: true,
        admissionSummaryJson: true,
        chiefComplaint: true,
        physicianAssigned: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    if (enc.type !== EncounterType.INPATIENT) {
      throw new BadRequestException("Provider synthesis requires an Inpatient encounter");
    }

    const ops = readInpatientClinicalOpsFromAdmissionSummary(enc.admissionSummaryJson);
    const workspace =
      readInpatientProviderWorkspace(enc.admissionSummaryJson) ??
      emptyInpatientProviderWorkspaceV1();
    const nowIso = new Date().toISOString();
    const careTeamUserIds = [
      ...new Set(
        (ops.careTeamHistory ?? [])
          .filter((c) => !c.endAt)
          .map((c) => c.assigneeUserId)
          .filter(Boolean)
      ),
    ];
    const careTeamUsers =
      careTeamUserIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: careTeamUserIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const careTeamById = Object.fromEntries(careTeamUsers.map((u) => [u.id, u]));

    const [vitalsRows, ioEntries, orders, diagnoses] = await Promise.all([
      this.prisma.triageVitalsReading.findMany({
        where: { facilityId, encounterId: enc.id, status: "ACTIVE" },
        orderBy: [{ measuredAt: "desc" }, { recordedAt: "desc" }],
        take: 48,
        select: { measuredAt: true, vitalsJson: true },
      }),
      this.prisma.encounterClinicalDocumentationEntry.findMany({
        where: {
          facilityId,
          encounterId: enc.id,
          voidedAt: null,
          OR: [
            { cardId: { contains: "intake" } },
            { cardId: { contains: "output" } },
            { cardId: { contains: "io-" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { cardId: true, createdAt: true, voidedAt: true, payloadJson: true },
      }),
      this.prisma.order.findMany({
        where: { facilityId, encounterId: enc.id, cancelledAt: null },
        orderBy: { createdAt: "desc" },
        take: 120,
        select: {
          id: true,
          type: true,
          status: true,
          orderedBy: true,
          prescriberName: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              catalogItemType: true,
              manualLabel: true,
              status: true,
              route: true,
              strength: true,
              notes: true,
              createdAt: true,
              completedAt: true,
              medicationLifecycleStatus: true,
              result: {
                select: {
                  resultText: true,
                  resultData: true,
                  criticalValue: true,
                  acknowledgedByProviderAt: true,
                  verifiedAt: true,
                  updatedAt: true,
                  verifiedByUserId: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.diagnosis.findMany({
        where: {
          facilityId,
          encounterId: enc.id,
          status: "ACTIVE",
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 20,
        select: {
          id: true,
          code: true,
          description: true,
          sortOrder: true,
          status: true,
        },
      }),
    ]);

    const vitals = projectProviderVitals({
      readings: vitalsRows.map((r) => ({
        measuredAt: r.measuredAt.toISOString(),
        vitals:
          r.vitalsJson && typeof r.vitalsJson === "object" && !Array.isArray(r.vitalsJson)
            ? (r.vitalsJson as Record<string, unknown>)
            : {},
      })),
      nowIso,
    });

    const intakeOutput = projectIntakeOutputSynthesis({
      nowIso,
      entries: ioEntries.map((e) => ({
        cardId: e.cardId,
        createdAt: e.createdAt.toISOString(),
        voidedAt: e.voidedAt ? e.voidedAt.toISOString() : null,
        payloadJson: e.payloadJson,
      })),
    });

    const labItems: Array<{
      orderItemId: string;
      orderId: string;
      label: string;
      status: string;
      resultText?: string | null;
      criticalValue?: boolean;
      acknowledgedByProviderAt?: string | null;
      resultUpdatedAt?: string | null;
    }> = [];
    const radItems: Array<{
      orderItemId: string;
      orderId: string;
      label: string;
      status: string;
      impression?: string | null;
      radiologist?: string | null;
      timestamp?: string | null;
      criticalValue?: boolean;
      acknowledgedByProviderAt?: string | null;
    }> = [];
    const medItems: Array<{
      orderItemId: string;
      orderId: string;
      label: string;
      dose?: string | null;
      route?: string | null;
      frequency?: string | null;
      start?: string | null;
      stop?: string | null;
      indication?: string | null;
      responsibleProvider?: string | null;
      held?: boolean;
      recentlyChanged?: boolean;
    }> = [];

    for (const order of orders) {
      for (const item of order.items) {
        const label = item.manualLabel?.trim() || item.catalogItemType;
        const cat = String(item.catalogItemType ?? order.type ?? "").toUpperCase();
        if (cat.includes("LAB")) {
          labItems.push({
            orderItemId: item.id,
            orderId: order.id,
            label,
            status: String(item.status ?? order.status),
            resultText: item.result?.resultText ?? null,
            criticalValue: item.result?.criticalValue ?? false,
            acknowledgedByProviderAt: item.result?.acknowledgedByProviderAt
              ? item.result.acknowledgedByProviderAt.toISOString()
              : null,
            resultUpdatedAt: item.result?.updatedAt
              ? item.result.updatedAt.toISOString()
              : null,
          });
        } else if (cat.includes("IMAGING") || cat.includes("RAD")) {
          const resultData =
            item.result?.resultData &&
            typeof item.result.resultData === "object" &&
            !Array.isArray(item.result.resultData)
              ? (item.result.resultData as Record<string, unknown>)
              : {};
          radItems.push({
            orderItemId: item.id,
            orderId: order.id,
            label,
            status: String(item.status ?? order.status),
            impression:
              item.result?.resultText?.trim() ||
              (typeof resultData.impression === "string" ? resultData.impression : null),
            radiologist:
              typeof resultData.radiologist === "string" ? resultData.radiologist : null,
            timestamp: item.result?.verifiedAt
              ? item.result.verifiedAt.toISOString()
              : item.result?.updatedAt
                ? item.result.updatedAt.toISOString()
                : null,
            criticalValue: item.result?.criticalValue ?? false,
            acknowledgedByProviderAt: item.result?.acknowledgedByProviderAt
              ? item.result.acknowledgedByProviderAt.toISOString()
              : null,
          });
        } else if (cat.includes("MED")) {
          const held =
            String(item.medicationLifecycleStatus ?? "").toUpperCase() === "HOLD" ||
            /HOLD|HELD|CANCEL/i.test(String(item.status));
          medItems.push({
            orderItemId: item.id,
            orderId: order.id,
            label,
            dose: item.strength ?? null,
            route: item.route ?? null,
            frequency: item.notes ?? null,
            start: item.createdAt.toISOString(),
            stop: item.completedAt ? item.completedAt.toISOString() : null,
            indication: item.notes ?? null,
            responsibleProvider: order.prescriberName ?? order.orderedBy ?? null,
            held,
            recentlyChanged:
              Date.now() - item.createdAt.getTime() < 24 * 60 * 60 * 1000 || held,
          });
        }
      }
    }

    // Seed critical-result inbox events when unacknowledged critical labs/imaging exist.
    const criticalUnacked = [...labItems, ...radItems].filter(
      (x) => x.criticalValue && !x.acknowledgedByProviderAt
    );
    let events = [...(workspace.events ?? [])];
    for (const c of criticalUnacked.slice(0, 10)) {
      const eventId = `crit-${c.orderItemId}`;
      if (events.some((e) => e.eventId === eventId)) continue;
      const occurredAt =
        "resultUpdatedAt" in c && c.resultUpdatedAt
          ? c.resultUpdatedAt
          : "timestamp" in c && c.timestamp
            ? c.timestamp
            : nowIso;
      events.push({
        eventId,
        type: "CRITICAL_RESULT",
        severity: "CRITICAL",
        summary: `Critical result — ${c.label}`,
        source: "ENTERPRISE_RESULTS",
        occurredAt,
        status: "NEW",
        relatedObjectId: c.orderItemId,
      });
    }
    for (const consult of ops.consults ?? []) {
      if (consult.status !== "COMPLETED") continue;
      const eventId = `consult-done-${consult.consultId}`;
      if (events.some((e) => e.eventId === eventId)) continue;
      events.push({
        eventId,
        type: "CONSULT_COMPLETED",
        severity: "INFO",
        summary: `Consult completed — ${consult.specialty}`,
        source: "CLINICAL_OPS",
        occurredAt: consult.completedAt ?? consult.requestedAt,
        status: "NEW",
        relatedObjectId: consult.consultId,
      });
    }

    const code = resolveAuthoritativeCodeStatus(ops);
    const isolation = resolveAuthoritativeIsolation(ops);
    const dxLabel = (d: { code: string; description: string | null }) =>
      d.description?.trim() || d.code;
    const primaryDx =
      (diagnoses[0] ? dxLabel(diagnoses[0]) : null) ??
      workspace.problemPlans.find((p) => p.priority === "PRIMARY")?.displayLabel ??
      null;
    const secondary = [
      ...diagnoses.slice(1).map(dxLabel).filter(Boolean),
      ...workspace.problemPlans
        .filter((p) => p.priority !== "PRIMARY")
        .map((p) => p.displayLabel),
    ].slice(0, 12);

    const careTeam = ops.careTeamHistory ?? [];
    const resident =
      careTeam.find((c) => /RESIDENT/i.test(c.role) && !c.endAt)?.assigneeUserId ?? null;
    const app =
      careTeam.find((c) => /APP|NP|PA/i.test(c.role) && !c.endAt)?.assigneeUserId ?? null;

    const admissionPainRef = (() => {
      const nursing = readMedSurgNursingAdmissionFromSummary(enc.admissionSummaryJson);
      const sections = nursing?.sections ?? {};
      for (const section of Object.values(sections)) {
        if (!section) continue;
        const answers = section.answers;
        if (!answers || typeof answers !== "object") continue;
        const a = answers as Record<string, unknown>;
        const score = a.painScore ?? a.painIntensity ?? a.score ?? a.PAIN_SCORE;
        if (score != null && String(score).trim()) return String(score);
      }
      return null;
    })();
    const currentPainVital = vitals.find((v) => v.key === "PAIN")?.current ?? null;
    const providerPainAssessment =
      workspace.problemPlans.find((p) => /pain/i.test(p.displayLabel))?.assessment ?? null;

    let synthesis = emptyProviderClinicalSynthesis({
      encounterId: enc.id,
      patientId: enc.patientId,
      facilityId,
      expectedVersion: workspace.expectedVersion,
      atIso: nowIso,
    });

    synthesis = {
      ...synthesis,
      overview: {
        hospitalDay: computeProviderHospitalDay(enc.admittedAt?.toISOString() ?? null, nowIso),
        currentStatus: String(enc.status),
        codeStatus: code.documented ? code.value : null,
        isolation: isolation.documented ? isolation.value : null,
        attending: resolveClinicianIdentity({
          userId: enc.physicianAssignedUserId,
          firstName: enc.physicianAssigned?.firstName,
          lastName: enc.physicianAssigned?.lastName,
          relationship: "ATTENDING",
        }).displayName,
        consultServices: (ops.consults ?? [])
          .filter((c) => c.status !== "CANCELLED" && c.status !== "DECLINED")
          .map((c) => c.specialty),
        primaryDiagnosis: primaryDx,
        secondaryProblems: secondary,
        currentBed: (() => {
          const key = resolveEncounterCanonicalBedKey({
            roomLabel: enc.roomLabel,
            type: enc.type,
            admissionSummaryJson: enc.admissionSummaryJson,
          });
          return key ?? enc.roomLabel ?? null;
        })(),
        currentUnit: (() => {
          const key = resolveEncounterCanonicalBedKey({
            roomLabel: enc.roomLabel,
            type: enc.type,
            admissionSummaryJson: enc.admissionSummaryJson,
          });
          if (!key) return null;
          return parseCanonicalBedKey(key)?.unit ?? null;
        })(),
        admissionDate: enc.admittedAt?.toISOString() ?? null,
        lengthOfStayHours: computeProviderLosHours(enc.admittedAt?.toISOString() ?? null, nowIso),
        estimatedDischarge: ops.dischargePlanning?.anticipatedDischargeDate ?? null,
        provider: resolveClinicianIdentity({
          userId: enc.physicianAssignedUserId,
          firstName: enc.physicianAssigned?.firstName,
          lastName: enc.physicianAssigned?.lastName,
          relationship: "ATTENDING",
        }).displayName,
        resident: (() => {
          const u = resident ? careTeamById[resident] : null;
          return resolveClinicianIdentity({
            userId: resident,
            firstName: u?.firstName,
            lastName: u?.lastName,
            relationship: "RESIDENT",
          }).displayName;
        })(),
        app: (() => {
          const u = app ? careTeamById[app] : null;
          return resolveClinicianIdentity({
            userId: app,
            firstName: u?.firstName,
            lastName: u?.lastName,
            relationship: "APP",
          }).displayName;
        })(),
      },
      vitals,
      intakeOutput,
      laboratories: projectLabLines({ items: labItems }),
      radiology: projectRadiologyStudies({ items: radItems }),
      medications: projectMedicationSnapshot({ items: medItems }),
      dischargeReadiness: projectDischargeReadiness({
        workflowState: ops.dischargePlanning?.workflowState ?? null,
        estimatedDischargeDate: ops.dischargePlanning?.anticipatedDischargeDate ?? null,
        destination: ops.dischargePlanning?.destination ?? null,
        barriersText: ops.dischargePlanning?.barriers ?? null,
        pendingConsultCount: (ops.consults ?? []).filter(
          (c) => c.status === "REQUESTED" || c.status === "IN_PROGRESS" || c.status === "ACKNOWLEDGED"
        ).length,
        pendingPt: /PT|PHYSIOTHERAPY/i.test(String(ops.dischargePlanning?.barriers ?? "")),
        pendingOt: /OT|OCCUPATIONAL/i.test(String(ops.dischargePlanning?.barriers ?? "")),
        medReconIncomplete: (ops.medicationReconciliation?.length ?? 0) === 0,
        hpUnsigned: workspace.hpDraft?.status !== "SIGNED",
      }),
      currentVsAdmission: {
        admissionPain: admissionPainRef,
        currentPain: currentPainVital,
        providerAssessment: providerPainAssessment,
        conceptsSeparated: true,
      },
    };

    // Attach workspace slices (problems/events/tasks) — events enriched above.
    const workspaceForAttach = { ...workspace, events };
    synthesis = attachWorkspaceSlices(synthesis, workspaceForAttach);

    // D4A.2.6B — synthesis is read-only; derived inbox events are projected in-memory only.

    return {
      certification: PROVIDER_CLINICAL_SYNTHESIS_CERTIFICATION_ID,
      synthesis,
      boundary: {
        synthesisNotDomainEngine: true,
        reusesOrdersResultsMarTimeline: true,
        neverAutoAcknowledge: true,
        currentVsAdmissionSeparated: true,
      },
    };
  }


  /** Command-center adapter — reuses the same service, no duplicated domain queries in UI. */
  async buildCommandCenterProjection(
    facilityId: string,
    encounterId: string
  ): Promise<CommandCenterSynthesisLiteV1> {
    const full = await this.buildProviderProjection(facilityId, encounterId, {
      audience: "HOSPITAL_COMMAND_CENTER",
    });
    const s = full.synthesis;
    return {
      certification: PROVIDER_LEGAL_RECORD_SYNTHESIS_CERTIFICATION_ID,
      encounterId: s.encounterId,
      patientId: s.patientId,
      status: s.overview.currentStatus,
      levelOfCare: s.overview.currentUnit,
      lengthOfStayHours: s.overview.lengthOfStayHours,
      dischargeReadiness: {
        medicalReady: s.dischargeReadiness.medicalReady,
        workflowState: s.dischargeReadiness.workflowState,
        barrierCount: s.dischargeReadiness.barriers.length,
      },
      criticalUnacknowledgedCount:
        s.laboratories.critical.filter((c) => !c.acknowledgedByProvider).length +
        s.radiology.critical.filter((c) => !c.acknowledgedByProvider).length,
      pendingConsultCount: s.overview.consultServices.length,
      pendingImagingCount: s.radiology.pending.length + s.radiology.inProgress.length,
      attendingDisplayName: s.overview.attending,
      generatedAt: s.generatedAt,
      reusedClinicalSynthesisService: true,
    };
  }

  /** Authoritative provider census facet report + client-safe filter (unsupported disclosed). */
  describeCensusFacets() {
    return {
      certification: PROVIDER_LEGAL_RECORD_SYNTHESIS_CERTIFICATION_ID,
      supported: (["attending","facility","unit","room","observation","medSurg","lengthOfStay","pendingConsult","dischargeReady","unsignedHp","unsignedProgressNote","criticalUnacknowledgedResult"] as const),
      unsupported: PROVIDER_CENSUS_UNSUPPORTED_FACETS,
      facetSupport: Object.fromEntries(
        [
          ...(["attending","facility","unit","room","observation","medSurg","lengthOfStay","pendingConsult","dischargeReady","unsignedHp","unsignedProgressNote","criticalUnacknowledgedResult"] as const).map(
            (f) => [f, providerCensusFacetSupport(f)]
          ),
          ...PROVIDER_CENSUS_UNSUPPORTED_FACETS.map((f: string) => [f, "UNSUPPORTED" as const]),
        ]
      ),
    };
  }

  filterCensusRows(
    rows: HospitalCensusPatientRow[],
    filter: ProviderCensusFilter,
    sort: ProviderCensusSort,
    unsupportedRequested: string[]
  ) {
    return {
      certification: PROVIDER_LEGAL_RECORD_SYNTHESIS_CERTIFICATION_ID,
      unsupportedRequested: unsupportedRequested.filter(
        (f) => providerCensusFacetSupport(f as any) === "UNSUPPORTED"
      ),
      rows: sortProviderCensusRows(filterProviderCensusRows(rows, filter), sort),
    };
  }
}
