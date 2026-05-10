/**
 * Phase 5F — chart-export snapshot service tests (createSnapshot + getSnapshot).
 *
 * Exercised invariants:
 *  - CLOSED encounter snapshot creation succeeds, persists manifestJson + hash.
 *  - OPEN encounter snapshot creation rejected with 409 (no DB write).
 *  - Hash is deterministic: same manifest → same hash.
 *  - Retrieval verifies the stored hash; mismatch → 500 integrity marker.
 *  - Retrieval renders HTML from the stored manifest (no live recompute, no base64).
 *  - Cross-facility snapshot retrieval → 404 (no leak).
 *  - Audit metadata is PHI-safe (no name / MRN / DOB / chief complaint / dx text).
 *  - createSnapshot does NOT emit CHART_ACCESS (suppressed via skipAudit), only RECORD_EXPORT.
 */

import { ConflictException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import {
  EncounterChartExportService,
  ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
  ENCOUNTER_CHART_EXPORT_TEMPLATE_VERSION,
  RECORD_EXPORT_INTEGRITY_MISMATCH,
} from "./chart-export.service";
import { canonicalizeForHash, sha256Hex } from "./chart-export-hash.util";

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
    ...overrides,
  };
}

function makePrismaMock(opts: {
  encounterRow?: ReturnType<typeof makeEncounterRow> | null;
  /** Optional override for the chart-export row returned by `findFirst`. */
  chartExportRow?: Record<string, unknown> | null;
}) {
  const encounter = opts.encounterRow ?? makeEncounterRow();
  return {
    encounter: { findFirst: jest.fn().mockResolvedValue(encounter) },
    triage: { findFirst: jest.fn().mockResolvedValue(null) },
    triageVitalsReading: { findMany: jest.fn().mockResolvedValue([]) },
    encounterClinicalEvent: { findMany: jest.fn().mockResolvedValue([]) },
    diagnosis: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
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
    encounterChartExport: {
      create: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
        const data = args.data;
        return Promise.resolve({
          id: "snap-1",
          manifestVersion: data.manifestVersion,
          manifestHash: data.manifestHash,
          templateVersion: data.templateVersion ?? null,
          createdAt: new Date("2026-01-02T02:00:00.000Z"),
          // Echo back fields useful in tests:
          manifestJson: data.manifestJson,
          renderedFormat: data.renderedFormat,
          livePreview: data.livePreview,
          patientId: data.patientId,
          encounterId: data.encounterId,
          facilityId: data.facilityId,
        });
      }),
      findFirst: jest.fn().mockImplementation(() => {
        return Promise.resolve(opts.chartExportRow ?? null);
      }),
    },
  };
}

function makeService(prisma: ReturnType<typeof makePrismaMock>) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new EncounterChartExportService(prisma as any, audit as any);
  return { service, prisma, audit };
}

const PHI_REGEX = /John|Doe|MRN-123|GMRN-XYZ|1980-05-04|Chest pain/;

