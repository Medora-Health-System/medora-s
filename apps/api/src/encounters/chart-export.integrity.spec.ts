/**
 * Phase 6 — chart export chain-of-custody integration tests.
 *
 * Confirms:
 *  - createSnapshot persists a server-issued HMAC signature when the secret
 *    is configured, and records `signaturePresent: true` in PHI-safe audit.
 *  - createSnapshot fails closed in production when the secret is missing
 *    (no DB write, no audit row).
 *  - getSnapshot success path verifies the signature and reports
 *    `signatureVerified: true` in the PHI-safe `RECORD_EXPORT_VIEW` audit.
 *  - getSnapshot signature mismatch (tampered signature) raises the integrity
 *    marker AND audits `RECORD_EXPORT_INTEGRITY_FAILURE` with PHI-safe metadata.
 *  - getSnapshot in production reading a signed row without the secret raises
 *    integrity failure (cannot prove authorship).
 *  - getSnapshot still accepts pre-Phase-6 unsigned rows (manifestSignature is
 *    null) so historical snapshots remain readable; signatureChecked: false
 *    is recorded in the view audit.
 *  - Service does not expose mutable surfaces (no updateSnapshot / deleteSnapshot).
 */

import { InternalServerErrorException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import {
  EncounterChartExportService,
  ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
  ENCOUNTER_CHART_EXPORT_TEMPLATE_VERSION,
  RECORD_EXPORT_INTEGRITY_MISMATCH,
} from "./chart-export.service";
import { canonicalizeForHash, sha256Hex } from "./chart-export-hash.util";
import {
  CHART_EXPORT_SIGNATURE_ALGORITHM,
  CHART_EXPORT_SIGNATURE_VERSION,
  signManifestHash,
} from "./chart-export-signature.util";

type AnyMock = jest.Mock;

const SECRET = "phase-6-test-signing-secret-do-not-use-in-prod";
const PHI_REGEX = /John|Doe|MRN-123|GMRN-XYZ|1980-05-04|Chest pain/;

async function withEnv<T>(
  env: Record<string, string | undefined>,
  fn: () => Promise<T> | T
): Promise<T> {
  const before: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) {
    before[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k] as string;
  }
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(before)) {
      if (before[k] === undefined) delete process.env[k];
      else process.env[k] = before[k] as string;
    }
  }
}

function makeEncounterRow() {
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
  };
}

function makePrismaMock(row?: Record<string, unknown> | null) {
  return {
    encounter: { findFirst: jest.fn().mockResolvedValue(makeEncounterRow()) },
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
          manifestJson: data.manifestJson,
          manifestSignature: data.manifestSignature,
          renderedFormat: data.renderedFormat,
          livePreview: data.livePreview,
          patientId: data.patientId,
          encounterId: data.encounterId,
          facilityId: data.facilityId,
        });
      }),
      findFirst: jest.fn().mockResolvedValue(row ?? null),
    },
  };
}

function makeService(prisma: ReturnType<typeof makePrismaMock>) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new EncounterChartExportService(prisma as any, audit as any);
  return { service, prisma, audit };
}

