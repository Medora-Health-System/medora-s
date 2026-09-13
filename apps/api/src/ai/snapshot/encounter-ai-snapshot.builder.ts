import { createHash, randomUUID } from "node:crypto";
import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { resolvePlatformPrincipalAccess } from "../../auth/platform-principal.js";
import type { EncounterAiSnapshot, AiEncounterContext } from "@medora/shared";
import { toAiBoundedText } from "@medora/shared";
import { EncounterType, BillingClassification } from "@prisma/client";
import {
  resolveEncounterCareSetting,
  resolveFacilityJurisdiction,
} from "./resolve-encounter-care-setting.js";
import type { EncounterAiSnapshotBuildInput } from "./encounter-ai-snapshot.types.js";

const MAX_PROVIDER_NOTE_CHARS = 50_000;
const MAX_TREATMENT_PLAN_CHARS = 50_000;
const MAX_DISCHARGE_SUMMARY_CHARS = 50_000;
const MAX_RESULT_TEXT_CHARS = 50_000;
const MAX_FOLLOWUP_INSTRUCTIONS_CHARS = 10_000;
const MAX_APPOINTMENT_NOTES_CHARS = 10_000;
const MAX_STRUCTURED_ENTRIES = 100;
const MAX_ORDERS = 100;
const MAX_ORDER_ITEMS = 200;
const MAX_RESULTS = 200;
const MAX_CRITICAL_RESULTS = 50;
const MAX_MEDICATION_ORDERS = 100;
const MAX_MEDICATION_ADMINISTRATIONS = 500;
const MAX_PROCEDURES = 100;
const MAX_DIAGNOSES = 50;
const MAX_FOLLOWUPS = 50;
const MAX_APPOINTMENTS = 50;
const MAX_VITALS_TREND_ENTRIES = 50;