describe("EncounterChartExportService.createSnapshot", () => {
  it("creates a snapshot for a CLOSED encounter with manifest + SHA-256 hash, no CHART_ACCESS audit", async () => {
    const prisma = makePrismaMock({});
    const { service, audit } = makeService(prisma);

    const out = await service.createSnapshot("facility-A", "enc-1", "u-1", "1.1.1.1", "ua");

    expect(out.id).toBe("snap-1");
    expect(out.manifestVersion).toBe(ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION);
    expect(out.templateVersion).toBe(ENCOUNTER_CHART_EXPORT_TEMPLATE_VERSION);
    expect(out.manifestHash).toMatch(/^[0-9a-f]{64}$/);
    expect(out.createdAt).toBe("2026-01-02T02:00:00.000Z");

    // Persisted with the canonical-form JSON; hash matches a re-canonicalize of the stored value.
    const createCall = (prisma.encounterChartExport.create as AnyMock).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createCall.data.facilityId).toBe("facility-A");
    expect(createCall.data.encounterId).toBe("enc-1");
    expect(createCall.data.patientId).toBe("patient-1");
    expect(createCall.data.exportedByUserId).toBe("u-1");
    expect(createCall.data.renderedFormat).toBe("json");
    expect(createCall.data.livePreview).toBe(false);
    expect(createCall.data.manifestVersion).toBe(ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION);
    expect(createCall.data.templateVersion).toBe(ENCOUNTER_CHART_EXPORT_TEMPLATE_VERSION);
    const recomputed = sha256Hex(canonicalizeForHash(createCall.data.manifestJson));
    expect(createCall.data.manifestHash).toBe(recomputed);

    // Exactly one audit row, RECORD_EXPORT (critical), no CHART_ACCESS.
    expect(audit.log).toHaveBeenCalledTimes(1);
    const [actionArg, entityTypeArg, payloadArg] = (audit.log as AnyMock).mock.calls[0];
    expect(actionArg).toBe(AuditAction.RECORD_EXPORT);
    expect(entityTypeArg).toBe("ENCOUNTER_CHART_EXPORT");
    const payload = payloadArg as { critical?: boolean; metadata: Record<string, unknown> };
    expect(payload.critical).toBe(true);
    expect(payload.metadata).toEqual(
      expect.objectContaining({
        chartExport: true,
        snapshotId: "snap-1",
        manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
        templateVersion: ENCOUNTER_CHART_EXPORT_TEMPLATE_VERSION,
        manifestHash: recomputed,
        format: "json",
        livePreview: false,
        encounterStatus: "CLOSED",
      })
    );
    // PHI-safe.
    expect(JSON.stringify(payload.metadata)).not.toMatch(PHI_REGEX);
  });

  it("rejects snapshot creation for an OPEN encounter with 409 and writes nothing", async () => {
    const open = makeEncounterRow({
      status: "OPEN",
      workflowState: "ARRIVED",
      dischargedAt: null,
    });
    const prisma = makePrismaMock({ encounterRow: open });
    const { service, audit } = makeService(prisma);

    await expect(service.createSnapshot("facility-A", "enc-1")).rejects.toBeInstanceOf(
      ConflictException
    );

    expect(prisma.encounterChartExport.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("returns 404 for cross-facility snapshot creation (encounter not visible)", async () => {
    const prisma = makePrismaMock({});
    prisma.encounter.findFirst = jest.fn().mockResolvedValue(null);
    const { service, audit } = makeService(prisma);

    await expect(service.createSnapshot("facility-WRONG", "enc-1")).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(prisma.encounterChartExport.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("two snapshots of the same encounter produce the same hash given the same composed manifest", async () => {
    const prisma = makePrismaMock({});
    const { service } = makeService(prisma);

    const a = await service.createSnapshot("facility-A", "enc-1");
    const b = await service.createSnapshot("facility-A", "enc-1");

    expect(a.manifestHash).toBe(b.manifestHash);
  });
});

describe("EncounterChartExportService.getSnapshot", () => {
  function makeStoredManifest(overrides: Record<string, unknown> = {}) {
    return {
      manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
      generatedAt: "2026-01-02T02:00:00.000Z",
      livePreview: false,
      caps: { clinicalTimeline: 100, auditTimeline: 200, diagnoses: 200, followUps: 100 },
      facility: { id: "facility-A", name: "Clinique A" },
      encounter: {
        id: "enc-1",
        type: "EMERGENCY",
        status: "CLOSED",
        workflowState: "DISCHARGED",
        visitReason: null,
        chiefComplaint: "Stored & rendered <safely>",
        roomLabel: "ER-3",
        physicianAssigned: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T01:00:00.000Z",
        admittedAt: null,
        dischargedAt: "2026-01-02T00:00:00.000Z",
        dischargeStatus: "HOME",
        closedByDisplayFr: "Alice Doctor",
        closedAt: "2026-01-02T01:00:00.000Z",
        nursingAssessment: null,
        dischargeSummaryJson: null,
        admissionSummaryJson: null,
        treatmentPlan: null,
        clinicianImpression: null,
        providerNote: null,
        providerDocumentation: { status: "SIGNED", signedAt: null, signedByDisplayFr: null },
        providerAddenda: [],
      },
      patient: {
        id: "patient-1",
        mrn: "MRN-123",
        globalMrn: "GMRN-XYZ",
        nationalId: null,
        firstName: "John",
        lastName: "Doe",
        dob: "1980-05-04T00:00:00.000Z",
        sex: "MALE",
        sexAtBirth: "MALE",
      },
      triage: null,
      vitalsHistory: { entries: [] },
      diagnoses: { items: [], total: 0 },
      documentationHistory: { entries: [] },
      orders: [],
      results: [],
      medicationAdministrations: [],
      procedures: { entries: [] },
      ivAccess: { entries: [] },
      clinicalTimeline: { items: [], capped: false },
      auditTimelineSummary: { items: [], capped: false },
      followUps: { items: [] },
      deferredDomains: [{ domain: "pathways", reason: "deferred_to_phase_5f" }],
      ...overrides,
    };
  }

  function makeChartExportRow(stored: ReturnType<typeof makeStoredManifest>, hash?: string) {
    const realHash = sha256Hex(canonicalizeForHash(stored));
    return {
      id: "snap-1",
      patientId: "patient-1",
      encounterId: "enc-1",
      facilityId: "facility-A",
      manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
      manifestHash: hash ?? realHash,
      manifestJson: stored,
      templateVersion: ENCOUNTER_CHART_EXPORT_TEMPLATE_VERSION,
      createdAt: new Date("2026-01-02T02:00:00.000Z"),
    };
  }

  it("returns the stored manifest as JSON when format=json (no live recompute)", async () => {
    const stored = makeStoredManifest();
    const prisma = makePrismaMock({ chartExportRow: makeChartExportRow(stored) });
    const { service, audit } = makeService(prisma);

    const result = await service.getSnapshot("facility-A", "enc-1", "snap-1", "json", "u-1");

    expect(result.manifest).toEqual(stored);
    expect(result.html).toBeUndefined();
    // Live encounter table NOT consulted (no recompute).
    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
    // RECORD_EXPORT_VIEW logged with PHI-safe metadata.
    expect(audit.log).toHaveBeenCalledTimes(1);
    const [action, entityType, payload] = (audit.log as AnyMock).mock.calls[0];
    expect(action).toBe(AuditAction.RECORD_EXPORT_VIEW);
    expect(entityType).toBe("ENCOUNTER_CHART_EXPORT");
    const meta = (payload as { metadata: Record<string, unknown> }).metadata;
    expect(meta).toEqual(
      expect.objectContaining({
        snapshotId: "snap-1",
        manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
        templateVersion: ENCOUNTER_CHART_EXPORT_TEMPLATE_VERSION,
        format: "json",
      })
    );
    expect(JSON.stringify(meta)).not.toMatch(PHI_REGEX);
  });

  it("renders HTML from the stored manifest (escapes unsafe strings, no dataBase64)", async () => {
    const stored = makeStoredManifest();
    const prisma = makePrismaMock({ chartExportRow: makeChartExportRow(stored) });
    const { service } = makeService(prisma);

    const result = await service.getSnapshot("facility-A", "enc-1", "snap-1", "html");

    expect(typeof result.html).toBe("string");
    const html = result.html as string;
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("&lt;safely&gt;");
    expect(html).not.toContain("<safely>");
    expect(html).not.toMatch(/dataBase64/i);
  });

  it("throws integrity error (500) when stored hash mismatches recomputed hash and audits RECORD_EXPORT_INTEGRITY_FAILURE", async () => {
    const stored = makeStoredManifest();
    // Row claims the original hash, but content has been altered → mismatch.
    const realHash = sha256Hex(canonicalizeForHash(stored));
    const tamperedRow = makeChartExportRow(stored);
    (tamperedRow.manifestJson as Record<string, unknown>).manifestVersion = "tampered-v1";
    tamperedRow.manifestHash = realHash;
    const prisma = makePrismaMock({ chartExportRow: tamperedRow });
    const { service, audit } = makeService(prisma);

    await expect(
      service.getSnapshot("facility-A", "enc-1", "snap-1", "json")
    ).rejects.toMatchObject({
      message: RECORD_EXPORT_INTEGRITY_MISMATCH,
    });
    await expect(
      service.getSnapshot("facility-A", "enc-1", "snap-1", "json")
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    // Phase 6 — integrity failure now writes a critical, PHI-safe audit and
    // never emits a successful RECORD_EXPORT_VIEW.
    expect(audit.log).toHaveBeenCalled();
    for (const call of (audit.log as AnyMock).mock.calls) {
      const [action, entityType, payload] = call as [
        AuditAction,
        string,
        { critical?: boolean; metadata: Record<string, unknown> }
      ];
      expect(action).toBe(AuditAction.RECORD_EXPORT_INTEGRITY_FAILURE);
      expect(entityType).toBe("ENCOUNTER_CHART_EXPORT");
      expect(payload.critical).toBe(true);
      expect(payload.metadata).toEqual(
        expect.objectContaining({
          chartExport: true,
          snapshotId: "snap-1",
          format: "json",
          hashMismatch: true,
          signatureChecked: false,
          signatureMismatch: false,
        })
      );
      expect(JSON.stringify(payload.metadata)).not.toMatch(PHI_REGEX);
    }
  });

  it("returns 404 when the snapshot is not visible to the facility (cross-facility)", async () => {
    const prisma = makePrismaMock({ chartExportRow: null });
    const { service } = makeService(prisma);

    await expect(
      service.getSnapshot("facility-WRONG", "enc-1", "snap-1", "json")
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("scopes the snapshot lookup by facilityId AND encounterId AND id", async () => {
    const stored = makeStoredManifest();
    const prisma = makePrismaMock({ chartExportRow: makeChartExportRow(stored) });
    const { service } = makeService(prisma);

    await service.getSnapshot("facility-A", "enc-1", "snap-1", "json");

    const args = (prisma.encounterChartExport.findFirst as AnyMock).mock.calls[0][0];
    expect(args.where).toEqual({ id: "snap-1", encounterId: "enc-1", facilityId: "facility-A" });
  });
});
