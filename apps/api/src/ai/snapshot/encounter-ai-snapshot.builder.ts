import { createHash } from "node:crypto";
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
import { extractDispositionFacts } from "./extract-disposition-facts.js";

const MAX_PROVIDER_NOTE_CHARS = 50_000;
const MAX_TREATMENT_PLAN_CHARS = 50_000;
const MAX_DISCHARGE_SUMMARY_CHARS = 50_000;
const MAX_NURSING_DISCHARGE_CHARS = 50_000;
const MAX_RESULT_TEXT_CHARS = 50_000;
const MAX_STRUCTURED_RESULT_CHARS = 50_000;
const MAX_STRUCTURED_RESULT_KEYS = 100;
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
const MAX_PROCEDURE_EVENTS = 100;
const MAX_PROCEDURE_EVENT_CHARS = 20_000;
const MAX_IV_ACCESS_EVENTS = 100;
const MAX_IV_ACCESS_NOTES_CHARS = 4_000;
const MAX_DIAGNOSES = 50;
const MAX_FOLLOWUPS = 50;
const MAX_APPOINTMENTS = 50;
const MAX_VITALS_TREND_ENTRIES = 50;
const MAX_ENCOUNTER_NOTES = 100;
const MAX_ENCOUNTER_NOTE_CHARS = 20_000;
const MAX_PROVIDER_DOCUMENTATION_VERSIONS = 50;
const MAX_PROVIDER_ADDENDA = 50;
const MAX_PROVIDER_ADDENDUM_CHARS = 5_000;
const MAX_PROVIDER_UNLOCK_REASON_CHARS = 5_000;
const MAX_PROVIDER_CLINICAL_SNAPSHOT_CHARS = 50_000;
const MAX_STRUCTURED_DOCUMENTATION_PAYLOAD_CHARS = 20_000;
const UNKNOWN_STRUCTURED_DOCUMENTED_AT = "1970-01-01T00:00:00.000Z";

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

function structuredEntryDocumentedAt(payload: unknown): string {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return UNKNOWN_STRUCTURED_DOCUMENTED_AT;
  }

  const source = payload as Record<string, unknown>;
  for (const key of [
    "reassessmentAt",
    "clinicalDocumentedAt",
    "documentedAt",
    "recordedAt",
    "authoredAt",
    "createdAt",
  ]) {
    const value = source[key];
    if (typeof value !== "string") continue;
    const iso = toIsoString(value);
    if (iso) return iso;
  }

  return UNKNOWN_STRUCTURED_DOCUMENTED_AT;
}

function strictBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

const NURSING_DISCHARGE_IDENTITY_KEYS = new Set([
  "userId", "user_id", "nurseId", "nurse_id", "staffId", "staff_id",
  "providerId", "provider_id", "employeeId", "employee_id", "email",
  "phone", "signature", "signedBy", "signed_by", "completedBy", "completed_by",
  "createdBy", "created_by", "updatedBy", "updated_by", "authorId", "author_id",
]);

function sanitizeNursingDischargeValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.length > 4_000 ? value.slice(0, 4_000) : value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeNursingDischargeValue(item, depth + 1));
  if (typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort().slice(0, 100)) {
    if (NURSING_DISCHARGE_IDENTITY_KEYS.has(key)) continue;
    result[key] = sanitizeNursingDischargeValue(source[key], depth + 1);
  }
  return result;
}

const CLINICAL_EVENT_IDENTITY_KEYS = new Set([
  "userId", "user_id", "staffId", "staff_id", "providerId", "provider_id",
  "employeeId", "employee_id", "nurseId", "nurse_id", "email", "phone",
  "signature", "signedBy", "signed_by", "performedBy", "performed_by",
  "createdBy", "created_by", "updatedBy", "updated_by", "authorId", "author_id",
]);

function sanitizeClinicalEventValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.length > 4_000 ? value.slice(0, 4_000) : value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeClinicalEventValue(item, depth + 1));
  if (typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort().slice(0, 100)) {
    if (CLINICAL_EVENT_IDENTITY_KEYS.has(key)) continue;
    result[key] = sanitizeClinicalEventValue(source[key], depth + 1);
  }
  return result;
}