describe("EncounterChartExportService — Phase 6 signing on createSnapshot", () => {
  it("persists a server-issued signature when CHART_EXPORT_SIGNING_SECRET is set", async () => {
    await withEnv(
      { NODE_ENV: "test", CHART_EXPORT_SIGNING_SECRET: SECRET },
      async () => {
        const prisma = makePrismaMock();
        const { service, audit } = makeService(prisma);

        await service.createSnapshot("facility-A", "enc-1", "u-1");

        const createCall = (prisma.encounterChartExport.create as AnyMock).mock.calls[0][0] as {
          data: Record<string, unknown>;
        };
        const sig = createCall.data.manifestSignature as string;
        expect(typeof sig).toBe("string");
        expect(sig.startsWith(`${CHART_EXPORT_SIGNATURE_VERSION}:`)).toBe(true);
        expect(sig).toBe(signManifestHash(SECRET, createCall.data.manifestHash as string));

        // Audit metadata records signature presence in a PHI-safe way.
        const [, , payloadArg] = (audit.log as AnyMock).mock.calls[0];
        const meta = (payloadArg as { metadata: Record<string, unknown> }).metadata;
        expect(meta.signaturePresent).toBe(true);
        expect(meta.signatureAlgorithm).toBe(CHART_EXPORT_SIGNATURE_ALGORITHM);
        expect(meta.signatureVersion).toBe(CHART_EXPORT_SIGNATURE_VERSION);
        // Audit must never carry the secret or the signature itself.
        expect(JSON.stringify(meta)).not.toContain(SECRET);
        expect(JSON.stringify(meta)).not.toContain(sig);
        expect(JSON.stringify(meta)).not.toMatch(PHI_REGEX);
      }
    );
  });

  it("FAILS CLOSED in production when CHART_EXPORT_SIGNING_SECRET is missing", async () => {
    await withEnv(
      { NODE_ENV: "production", CHART_EXPORT_SIGNING_SECRET: undefined },
      async () => {
        const prisma = makePrismaMock();
        const { service, audit } = makeService(prisma);

        await expect(service.createSnapshot("facility-A", "enc-1", "u-1")).rejects.toThrow(
          /CHART_EXPORT_SIGNING_SECRET/
        );

        // No DB write, no audit row.
        expect(prisma.encounterChartExport.create).not.toHaveBeenCalled();
        expect(audit.log).not.toHaveBeenCalled();
      }
    );
  });

  it("permits unsigned snapshots in non-production when the secret is missing", async () => {
    await withEnv(
      { NODE_ENV: "test", CHART_EXPORT_SIGNING_SECRET: undefined },
      async () => {
        const prisma = makePrismaMock();
        const { service, audit } = makeService(prisma);

        await service.createSnapshot("facility-A", "enc-1", "u-1");

        const createCall = (prisma.encounterChartExport.create as AnyMock).mock.calls[0][0] as {
          data: Record<string, unknown>;
        };
        expect(createCall.data.manifestSignature).toBeNull();

        const [, , payloadArg] = (audit.log as AnyMock).mock.calls[0];
        const meta = (payloadArg as { metadata: Record<string, unknown> }).metadata;
        expect(meta.signaturePresent).toBe(false);
        expect(meta.signatureAlgorithm).toBeNull();
        expect(meta.signatureVersion).toBeNull();
      }
    );
  });
});

