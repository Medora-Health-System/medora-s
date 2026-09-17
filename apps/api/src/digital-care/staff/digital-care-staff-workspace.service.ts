import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { AuditAction, Prisma } from "@prisma/client";
import { AuditService } from "../../common/services/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { isOptionalPortalStorageError } from "../../patient-portal/portal-storage.util";
import type { DiagnosticResultStaffActor } from "../../patient-portal/records/patient-diagnostic-result-release.service";
import { PatientDiagnosticResultReleaseService } from "../../patient-portal/records/patient-diagnostic-result-release.service";
import { FacilityConfigurationService } from "../../facility-configuration/facility-configuration.service";
import { projectFacilityRuntimeConfiguration } from "@medora/shared";
import {
  digitalCareAgeYears,
  digitalCareImagingReport,
  digitalCareLooksLikeUuid,
  digitalCareMedicationBucket,
  digitalCareParseResultRows,
  digitalCareParseSearchDate,
  digitalCarePatientDisplayName,
  digitalCareSearchHaystack,
  digitalCareVisitType,
} from "./digital-care-staff-workspace.util";

const DIGITAL_CARE_AUDIT_TYPES = [
  "PATIENT_DIAGNOSTIC_RESULT_RELEASE",
  "PATIENT_PORTAL_MESSAGE",
  "PATIENT_PORTAL_MESSAGE_THREAD",
  "PATIENT_PORTAL_MESSAGE_THREAD_LIST",
  "DIGITAL_CARE_WORKSPACE",
  "DIGITAL_CARE_ROSTER",
];