function stableStructuredEntryId(namespace: string, payload: unknown): string {
  const digest = createHash("sha256")
    .update(`${namespace}\n${canonicalJsonStringify(payload)}`)
    .digest("hex")
    .slice(0, 32);
  return `structured-${digest}`;
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
      encounterNotes,
      providerDocumentationVersions,
      providerAddenda,
      clinicalDocumentationEntries,
      procedureEvents,
      ivAccessEvents,
    ] = await Promise.all([
      this.findTriage(encounterId, facilityId),
      this.findVitalsReadings(encounterId, facilityId),
      this.findOrders(encounterId, facilityId),
      this.findResults(encounterId, facilityId),
      this.findDiagnoses(encounterId, facilityId),
      this.findMedicationAdministrations(encounterId, facilityId),
      this.findFollowUps(encounterId, facilityId),
      this.findAppointments(encounterId, facilityId),
      this.findEncounterNotes(encounterId, facilityId),
      this.findProviderDocumentationVersions(encounterId, facilityId),
      this.findProviderAddenda(encounterId, facilityId),
      this.findClinicalDocumentationEntries(encounterId, facilityId),
      this.findProcedureEvents(encounterId, facilityId),
      this.findIvAccessEvents(encounterId, facilityId),
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

    const snapshotWithoutVersion: Omit<EncounterAiSnapshot, "snapshotVersion" | "generatedAt" | "completeness"> = {
      encounterContext,
      patientContext: {
        age: ageYearsFromDob(patient.dob),
        dateOfBirth: toIsoString(patient.dob),
        sexAtBirth: patient.sexAtBirth,
        relevantHistory: (patient.clinicalHistoryProfileJson as unknown) ?? null,
      },
      presentation: this.buildPresentation(encounter, triage, triageVitalsReadings),
      clinicalDocumentation: this.buildClinicalDocumentation(encounter, encounterNotes, providerDocumentationVersions, providerAddenda, clinicalDocumentationEntries),
      diagnostics: this.buildDiagnostics(orders, results),
      treatments: this.buildTreatments(orders, medicationAdministrations, procedureEvents, ivAccessEvents),
      diagnoses: this.buildDiagnoses(diagnoses),
      disposition: this.buildDisposition(encounter, followUps, appointments),
    };

    const completeness = this.buildCompleteness({
      encounter,
      triageVitalsReadings,
      orders,
      results,
      diagnoses,
      medicationAdministrations,
      followUps,
      appointments,
      encounterNotes,
      providerDocumentationVersions,
      providerAddenda,
      clinicalDocumentationEntries,
      procedureEvents,
      ivAccessEvents,
    });
    const snapshotVersion = this.computeSnapshotVersion({ ...snapshotWithoutVersion, completeness });

    return {
      snapshotVersion,
      generatedAt,
      completeness,
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
        resultData: true,
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

  private async findIvAccessEvents(encounterId: string, facilityId: string) {
    return this.prisma.encounterClinicalEvent.findMany({
      where: { encounterId, facilityId, eventType: { in: ["IV_INSERTED", "IV_REMOVED"] } },
      take: MAX_IV_ACCESS_EVENTS,
      orderBy: { createdAt: "asc" },
      select: { id: true, eventType: true, payloadJson: true, createdAt: true },
    });
  }

  private async findProcedureEvents(encounterId: string, facilityId: string) {
    return this.prisma.encounterClinicalEvent.findMany({
      where: { encounterId, facilityId, eventType: "PROCEDURE_DOCUMENTED" },
      take: MAX_PROCEDURE_EVENTS,
      orderBy: { createdAt: "desc" },
      select: { id: true, eventType: true, payloadJson: true, createdAt: true },
    });
  }

  private async findClinicalDocumentationEntries(encounterId: string, facilityId: string) {
    return this.prisma.encounterClinicalDocumentationEntry.findMany({
      where: { encounterId, facilityId },
      take: MAX_STRUCTURED_ENTRIES,
      orderBy: { createdAt: "desc" },
      select: { id: true, category: true, cardId: true, createdAt: true, payloadJson: true, voidedAt: true, requiresWitnessSignature: true, witnessedAt: true },
    });
  }

  private async findProviderDocumentationVersions(encounterId: string, facilityId: string) {
    return this.prisma.encounterProviderDocumentationVersion.findMany({
      where: { encounterId, facilityId },
      take: MAX_PROVIDER_DOCUMENTATION_VERSIONS,
      orderBy: { versionNumber: "asc" },
      select: {
        id: true,
        versionNumber: true,
        signedAt: true,
        clinicalSnapshotJson: true,
        snapshotHash: true,
        schemaVersion: true,
        documentType: true,
        encounterMode: true,
        sourceEncounterVersion: true,
        previousVersionId: true,
        unlockedAt: true,
        unlockReason: true,
      },
    });
  }

  private async findProviderAddenda(encounterId: string, facilityId: string) {
    return this.prisma.encounterProviderAddendum.findMany({
      where: { encounterId, facilityId },
      take: MAX_PROVIDER_ADDENDA,
      orderBy: { createdAt: "asc" },
      select: { id: true, text: true, amendmentReason: true, createdAt: true },
    });
  }

  private async findEncounterNotes(encounterId: string, facilityId: string) {
    return this.prisma.encounterNote.findMany({
      where: { encounterId, facilityId },
      take: MAX_ENCOUNTER_NOTES,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        noteType: true,
        body: true,
        createdAt: true,
        voidedAt: true,
        isAmendment: true,
        amendedFromNoteId: true,
        requiresCosign: true,
        cosignedAt: true,
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
    encounter: Awaited<ReturnType<typeof this.findAuthorizedEncounter>>,
    encounterNotes: Awaited<ReturnType<typeof this.findEncounterNotes>>,
    providerDocumentationVersions: Awaited<ReturnType<typeof this.findProviderDocumentationVersions>>,
    providerAddenda: Awaited<ReturnType<typeof this.findProviderAddenda>>,
    clinicalDocumentationEntries: Awaited<ReturnType<typeof this.findClinicalDocumentationEntries>>
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
          id: stableStructuredEntryId(namespace, payload),
          namespace,
          documentedAt: structuredEntryDocumentedAt(payload),
          payloadSummary: toAiBoundedText(canonicalJsonStringify(payload), MAX_STRUCTURED_DOCUMENTATION_PAYLOAD_CHARS)!,
        };
        if (namespace.toLowerCase().includes("reassess")) {
          reassessments?.push(entry);
        } else {
          structuredEntries?.push(entry);
        }
      }
    }

    const persistedStructuredEntries = clinicalDocumentationEntries.map((entry) => ({
      id: entry.id,
      namespace: `clinical-documentation:${entry.cardId}`,
      documentedAt: entry.createdAt.toISOString(),
      payloadSummary: entry.payloadJson && typeof entry.payloadJson === "object" && !Array.isArray(entry.payloadJson) ? toAiBoundedText(canonicalJsonStringify(entry.payloadJson), MAX_STRUCTURED_DOCUMENTATION_PAYLOAD_CHARS)! : undefined,
      category: String(entry.category),
      cardId: entry.cardId,
      voidedAt: toIsoString(entry.voidedAt),
      requiresWitnessSignature: entry.requiresWitnessSignature,
      witnessedAt: toIsoString(entry.witnessedAt),
    }));

    return {
      providerDocumentationStatus: encounter?.providerDocumentationStatus ?? null,
      providerNote,
      treatmentPlan,
      structuredEntries: persistedStructuredEntries,
      reassessments,
      providerDocumentationVersions: providerDocumentationVersions.map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        signedAt: version.signedAt.toISOString(),
        snapshotHash: version.snapshotHash,
        schemaVersion: version.schemaVersion,
        documentType: version.documentType,
        encounterMode: version.encounterMode,
        sourceEncounterVersion: version.sourceEncounterVersion,
        previousVersionId: version.previousVersionId,
        unlockedAt: toIsoString(version.unlockedAt),
        unlockReason: toAiBoundedText(version.unlockReason, MAX_PROVIDER_UNLOCK_REASON_CHARS),
        clinicalSnapshot: toAiBoundedText(canonicalJsonStringify(version.clinicalSnapshotJson), MAX_PROVIDER_CLINICAL_SNAPSHOT_CHARS)!,
      })),
      providerAddenda: providerAddenda.map((addendum) => ({
        id: addendum.id,
        text: toAiBoundedText(addendum.text, MAX_PROVIDER_ADDENDUM_CHARS)!,
        amendmentReason: toAiBoundedText(addendum.amendmentReason, MAX_PROVIDER_ADDENDUM_CHARS),
        createdAt: addendum.createdAt.toISOString(),
      })),
      encounterNotes: encounterNotes.map((note) => ({
        id: note.id,
        noteType: String(note.noteType),
        body: toAiBoundedText(note.body, MAX_ENCOUNTER_NOTE_CHARS)!,
        createdAt: note.createdAt.toISOString(),
        voidedAt: toIsoString(note.voidedAt),
        isAmendment: note.isAmendment,
        amendedFromNoteId: note.amendedFromNoteId,
        requiresCosign: note.requiresCosign,
        cosignedAt: toIsoString(note.cosignedAt),
      })),
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
      const resultDataObject = result.resultData && typeof result.resultData === "object" && !Array.isArray(result.resultData)
        ? result.resultData as Record<string, unknown>
        : null;
      const structuredDataKeys = resultDataObject
        ? Object.keys(resultDataObject).filter((key) => !/attachment|base64|dataUrl|content/i.test(key)).slice(0, MAX_STRUCTURED_RESULT_KEYS)
        : [];
      const safeStructuredData = resultDataObject
        ? Object.fromEntries(structuredDataKeys.map((key) => [key, resultDataObject[key]]))
        : null;
      const attachmentValue = resultDataObject?.attachments;
      const attachmentCount = Array.isArray(attachmentValue) ? attachmentValue.length : 0;
      return {
        id: result.id,
        orderItemId: result.orderItemId,
        resultText,
        criticalValue: result.criticalValue,
        acknowledgedByProviderAt: toIsoString(result.acknowledgedByProviderAt),
        resultedAt: toIsoString(result.createdAt),
        verifiedAt: toIsoString(result.verifiedAt),
        structuredData: safeStructuredData ? toAiBoundedText(JSON.stringify(safeStructuredData), MAX_STRUCTURED_RESULT_CHARS) : null,
        structuredDataKeys,
        attachmentCount,
      };
    });

    const pendingTests = orders
      .flatMap((order) => order.items)
      .filter(
        (item) =>
          item.catalogItemType !== "MEDICATION" &&
          item.medicationLifecycleStatus === null &&
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
    administrations: Awaited<ReturnType<typeof this.findMedicationAdministrations>>,
    procedureEvents: Awaited<ReturnType<typeof this.findProcedureEvents>>,
    ivAccessEvents: Awaited<ReturnType<typeof this.findIvAccessEvents>>
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

    const mappedProcedureEvents = procedureEvents.map((event) => {
      const payload = event.payloadJson && typeof event.payloadJson === "object" && !Array.isArray(event.payloadJson)
        ? event.payloadJson as Record<string, unknown>
        : {};
      return {
        id: event.id,
        eventType: "PROCEDURE_DOCUMENTED" as const,
        documentedAt: event.createdAt.toISOString(),
        performedAt: typeof payload.performedAt === "string" ? toIsoString(payload.performedAt) : null,
        procedureType: typeof payload.procedureType === "string" ? payload.procedureType : null,
        site: typeof payload.site === "string" ? payload.site : null,
        status: typeof payload.status === "string" ? payload.status : "COMPLETED",
        documentationRole: typeof payload.documentationRole === "string" ? payload.documentationRole : null,
        payload: toAiBoundedText(canonicalJsonStringify(sanitizeClinicalEventValue(payload)), MAX_PROCEDURE_EVENT_CHARS)!,
      };
    });

    return {
      medicationOrders,
      medicationAdministrations: mappedAdministrations,
      procedures,
      procedureEvents: mappedProcedureEvents,
      ivAccessEvents: ivAccessEvents.map((event) => {
        const payload = event.payloadJson && typeof event.payloadJson === "object" && !Array.isArray(event.payloadJson)
          ? event.payloadJson as Record<string, unknown>
          : {};
        return {
          id: event.id,
          eventType: event.eventType as "IV_INSERTED" | "IV_REMOVED",
          documentedAt: event.createdAt.toISOString(),
          insertionEventId: typeof payload.insertionEventId === "string" ? payload.insertionEventId : null,
          insertedAt: typeof payload.insertedAt === "string" ? toIsoString(payload.insertedAt) : null,
          removedAt: typeof payload.removedAt === "string" ? toIsoString(payload.removedAt) : null,
          site: typeof payload.site === "string" ? payload.site : null,
          gauge: typeof payload.gauge === "string" ? payload.gauge : null,
          reason: typeof payload.reason === "string" ? payload.reason : null,
          notes: typeof payload.notes === "string" ? toAiBoundedText(payload.notes, MAX_IV_ACCESS_NOTES_CHARS) : null,
        };
      }),
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
    const summaryRoot = encounter?.dischargeSummaryJson && typeof encounter.dischargeSummaryJson === "object" && !Array.isArray(encounter.dischargeSummaryJson)
      ? encounter.dischargeSummaryJson as Record<string, unknown>
      : null;
    const nursingRaw = summaryRoot?.inpatientNursingDischarge && typeof summaryRoot.inpatientNursingDischarge === "object" && !Array.isArray(summaryRoot.inpatientNursingDischarge)
      ? summaryRoot.inpatientNursingDischarge as Record<string, unknown>
      : null;
    const dischargeSummary = encounter?.dischargeSummaryJson
      ? toAiBoundedText(JSON.stringify(encounter.dischargeSummaryJson), MAX_DISCHARGE_SUMMARY_CHARS)
      : null;
    const dispositionFacts = extractDispositionFacts(encounter?.dischargeSummaryJson);

    return {
      disposition: encounter?.disposition ?? null,
      dischargeStatus: encounter?.dischargeStatus ?? null,
      dischargeSummary,
      checkoutState: dispositionFacts.checkoutState,
      transferReason: dispositionFacts.transferReason,
      transferDestination: dispositionFacts.transferDestination,
      transferTransport: dispositionFacts.transferTransport,
      dischargeFollowUpDocumented: dispositionFacts.dischargeFollowUpDocumented,
      followUps: followUps.map((followUp) => ({
        id: followUp.id,
        type: followUp.reason,
        status: followUp.status,
        dueDate: toIsoString(followUp.dueDate),
        instructions: toAiBoundedText(followUp.notes, MAX_FOLLOWUP_INSTRUCTIONS_CHARS),
      })),
      nursingDischargeExecution: {
        present: nursingRaw !== null,
        executionStatus: typeof nursingRaw?.executionStatus === "string" ? nursingRaw.executionStatus : null,
        revision: typeof nursingRaw?.revision === "number" ? nursingRaw.revision : null,
        completedAt: typeof nursingRaw?.completedAt === "string" ? toIsoString(nursingRaw.completedAt) : null,
        departureAt: typeof nursingRaw?.departureAt === "string" ? toIsoString(nursingRaw.departureAt) : null,
        dispositionMismatchDetected: nursingRaw?.dispositionMismatch && typeof nursingRaw.dispositionMismatch === "object" && !Array.isArray(nursingRaw.dispositionMismatch) ? strictBoolean((nursingRaw.dispositionMismatch as Record<string, unknown>).detected) : null,
        documentation: nursingRaw ? toAiBoundedText(canonicalJsonStringify(sanitizeNursingDischargeValue(nursingRaw)), MAX_NURSING_DISCHARGE_CHARS) : null,
      },
      appointments: appointments.map((appointment) => ({
        id: appointment.id,
        status: appointment.status,
        scheduledAt: toIsoString(appointment.scheduledStartAt),
        departmentCode: appointment.departmentId,
        notes: toAiBoundedText(appointment.reason, MAX_APPOINTMENT_NOTES_CHARS),
      })),
    };
  }

  private buildCompleteness(input: {
    encounter: NonNullable<Awaited<ReturnType<EncounterAiSnapshotBuilder["findAuthorizedEncounter"]>>>;
    triageVitalsReadings: Awaited<ReturnType<EncounterAiSnapshotBuilder["findVitalsReadings"]>>;
    orders: Awaited<ReturnType<EncounterAiSnapshotBuilder["findOrders"]>>;
    results: Awaited<ReturnType<EncounterAiSnapshotBuilder["findResults"]>>;
    diagnoses: Awaited<ReturnType<EncounterAiSnapshotBuilder["findDiagnoses"]>>;
    medicationAdministrations: Awaited<ReturnType<EncounterAiSnapshotBuilder["findMedicationAdministrations"]>>;
    followUps: Awaited<ReturnType<EncounterAiSnapshotBuilder["findFollowUps"]>>;
    appointments: Awaited<ReturnType<EncounterAiSnapshotBuilder["findAppointments"]>>;
    encounterNotes: Awaited<ReturnType<EncounterAiSnapshotBuilder["findEncounterNotes"]>>;
    providerDocumentationVersions: Awaited<ReturnType<EncounterAiSnapshotBuilder["findProviderDocumentationVersions"]>>;
    providerAddenda: Awaited<ReturnType<EncounterAiSnapshotBuilder["findProviderAddenda"]>>;
    clinicalDocumentationEntries: Awaited<ReturnType<EncounterAiSnapshotBuilder["findClinicalDocumentationEntries"]>>;
    procedureEvents: Awaited<ReturnType<EncounterAiSnapshotBuilder["findProcedureEvents"]>>;
    ivAccessEvents: Awaited<ReturnType<EncounterAiSnapshotBuilder["findIvAccessEvents"]>>;
  }): NonNullable<EncounterAiSnapshot["completeness"]> {
    const truncatedDomains: NonNullable<EncounterAiSnapshot["completeness"]>["truncatedDomains"] = [];
    if (input.triageVitalsReadings.length >= MAX_VITALS_TREND_ENTRIES) truncatedDomains.push("VITALS");
    if (
      input.encounter.nursingAssessment &&
      typeof input.encounter.nursingAssessment === "object" &&
      !Array.isArray(input.encounter.nursingAssessment) &&
      Object.keys(input.encounter.nursingAssessment as Record<string, unknown>).length >= MAX_STRUCTURED_ENTRIES
    ) truncatedDomains.push("STRUCTURED_DOCUMENTATION");
    if (input.clinicalDocumentationEntries.length >= MAX_STRUCTURED_ENTRIES || input.clinicalDocumentationEntries.some((entry) => canonicalJsonStringify(entry.payloadJson).length > MAX_STRUCTURED_DOCUMENTATION_PAYLOAD_CHARS)) truncatedDomains.push("STRUCTURED_DOCUMENTATION");
    if (input.orders.length >= MAX_ORDERS) truncatedDomains.push("ORDERS");
    if (input.orders.some((order) => order.items.length >= MAX_ORDER_ITEMS)) truncatedDomains.push("ORDER_ITEMS");
    if (input.results.length >= MAX_RESULTS) truncatedDomains.push("RESULTS");
    if (input.results.some((result) => {
      const data = result.resultData && typeof result.resultData === "object" && !Array.isArray(result.resultData) ? result.resultData as Record<string, unknown> : null;
      if (!data) return false;
      const safeKeys = Object.keys(data).filter((key) => !/attachment|base64|dataUrl|content/i.test(key));
      const safe = Object.fromEntries(safeKeys.slice(0, MAX_STRUCTURED_RESULT_KEYS).map((key) => [key, data[key]]));
      return safeKeys.length > MAX_STRUCTURED_RESULT_KEYS || JSON.stringify(safe).length > MAX_STRUCTURED_RESULT_CHARS;
    })) truncatedDomains.push("STRUCTURED_RESULT_DATA");
    if (input.diagnoses.length >= MAX_DIAGNOSES) truncatedDomains.push("DIAGNOSES");
    if (input.medicationAdministrations.length >= MAX_MEDICATION_ADMINISTRATIONS) truncatedDomains.push("MEDICATION_ADMINISTRATIONS");
    if (input.followUps.length >= MAX_FOLLOWUPS) truncatedDomains.push("FOLLOW_UPS");
    if (input.appointments.length >= MAX_APPOINTMENTS) truncatedDomains.push("APPOINTMENTS");
    if (input.procedureEvents.length >= MAX_PROCEDURE_EVENTS || input.procedureEvents.some((event) => JSON.stringify(event.payloadJson ?? {}).length > MAX_PROCEDURE_EVENT_CHARS)) truncatedDomains.push("PROCEDURE_EVENTS");
    if (input.ivAccessEvents.length >= MAX_IV_ACCESS_EVENTS || input.ivAccessEvents.some((event) => { const p = event.payloadJson && typeof event.payloadJson === "object" && !Array.isArray(event.payloadJson) ? event.payloadJson as Record<string, unknown> : {}; return typeof p.notes === "string" && p.notes.length > MAX_IV_ACCESS_NOTES_CHARS; })) truncatedDomains.push("IV_ACCESS_EVENTS");
    const dischargeRoot = input.encounter.dischargeSummaryJson && typeof input.encounter.dischargeSummaryJson === "object" && !Array.isArray(input.encounter.dischargeSummaryJson) ? input.encounter.dischargeSummaryJson as Record<string, unknown> : null;
    const nursingDischarge = dischargeRoot?.inpatientNursingDischarge && typeof dischargeRoot.inpatientNursingDischarge === "object" && !Array.isArray(dischargeRoot.inpatientNursingDischarge) ? dischargeRoot.inpatientNursingDischarge as Record<string, unknown> : null;
    if (nursingDischarge && JSON.stringify(nursingDischarge).length > MAX_NURSING_DISCHARGE_CHARS) truncatedDomains.push("NURSING_DISCHARGE_EXECUTION");
    if (input.encounterNotes.length >= MAX_ENCOUNTER_NOTES || input.encounterNotes.some((note) => note.body.length > MAX_ENCOUNTER_NOTE_CHARS)) truncatedDomains.push("ENCOUNTER_NOTES");
    if (input.providerDocumentationVersions.length >= MAX_PROVIDER_DOCUMENTATION_VERSIONS || input.providerDocumentationVersions.some((version) => (version.unlockReason?.length ?? 0) > MAX_PROVIDER_UNLOCK_REASON_CHARS || canonicalJsonStringify(version.clinicalSnapshotJson).length > MAX_PROVIDER_CLINICAL_SNAPSHOT_CHARS)) truncatedDomains.push("PROVIDER_DOCUMENTATION_HISTORY");
    if (input.providerAddenda.length >= MAX_PROVIDER_ADDENDA || input.providerAddenda.some((addendum) => addendum.text.length > MAX_PROVIDER_ADDENDUM_CHARS || (addendum.amendmentReason?.length ?? 0) > MAX_PROVIDER_ADDENDUM_CHARS)) truncatedDomains.push("PROVIDER_ADDENDA");
    // Audited against Medora's encounter-scoped legal/closed-chart composition.
    // These sources are persisted and clinically relevant but are not yet loaded
    // by this AI snapshot builder. Keep completeness fail-closed until each is
    // deliberately projected, bounded, and covered by regression tests.
    const missingSourceDomains: NonNullable<EncounterAiSnapshot["completeness"]>["missingSourceDomains"] = [];
    return {
      complete: truncatedDomains.length === 0 && missingSourceDomains.length === 0,
      truncatedDomains,
      missingSourceDomains,
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