describe("EncounterChartExportService — Phase 6 verification on getSnapshot", () => {
  function buildSignedRow() {
    const stored = {
      manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
      generatedAt: "2026-01-02T02:00:00.000Z",
      livePreview: false,
      caps: { clinicalTimeline: 100, auditTimeline: 200, diagnoses: 200, followUps: 100 },
      facility: { id: "facility-A", name: "Clinique A" },
      encounter: { id: "enc-1", status: "CLOSED" },
      patient: { id: "patient-1" },
    } as Record<string, unknown>;
    const realHash = sha256Hex(canonicalizeForHash(stored));
    const signature = signManifestHash(SECRET, realHash);
    return {
      id: "snap-1",
      patientId: "patient-1",
      encounterId: "enc-1",
      facilityId: "facility-A",
      manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
      manifestHash: realHash,
      manifestSignature: signature,
      manifestJson: stored,
      templateVersion: ENCOUNTER_CHART_EXPORT_TEMPLATE_VERSION,
      createdAt: new Date("2026-01-02T02:00:00.000Z"),
    };
  }

  it("verifies the signature on retrieval and records signatureVerified: true in the view audit", async () => {
    await withEnv(
      { NODE_ENV: "test", CHART_EXPORT_SIGNING_SECRET: SECRET },
      async () => {
        const prisma = makePrismaMock(buildSignedRow());
        const { service, audit } = makeService(prisma);

        await service.getSnapshot("facility-A", "enc-1", "snap-1", "json", "u-1");

        expect(audit.log).toHaveBeenCalledTimes(1);
        const [action, , payload] = (audit.log as AnyMock).mock.calls[0];
        expect(action).toBe(AuditAction.RECORD_EXPORT_VIEW);
        const meta = (payload as { metadata: Record<string, unknown> }).metadata;
        expect(meta).toEqual(
          expect.objectContaining({
            signaturePresent: true,
            signatureVerified: true,
            signatureVersion: CHART_EXPORT_SIGNATURE_VERSION,
          })
        );
      }
    );
  });

  it("fails integrity (and audits RECORD_EXPORT_INTEGRITY_FAILURE) when the signature is tampered", async () => {
    await withEnv(
      { NODE_ENV: "test", CHART_EXPORT_SIGNING_SECRET: SECRET },
      async () => {
        const row = buildSignedRow();
        // Tamper the signature hex (last char flip) without touching the hash.
        const original = row.manifestSignature;
        const tampered = original.slice(0, -1) + (original.endsWith("a") ? "b" : "a");
        row.manifestSignature = tampered;
        const prisma = makePrismaMock(row);
        const { service, audit } = makeService(prisma);

        await expect(
          service.getSnapshot("facility-A", "enc-1", "snap-1", "json", "u-1")
        ).rejects.toBeInstanceOf(InternalServerErrorException);
        await expect(
          service.getSnapshot("facility-A", "enc-1", "snap-1", "json", "u-1")
        ).rejects.toMatchObject({ message: RECORD_EXPORT_INTEGRITY_MISMATCH });

        // At least one audit, all of which are RECORD_EXPORT_INTEGRITY_FAILURE
        // — never a successful RECORD_EXPORT_VIEW for the same call.
        expect(audit.log).toHaveBeenCalled();
        for (const call of (audit.log as AnyMock).mock.calls) {
          const [action, , payload] = call as [
            AuditAction,
            string,
            { critical?: boolean; metadata: Record<string, unknown> }
          ];
          expect(action).toBe(AuditAction.RECORD_EXPORT_INTEGRITY_FAILURE);
          expect(payload.critical).toBe(true);
          expect(payload.metadata).toEqual(
            expect.objectContaining({
              chartExport: true,
              snapshotId: "snap-1",
              format: "json",
              hashMismatch: false,
              signatureChecked: true,
              signatureMismatch: true,
              signatureVersion: CHART_EXPORT_SIGNATURE_VERSION,
            })
          );
          // No PHI / no secret leak.
          expect(JSON.stringify(payload.metadata)).not.toMatch(PHI_REGEX);
          expect(JSON.stringify(payload.metadata)).not.toContain(SECRET);
        }
      }
    );
  });

  it("FAILS CLOSED in production when the secret is missing but the row is signed", async () => {
    await withEnv(
      { NODE_ENV: "production", CHART_EXPORT_SIGNING_SECRET: undefined },
      async () => {
        // Arrange: a signed row exists (was created earlier with a secret),
        // but the production env is misconfigured at retrieval time.
        const row = buildSignedRow();
        const prisma = makePrismaMock(row);
        const { service, audit } = makeService(prisma);

        await expect(
          service.getSnapshot("facility-A", "enc-1", "snap-1", "json", "u-1")
        ).rejects.toMatchObject({ message: RECORD_EXPORT_INTEGRITY_MISMATCH });
        // The integrity-failure audit attempt itself looks up the secret too;
        // accept that no audit was written, but ensure we never log a
        // successful view in this misconfigured state.
        for (const call of (audit.log as AnyMock).mock.calls) {
          const [action] = call as [AuditAction];
          expect(action).not.toBe(AuditAction.RECORD_EXPORT_VIEW);
        }
      }
    );
  });

  it("still accepts pre-Phase-6 unsigned rows (manifestSignature is null)", async () => {
    await withEnv(
      { NODE_ENV: "test", CHART_EXPORT_SIGNING_SECRET: SECRET },
      async () => {
        const stored = {
          manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
          legacy: true,
        } as Record<string, unknown>;
        const realHash = sha256Hex(canonicalizeForHash(stored));
        const row = {
          id: "snap-legacy",
          patientId: "patient-1",
          encounterId: "enc-1",
          facilityId: "facility-A",
          manifestVersion: ENCOUNTER_CHART_EXPORT_MANIFEST_VERSION,
          manifestHash: realHash,
          manifestSignature: null,
          manifestJson: stored,
          templateVersion: ENCOUNTER_CHART_EXPORT_TEMPLATE_VERSION,
          createdAt: new Date("2026-01-02T02:00:00.000Z"),
        };
        const prisma = makePrismaMock(row);
        const { service, audit } = makeService(prisma);

        await service.getSnapshot("facility-A", "enc-1", "snap-legacy", "json", "u-1");

        const [action, , payload] = (audit.log as AnyMock).mock.calls[0];
        expect(action).toBe(AuditAction.RECORD_EXPORT_VIEW);
        const meta = (payload as { metadata: Record<string, unknown> }).metadata;
        expect(meta).toEqual(
          expect.objectContaining({
            signaturePresent: false,
            signatureVerified: false,
            signatureVersion: null,
          })
        );
      }
    );
  });
});

describe("EncounterChartExportService — service-level immutability surface", () => {
  it("does not expose any mutable snapshot methods", () => {
    const proto = EncounterChartExportService.prototype as unknown as Record<string, unknown>;
    const exposed = Object.getOwnPropertyNames(proto);
    for (const name of exposed) {
      expect(name).not.toMatch(/^update|^delete|^remove|^modify|^edit|^overwrite/i);
    }
    // Allow-list the only public mutation (creation) and the read paths we expect.
    expect(exposed.sort()).toEqual(
      expect.arrayContaining(["constructor", "createSnapshot", "getManifest", "getSnapshot"])
    );
  });
});