@Injectable()
export class DigitalCareStaffWorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly releases: PatientDiagnosticResultReleaseService,
    @Optional() private readonly facilityConfiguration?: FacilityConfigurationService,
  ) {}

  async roster(actor: DiagnosticResultStaffActor, query?: { q?: string; limit?: number; offset?: number }) {
    const configuration = this.facilityConfiguration
      ? await this.facilityConfiguration.assertStaffDigitalCare(actor.facilityId).then((settings) =>
          projectFacilityRuntimeConfiguration(actor.facilityId, settings),
        )
      : null;
    const limit = Math.min(Math.max(query?.limit ?? 40, 1), 80);
    const offset = Math.max(query?.offset ?? 0, 0);
    const needle = (query?.q ?? "").trim().toLowerCase();
    if (digitalCareLooksLikeUuid(needle)) {
      return { patients: [], total: 0, offset, limit, configuration, messagingStorageAvailable: true };
    }

    const [resultOrders, recentEncounters, encounterPatients, threadPatients] = await Promise.all([
      this.prisma.order.findMany({
        where: { facilityId: actor.facilityId, cancelledAt: null },
        select: { patientId: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      this.prisma.encounter.findMany({
        where: { facilityId: actor.facilityId, status: { in: ["OPEN", "CLOSED"] } },
        select: { patientId: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      this.prisma.patient.findMany({
        where: {
          facilityId: actor.facilityId,
          encounters: { some: { status: { in: ["OPEN", "CLOSED"] } } },
        },
        select: { id: true },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
      this.optionalPortalQuery(
        () =>
          this.prisma.$queryRaw<Array<{ patientId: string }>>(Prisma.sql`
            SELECT DISTINCT "patientId" FROM "PatientPortalMessageThread"
            WHERE "facilityId" = ${actor.facilityId}
            ORDER BY "patientId"
            LIMIT 200
          `),
        [] as Array<{ patientId: string }>,
      ),
    ]);

    const idSet = new Set<string>();
    for (const row of resultOrders) idSet.add(row.patientId);
    for (const row of recentEncounters) idSet.add(row.patientId);
    for (const row of encounterPatients) idSet.add(row.id);
    for (const row of threadPatients.value) idSet.add(row.patientId);
    const messagingStorageAvailable = threadPatients.available;

    if (needle) {
      const dob = digitalCareParseSearchDate(needle);
      const searched = await this.prisma.patient.findMany({
        where: {
          facilityId: actor.facilityId,
          OR: [
            { firstName: { contains: needle, mode: "insensitive" } },
            { lastName: { contains: needle, mode: "insensitive" } },
            { mrn: { contains: needle, mode: "insensitive" } },
            { phone: { contains: needle, mode: "insensitive" } },
            { email: { contains: needle, mode: "insensitive" } },
            ...(dob ? [{ dob: { gte: dob, lt: new Date(dob.getTime() + 24 * 60 * 60 * 1000) } }] : []),
          ],
        },
        select: { id: true },
        take: 40,
      });
      for (const row of searched) idSet.add(row.id);
    }

    const patientIds = [...idSet].slice(0, 200);
    if (patientIds.length === 0) {
      await this.audit.log(AuditAction.VIEW, "DIGITAL_CARE_ROSTER", {
        userId: actor.userId,
        facilityId: actor.facilityId,
        metadata: { count: 0 },
      });
      return { patients: [], total: 0, offset, limit, configuration, messagingStorageAvailable };
    }

    const [patients, encounters, portalRows, unreadRows] = await Promise.all([
      this.prisma.patient.findMany({
        where: { facilityId: actor.facilityId, id: { in: patientIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          mrn: true,
          dob: true,
          sex: true,
          sexAtBirth: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          country: true,
        },
      }),
      this.prisma.encounter.findMany({
        where: { facilityId: actor.facilityId, patientId: { in: patientIds } },
        select: {
          id: true,
          patientId: true,
          type: true,
          status: true,
          createdAt: true,
          dischargedAt: true,
          roomLabel: true,
          billingClassification: true,
          physicianAssignedUserId: true,
          physicianAssigned: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.optionalPortalQuery(
        () =>
          this.prisma.$queryRaw<Array<{ patientId: string; status: string }>>(Prisma.sql`
            SELECT l."patientId", l."status"::text AS "status"
            FROM "PatientPortalLink" l
            WHERE l."facilityId" = ${actor.facilityId}
              AND l."patientId" IN (${Prisma.join(patientIds)})
              AND l."revokedAt" IS NULL
          `),
        [] as Array<{ patientId: string; status: string }>,
      ),
      this.optionalPortalQuery(
        () =>
          this.prisma.$queryRaw<Array<{ patientId: string; unread: number }>>(Prisma.sql`
            SELECT t."patientId", COUNT(*)::int AS unread
            FROM "PatientPortalMessageThread" t
            INNER JOIN "PatientPortalMessage" m ON m."threadId" = t."id"
            WHERE t."facilityId" = ${actor.facilityId}
              AND t."status" = 'OPEN'
              AND m."senderType" = 'PATIENT'
              AND m."createdAt" = (
                SELECT MAX(m2."createdAt") FROM "PatientPortalMessage" m2 WHERE m2."threadId" = t."id"
              )
            GROUP BY t."patientId"
          `),
        [] as Array<{ patientId: string; unread: number }>,
      ),
    ]);

    const latestEncounter = new Map<string, (typeof encounters)[number]>();
    for (const encounter of encounters) {
      if (!latestEncounter.has(encounter.patientId)) latestEncounter.set(encounter.patientId, encounter);
    }
    const portalByPatient = new Map(portalRows.value.map((row) => [row.patientId, row.status === "VERIFIED"]));
    const unreadByPatient = new Map(unreadRows.value.map((row) => [row.patientId, row.unread]));
    const portalMetadataAvailable = messagingStorageAvailable && portalRows.available && unreadRows.available;

    const mapped = patients.map((patient) => {
      const encounter = latestEncounter.get(patient.id) ?? null;
      const displayName = digitalCarePatientDisplayName(patient);
      const visitType = digitalCareVisitType(encounter?.type ?? null, encounter?.billingClassification ?? null);
      const haystack = digitalCareSearchHaystack({
        displayName,
        mrn: patient.mrn,
        phone: patient.phone,
        email: patient.email,
        dob: patient.dob,
        visitType,
        unit: encounter?.roomLabel,
      });
      return {
        id: patient.id,
        displayName: digitalCareLooksLikeUuid(displayName) ? "Patient" : displayName,
        mrn: patient.mrn ?? null,
        dob: patient.dob?.toISOString() ?? null,
        ageYears: digitalCareAgeYears(patient.dob),
        sex: patient.sexAtBirth ?? patient.sex,
        phone: patient.phone,
        email: patient.email,
        address: [patient.address, patient.city, patient.country].filter(Boolean).join(", ") || null,
        visitType,
        visitStatus: encounter?.status ?? null,
        arrivedAt: encounter?.createdAt?.toISOString() ?? null,
        dischargedAt: encounter?.dischargedAt?.toISOString() ?? null,
        unit: encounter?.roomLabel ?? null,
        attending: encounter?.physicianAssigned
          ? digitalCarePatientDisplayName(encounter.physicianAssigned)
          : null,
        encounterId: encounter?.id ?? null,
        portalActive: portalByPatient.get(patient.id) === true,
        unreadCount: unreadByPatient.get(patient.id) ?? 0,
        _haystack: haystack,
      };
    });

    const filtered = needle ? mapped.filter((row) => row._haystack.includes(needle)) : mapped;
    filtered.sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      return String(b.arrivedAt ?? "").localeCompare(String(a.arrivedAt ?? ""));
    });

    await this.audit.log(AuditAction.VIEW, "DIGITAL_CARE_ROSTER", {
      userId: actor.userId,
      facilityId: actor.facilityId,
      metadata: { count: filtered.length, qLength: needle.length, messagingStorageAvailable: portalMetadataAvailable },
    });

    return {
      patients: filtered.slice(offset, offset + limit).map(({ _haystack, ...row }) => row),
      total: filtered.length,
      offset,
      limit,
      configuration,
      messagingStorageAvailable: portalMetadataAvailable,
    };
  }

  async workspace(actor: DiagnosticResultStaffActor, patientId: string) {
    if (!digitalCareLooksLikeUuid(patientId)) {
      throw new BadRequestException("Patient identity is required");
    }
    const configuration = this.facilityConfiguration
      ? await this.facilityConfiguration.assertStaffDigitalCare(actor.facilityId).then((settings) =>
          projectFacilityRuntimeConfiguration(actor.facilityId, settings),
        )
      : null;
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId: actor.facilityId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        mrn: true,
        dob: true,
        sex: true,
        sexAtBirth: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        country: true,
        clinicalHistoryProfileJson: true,
      },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    const now = new Date();
    const [
      encounter,
      portalRows,
      unreadRows,
      results,
      threads,
      orders,
      carePlans,
      activity,
      followUps,
      diagnoses,
      insurance,
      appointments,
    ] = await Promise.all([
      this.prisma.encounter.findFirst({
        where: { facilityId: actor.facilityId, patientId },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          dischargedAt: true,
          dischargeSummaryJson: true,
          disposition: true,
          followUpDate: true,
          treatmentPlan: true,
          notes: true,
          providerNote: true,
          vitals: true,
          chiefComplaint: true,
          roomLabel: true,
          billingClassification: true,
          physicianAssigned: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.optionalPortalQuery(
        () =>
          this.prisma.$queryRaw<Array<{ status: string }>>(Prisma.sql`
            SELECT l."status"::text AS "status"
            FROM "PatientPortalLink" l
            WHERE l."facilityId" = ${actor.facilityId}
              AND l."patientId" = ${patientId}
              AND l."revokedAt" IS NULL
            LIMIT 1
          `),
        [] as Array<{ status: string }>,
      ),
      this.optionalPortalQuery(
        () =>
          this.prisma.$queryRaw<Array<{ unread: number }>>(Prisma.sql`
            SELECT COUNT(*)::int AS unread
            FROM "PatientPortalMessageThread" t
            INNER JOIN "PatientPortalMessage" m ON m."threadId" = t."id"
            WHERE t."facilityId" = ${actor.facilityId}
              AND t."patientId" = ${patientId}
              AND t."status" = 'OPEN'
              AND m."senderType" = 'PATIENT'
              AND m."createdAt" = (
                SELECT MAX(m2."createdAt") FROM "PatientPortalMessage" m2 WHERE m2."threadId" = t."id"
              )
          `),
        [] as Array<{ unread: number }>,
      ),
      this.optionalReleaseList(actor, patientId),
      this.optionalPortalQuery(
        () =>
          this.prisma.$queryRaw<
            Array<{
              id: string;
              subject: string;
              status: string;
              category: string;
              lastMessageAt: Date;
            }>
          >(Prisma.sql`
            SELECT "id", "subject", "status"::text AS "status", "category"::text AS "category", "lastMessageAt"
            FROM "PatientPortalMessageThread"
            WHERE "facilityId" = ${actor.facilityId} AND "patientId" = ${patientId}
            ORDER BY "lastMessageAt" DESC
            LIMIT 50
          `),
        [] as Array<{
          id: string;
          subject: string;
          status: string;
          category: string;
          lastMessageAt: Date;
        }>,
      ),
      this.prisma.order.findMany({
        where: { facilityId: actor.facilityId, patientId },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          cancelledAt: true,
          prescriberName: true,
          notes: true,
          encounter: { select: { type: true } },
          items: {
            select: {
              id: true,
              catalogItemType: true,
              manualLabel: true,
              strength: true,
              route: true,
              frequencyCode: true,
              notes: true,
              status: true,
              medicationLifecycleStatus: true,
              medicationFulfillmentIntent: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 120,
      }),
      this.prisma.encounterCarePlan.findMany({
        where: { facilityId: actor.facilityId, patientId, status: { in: ["ACTIVE", "COMPLETED"] } },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          activatedAt: true,
          components: {
            select: {
              id: true,
              title: true,
              text: true,
              status: true,
              componentType: true,
              targetOutcome: true,
              educationJson: true,
            },
            orderBy: { sequence: "asc" },
            take: 40,
          },
        },
        orderBy: { activatedAt: "desc" },
        take: 8,
      }),
      this.prisma.auditLog.findMany({
        where: {
          facilityId: actor.facilityId,
          patientId,
          entityType: { in: DIGITAL_CARE_AUDIT_TYPES },
        },
        select: { id: true, createdAt: true, action: true, entityType: true, metadata: true, userId: true },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      this.prisma.followUp.findMany({
        where: { facilityId: actor.facilityId, patientId },
        select: { id: true, dueDate: true, reason: true, notes: true, status: true },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      this.prisma.diagnosis.findMany({
        where: { facilityId: actor.facilityId, patientId, status: "ACTIVE" },
        select: { id: true, code: true, description: true },
        take: 12,
      }),
      this.prisma.patientInsuranceCoverage.findMany({
        where: { facilityId: actor.facilityId, patientId, isActive: true },
        select: { payerNameFreeText: true, planName: true, rank: true },
        orderBy: { rank: "asc" },
        take: 3,
      }),
      this.prisma.appointment.findMany({
        where: {
          facilityId: actor.facilityId,
          patientId,
          scheduledStartAt: { gte: now },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        select: { id: true, scheduledStartAt: true, reason: true, status: true },
        orderBy: { scheduledStartAt: "asc" },
        take: 5,
      }),
    ]);

    const displayName = digitalCareLooksLikeUuid(digitalCarePatientDisplayName(patient))
      ? "Patient"
      : digitalCarePatientDisplayName(patient);
    const identity = {
      id: patient.id,
      displayName,
      mrn: patient.mrn ?? null,
      dob: patient.dob?.toISOString() ?? null,
      ageYears: digitalCareAgeYears(patient.dob),
      sex: patient.sexAtBirth ?? patient.sex,
      phone: patient.phone,
      email: patient.email,
      address: [patient.address, patient.city, patient.country].filter(Boolean).join(", ") || null,
      visitType: digitalCareVisitType(encounter?.type ?? null, encounter?.billingClassification ?? null),
      visitStatus: encounter?.status ?? null,
      arrivedAt: encounter?.createdAt?.toISOString() ?? null,
      dischargedAt: encounter?.dischargedAt?.toISOString() ?? null,
      unit: encounter?.roomLabel ?? null,
      attending: encounter?.physicianAssigned ? digitalCarePatientDisplayName(encounter.physicianAssigned) : null,
      encounterId: encounter?.id ?? null,
      portalActive: portalRows.value[0]?.status === "VERIFIED",
      unreadCount: unreadRows.value[0]?.unread ?? 0,
      insurance: insurance
        .map((row) => row.payerNameFreeText || row.planName)
        .filter(Boolean)
        .join(" · ") || null,
    };

    const patientResults = results.value.map((result) => {
      const rows = digitalCareParseResultRows(result.resultData, result.resultText);
      const imaging = digitalCareImagingReport(result.resultData);
      const { resultData: _omit, ...rest } = result;
      return {
        ...rest,
        patientDisplayName: identity.displayName,
        patientMrn: identity.mrn,
        rows,
        imaging,
        category: result.kind === "LAB_TEST" ? "Lab" : result.kind === "IMAGING_STUDY" ? "Imaging" : "Other",
        collectedAt: result.collectedAt ?? result.clinicalAt,
        flag: result.criticalValue ? "CRITICAL" : rows.some((row) => row.flag && row.flag !== "NORMAL") ? "ABN" : "NORMAL",
      };
    });

    const history = patient.clinicalHistoryProfileJson as {
      homeMedications?: { medicationsSummary?: string; reconciled?: boolean };
    } | null;
    const homeSummary = history?.homeMedications?.medicationsSummary?.trim() || null;
    const reconComplete = history?.homeMedications?.reconciled === true || Boolean(homeSummary);

    const medicationItems = orders.flatMap((order) =>
      order.items
        .filter((item) => item.catalogItemType === "MEDICATION")
        .map((item) => ({
          id: item.id,
          orderId: order.id,
          name: item.manualLabel?.trim() || "Medication",
          strength: item.strength,
          route: item.route,
          frequency: item.frequencyCode,
          instructions: item.notes,
          itemStatus: item.status,
          lifecycle: item.medicationLifecycleStatus,
          fulfillment: item.medicationFulfillmentIntent,
          orderStatus: order.status,
          cancelledAt: order.cancelledAt?.toISOString() ?? null,
          prescriberName: order.prescriberName,
          orderedAt: order.createdAt.toISOString(),
          encounterType: order.encounter?.type ?? null,
          bucket: digitalCareMedicationBucket({
            encounterType: order.encounter?.type,
            fulfillment: item.medicationFulfillmentIntent,
            lifecycle: item.medicationLifecycleStatus,
            orderStatus: order.status,
            cancelledAt: order.cancelledAt?.toISOString() ?? null,
          }),
        })),
    );

    const timeline = [
      encounter
        ? {
            id: `arrival-${encounter.id}`,
            kind: "ARRIVAL",
            at: encounter.createdAt.toISOString(),
            title: "Arrival",
            detail: encounter.chiefComplaint ?? encounter.type,
          }
        : null,
      encounter?.vitals
        ? {
            id: `vitals-${encounter.id}`,
            kind: "VITALS",
            at: encounter.createdAt.toISOString(),
            title: "Vitals",
            detail: typeof encounter.vitals === "string" ? encounter.vitals : JSON.stringify(encounter.vitals),
          }
        : null,
      ...orders.slice(0, 40).map((order) => ({
        id: `order-${order.id}`,
        kind: order.type,
        at: order.createdAt.toISOString(),
        title: order.items[0]?.manualLabel?.trim() || order.type,
        detail: order.status,
      })),
      ...(encounter?.providerNote || encounter?.notes
        ? [
            {
              id: `note-${encounter.id}`,
              kind: "NOTES",
              at: encounter.createdAt.toISOString(),
              title: "Notes",
              detail: encounter.providerNote ?? encounter.notes,
            },
          ]
        : []),
      encounter?.dischargedAt
        ? {
            id: `discharge-${encounter.id}`,
            kind: "DISCHARGE",
            at: encounter.dischargedAt.toISOString(),
            title: "Discharge",
            detail: encounter.disposition ?? null,
          }
        : null,
    ]
      .filter(Boolean)
      .sort((a, b) => String(b!.at).localeCompare(String(a!.at)));

    const dischargeJson =
      encounter?.dischargeSummaryJson && typeof encounter.dischargeSummaryJson === "object"
        ? (encounter.dischargeSummaryJson as Record<string, unknown>)
        : {};

    await this.audit.log(AuditAction.VIEW, "DIGITAL_CARE_WORKSPACE", {
      userId: actor.userId,
      facilityId: actor.facilityId,
      patientId,
      metadata: {
        resultCount: patientResults.length,
        threadCount: threads.value.length,
        messagingStorageAvailable: portalRows.available && unreadRows.available && threads.available,
      },
    });

    return {
      identity,
      configuration,
      messagingStorageAvailable: portalRows.available && unreadRows.available && threads.available,
      results: !configuration || configuration.digitalCare.resultRelease ? patientResults : [],
      threads:
        !configuration || configuration.digitalCare.secureMessaging
          ? threads.value.map((thread) => ({
              id: thread.id,
              subject: thread.subject,
              status: thread.status,
              category: thread.category,
              lastMessageAt: thread.lastMessageAt.toISOString(),
            }))
          : [],
      medications: {
        ordered: medicationItems,
        homeSummary,
        reconComplete,
      },
      discharge: {
        diagnoses,
        summary: encounter?.dischargeSummaryJson ?? null,
        disposition: encounter?.disposition ?? (typeof dischargeJson.disposition === "string" ? dischargeJson.disposition : null),
        followUpDate: encounter?.followUpDate?.toISOString() ?? null,
        instructions:
          (typeof dischargeJson.dischargeInstructions === "string" ? dischargeJson.dischargeInstructions : null) ??
          encounter?.treatmentPlan ??
          encounter?.notes ??
          null,
        restrictions:
          (typeof dischargeJson.activityInstructions === "string" ? dischargeJson.activityInstructions : null) ??
          (typeof dischargeJson.returnPrecautions === "string" ? dischargeJson.returnPrecautions : null),
        schoolNote: typeof dischargeJson.workSchoolNote === "string" ? dischargeJson.workSchoolNote : null,
        workNote: typeof dischargeJson.workSchoolNote === "string" ? dischargeJson.workSchoolNote : null,
        followUp:
          (typeof dischargeJson.followUp === "string" ? dischargeJson.followUp : null) ??
          (typeof dischargeJson.followUpInstructions === "string" ? dischargeJson.followUpInstructions : null),
        acknowledgement: dischargeJson.patientInstructionsGiven === true,
        attending: identity.attending,
        status: encounter?.dischargedAt ? "DISCHARGED" : identity.visitStatus,
        portalActive: identity.portalActive,
      },
      timeline,
      carePlans,
      followUps: followUps.map((row) => ({
        id: row.id,
        dueDate: row.dueDate.toISOString(),
        reason: row.reason,
        notes: row.notes,
        status: row.status,
      })),
      appointments: appointments.map((row) => ({
        id: row.id,
        at: row.scheduledStartAt.toISOString(),
        reason: row.reason,
        status: row.status,
      })),
      activity: activity.map((row) => ({
        id: row.id,
        at: row.createdAt.toISOString(),
        action: row.action,
        entityType: row.entityType,
        metadata: row.metadata,
      })),
    };
  }

  private async optionalPortalQuery<T>(query: () => Promise<T>, fallback: T): Promise<{ value: T; available: boolean }> {
    try {
      return { value: await query(), available: true };
    } catch (error) {
      if (isOptionalPortalStorageError(error)) {
        return { value: fallback, available: false };
      }
      throw error;
    }
  }

  private async optionalReleaseList(actor: DiagnosticResultStaffActor, patientId: string) {
    try {
      return { value: await this.releases.list(actor, patientId), available: true };
    } catch (error) {
      if (isOptionalPortalStorageError(error)) {
        return { value: [], available: false };
      }
      throw error;
    }
  }
}
