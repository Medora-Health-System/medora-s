/**
 * M1.3F.8 — Medication governance legal chart, export, snapshot, and audit coverage.
 */

import { AuditAction } from "@prisma/client";
import { renderEncounterChartExportHtml } from "./chart-export-html.util";
import {
  EncounterChartExportService,
  ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
} from "./chart-export.service";
import {
  auditActionShortLabelFr,
  CHART_AUDIT_TIMELINE_ACTIONS,
  mapAuditLogRowToTimelineItem,
} from "../patients/chart-audit-timeline.util";

const MAR_GOVERNANCE_AUDIT_ACTIONS = [
  AuditAction.MEDICATION_WITNESS_VERIFICATION_COMPLETED,
  AuditAction.MEDICATION_WASTE_RECORDED,
  AuditAction.MEDICATION_WASTE_WITNESSED,
  AuditAction.CONTROLLED_SUBSTANCE_OVERRIDE,
  AuditAction.HIGH_ALERT_DOUBLE_CHECK_COMPLETED,
  AuditAction.HIGH_ALERT_OVERRIDE,
  AuditAction.LASA_WARNING_ACKNOWLEDGED,
  AuditAction.LASA_OVERRIDE,
  AuditAction.PHARMACY_VERIFICATION_COMPLETED,
  AuditAction.PHARMACY_VERIFICATION_REJECTED,
  AuditAction.PHARMACY_VERIFICATION_OVERRIDE,
] as const;

function makeEncounterRow() {
  return {
    id: "enc-1",
    facilityId: "facility-A",
    patientId: "patient-1",
    type: "EMERGENCY",
    status: "CLOSED",
    workflowState: "DISCHARGED",
    chiefComplaint: null,
    roomLabel: null,
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
    providerDocumentationSignedAt: null,
    providerDocumentationSignedByUserId: null,
    physicianAssignedUserId: null,
    physicianAssigned: null,
    providerDocumentationSignedBy: null,
    patient: {
      id: "patient-1",
      mrn: "MRN-1",
      globalMrn: null,
      nationalId: null,
      firstName: "Jean",
      lastName: "Patient",
      dob: new Date("1990-01-01"),
      sex: "MALE",
      sexAtBirth: "MALE",
    },
    facility: { id: "facility-A", name: "Clinique" },
    providerAddenda: [],
    encounterNotes: [],
    clinicalDocumentationEntries: [],
  };
}

function makePrismaWithMarGovernance(opts: {
  marRows: Array<Record<string, unknown>>;
  verifications?: unknown[];
  waste?: unknown[];
  overrides?: unknown[];
  pharmacy?: unknown[];
  auditRows?: unknown[];
}) {
  return {
    encounter: { findFirst: jest.fn().mockResolvedValue(makeEncounterRow()) },
    triage: { findFirst: jest.fn().mockResolvedValue(null) },
    triageVitalsReading: { findMany: jest.fn().mockResolvedValue([]) },
    encounterClinicalEvent: { findMany: jest.fn().mockResolvedValue([]) },
    diagnosis: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    order: { findMany: jest.fn().mockResolvedValue([]) },
    result: { findMany: jest.fn().mockResolvedValue([]) },
    medicationAdministration: { findMany: jest.fn().mockResolvedValue(opts.marRows) },
    medicationAdministrationVerification: {
      findMany: jest.fn().mockResolvedValue(opts.verifications ?? []),
    },
    medicationWasteDocumentation: {
      findMany: jest.fn().mockResolvedValue(opts.waste ?? []),
    },
    medicationAdministrationOverride: {
      findMany: jest.fn().mockResolvedValue(opts.overrides ?? []),
    },
    pharmacyVerification: {
      findMany: jest.fn().mockResolvedValue(opts.pharmacy ?? []),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue(opts.auditRows ?? []),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    followUp: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn().mockResolvedValue(null) },
  };
}

