/**
 * EDOC.2A — Legal chart + ROI pipeline verification for structured clinical documentation.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AuditAction } from "@prisma/client";
import { renderEncounterChartExportHtml } from "./chart-export-html.util";
import {
  EncounterChartExportService,
  ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
} from "./chart-export.service";
import { EDOC_BASIC_STRUCTURED_CARD_ID, IO_PO_INTAKE_CARD_ID, IO_URINE_OUTPUT_CARD_ID, OBS_PO_CHALLENGE_CARD_ID, RESTRAINT_INITIATION_CARD_ID, RESTRAINT_RENEWAL_CARD_ID, STROKE_NIHSS_CARD_ID } from "@medora/shared";

const SAMPLE_ENTRY = {
  id: "edoc-legal-1",
  encounterId: "enc-1",
  category: "OBSERVATION_DOCUMENTATION",
  cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
  authorUserId: "user-rn-1",
  authorDisplayNameSnapshot: "Marie Infirmière",
  authorRoleSnapshot: "Infirmier(ère)",
  createdAt: new Date("2026-05-28T15:00:00.000Z"),
  payloadJson: {
    items: [
      { key: "Pain", value: "2/10" },
      { key: "Mobility", value: "Ambulatory with assist" },
    ],
  },
  voidedAt: null,
  requiresWitnessSignature: false,
  witnessedAt: null,
  witnessedByUserId: null,
  witnessDisplayNameSnapshot: null,
  witnessRoleSnapshot: null,
};

type EdocPrismaRow = {
  id: string;
  encounterId: string;
  category: string;
  cardId: string;
  authorUserId: string;
  authorDisplayNameSnapshot: string;
  authorRoleSnapshot: string;
  createdAt: Date;
  payloadJson: unknown;
  voidedAt: Date | null;
  requiresWitnessSignature: boolean;
  witnessedAt: Date | null;
  witnessedByUserId: string | null;
  witnessDisplayNameSnapshot: string | null;
  witnessRoleSnapshot: string | null;
};

function makePrismaForEdoc(overrides?: {
  clinicalDocumentationEntries?: EdocPrismaRow[];
}) {
  const encounter = {
    id: "enc-1",
    facilityId: "facility-A",
    patientId: "patient-1",
    type: "EMERGENCY",
    status: "CLOSED",
    workflowState: "DISCHARGED",
    chiefComplaint: "Chest pain",
    roomLabel: "ER-3",
    treatmentPlan: null,
    providerNote: null,
    nursingAssessment: null,
    notes: null,
    dischargeSummaryJson: null,
    admissionSummaryJson: null,
    admittedAt: null,
    dischargedAt: new Date("2026-01-02T00:00:00.000Z"),
    dischargeStatus: "HOME",
    followUpDate: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T01:00:00.000Z"),
    providerDocumentationStatus: "SIGNED",
    providerDocumentationSignedAt: new Date("2026-01-02T00:30:00.000Z"),
    providerDocumentationSignedByUserId: "user-doc-1",
    physicianAssignedUserId: "user-doc-1",
    physicianAssigned: { id: "user-doc-1", firstName: "Alice", lastName: "Doctor" },
    providerDocumentationSignedBy: { firstName: "Alice", lastName: "Doctor" },
    patient: {
      id: "patient-1",
      mrn: "MRN-123",
      globalMrn: "GMRN-XYZ",
      nationalId: null,
      firstName: "John",
      lastName: "Doe",
      dob: new Date("1980-05-04T00:00:00.000Z"),
      sex: "MALE",
      sexAtBirth: "MALE",
    },
    facility: { id: "facility-A", name: "Clinique A" },
    providerAddenda: [],
    encounterNotes: [],
    clinicalDocumentationEntries: overrides?.clinicalDocumentationEntries ?? [SAMPLE_ENTRY],
  };

  return {
    encounter: { findFirst: jest.fn().mockResolvedValue(encounter) },
    triage: { findFirst: jest.fn().mockResolvedValue(null) },
    triageVitalsReading: { findMany: jest.fn().mockResolvedValue([]) },
    encounterClinicalEvent: { findMany: jest.fn().mockResolvedValue([]) },
    diagnosis: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    order: { findMany: jest.fn().mockResolvedValue([]) },
    result: { findMany: jest.fn().mockResolvedValue([]) },
    medicationAdministration: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({
        action: AuditAction.ENCOUNTER_CLOSE,
        createdAt: new Date("2026-01-02T01:00:00.000Z"),
        user: { firstName: "Alice", lastName: "Doctor" },
      }),
    },
    followUp: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
  };
}

describe("Clinical documentation legal chart + ROI export pipeline (EDOC.2A)", () => {
  it("includes full payloadJson and metadata in chart export manifest (ROI snapshot source)", async () => {
    const prisma = makePrismaForEdoc();
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const unifiedTimelineService = {
      getUnifiedTimeline: jest.fn().mockResolvedValue({
        capped: false,
        items: [],
        totalBeforeDedupe: 0,
        totalAfterDedupe: 0,
      }),
    };
    const service = new EncounterChartExportService(
      prisma as never,
      audit as never,
      unifiedTimelineService as never
    );

    const manifest = await service.getManifest("facility-A", "enc-1");
    const entries = manifest.encounter.clinicalDocumentationEntries;

    expect(entries).toHaveLength(1);
    const row = entries[0]!;
    expect(row.cardId).toBe(EDOC_BASIC_STRUCTURED_CARD_ID);
    expect(row.category).toBe("OBSERVATION_DOCUMENTATION");
    expect(row.authorDisplayName).toBe("Marie Infirmière");
    expect(row.authorRoleTitle).toBe("Infirmier(ère)");
    expect(row.cardTitleEn).toContain("Structured");
    expect(row.cardTitleFr).toMatch(/structurée/i);
    expect(row.createdAt).toBe("2026-05-28T15:00:00.000Z");

    expect(row.payloadJson).toEqual(SAMPLE_ENTRY.payloadJson);
    expect(row.payloadSummary).toEqual(
      expect.arrayContaining([
        { key: "Pain", value: "2/10" },
        { key: "Mobility", value: "Ambulatory with assist" },
      ])
    );
    expect(JSON.stringify(manifest)).toContain("Ambulatory with assist");
    expect(manifest.manifestVersion).toBe(ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION);
  });

  it("renders clinical documentation in HTML export with key/value lines (not preview-only)", () => {
    const prisma = makePrismaForEdoc();
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const unifiedTimelineService = {
      getUnifiedTimeline: jest.fn().mockResolvedValue({
        capped: false,
        items: [],
        totalBeforeDedupe: 0,
        totalAfterDedupe: 0,
      }),
    };
    return new EncounterChartExportService(
      prisma as never,
      audit as never,
      unifiedTimelineService as never
    )
      .getManifest("facility-A", "enc-1")
      .then((manifest) => {
        const html = renderEncounterChartExportHtml(manifest);
        expect(html).toContain("Clinical documentation (structured)");
        expect(html).toContain("OBSERVATION_DOCUMENTATION");
        expect(html).toContain("Marie Infirmière");
        expect(html).toContain("Infirmier(ère)");
        expect(html).toContain("2026-05-28T15:00:00.000Z");
        expect(html).toContain("Pain");
        expect(html).toContain("2/10");
        expect(html).toContain("Mobility");
        expect(html).toContain("Ambulatory with assist");
        expect(html).not.toContain("preview-only");
      });
  });

  it("renders pending witness and witnessed signatures in HTML export (EDOC.4)", async () => {
    const prisma = makePrismaForEdoc({
      clinicalDocumentationEntries: [
        {
          ...SAMPLE_ENTRY,
          id: "edoc-pending",
          cardId: "blood_transfusion",
          category: "BLOOD_PRODUCT_DOCUMENTATION",
          requiresWitnessSignature: true,
          witnessedAt: null,
        },
        {
          ...SAMPLE_ENTRY,
          id: "edoc-witnessed",
          cardId: "blood_transfusion",
          category: "BLOOD_PRODUCT_DOCUMENTATION",
          requiresWitnessSignature: true,
          witnessedAt: new Date("2026-05-28T16:30:00.000Z"),
          witnessedByUserId: "user-rn-2",
          witnessDisplayNameSnapshot: "Paul Témoin",
          witnessRoleSnapshot: "Infirmier(ère)",
        },
      ],
    });
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const unifiedTimelineService = {
      getUnifiedTimeline: jest.fn().mockResolvedValue({
        capped: false,
        items: [],
        totalBeforeDedupe: 0,
        totalAfterDedupe: 0,
      }),
    };
    const manifest = await new EncounterChartExportService(
      prisma as never,
      audit as never,
      unifiedTimelineService as never
    ).getManifest("facility-A", "enc-1");
    const html = renderEncounterChartExportHtml(manifest);
    expect(html).toContain("[PENDING WITNESS]");
    expect(html).toContain("[WITNESSED]");
    expect(html).toContain("Paul Témoin");
    expect(manifest.encounter.clinicalDocumentationEntries[0]?.witnessStatus).toBe("PENDING_WITNESS");
    expect(manifest.encounter.clinicalDocumentationEntries[1]?.witnessStatus).toBe("WITNESSED");
  });

  it("renders PO Challenge full payload in manifest and HTML (EDOC.3)", async () => {
    const poPayload = {
      startTime: "2026-05-28T16:00:00.000Z",
      substance: "Apple juice",
      amount: "120 mL",
      tolerated: "YES",
      nausea: false,
      vomiting: false,
      abdominalPain: false,
      result: "PASSED",
    };
    const prisma = makePrismaForEdoc({
      clinicalDocumentationEntries: [
        {
          id: "edoc-po-1",
          encounterId: "enc-1",
          category: "OBSERVATION_DOCUMENTATION",
          cardId: OBS_PO_CHALLENGE_CARD_ID,
          authorUserId: "user-rn-1",
          authorDisplayNameSnapshot: "Marie Infirmière",
          authorRoleSnapshot: "Infirmier(ère)",
          createdAt: new Date("2026-05-28T16:00:00.000Z"),
          payloadJson: poPayload,
          voidedAt: null,
          requiresWitnessSignature: false,
          witnessedAt: null,
          witnessedByUserId: null,
          witnessDisplayNameSnapshot: null,
          witnessRoleSnapshot: null,
        },
      ],
    });
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const unifiedTimelineService = {
      getUnifiedTimeline: jest.fn().mockResolvedValue({
        capped: false,
        items: [],
        totalBeforeDedupe: 0,
        totalAfterDedupe: 0,
      }),
    };
    const service = new EncounterChartExportService(
      prisma as never,
      audit as never,
      unifiedTimelineService as never
    );
    const manifest = await service.getManifest("facility-A", "enc-1");
    expect(manifest.encounter.clinicalDocumentationEntries[0]?.payloadJson).toEqual(poPayload);
    expect(
      manifest.encounter.clinicalDocumentationEntries[0]?.payloadSummary.some(
        (l) => l.key === "Substance" && l.value === "Apple juice"
      )
    ).toBe(true);
    const html = renderEncounterChartExportHtml(manifest);
    expect(html).toContain("Apple juice");
    expect(html).toContain("Réussi");
  });

  it("renders NIHSS in chart export JSON and HTML (EDOC.4 stroke)", async () => {
    const nihssPayload = {
      assessedAt: "2026-05-28T17:00:00.000Z",
      levelOfConsciousness: 0,
      locQuestions: 1,
      locCommands: 0,
      bestGaze: 0,
      visualFields: 0,
      facialPalsy: 1,
      motorArmLeft: 2,
      motorArmRight: 0,
      motorLegLeft: 1,
      motorLegRight: 0,
      limbAtaxia: 0,
      sensory: 0,
      bestLanguage: 0,
      dysarthria: 0,
      extinctionInattention: 0,
      totalScore: 5,
    };
    const prisma = makePrismaForEdoc({
      clinicalDocumentationEntries: [
        {
          ...SAMPLE_ENTRY,
          id: "edoc-nihss-1",
          category: "STROKE_DOCUMENTATION",
          cardId: STROKE_NIHSS_CARD_ID,
          payloadJson: nihssPayload,
        },
      ],
    });
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const unifiedTimelineService = {
      getUnifiedTimeline: jest.fn().mockResolvedValue({
        capped: false,
        items: [],
        totalBeforeDedupe: 0,
        totalAfterDedupe: 0,
      }),
    };
    const manifest = await new EncounterChartExportService(
      prisma as never,
      audit as never,
      unifiedTimelineService as never
    ).getManifest("facility-A", "enc-1");
    const row = manifest.encounter.clinicalDocumentationEntries[0]!;
    expect(row.payloadJson).toEqual(nihssPayload);
    expect(row.payloadSummary.some((l) => l.key === "Score NIHSS total" && l.value === "5")).toBe(
      true
    );
    const html = renderEncounterChartExportHtml(manifest);
    expect(html).toContain("Score NIHSS total");
    expect(html).toContain("STROKE_DOCUMENTATION");
  });

  it("renders PO Intake in chart export JSON and HTML (EDOC.5)", async () => {
    const poPayload = {
      recordedAt: "2026-05-28T18:00:00.000Z",
      amount: 240,
      unit: "ML",
      substance: "eau",
      tolerated: "YES",
      nausea: false,
      vomiting: false,
    };
    const prisma = makePrismaForEdoc({
      clinicalDocumentationEntries: [
        {
          ...SAMPLE_ENTRY,
          id: "edoc-io-po-1",
          category: "INTAKE_OUTPUT",
          cardId: IO_PO_INTAKE_CARD_ID,
          payloadJson: poPayload,
        },
      ],
    });
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const unifiedTimelineService = {
      getUnifiedTimeline: jest.fn().mockResolvedValue({
        capped: false,
        items: [],
        totalBeforeDedupe: 0,
        totalAfterDedupe: 0,
      }),
    };
    const manifest = await new EncounterChartExportService(
      prisma as never,
      audit as never,
      unifiedTimelineService as never
    ).getManifest("facility-A", "enc-1");
    const row = manifest.encounter.clinicalDocumentationEntries[0]!;
    expect(row.payloadJson).toEqual(poPayload);
    expect(row.payloadSummary.some((l) => l.key === "PO")).toBe(true);
    const html = renderEncounterChartExportHtml(manifest);
    expect(html).toContain("INTAKE_OUTPUT");
    expect(html).toContain("240 mL");
  });

  it("renders Urine Output and witness status in export when configured (EDOC.5)", async () => {
    const urinePayload = {
      recordedAt: "2026-05-28T19:00:00.000Z",
      amount: 400,
      unit: "ML",
      method: "FOLEY",
    };
    const prisma = makePrismaForEdoc({
      clinicalDocumentationEntries: [
        {
          ...SAMPLE_ENTRY,
          id: "edoc-io-urine-1",
          category: "INTAKE_OUTPUT",
          cardId: IO_URINE_OUTPUT_CARD_ID,
          payloadJson: urinePayload,
          requiresWitnessSignature: true,
          witnessedAt: null,
        },
      ],
    });
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const unifiedTimelineService = {
      getUnifiedTimeline: jest.fn().mockResolvedValue({
        capped: false,
        items: [],
        totalBeforeDedupe: 0,
        totalAfterDedupe: 0,
      }),
    };
    const manifest = await new EncounterChartExportService(
      prisma as never,
      audit as never,
      unifiedTimelineService as never
    ).getManifest("facility-A", "enc-1");
    expect(manifest.encounter.clinicalDocumentationEntries[0]?.witnessStatus).toBe(
      "PENDING_WITNESS"
    );
    const html = renderEncounterChartExportHtml(manifest);
    expect(html).toContain("[PENDING WITNESS]");
    expect(html).toContain("400 mL");
  });

  it("renders Restraint Initiation with billing metadata and witness in export (EDOC.6)", async () => {
    const initiationPayload = {
      assessmentTime: "2026-05-28T20:00:00.000Z",
      restraintType: "BEHAVIORAL",
      reasonForRestraint: "VIOLENT_BEHAVIOR",
      alternativesAttempted: ["VERBAL_DEESCALATION"],
      continuedNeed: true,
      injuryPresent: false,
      circulationAssessment: "NORMAL",
      mentalStatusAssessment: "Agitated.",
      physicianOrderVerified: true,
      orderingProviderId: "provider-1",
      billingReadinessMetadata: {
        capturePhase: "EDOC.6",
        claimsGenerationDeferred: true,
        restraintEventCapturable: true,
      },
    };
    const prisma = makePrismaForEdoc({
      clinicalDocumentationEntries: [
        {
          ...SAMPLE_ENTRY,
          id: "edoc-restraint-init-1",
          category: "RESTRAINT_DOCUMENTATION",
          cardId: RESTRAINT_INITIATION_CARD_ID,
          payloadJson: initiationPayload,
          requiresWitnessSignature: true,
          witnessedAt: new Date("2026-05-28T20:30:00.000Z"),
          witnessedByUserId: "user-rn-2",
          witnessDisplayNameSnapshot: "Paul Témoin",
          witnessRoleSnapshot: "Infirmier(ère)",
        },
        {
          ...SAMPLE_ENTRY,
          id: "edoc-restraint-renewal-1",
          category: "RESTRAINT_DOCUMENTATION",
          cardId: RESTRAINT_RENEWAL_CARD_ID,
          payloadJson: {
            renewalTime: "2026-05-28T21:00:00.000Z",
            orderingProviderId: "provider-1",
            continuedNeed: true,
            renewalReason: "Continued danger.",
          },
        },
      ],
    });
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const unifiedTimelineService = {
      getUnifiedTimeline: jest.fn().mockResolvedValue({
        capped: false,
        items: [],
        totalBeforeDedupe: 0,
        totalAfterDedupe: 0,
      }),
    };
    const manifest = await new EncounterChartExportService(
      prisma as never,
      audit as never,
      unifiedTimelineService as never
    ).getManifest("facility-A", "enc-1");
    const initiationRow = manifest.encounter.clinicalDocumentationEntries.find(
      (e) => e.cardId === RESTRAINT_INITIATION_CARD_ID
    )!;
    expect(initiationRow.payloadJson).toEqual(initiationPayload);
    expect(initiationRow.witnessStatus).toBe("WITNESSED");
    expect(initiationRow.payloadSummary.some((l) => l.key === "Type")).toBe(true);
    const renewalRow = manifest.encounter.clinicalDocumentationEntries.find(
      (e) => e.cardId === RESTRAINT_RENEWAL_CARD_ID
    )!;
    expect(renewalRow.payloadSummary.some((l) => l.key === "Renouvellement")).toBe(true);
    const html = renderEncounterChartExportHtml(manifest);
    expect(html).toContain("RESTRAINT_DOCUMENTATION");
    expect(html).toContain("Comportementale");
    expect(html).toContain("Paul Témoin");
    expect(html).toContain("Renouvellement");
  });

  it("ROI consumes chart export snapshots — no separate ROI manifest field required in EDOC.2", () => {
    const roiSource = readFileSync(join(__dirname, "../roi/chart-roi.service.ts"), "utf8");
    expect(roiSource).toContain("EncounterChartExportService");
    expect(roiSource).toContain("createSnapshot");
    expect(roiSource).not.toMatch(/clinicalDocumentationEntries\s*=/);
  });
});