function ageYearsFromDob(dob: Date | string | null | undefined): number | null {
  if (!dob) return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && Number.isFinite(age) ? age : null;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

@Injectable()
export class EncounterAiSnapshotBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async build(input: EncounterAiSnapshotBuildInput): Promise<EncounterAiSnapshot> {
    const { facilityId, encounterId, actorUserId } = input;

    await this.assertActorFacilityAccess(actorUserId, facilityId);

    const encounter = await this.findAuthorizedEncounter(encounterId, facilityId);
    if (!encounter) {
      throw new NotFoundException("Encounter not found or not accessible");
    }

    const patient = await this.findFacilityPatient(encounter.patientId, facilityId);

    const [
      triage,
      triageVitalsReadings,
      orders,
      results,
      diagnoses,
      medicationAdministrations,
      followUps,
      appointments,
    ] = await Promise.all([
      this.findTriage(encounterId, facilityId),
      this.findVitalsReadings(encounterId, facilityId),
      this.findOrders(encounterId, facilityId),
      this.findResults(encounterId, facilityId),
      this.findDiagnoses(encounterId, facilityId),
      this.findMedicationAdministrations(encounterId, facilityId),
      this.findFollowUps(encounterId, facilityId),
      this.findAppointments(encounterId, facilityId),
    ]);

    const generatedAt = new Date().toISOString();

    const encounterContext: AiEncounterContext = {
      encounterId,
      facilityId,
      patientId: encounter.patientId,
      country: resolveFacilityJurisdiction(encounter.facility.country),
      encounterType: encounter.type,
      status: encounter.status,
      serviceLine: encounter.serviceLine ?? null,
      billingClassification: encounter.billingClassification,
      workflowState: encounter.workflowState,
      careSetting: resolveEncounterCareSetting({
        encounter: {
          type: encounter.type,
          serviceLine: encounter.serviceLine,
          billingClassification: encounter.billingClassification,
          workflowState: encounter.workflowState,
        },
        facility: {
          facilityType: encounter.facility.facilityType,
          billingSiteType: encounter.facility.billingSiteType,
          billingClassificationMode: encounter.facility.billingClassificationMode,
        },
      }),
    };

    const snapshotWithoutVersion: Omit<EncounterAiSnapshot, "snapshotVersion" | "generatedAt"> = {
      encounterContext,
      patientContext: {
        age: ageYearsFromDob(patient.dob),
        dateOfBirth: toIsoString(patient.dob),
        sexAtBirth: patient.sexAtBirth,
        relevantHistory: (patient.clinicalHistoryProfileJson as unknown) ?? null,
      },
      presentation: this.buildPresentation(encounter, triage, triageVitalsReadings),
      clinicalDocumentation: this.buildClinicalDocumentation(encounter),
      diagnostics: this.buildDiagnostics(orders, results),
      treatments: this.buildTreatments(orders, medicationAdministrations),
      diagnoses: this.buildDiagnoses(diagnoses),
      disposition: this.buildDisposition(encounter, followUps, appointments),
    };

    const snapshotVersion = this.computeSnapshotVersion(snapshotWithoutVersion);

    return {
      snapshotVersion,
      generatedAt,
      ...snapshotWithoutVersion,
    };
  }

  private async assertActorFacilityAccess(actorUserId: string, facilityId: string): Promise<void> {
    const activeRole = await this.prisma.userRole.findFirst({
      where: {
        userId: actorUserId,
        facilityId,
        isActive: true,
        facility: { isActive: true },
      },
      select: { id: true },
    });
    if (activeRole) return;

    try {
      const platformAccess = await resolvePlatformPrincipalAccess(this.prisma, {
        userId: actorUserId,
        facilityId,
      });
      if (platformAccess.granted) {
        const activeFacility = await this.prisma.facility.findFirst({
          where: { id: facilityId, isActive: true },
          select: { id: true },
        });
        if (activeFacility) return;
      }
    } catch {
      // Authorization resolution is fail-closed. Missing/incomplete context,
      // database failures, or malformed platform authority never grant access.
    }

    throw new ForbiddenException("Actor does not have access to the requested facility");
  }

  private async findAuthorizedEncounter(encounterId: string, facilityId: string) {
    return this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        type: true,
        status: true,
        chiefComplaint: true,
        dischargeStatus: true,
        disposition: true,
        nursingAssessment: true,
        providerNote: true,
        treatmentPlan: true,
        dischargeSummaryJson: true,
        admissionSummaryJson: true,
        providerDocumentationStatus: true,
        providerDocumentationSignedAt: true,
        providerDocumentationSignedByUserId: true,
        workflowState: true,
        billingClassification: true,
        serviceLine: true,
        facility: {
          select: {
            country: true,
            facilityType: true,
            billingSiteType: true,
            billingClassificationMode: true,
          },
        },
      },
    });
  }

  private async findFacilityPatient(patientId: string, facilityId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId },
      select: {
        id: true,
        dob: true,
        sexAtBirth: true,
        clinicalHistoryProfileJson: true,
      },
    });
    if (!patient) {
      throw new NotFoundException("Patient not found or not accessible");
    }
    return patient;
  }

  private async findTriage(encounterId: string, facilityId: string) {
    return this.prisma.triage.findFirst({
      where: { encounterId, facilityId },
      select: {
        esi: true,
        chiefComplaint: true,
        onsetAt: true,
        vitalsJson: true,
      },
    });
  }

  private async findVitalsReadings(encounterId: string, facilityId: string) {
    return this.prisma.triageVitalsReading.findMany({
      where: { encounterId, facilityId, status: "ACTIVE" },
      orderBy: { measuredAt: "desc" },
      take: MAX_VITALS_TREND_ENTRIES,
      select: {
        measuredAt: true,
        vitalsJson: true,
      },
    });
  }

  private async findOrders(encounterId: string, facilityId: string) {
    return this.prisma.order.findMany({
      where: { encounterId, facilityId },
      take: MAX_ORDERS,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        items: {
          take: MAX_ORDER_ITEMS,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            catalogItemType: true,
            manualLabel: true,
            status: true,
            lifecycleState: true,
            createdAt: true,
            completedAt: true,
            route: true,
            frequencyCode: true,
            medicationLifecycleStatus: true,
            enterpriseProcedureId: true,
          },
        },
      },
    });
  }

  private async findResults(encounterId: string, facilityId: string) {
    return this.prisma.result.findMany({
      where: { facilityId, orderItem: { order: { encounterId } } },
      take: MAX_RESULTS,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderItemId: true,
        resultText: true,
        criticalValue: true,
        acknowledgedByProviderAt: true,
        createdAt: true,
        verifiedAt: true,
      },
    });
  }

  private async findDiagnoses(encounterId: string, facilityId: string) {
    return this.prisma.diagnosis.findMany({
      where: { encounterId, facilityId, status: { not: "REMOVED" } },
      take: MAX_DIAGNOSES,
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        code: true,
        description: true,
        status: true,
        sortOrder: true,
      },
    });
  }

  private async findMedicationAdministrations(encounterId: string, facilityId: string) {
    return this.prisma.medicationAdministration.findMany({
      where: { encounterId, facilityId },
      take: MAX_MEDICATION_ADMINISTRATIONS,
      orderBy: { administeredAt: "desc" },
      select: {
        id: true,
        orderItemId: true,
        administeredAt: true,
        effectiveAdministeredAt: true,
        marAction: true,
        route: true,
      },
    });
  }

  private async findFollowUps(encounterId: string, facilityId: string) {
    return this.prisma.followUp.findMany({
      where: { encounterId, facilityId },
      take: MAX_FOLLOWUPS,
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        reason: true,
        status: true,
        dueDate: true,
        notes: true,
      },
    });
  }

  private async findAppointments(encounterId: string, facilityId: string) {
    return this.prisma.appointment.findMany({
      where: { encounterId, facilityId },
      take: MAX_APPOINTMENTS,
      orderBy: { scheduledStartAt: "asc" },
      select: {
        id: true,
        status: true,
        scheduledStartAt: true,
        departmentId: true,
        reason: true,
      },
    });
  }

  private buildPresentation(
    encounter: Awaited<ReturnType<typeof this.findAuthorizedEncounter>>,
    triage: Awaited<ReturnType<typeof this.findTriage>>,
    vitalsReadings: Awaited<ReturnType<typeof this.findVitalsReadings>>
  ): EncounterAiSnapshot["presentation"] {
    const latestVitals = vitalsReadings[0];

    return {
      chiefComplaint: encounter?.chiefComplaint ?? null,
      triage: triage
        ? {
            esi: triage.esi ? String(triage.esi) : null,
            chiefComplaint: triage.chiefComplaint ?? null,
            onset: toIsoString(triage.onsetAt),
            modeOfArrival: null,
            triageNote: null,
          }
        : undefined,
      latestVitals: latestVitals
        ? {
            recordedAt: toIsoString(latestVitals.measuredAt),
            source: "TRIAGE_VITALS_READING",
            values: latestVitals.vitalsJson as Record<string, unknown>,
          }
        : triage?.vitalsJson
          ? {
              recordedAt: null,
              source: "TRIAGE",
              values: triage.vitalsJson as Record<string, unknown>,
            }
          : null,
      vitalTrend: vitalsReadings.map((reading) => ({
        recordedAt: toIsoString(reading.measuredAt),
        source: "TRIAGE_VITALS_READING",
        values: reading.vitalsJson as Record<string, unknown>,
      })),
    };
  }

  private buildClinicalDocumentation(
    encounter: Awaited<ReturnType<typeof this.findAuthorizedEncounter>>
  ): EncounterAiSnapshot["clinicalDocumentation"] {
    const providerNote = toAiBoundedText(encounter?.providerNote, MAX_PROVIDER_NOTE_CHARS);
    const treatmentPlan = toAiBoundedText(encounter?.treatmentPlan, MAX_TREATMENT_PLAN_CHARS);

    const structuredEntries: EncounterAiSnapshot["clinicalDocumentation"]["structuredEntries"] = [];
    const reassessments: EncounterAiSnapshot["clinicalDocumentation"]["reassessments"] = [];

    const nursingAssessment = encounter?.nursingAssessment;
    if (nursingAssessment && typeof nursingAssessment === "object") {
      const namespaces = nursingAssessment as Record<string, unknown>;
      for (const [namespace, payload] of Object.entries(namespaces).slice(0, MAX_STRUCTURED_ENTRIES)) {
        const entry = {
          id: randomUUID(),
          namespace,
          documentedAt: new Date().toISOString(),
          payloadSummary: payload as Record<string, unknown>,
        };
        if (namespace.includes("REASSESSMENT")) {
          reassessments?.push(entry);
        } else {
          structuredEntries?.push(entry);
        }
      }
    }

    return {
      providerDocumentationStatus: encounter?.providerDocumentationStatus ?? null,
      providerNote,
      treatmentPlan,
      structuredEntries,
      reassessments,
    };
  }

  private buildDiagnostics(
    orders: Awaited<ReturnType<typeof this.findOrders>>,
    results: Awaited<ReturnType<typeof this.findResults>>
  ): EncounterAiSnapshot["diagnostics"] {
    const mappedOrders = orders.map((order) => ({
      id: order.id,
      status: order.status,
      orderedAt: toIsoString(order.createdAt),
      items: order.items.map((item) => ({
        id: item.id,
        catalogItemType: item.catalogItemType,
        displayLabel: item.manualLabel,
        status: item.status,
        lifecycleState: item.lifecycleState,
        orderedAt: toIsoString(item.createdAt),
        completedAt: toIsoString(item.completedAt),
      })),
    }));

    const mappedResults = results.map((result) => {
      const resultText = toAiBoundedText(result.resultText, MAX_RESULT_TEXT_CHARS);
      return {
        id: result.id,
        orderItemId: result.orderItemId,
        resultText,
        criticalValue: result.criticalValue,
        acknowledgedByProviderAt: toIsoString(result.acknowledgedByProviderAt),
        resultedAt: toIsoString(result.createdAt),
        verifiedAt: toIsoString(result.verifiedAt),
      };
    });

    const pendingTests = orders
      .flatMap((order) => order.items)
      .filter(
        (item) =>
          item.status !== "COMPLETED" &&
          item.status !== "CANCELLED" &&
          item.lifecycleState !== "REVIEWED" &&
          item.lifecycleState !== "CANCELLED"
      )
      .map((item) => item.id);

    const criticalResults = mappedResults
      .filter((result) => result.criticalValue === true)
      .slice(0, MAX_CRITICAL_RESULTS);

    return {
      orders: mappedOrders,
      results: mappedResults,
      pendingTests,
      criticalResults,
    };
  }

  private buildTreatments(
    orders: Awaited<ReturnType<typeof this.findOrders>>,
    administrations: Awaited<ReturnType<typeof this.findMedicationAdministrations>>
  ): EncounterAiSnapshot["treatments"] {
    const medicationOrders = orders
      .flatMap((order) => order.items)
      .filter(
        (item) =>
          item.catalogItemType === "MEDICATION" || item.medicationLifecycleStatus !== null
      )
      .slice(0, MAX_MEDICATION_ORDERS)
      .map((item) => ({
        id: item.id,
        displayLabel: item.manualLabel,
        status: item.status,
        lifecycleState: item.lifecycleState,
        route: item.route,
        frequencyCode: item.frequencyCode,
        orderedAt: toIsoString(item.createdAt),
      }));

    const mappedAdministrations = administrations
      .slice(0, MAX_MEDICATION_ADMINISTRATIONS)
      .map((admin) => ({
        id: admin.id,
        orderItemId: admin.orderItemId,
        scheduledAt: null,
        administeredAt: toIsoString(admin.effectiveAdministeredAt ?? admin.administeredAt),
        status: null,
        action: admin.marAction,
      }));

    const procedures = orders
      .flatMap((order) => order.items)
      .filter(
        (item) =>
          item.catalogItemType === "CARE" || item.enterpriseProcedureId !== null
      )
      .slice(0, MAX_PROCEDURES)
      .map((item) => ({
        id: item.id,
        catalogCode: item.enterpriseProcedureId,
        displayLabel: item.manualLabel,
        performedAt: toIsoString(item.completedAt),
        status: item.status,
      }));

    return {
      medicationOrders,
      medicationAdministrations: mappedAdministrations,
      procedures,
    };
  }

  private buildDiagnoses(
    diagnoses: Awaited<ReturnType<typeof this.findDiagnoses>>
  ): EncounterAiSnapshot["diagnoses"] {
    return {
      documentedDiagnoses: diagnoses.map((diagnosis) => ({
        id: diagnosis.id,
        code: diagnosis.code,
        display: diagnosis.description,
        isPrimary: diagnosis.sortOrder === 0,
        status: diagnosis.status,
      })),
    };
  }

  private buildDisposition(
    encounter: Awaited<ReturnType<typeof this.findAuthorizedEncounter>>,
    followUps: Awaited<ReturnType<typeof this.findFollowUps>>,
    appointments: Awaited<ReturnType<typeof this.findAppointments>>
  ): EncounterAiSnapshot["disposition"] {
    const dischargeSummary = encounter?.dischargeSummaryJson
      ? toAiBoundedText(JSON.stringify(encounter.dischargeSummaryJson), MAX_DISCHARGE_SUMMARY_CHARS)
      : null;

    return {
      disposition: encounter?.disposition ?? null,
      dischargeStatus: encounter?.dischargeStatus ?? null,
      dischargeSummary,
      followUps: followUps.map((followUp) => ({
        id: followUp.id,
        type: followUp.reason,
        status: followUp.status,
        dueDate: toIsoString(followUp.dueDate),
        instructions: toAiBoundedText(followUp.notes, MAX_FOLLOWUP_INSTRUCTIONS_CHARS),
      })),
      appointments: appointments.map((appointment) => ({
        id: appointment.id,
        status: appointment.status,
        scheduledAt: toIsoString(appointment.scheduledStartAt),
        departmentCode: appointment.departmentId,
        notes: toAiBoundedText(appointment.reason, MAX_APPOINTMENT_NOTES_CHARS),
      })),
    };
  }

  private computeSnapshotVersion(
    payload: Omit<EncounterAiSnapshot, "snapshotVersion" | "generatedAt">
  ): string {
    const canonical = canonicalJsonStringify(payload);
    return createHash("sha256").update(canonical).digest("hex");
  }
}

function canonicalJsonStringify(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJsonStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map((key) => `"${key}":${canonicalJsonStringify(obj[key])}`);
  return `{${entries.join(",")}}`;
}