function makeExportService(prisma: ReturnType<typeof makePrismaWithMarGovernance>) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const unifiedTimelineService = {
    getUnifiedTimeline: jest.fn().mockResolvedValue({
      capped: false,
      items: [],
      totalBeforeDedupe: 0,
      totalAfterDedupe: 0,
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new EncounterChartExportService(prisma as any, audit as any, unifiedTimelineService as any);
}

const baseMar = {
  id: "mar-1",
  orderItemId: "oi-1",
  medicationLabelSnapshot: "Morphine 4 mg IV",
  route: "IV",
  doseValue: "4",
  doseUnit: "mg",
  administeredQuantity: "4",
  administeredAt: new Date("2026-05-28T12:00:00.000Z"),
  marAction: "administered",
  notes: null,
  administeredBy: { firstName: "Marie", lastName: "Infirmière" },
};

describe("M1.3F.8 medication governance legal chart integration", () => {
  it("exposes MAR governance audit actions on chart audit timeline", () => {
    for (const action of MAR_GOVERNANCE_AUDIT_ACTIONS) {
      expect(CHART_AUDIT_TIMELINE_ACTIONS).toContain(action);
      expect(auditActionShortLabelFr(action)).not.toBe(String(action));
    }
  });

  it("maps governance audit rows without patient narrative in detail", () => {
    const item = mapAuditLogRowToTimelineItem({
      id: "a1",
      action: AuditAction.MEDICATION_WITNESS_VERIFICATION_COMPLETED,
      createdAt: new Date("2026-05-28T12:00:00.000Z"),
      metadata: {
        encounterId: "enc-1",
        verificationStatus: "COMPLETED",
        catalogMedicationId: "cat-1",
      },
      encounterId: "enc-1",
      entityType: "MEDICATION_ADMINISTRATION",
      entityId: "mar-1",
      user: { firstName: "Marie", lastName: "Infirmière" },
    });
    expect(item.shortLabelFr).toMatch(/Témoin MAR/);
    expect(item.detailFr).toMatch(/Statut/);
    expect(JSON.stringify(item)).not.toMatch(/Morphine/i);
  });

  it("includes controlled witness + waste + override in manifest and HTML export", async () => {
    const prisma = makePrismaWithMarGovernance({
      marRows: [baseMar],
      verifications: [
        {
          medicationAdministrationId: "mar-1",
          verificationType: "WITNESS",
          verificationStatus: "COMPLETED",
          createdAt: new Date("2026-05-28T12:00:00.000Z"),
        },
      ],
      waste: [
        {
          medicationAdministrationId: "mar-1",
          status: "COMPLETED",
          witnessUserId: "u-witness",
          createdAt: new Date("2026-05-28T12:01:00.000Z"),
        },
      ],
      overrides: [
        {
          medicationAdministrationId: "mar-1",
          overrideType: "CONTROLLED_SUBSTANCE_OVERRIDE",
          metadata: { sourcePhase: "M1.3F.4" },
          createdAt: new Date("2026-05-28T12:00:00.000Z"),
        },
      ],
    });
    const service = makeExportService(prisma);
    const manifest = await service.getManifest("facility-A", "enc-1");

    expect(manifest.manifestVersion).toBe(ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION);
    expect(manifest.medicationGovernanceSummaries).toHaveLength(1);
    const keys = manifest.medicationGovernanceSummaries[0]!.lines.map((l) => l.key);
    expect(keys).toEqual(
      expect.arrayContaining(["witness_completed", "waste_documented", "controlled_override"])
    );
    expect(manifest.medicationAdministrations[0]!.governanceSummary?.hasOverride).toBe(true);

    const html = renderEncounterChartExportHtml(manifest, { locale: "fr" });
    expect(html).toContain("Medication governance summary");
    expect(html).toContain("Témoin complété");
    expect(html).toContain("Perte documentée");
    expect(html).toContain("Dérogation substance contrôlée");
    expect(JSON.stringify(manifest)).toContain("medicationGovernanceSummaries");
  });

  it("includes high-alert double-check and override", async () => {
    const prisma = makePrismaWithMarGovernance({
      marRows: [{ ...baseMar, id: "mar-ha", medicationLabelSnapshot: "Heparin" }],
      verifications: [
        {
          medicationAdministrationId: "mar-ha",
          verificationType: "INDEPENDENT_DOUBLE_CHECK",
          verificationStatus: "COMPLETED",
          createdAt: new Date("2026-05-28T13:00:00.000Z"),
        },
      ],
      overrides: [
        {
          medicationAdministrationId: "mar-ha",
          overrideType: "HIGH_ALERT_OVERRIDE",
          metadata: null,
          createdAt: new Date("2026-05-28T13:00:00.000Z"),
        },
      ],
    });
    const manifest = await makeExportService(prisma).getManifest("facility-A", "enc-1");
    const keys = manifest.medicationGovernanceSummaries[0]!.lines.map((l) => l.key);
    expect(keys).toEqual(expect.arrayContaining(["double_check_completed", "high_alert_override"]));
  });

  it("includes LASA acknowledgment and override", async () => {
    const prisma = makePrismaWithMarGovernance({
      marRows: [{ ...baseMar, id: "mar-lasa", medicationLabelSnapshot: "Hydromorphone" }],
      verifications: [
        {
          medicationAdministrationId: "mar-lasa",
          verificationType: "LASA_ACKNOWLEDGMENT",
          verificationStatus: "COMPLETED",
          createdAt: new Date("2026-05-28T14:00:00.000Z"),
        },
      ],
      overrides: [
        {
          medicationAdministrationId: "mar-lasa",
          overrideType: "LASA_OVERRIDE",
          metadata: null,
          createdAt: new Date("2026-05-28T14:00:00.000Z"),
        },
      ],
    });
    const manifest = await makeExportService(prisma).getManifest("facility-A", "enc-1");
    const keys = manifest.medicationGovernanceSummaries[0]!.lines.map((l) => l.key);
    expect(keys).toEqual(expect.arrayContaining(["lasa_acknowledged", "lasa_override"]));
  });

  it("includes pharmacy verified, rejected, and override paths", async () => {
    const verified = await makeExportService(
      makePrismaWithMarGovernance({
        marRows: [baseMar],
        pharmacy: [
          {
            orderItemId: "oi-1",
            verificationStatus: "VERIFIED",
            updatedAt: new Date("2026-05-28T11:00:00.000Z"),
          },
        ],
      })
    ).getManifest("facility-A", "enc-1");
    expect(verified.medicationGovernanceSummaries[0]!.lines.some((l) => l.key === "pharmacy_verified")).toBe(
      true
    );

    const rejected = await makeExportService(
      makePrismaWithMarGovernance({
        marRows: [baseMar],
        pharmacy: [
          {
            orderItemId: "oi-1",
            verificationStatus: "REJECTED",
            updatedAt: new Date("2026-05-28T11:00:00.000Z"),
          },
        ],
      })
    ).getManifest("facility-A", "enc-1");
    expect(rejected.medicationGovernanceSummaries[0]!.lines.some((l) => l.key === "pharmacy_rejected")).toBe(
      true
    );

    const override = await makeExportService(
      makePrismaWithMarGovernance({
        marRows: [baseMar],
        overrides: [
          {
            medicationAdministrationId: "mar-1",
            overrideType: "PHARMACY_PENDING_OVERRIDE",
            metadata: { overrideKind: "PHARMACY_VERIFICATION_OVERRIDE" },
            createdAt: new Date("2026-05-28T12:00:00.000Z"),
          },
        ],
      })
    ).getManifest("facility-A", "enc-1");
    expect(override.medicationGovernanceSummaries[0]!.lines.some((l) => l.key === "pharmacy_override")).toBe(
      true
    );
  });

  it("includes governance timeline entries for ROI/snapshot consumers", async () => {
    const prisma = makePrismaWithMarGovernance({
      marRows: [baseMar],
      verifications: [
        {
          medicationAdministrationId: "mar-1",
          verificationType: "WITNESS",
          verificationStatus: "COMPLETED",
          createdAt: new Date("2026-05-28T12:00:00.000Z"),
        },
      ],
    });
    const manifest = await makeExportService(prisma).getManifest("facility-A", "enc-1");
    expect(manifest.medicationGovernanceTimeline.items.length).toBeGreaterThan(0);
    expect(manifest.medicationGovernanceTimeline.items[0]!.titleFr).toMatch(/Témoin MAR/);
  });
});
