/**
 * Phase 5D / 5E — chart-export.service unit tests.
 *
 * Validates the invariants explicitly required by the phase brief:
 *  - 200/manifest path returns for closed encounter (livePreview: false).
 *  - Open encounter returns the manifest with livePreview: true (no 409).
 *  - Cross-facility access throws NotFoundException (404, not 403).
 *  - Result attachments never include `dataBase64`.
 *  - Audit metadata is PHI-safe (no patient name / MRN / DOB / clinical text).
 */

import { NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import {
  EncounterChartExportService,
  ENCOUNTER_CHART_EXPORT_INCLUDED_DOMAIN_KEYS,
  ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
} from "./chart-export.service";

type AnyMock = jest.Mock;

function makeEncounterRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
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
    clinicalDocumentationEntries: [],
    ...overrides,
  };
}

function makePrismaMock(opts: {
  encounterRow?: ReturnType<typeof makeEncounterRow> | null;
  results?: unknown[];
}) {
  const encounter = opts.encounterRow ?? makeEncounterRow();
  return {
    encounter: { findFirst: jest.fn().mockResolvedValue(encounter) },
    triage: { findFirst: jest.fn().mockResolvedValue(null) },
    triageVitalsReading: { findMany: jest.fn().mockResolvedValue([]) },
    encounterClinicalEvent: {
      findMany: jest.fn().mockImplementation((args?: { where?: { eventType?: unknown } }) => {
        const et = args?.where?.eventType;
        if (et && typeof et === "object" && "in" in (et as object)) return Promise.resolve([]);
        return Promise.resolve([]);
      }),
    },
    diagnosis: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    order: { findMany: jest.fn().mockResolvedValue([]) },
    result: { findMany: jest.fn().mockResolvedValue(opts.results ?? []) },
    medicationAdministration: { findMany: jest.fn().mockResolvedValue([]) },
    medicationAdministrationVerification: { findMany: jest.fn().mockResolvedValue([]) },
    medicationWasteDocumentation: { findMany: jest.fn().mockResolvedValue([]) },
    medicationAdministrationOverride: { findMany: jest.fn().mockResolvedValue([]) },
    pharmacyVerification: { findMany: jest.fn().mockResolvedValue([]) },
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

function makeService(prisma: ReturnType<typeof makePrismaMock>) {
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
  const service = new EncounterChartExportService(prisma as any, audit as any, unifiedTimelineService as any);
  return { service, prisma, audit };
}

describe("EncounterChartExportService.getManifest", () => {
  it("returns a manifest with livePreview=false for a CLOSED encounter and audits CHART_ACCESS with PHI-safe metadata", async () => {
    const prisma = makePrismaMock({});
    const { service, audit } = makeService(prisma);

    const manifest = await service.getManifest("facility-A", "enc-1", "user-clin-1", "1.2.3.4", "ua");

    expect(manifest.manifestVersion).toBe(ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION);
    expect(manifest.livePreview).toBe(false);
    expect(manifest.encounter.id).toBe("enc-1");
    expect(manifest.encounter.status).toBe("CLOSED");
    expect(manifest.encounter.providerDocumentation.status).toBe("SIGNED");
    expect(manifest.encounter.providerDocumentation.signedAt).toBe("2026-01-02T00:30:00.000Z");
    expect(manifest.encounter.providerDocumentation.signedByDisplayFr).toBe("Alice Doctor");
    expect(manifest.deferredDomains.length).toBeGreaterThan(0);

    expect(audit.log).toHaveBeenCalledTimes(1);
    const [actionArg, entityTypeArg, payloadArg] = (audit.log as AnyMock).mock.calls[0];
    expect(actionArg).toBe(AuditAction.CHART_ACCESS);
    expect(entityTypeArg).toBe("ENCOUNTER");
    const meta = (payloadArg as { metadata: Record<string, unknown> }).metadata;
    expect(meta).toEqual(
      expect.objectContaining({
        chartExport: true,
        exportFormat: "json",
        manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
        livePreview: false,
        encounterStatus: "CLOSED",
        deferredDomainCount: expect.any(Number),
      })
    );

    // includedDomainCount is derived from the manifest, not hardcoded.
    const expectedIncluded = ENCOUNTER_CHART_EXPORT_INCLUDED_DOMAIN_KEYS.filter(
      (k) => manifest[k] !== null && typeof manifest[k] !== "undefined"
    ).length;
    expect(meta.includedDomainCount).toBe(expectedIncluded);
    expect(meta.includedDomainCount).toBeLessThanOrEqual(
      ENCOUNTER_CHART_EXPORT_INCLUDED_DOMAIN_KEYS.length
    );

    // PHI-safe: no patient identity / clinical text in metadata.
    const PHI_FORBIDDEN = [
      "firstName",
      "lastName",
      "mrn",
      "globalMrn",
      "dob",
      "chiefComplaint",
      "resultText",
      "diagnosis",
      "diagnosisCode",
      "diagnosisDescription",
    ];
    for (const key of PHI_FORBIDDEN) {
      expect(meta).not.toHaveProperty(key);
    }
    const metaJson = JSON.stringify(meta);
    expect(metaJson).not.toMatch(/John|Doe|MRN-123|Chest pain|GMRN-XYZ|1980-05-04/);
  });

  it("returns the manifest with livePreview=true for an OPEN encounter (does not throw 409)", async () => {
    const open = makeEncounterRow({ status: "OPEN", workflowState: "ARRIVED", dischargedAt: null });
    const prisma = makePrismaMock({ encounterRow: open });
    const { service, audit } = makeService(prisma);

    const manifest = await service.getManifest("facility-A", "enc-1");

    expect(manifest.livePreview).toBe(true);
    expect(manifest.encounter.status).toBe("OPEN");
    expect((audit.log as AnyMock).mock.calls[0][2].metadata).toEqual(
      expect.objectContaining({
        livePreview: true,
        encounterStatus: "OPEN",
        exportFormat: "json",
      })
    );
  });

  it("includes additive observationStay on manifest encounter for INPATIENT rows", async () => {
    const inpatient = makeEncounterRow({
      type: "INPATIENT",
      admittedAt: new Date("2026-01-01T08:00:00.000Z"),
      dischargedAt: new Date("2026-01-01T20:00:00.000Z"),
    });
    const prisma = makePrismaMock({ encounterRow: inpatient });
    const { service } = makeService(prisma);

    const manifest = await service.getManifest("facility-A", "enc-1");

    expect(manifest.encounter.observationStay?.applicable).toBe(true);
    expect(manifest.encounter.observationStay?.carePathLabel).toBe("observation_short_stay");
    expect(manifest.encounter.observationStay?.observationLosHours).toBe(12);
    expect(manifest.encounter.observationStay?.preview).toBe(false);
  });

  it("records exportFormat html in PHI-safe audit metadata when requested", async () => {
    const prisma = makePrismaMock({});
    const { service, audit } = makeService(prisma);

    await service.getManifest("facility-A", "enc-1", "u", "1.1.1.1", "ua", { exportFormat: "html" });

    expect((audit.log as AnyMock).mock.calls[0][2].metadata).toEqual(
      expect.objectContaining({
        chartExport: true,
        exportFormat: "html",
        manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
      })
    );
    const meta = (audit.log as AnyMock).mock.calls[0][2].metadata;
    const metaJson = JSON.stringify(meta);
    expect(metaJson).not.toMatch(/John|Doe|MRN-123/);
  });

  it("denies cross-facility access by returning NotFoundException (no facility/encounter existence leak)", async () => {
    const prisma = makePrismaMock({ encounterRow: null });
    prisma.encounter.findFirst = jest.fn().mockResolvedValue(null);
    const { service, audit } = makeService(prisma);

    await expect(service.getManifest("facility-WRONG", "enc-1")).rejects.toBeInstanceOf(
      NotFoundException
    );
    // Audit must not be written when the encounter is not visible to this facility.
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("never returns base64 attachment payloads (only file metadata)", async () => {
    const prisma = makePrismaMock({
      results: [
        {
          orderItemId: "item-1",
          resultText: "WBC 12.3",
          resultData: {
            structured: { unit: "10^9/L" },
            attachments: [
              {
                fileName: "lab-pdf.pdf",
                mimeType: "application/pdf",
                sizeBytes: 12345,
                dataBase64: "BASE64-PAYLOAD-SHOULD-NOT-LEAK",
              },
            ],
          },
          criticalValue: false,
          verifiedAt: new Date("2026-01-01T01:00:00.000Z"),
          verifiedByUserId: null,
          acknowledgedByProviderAt: null,
          acknowledgedByUserId: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T01:00:00.000Z"),
          orderItem: { id: "item-1", catalogItemType: "LAB_TEST" },
        },
      ],
    });
    const { service } = makeService(prisma);

    const manifest = await service.getManifest("facility-A", "enc-1");

    expect(manifest.results).toHaveLength(1);
    const result = manifest.results[0];
    expect(result.attachmentCount).toBe(1);
    expect(result.attachmentMetadata).toEqual([
      { fileName: "lab-pdf.pdf", mimeType: "application/pdf", sizeBytes: 12345 },
    ]);
    // The whole serialized manifest must not contain the base64 marker anywhere.
    expect(JSON.stringify(manifest)).not.toContain("BASE64-PAYLOAD-SHOULD-NOT-LEAK");
    // The structured (non-attachments) keys are reported by name only — no values leaked.
    expect(result.resultDataKeys).toEqual(["structured"]);
  });

  it("scopes the encounter lookup by facilityId, not just by id (cross-facility safety)", async () => {
    const prisma = makePrismaMock({});
    const { service } = makeService(prisma);

    await service.getManifest("facility-A", "enc-1");

    const args = (prisma.encounter.findFirst as AnyMock).mock.calls[0][0];
    expect(args.where).toEqual({ id: "enc-1", facilityId: "facility-A" });
  });
});
