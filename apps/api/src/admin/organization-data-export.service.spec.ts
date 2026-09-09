import { ConflictException, ForbiddenException } from "@nestjs/common";
import { AuditAction, OrganizationDataExportFormat, OrganizationDataExportStatus } from "@prisma/client";
import * as crypto from "crypto";
import * as fs from "fs";
import { OrganizationDataExportService } from "./organization-data-export.service";
import { buildStoredZip, readStoredZipEntries } from "./organization-data-export.zip";
import { createEncryptedExportEnvelope } from "./organization-data-export-envelope";
import { assertFacilityAdminFacilityScope } from "./user-mutation-boundary";
import { unwrapServerSecret, wrapServerSecret } from "../auth/mfa/server-secret-encryption.util";

jest.mock("./user-mutation-boundary", () => ({
  assertFacilityAdminFacilityScope: jest.fn(),
}));
jest.mock("../encounters/chart-export-html.util", () => ({
  renderEncounterChartExportHtml: jest.fn(() => "<html>chart</html>"),
}));

const assertScope = assertFacilityAdminFacilityScope as jest.MockedFunction<typeof assertFacilityAdminFacilityScope>;

function makeService(overrides?: {
  organizationDataExport?: Partial<Record<"create" | "findMany" | "findFirst" | "findUnique" | "update" | "updateMany", jest.Mock>>;
  queryRaw?: jest.Mock;
  chartManifest?: jest.Mock;
  storagePut?: jest.Mock;
  storageRead?: jest.Mock;
}) {
  const prisma = {
    facility: {
      findFirst: jest.fn().mockResolvedValue({ id: "fac-a", code: "FACA", name: "Facility A", isActive: true }),
      findUnique: jest.fn().mockResolvedValue({ id: "fac-a", code: "FACA", name: "Facility A" }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: "admin-a", firstName: "Ada", lastName: "Admin" }),
    },
    organizationDataExport: {
      create: overrides?.organizationDataExport?.create ?? jest.fn().mockResolvedValue({
        id: "exp-1",
        requestedAt: new Date("2026-09-08T06:00:00.000Z"),
        status: OrganizationDataExportStatus.QUEUED,
      }),
      findMany: overrides?.organizationDataExport?.findMany ?? jest.fn().mockResolvedValue([]),
      findFirst: overrides?.organizationDataExport?.findFirst ?? jest.fn(),
      findUnique: overrides?.organizationDataExport?.findUnique ?? jest.fn(),
      update: overrides?.organizationDataExport?.update ?? jest.fn().mockResolvedValue({}),
      updateMany: overrides?.organizationDataExport?.updateMany ?? jest.fn().mockResolvedValue({ count: 1 }),
    },
    $queryRawUnsafe: overrides?.queryRaw ?? jest.fn().mockResolvedValue([]),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const chartExport = {
    getManifest:
      overrides?.chartManifest ??
      jest.fn().mockResolvedValue({
        facility: { id: "fac-a", name: "Facility A" },
        encounter: { id: "enc-1" },
      }),
  };
  const storage = {
    put: overrides?.storagePut ?? jest.fn().mockResolvedValue({ objectKey: "obj-key", sizeBytes: 128 }),
    read: overrides?.storageRead ?? jest.fn().mockResolvedValue(Buffer.from("cipher", "utf8")),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const service = new OrganizationDataExportService(prisma as never, audit as never, chartExport as never, storage as never);
  jest.spyOn(service as any, "scheduleProcessing").mockImplementation(() => undefined);
  return { service, prisma, audit, chartExport, storage };
}

function makeExportRow(
  overrides?: Partial<{
    id: string;
    facilityId: string;
    status: OrganizationDataExportStatus;
    exportFormat: OrganizationDataExportFormat;
    requestedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    failedAt: Date | null;
    patientCount: number;
    encounterCount: number;
    fileSizeBytes: bigint | null;
    plaintextSha256: string | null;
    encryptedSha256: string | null;
    encryptionAlgorithm: string | null;
    encryptionIvBase64: string | null;
    encryptionAuthTagBase64: string | null;
    wrappedKeyReference: string | null;
    objectStorageKey: string | null;
    expiresAt: Date | null;
    downloadedAt: Date | null;
    failureCode: string | null;
    failureMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>
) {
  return {
    id: "exp-row-1",
    facilityId: "fac-a",
    status: OrganizationDataExportStatus.COMPLETED,
    exportFormat: OrganizationDataExportFormat.ZIP,
    requestedAt: new Date("2026-09-08T06:00:00.000Z"),
    startedAt: null,
    completedAt: new Date("2026-09-08T06:05:00.000Z"),
    failedAt: null,
    patientCount: 1,
    encounterCount: 1,
    fileSizeBytes: BigInt(128),
    plaintextSha256: "p".repeat(64),
    encryptedSha256: "e".repeat(64),
    encryptionAlgorithm: "AES-256-GCM",
    encryptionIvBase64: "iv-base64",
    encryptionAuthTagBase64: "tag-base64",
    wrappedKeyReference: "mfa-secret-encryption:v1",
    objectStorageKey: "internal/object/key",
    expiresAt: new Date("2026-09-09T06:00:00.000Z"),
    downloadedAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: new Date("2026-09-08T06:00:00.000Z"),
    updatedAt: new Date("2026-09-08T06:00:00.000Z"),
    ...overrides,
  };
}

describe("OrganizationDataExportService", () => {
  const originalMfaKey = process.env.MFA_SECRET_ENCRYPTION_KEY;

  beforeEach(() => {
    // Keep expiration tests deterministic as wall-clock time advances. Production
    // expiration enforcement remains exercised; only the test clock is fixed.
    jest.useFakeTimers({ now: new Date("2026-09-08T12:00:00.000Z") });
    assertScope.mockResolvedValue(undefined);
    process.env.MFA_SECRET_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  });

  afterAll(() => {
    jest.useRealTimers();
    if (originalMfaKey === undefined) {
      delete process.env.MFA_SECRET_ENCRYPTION_KEY;
      return;
    }
    process.env.MFA_SECRET_ENCRYPTION_KEY = originalMfaKey;
  });

  it("EXP-01: Authorized admin can request facility export", async () => {
    const { service } = makeService();
    const result = await service.requestExport({ actorUserId: "admin-a", facilityId: "fac-a", format: "ZIP" });
    expect(result.exportId).toBe("exp-1");
    expect(result.status).toBe("QUEUED");
    expect(result.decryptionSecret).toBeTruthy();
  });

  it("EXP-02: Unauthorized role cannot request export", async () => {
    assertScope.mockRejectedValueOnce(new ForbiddenException("denied"));
    const { service } = makeService();
    await expect(
      service.requestExport({ actorUserId: "user-x", facilityId: "fac-a", format: "ZIP" })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("EXP-03: Cross-facility export request/access is rejected", async () => {
    assertScope.mockRejectedValueOnce(new ForbiddenException("denied"));
    const { service } = makeService();
    await expect(service.getExport("admin-b", "fac-b", "exp-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("EXP-04/05/06/07/08: facility package includes scoped rows and valid manifest hashes", async () => {
    const queryRaw = jest.fn(async (query: string, facilityId: string) => {
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("COUNT(*)")) return [{ count: 1n }];
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("LIMIT")) {
        return [{ patientId: `${facilityId}-pat`, facilityId, allergies: { allergyNote: `${facilityId}-allergy` } }];
      }
      if (query.includes(`FROM "Patient"`) && query.includes(`COUNT(*)`)) return [{ count: 1n }];
      if (query.includes(`FROM "Encounter"`) && query.includes(`COUNT(*)`)) return [{ count: 1n }];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes(`COUNT(*)`)) return [{ count: 1n }];
      if (query.includes(`FROM "Patient"`) && query.includes("LIMIT")) return [{ id: `${facilityId}-pat`, facilityId }];
      if (query.includes(`FROM "Encounter"`) && query.includes("LIMIT")) return [{ id: `${facilityId}-enc`, patientId: `${facilityId}-pat`, facilityId }];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes("LIMIT"))
        return [{ id: `${facilityId}-ver`, facilityId, versionNumber: 1, encounterId: `${facilityId}-enc` }];
      if (query.includes("COUNT(*)")) return [{ count: 0n }];
      if (query.includes("LIMIT")) return [];
      return [];
    });
    const { service } = makeService({ queryRaw });
    const pkg = await (service as any).buildPlaintextPackage({
      facilityId: "fac-a",
      requestedByUserId: "admin-a",
      generatedAt: new Date("2026-09-08T06:00:00.000Z"),
    });
    const zip = readStoredZipEntries(pkg.zipBuffer);
    const manifestPath = [...zip.keys()].find((k) => k.endsWith("/manifest.json"))!;
    const manifest = JSON.parse(zip.get(manifestPath)!.toString("utf8"));
    const patients = [...zip.entries()].find(([k]) => k.endsWith("/patients.csv"))?.[1].toString("utf8") ?? "";
    const allergiesJsonl = [...zip.entries()].find(([k]) => k.endsWith("/allergies.jsonl"))?.[1].toString("utf8") ?? "";
    const encounters = [...zip.entries()].find(([k]) => k.endsWith("/encounters.csv"))?.[1].toString("utf8") ?? "";
    const versions = [...zip.entries()].find(([k]) => k.endsWith("/provider-documentation-versions.jsonl"))?.[1].toString("utf8") ?? "";
    expect(patients).toContain("fac-a-pat");
    expect(allergiesJsonl).toContain("\"patientId\":\"fac-a-pat\"");
    expect(allergiesJsonl).toContain("\"facilityId\":\"fac-a\"");
    expect(allergiesJsonl).toContain("\"allergyNote\":\"fac-a-allergy\"");
    expect(encounters).toContain("fac-a-enc");
    expect(versions).toContain("fac-a-ver");
    expect(`${patients}${allergiesJsonl}${encounters}${versions}`).not.toContain("fac-b-");
    for (const f of manifest.files as Array<{ path: string; sha256: string; sizeBytes: number }>) {
      const key = manifestPath.replace("manifest.json", f.path);
      const file = zip.get(key);
      expect(file).toBeDefined();
      expect(crypto.createHash("sha256").update(file!).digest("hex")).toBe(f.sha256);
    }
  });

  it("EXP-09/10: plaintext package hash verifies and MED1 artifact decrypts with correct secret", async () => {
    const { service } = makeService();
    const secret = crypto.randomBytes(32).toString("base64url");
    const key = Buffer.from(secret, "base64url");
    const iv = crypto.randomBytes(12);
    const root = "medora-export-fac-a-20260908T060000Z";
    const manifestPayload = { files: [{ path: "README.txt", sizeBytes: 5, sha256: crypto.createHash("sha256").update("hello").digest("hex") }] };
    const zipBuffer = buildStoredZip(
      [
        { path: `${root}/README.txt`, data: Buffer.from("hello", "utf8") },
        { path: `${root}/manifest.json`, data: Buffer.from(JSON.stringify(manifestPayload), "utf8") },
      ],
      new Date("2026-09-08T06:00:00.000Z")
    );
    const c2 = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encryptedZip = Buffer.concat([c2.update(zipBuffer), c2.final()]);
    const tag2 = c2.getAuthTag();
    const envelope = createEncryptedExportEnvelope("AES-256-GCM", iv, tag2, encryptedZip);
    const plaintextSha256 = crypto.createHash("sha256").update(zipBuffer).digest("hex");
    await expect(
      service.verifyEncryptedArtifact({
        encryptedArtifact: envelope,
        decryptionSecret: secret,
        plaintextSha256,
      })
    ).resolves.toEqual({ ok: true });
    expect(encryptedZip.length).toBeGreaterThan(0);
    expect(plaintextSha256).toHaveLength(64);
  });

  it("EXP-11: incorrect secret fails MED1 decryption", async () => {
    const { service } = makeService();
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from("abc", "utf8")), cipher.final()]);
    const tag = cipher.getAuthTag();
    const envelope = createEncryptedExportEnvelope("AES-256-GCM", iv, tag, encrypted);
    await expect(
      service.verifyEncryptedArtifact({
        encryptedArtifact: envelope,
        decryptionSecret: crypto.randomBytes(32).toString("base64url"),
        plaintextSha256: "0".repeat(64),
      })
    ).rejects.toThrow();
  });

  it("EXP-12: modified MED1 ciphertext fails authenticated decryption", async () => {
    const { service } = makeService();
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from("abc")), cipher.final()]);
    const tag = cipher.getAuthTag();
    const envelope = createEncryptedExportEnvelope("AES-256-GCM", iv, tag, encrypted);
    envelope[envelope.length - 1] = envelope[envelope.length - 1] ^ 0xff;
    await expect(
      service.verifyEncryptedArtifact({
        encryptedArtifact: envelope,
        decryptionSecret: key.toString("base64url"),
        plaintextSha256: "0".repeat(64),
      })
    ).rejects.toThrow();
  });

  it("EXP-13: reconciliation mismatch causes export failure", async () => {
    const queryRaw = jest.fn(async (query: string) => {
      if (query.includes(`FROM "Patient"`) && query.includes("COUNT(*)")) return [{ count: 2n }];
      if (query.includes(`FROM "Patient"`) && query.includes("LIMIT")) return [{ id: "p1" }];
      if (query.includes("COUNT(*)")) return [{ count: 0n }];
      return [];
    });
    const { service } = makeService({ queryRaw });
    await expect(
      (service as any).buildPlaintextPackage({
        facilityId: "fac-a",
        requestedByUserId: "admin-a",
        generatedAt: new Date(),
      })
    ).rejects.toThrow(/RECONCILIATION_MISMATCH/);
  });

  it("EXP-14: Failed export cannot be downloaded", async () => {
    const { service } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-1",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.FAILED,
        }),
      },
    });
    await expect(service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-1" })).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it("EXP-15: Download is audited", async () => {
    const encryptedArtifact = Buffer.from("cipher-exp-15", "utf8");
    const encryptedSha256 = crypto.createHash("sha256").update(encryptedArtifact).digest("hex");
    const { service, audit } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-1",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256,
          objectStorageKey: "obj-key",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      storageRead: jest.fn().mockResolvedValue(encryptedArtifact),
    });
    await service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-1" });
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_DOWNLOADED,
      "OrganizationDataExport",
      expect.objectContaining({ entityId: "exp-1" })
    );
  });

  it("EXP-16: Cross-facility download denied", async () => {
    assertScope.mockRejectedValueOnce(new ForbiddenException("denied"));
    const { service } = makeService();
    await expect(service.downloadExport({ actorUserId: "admin-b", facilityId: "fac-b", exportId: "exp-1" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("EXP-17: Expired export cannot be downloaded", async () => {
    const { service, audit, prisma } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-1",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          expiresAt: new Date("2026-09-08T05:59:59.000Z"),
          objectStorageKey: "obj-key",
        }),
      },
    });
    await expect(service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-1" })).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(prisma.organizationDataExport.update).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_EXPIRED,
      "OrganizationDataExport",
      expect.objectContaining({ entityId: "exp-1" })
    );
  });

  it("EXP-18: Export does not delete or modify source clinical data", async () => {
    const { service, prisma } = makeService();
    await service.requestExport({ actorUserId: "admin-a", facilityId: "fac-a", format: "ZIP" });
    expect((prisma as any).patient?.update).toBeUndefined();
    expect((prisma as any).encounter?.delete).toBeUndefined();
  });

  it("EXP-19: Existing encounter chart export integration remains in use", async () => {
    const queryRaw = jest.fn(async (query: string) => {
      if (query.includes(`FROM "Encounter"`) && query.includes("COUNT(*)")) return [{ count: 1n }];
      if (query.includes(`FROM "Encounter"`) && query.includes("LIMIT")) return [{ id: "enc-1", patientId: "pat-1" }];
      if (query.includes("COUNT(*)")) return [{ count: 0n }];
      return [];
    });
    const chartManifest = jest.fn().mockResolvedValue({
      facility: { id: "fac-a", name: "Facility A" },
      encounter: { id: "enc-1" },
    });
    const { service, chartExport } = makeService({ queryRaw, chartManifest });
    await (service as any).buildPlaintextPackage({
      facilityId: "fac-a",
      requestedByUserId: "admin-a",
      generatedAt: new Date(),
    });
    expect(chartExport.getManifest).toHaveBeenCalledWith(
      "fac-a",
      "enc-1",
      "admin-a",
      undefined,
      undefined,
      expect.objectContaining({ skipAudit: true, exportFormat: "html" })
    );
  });

  it("EXP-20: Sensitive encryption secret does not persist in metadata or logs", async () => {
    const { service, prisma, audit } = makeService();
    const result = await service.requestExport({ actorUserId: "admin-a", facilityId: "fac-a", format: "ZIP" });
    const createArgs = prisma.organizationDataExport.create.mock.calls[0]?.[0];
    const auditArgs = audit.log.mock.calls[0];
    expect(JSON.stringify(createArgs)).not.toContain(result.decryptionSecret);
    expect(JSON.stringify(auditArgs)).not.toContain(result.decryptionSecret);
  });

  it("EXP-21: Request persists wrapped key and can recover plaintext for one-time return", async () => {
    const { service, prisma } = makeService();
    const result = await service.requestExport({ actorUserId: "admin-a", facilityId: "fac-a", format: "ZIP" });
    const createArgs = prisma.organizationDataExport.create.mock.calls[0]?.[0];
    const wrapped = createArgs?.data?.exportKeyWrappedJson as string;
    expect(typeof wrapped).toBe("string");
    expect(wrapped).toBeTruthy();
    expect(wrapped).not.toContain(result.decryptionSecret);
    expect(unwrapServerSecret(wrapped)).toBe(result.decryptionSecret);
  });

  it("EXP-22: Processing reads wrapped key from DB and does not require in-memory pending secret", async () => {
    const decryptionSecret = crypto.randomBytes(32).toString("base64url");
    const wrapped = wrapServerSecret(decryptionSecret);
    const findUnique = jest.fn().mockResolvedValue({
      id: "exp-1",
      facilityId: "fac-a",
      requestedByUserId: "admin-a",
      exportFormat: OrganizationDataExportFormat.ZIP,
      status: OrganizationDataExportStatus.QUEUED,
      exportKeyWrappedJson: wrapped,
    });
    const update = jest.fn().mockResolvedValue({});
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const { service, prisma, storage } = makeService({
      organizationDataExport: { findUnique, update, updateMany },
    });
    jest.spyOn(service as any, "buildPlaintextPackage").mockResolvedValue({
      zipBuffer: Buffer.from("zip-bytes", "utf8"),
      patientCount: 1,
      encounterCount: 1,
      providerDocumentationVersionCount: 0,
    });

    await (service as any).processQueuedExport("exp-1");

    expect(storage.put).toHaveBeenCalled();
    expect(prisma.organizationDataExport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "exp-1" },
        data: expect.objectContaining({
          status: OrganizationDataExportStatus.COMPLETED,
          wrappedKeyReference: "mfa-secret-encryption:v1",
        }),
      })
    );
  });

  it("EXP-23: Plaintext key is never persisted to export row", async () => {
    const { service, prisma } = makeService();
    const result = await service.requestExport({ actorUserId: "admin-a", facilityId: "fac-a", format: "ZIP" });
    const createArgs = prisma.organizationDataExport.create.mock.calls[0]?.[0];
    expect(createArgs?.data?.decryptionSecret).toBeUndefined();
    expect(JSON.stringify(createArgs)).not.toContain(result.decryptionSecret);
  });

  it("EXP-24: Missing server wrapping key fails closed for request and processing", async () => {
    delete process.env.MFA_SECRET_ENCRYPTION_KEY;
    const requestCase = makeService();
    await expect(
      requestCase.service.requestExport({ actorUserId: "admin-a", facilityId: "fac-a", format: "ZIP" })
    ).rejects.toThrow();
    expect(requestCase.prisma.organizationDataExport.create).not.toHaveBeenCalled();

    process.env.MFA_SECRET_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
    const wrapped = wrapServerSecret(crypto.randomBytes(32).toString("base64url"));
    delete process.env.MFA_SECRET_ENCRYPTION_KEY;
    const findUnique = jest.fn().mockResolvedValue({
      id: "exp-1",
      facilityId: "fac-a",
      requestedByUserId: "admin-a",
      exportFormat: OrganizationDataExportFormat.ZIP,
      status: OrganizationDataExportStatus.QUEUED,
      exportKeyWrappedJson: wrapped,
    });
    const update = jest.fn().mockResolvedValue({});
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const processCase = makeService({
      organizationDataExport: { findUnique, update, updateMany },
    });
    jest.spyOn(processCase.service as any, "buildPlaintextPackage").mockResolvedValue({
      zipBuffer: Buffer.from("zip-bytes", "utf8"),
      patientCount: 1,
      encounterCount: 1,
      providerDocumentationVersionCount: 0,
    });

    await (processCase.service as any).processQueuedExport("exp-1");

    expect(processCase.prisma.organizationDataExport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "exp-1" }),
        data: expect.objectContaining({
          status: OrganizationDataExportStatus.FAILED,
          failureCode: "EXPORT_PROCESSING_FAILED",
        }),
      })
    );
  });

  it("EXP-30/31: Stored export artifact is MED1 and encryptedSha256 hashes stored MED1 bytes", async () => {
    const decryptionSecret = crypto.randomBytes(32).toString("base64url");
    const wrapped = wrapServerSecret(decryptionSecret);
    const findUnique = jest.fn().mockResolvedValue({
      id: "exp-1",
      facilityId: "fac-a",
      requestedByUserId: "admin-a",
      exportFormat: OrganizationDataExportFormat.ZIP,
      status: OrganizationDataExportStatus.QUEUED,
      exportKeyWrappedJson: wrapped,
    });
    const update = jest.fn().mockResolvedValue({});
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const storagePut = jest.fn().mockImplementation(async (_id, _facilityId, _fileName, encryptedArtifact: Buffer) => ({
      objectKey: "obj-key",
      sizeBytes: encryptedArtifact.length,
    }));
    const { service, prisma, storage } = makeService({
      organizationDataExport: { findUnique, update, updateMany },
      storagePut,
    });
    jest.spyOn(service as any, "buildPlaintextPackage").mockResolvedValue({
      zipBuffer: Buffer.from("zip-bytes", "utf8"),
      patientCount: 1,
      encounterCount: 1,
      providerDocumentationVersionCount: 0,
    });

    await (service as any).processQueuedExport("exp-1");

    expect(storage.put).toHaveBeenCalled();
    const storedArtifact = storage.put.mock.calls[0]?.[3] as Buffer;
    expect(Buffer.isBuffer(storedArtifact)).toBe(true);
    expect(storedArtifact.subarray(0, 4).toString("ascii")).toBe("MED1");

    const completionCall = prisma.organizationDataExport.update.mock.calls.find(
      (call) => call[0]?.data?.status === OrganizationDataExportStatus.COMPLETED
    );
    const completionData = completionCall?.[0]?.data;
    expect(completionData).toBeDefined();
    expect(completionData.encryptedSha256).toBe(crypto.createHash("sha256").update(storedArtifact).digest("hex"));
    expect(Number(completionData.fileSizeBytes)).toBe(storedArtifact.length);
  });

  it("EXP-32: Legacy raw ciphertext fallback still decrypts with DB iv/auth tag metadata", async () => {
    const { service } = makeService();
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const plaintext = Buffer.from("legacy export payload", "utf8");
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    const plaintextSha256 = crypto.createHash("sha256").update(plaintext).digest("hex");

    const root = "legacy-root";
    const manifestPayload = {
      files: [{ path: "README.txt", sizeBytes: 5, sha256: crypto.createHash("sha256").update("hello").digest("hex") }],
    };
    const zipBuffer = buildStoredZip(
      [
        { path: `${root}/README.txt`, data: Buffer.from("hello", "utf8") },
        { path: `${root}/manifest.json`, data: Buffer.from(JSON.stringify(manifestPayload), "utf8") },
      ],
      new Date("2026-09-08T06:00:00.000Z")
    );
    const c2 = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encryptedZip = Buffer.concat([c2.update(zipBuffer), c2.final()]);
    const tag2 = c2.getAuthTag();
    const zipHash = crypto.createHash("sha256").update(zipBuffer).digest("hex");

    await expect(
      service.verifyEncryptedArtifact({
        encryptedArtifact: encryptedZip,
        decryptionSecret: key.toString("base64url"),
        ivBase64: iv.toString("base64"),
        authTagBase64: tag2.toString("base64"),
        plaintextSha256: zipHash,
      })
    ).resolves.toEqual({ ok: true });
    expect(encrypted.length).toBeGreaterThan(0);
    expect(plaintextSha256).toHaveLength(64);
  });

  it("EXP-33: Allergy export no longer uses placeholder query and reconciles canonical profile allergies", async () => {
    const queryRaw = jest.fn(async (query: string, facilityId: string) => {
      if (query.includes("AND 1 = 0")) {
        throw new Error("placeholder allergy query must not run");
      }
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("COUNT(*)")) {
        return [{ count: 1n }];
      }
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("LIMIT")) {
        return [{ patientId: `${facilityId}-pat`, facilityId, allergies: { allergyNote: "Penicillin" } }];
      }
      if (query.includes(`FROM "Patient"`) && query.includes(`COUNT(*)`)) return [{ count: 1n }];
      if (query.includes(`FROM "Encounter"`) && query.includes(`COUNT(*)`)) return [{ count: 0n }];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes(`COUNT(*)`)) return [{ count: 0n }];
      if (query.includes(`FROM "Patient"`) && query.includes("LIMIT")) return [{ id: `${facilityId}-pat`, facilityId }];
      if (query.includes(`FROM "Encounter"`) && query.includes("LIMIT")) return [];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes("LIMIT")) return [];
      if (query.includes("COUNT(*)")) return [{ count: 0n }];
      if (query.includes("LIMIT")) return [];
      return [];
    });
    const { service } = makeService({ queryRaw });
    const pkg = await (service as any).buildPlaintextPackage({
      facilityId: "fac-a",
      requestedByUserId: "admin-a",
      generatedAt: new Date("2026-09-08T06:00:00.000Z"),
    });
    const zip = readStoredZipEntries(pkg.zipBuffer);
    const allergies = [...zip.entries()].find(([k]) => k.endsWith("/allergies.jsonl"))?.[1].toString("utf8") ?? "";
    expect(allergies).toContain("\"allergyNote\":\"Penicillin\"");
  });

  it("EXP-34: Cross-facility isolation prevents facility B allergies from appearing in facility A export", async () => {
    const queryRaw = jest.fn(async (query: string, facilityId: string) => {
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("COUNT(*)")) {
        return [{ count: 1n }];
      }
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("LIMIT")) {
        return [{ patientId: `${facilityId}-pat`, facilityId, allergies: { allergyNote: `${facilityId}-allergy` } }];
      }
      if (query.includes(`FROM "Patient"`) && query.includes(`COUNT(*)`)) return [{ count: 1n }];
      if (query.includes(`FROM "Encounter"`) && query.includes(`COUNT(*)`)) return [{ count: 0n }];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes(`COUNT(*)`)) return [{ count: 0n }];
      if (query.includes(`FROM "Patient"`) && query.includes("LIMIT")) return [{ id: `${facilityId}-pat`, facilityId }];
      if (query.includes(`FROM "Encounter"`) && query.includes("LIMIT")) return [];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes("LIMIT")) return [];
      if (query.includes("COUNT(*)")) return [{ count: 0n }];
      if (query.includes("LIMIT")) return [];
      return [];
    });
    const { service } = makeService({ queryRaw });
    const pkg = await (service as any).buildPlaintextPackage({
      facilityId: "fac-a",
      requestedByUserId: "admin-a",
      generatedAt: new Date("2026-09-08T06:00:00.000Z"),
    });
    const zip = readStoredZipEntries(pkg.zipBuffer);
    const allergies = [...zip.entries()].find(([k]) => k.endsWith("/allergies.jsonl"))?.[1].toString("utf8") ?? "";
    expect(allergies).toContain("\"facilityId\":\"fac-a\"");
    expect(allergies).not.toContain("\"facilityId\":\"fac-b\"");
    expect(allergies).not.toContain("fac-b-allergy");
  });

  it("EXP-35: Patients without allergies section do not emit allergies.jsonl rows", async () => {
    const queryRaw = jest.fn(async (query: string, facilityId: string) => {
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("COUNT(*)")) {
        return [{ count: 0n }];
      }
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("LIMIT")) {
        return [];
      }
      if (query.includes(`FROM "Patient"`) && query.includes(`COUNT(*)`)) return [{ count: 2n }];
      if (query.includes(`FROM "Encounter"`) && query.includes(`COUNT(*)`)) return [{ count: 0n }];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes(`COUNT(*)`)) return [{ count: 0n }];
      if (query.includes(`FROM "Patient"`) && query.includes("LIMIT")) {
        return [{ id: `${facilityId}-pat-1`, facilityId }, { id: `${facilityId}-pat-2`, facilityId }];
      }
      if (query.includes(`FROM "Encounter"`) && query.includes("LIMIT")) return [];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes("LIMIT")) return [];
      if (query.includes("COUNT(*)")) return [{ count: 0n }];
      if (query.includes("LIMIT")) return [];
      return [];
    });
    const { service } = makeService({ queryRaw });
    const pkg = await (service as any).buildPlaintextPackage({
      facilityId: "fac-a",
      requestedByUserId: "admin-a",
      generatedAt: new Date("2026-09-08T06:00:00.000Z"),
    });
    const zip = readStoredZipEntries(pkg.zipBuffer);
    const allergies = [...zip.entries()].find(([k]) => k.endsWith("/allergies.jsonl"))?.[1].toString("utf8") ?? "";
    expect(allergies).toBe("");
  });

  it("EXP-36: Multiple allergy rows are deterministic by patient-id and preserve canonical allergy objects", async () => {
    const allergyRows = [
      {
        patientId: "fac-a-pat-001",
        facilityId: "fac-a",
        allergies: { allergyNote: "Aspirin", entries: [{ substance: "ASA", status: "active" }] },
      },
      {
        patientId: "fac-a-pat-002",
        facilityId: "fac-a",
        allergies: { allergyNote: "Penicillin", medicationAllergiesDetail: "Hives" },
      },
    ];
    const queryRaw = jest.fn(async (query: string, facilityId: string) => {
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("COUNT(*)")) {
        return [{ count: 2n }];
      }
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("LIMIT")) {
        return allergyRows;
      }
      if (query.includes(`FROM "Patient"`) && query.includes(`COUNT(*)`)) return [{ count: 2n }];
      if (query.includes(`FROM "Encounter"`) && query.includes(`COUNT(*)`)) return [{ count: 0n }];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes(`COUNT(*)`)) return [{ count: 0n }];
      if (query.includes(`FROM "Patient"`) && query.includes("LIMIT")) {
        return [{ id: `${facilityId}-pat-001`, facilityId }, { id: `${facilityId}-pat-002`, facilityId }];
      }
      if (query.includes(`FROM "Encounter"`) && query.includes("LIMIT")) return [];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes("LIMIT")) return [];
      if (query.includes("COUNT(*)")) return [{ count: 0n }];
      if (query.includes("LIMIT")) return [];
      return [];
    });
    const { service } = makeService({ queryRaw });
    const pkg = await (service as any).buildPlaintextPackage({
      facilityId: "fac-a",
      requestedByUserId: "admin-a",
      generatedAt: new Date("2026-09-08T06:00:00.000Z"),
    });
    const zip = readStoredZipEntries(pkg.zipBuffer);
    const allergies = [...zip.entries()].find(([k]) => k.endsWith("/allergies.jsonl"))?.[1].toString("utf8") ?? "";
    const lines = allergies.trim().split("\n").filter(Boolean);
    expect(lines).toHaveLength(2);
    const parsed = lines.map((line) => JSON.parse(line));
    expect(parsed[0]).toEqual(allergyRows[0]);
    expect(parsed[1]).toEqual(allergyRows[1]);
  });

  it("EXP-37: Canonical allergy source count matches allergies.jsonl row count", async () => {
    const queryRaw = jest.fn(async (query: string, facilityId: string) => {
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("COUNT(*)")) {
        return [{ count: 2n }];
      }
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("LIMIT")) {
        return [
          { patientId: `${facilityId}-pat-001`, facilityId, allergies: { allergyNote: "A" } },
          { patientId: `${facilityId}-pat-002`, facilityId, allergies: { allergyNote: "B" } },
        ];
      }
      if (query.includes(`FROM "Patient"`) && query.includes(`COUNT(*)`)) return [{ count: 2n }];
      if (query.includes(`FROM "Encounter"`) && query.includes(`COUNT(*)`)) return [{ count: 0n }];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes(`COUNT(*)`)) return [{ count: 0n }];
      if (query.includes(`FROM "Patient"`) && query.includes("LIMIT")) {
        return [{ id: `${facilityId}-pat-001`, facilityId }, { id: `${facilityId}-pat-002`, facilityId }];
      }
      if (query.includes(`FROM "Encounter"`) && query.includes("LIMIT")) return [];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes("LIMIT")) return [];
      if (query.includes("COUNT(*)")) return [{ count: 0n }];
      if (query.includes("LIMIT")) return [];
      return [];
    });
    const { service } = makeService({ queryRaw });
    const pkg = await (service as any).buildPlaintextPackage({
      facilityId: "fac-a",
      requestedByUserId: "admin-a",
      generatedAt: new Date("2026-09-08T06:00:00.000Z"),
    });
    const zip = readStoredZipEntries(pkg.zipBuffer);
    const allergies = [...zip.entries()].find(([k]) => k.endsWith("/allergies.jsonl"))?.[1].toString("utf8") ?? "";
    const lines = allergies.trim().split("\n").filter(Boolean);
    expect(lines).toHaveLength(2);
  });

  it("EXP-38: Allergy reconciliation mismatch fails closed", async () => {
    const queryRaw = jest.fn(async (query: string, facilityId: string) => {
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("COUNT(*)")) {
        return [{ count: 2n }];
      }
      if (query.includes(`jsonb_typeof((p."clinicalHistoryProfileJson"::jsonb)->'allergies')`) && query.includes("LIMIT")) {
        return [{ patientId: `${facilityId}-pat-001`, facilityId, allergies: { allergyNote: "A" } }];
      }
      if (query.includes(`FROM "Patient"`) && query.includes(`COUNT(*)`)) return [{ count: 1n }];
      if (query.includes(`FROM "Encounter"`) && query.includes(`COUNT(*)`)) return [{ count: 0n }];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes(`COUNT(*)`)) return [{ count: 0n }];
      if (query.includes(`FROM "Patient"`) && query.includes("LIMIT")) return [{ id: `${facilityId}-pat-001`, facilityId }];
      if (query.includes(`FROM "Encounter"`) && query.includes("LIMIT")) return [];
      if (query.includes(`FROM "EncounterProviderDocumentationVersion"`) && query.includes("LIMIT")) return [];
      if (query.includes("COUNT(*)")) return [{ count: 0n }];
      if (query.includes("LIMIT")) return [];
      return [];
    });
    const { service } = makeService({ queryRaw });
    await expect(
      (service as any).buildPlaintextPackage({
        facilityId: "fac-a",
        requestedByUserId: "admin-a",
        generatedAt: new Date("2026-09-08T06:00:00.000Z"),
      })
    ).rejects.toThrow(/RECONCILIATION_MISMATCH:allergies/);
  });

  it("EXP-39: Allergy export spec/query has no placeholder and remains facility-scoped JSONL", () => {
    // Resolve from the checkout instead of assuming GitHub Actions' absolute workspace path.
    const servicePath = require.resolve("./organization-data-export.service");
    const source = fs.readFileSync(servicePath, "utf8");
    const blockMatch = source.match(
      /filePath:\s*"allergies\.jsonl"[\s\S]*?reconciliationKey:\s*"allergies"/
    );
    expect(blockMatch).toBeTruthy();
    const block = blockMatch![0];
    expect(block).not.toContain("AND 1 = 0");
    expect(block).not.toContain("SELECT 0");
    expect(block).toContain(`format: "jsonl"`);
    const queryBase = block.match(/queryBase:\s*`([^`]+)`/)?.[1] ?? "";
    const countQuery = block.match(/countQuery:\s*`([^`]+)`/)?.[1] ?? "";
    expect(queryBase).toContain(`WHERE p."facilityId" = $1`);
    expect(countQuery).toContain(`WHERE p."facilityId" = $1`);
    expect(countQuery).not.toContain("SELECT 0");
  });

  it("EXP-40: Valid stored MED1 artifact with matching encryptedSha256 downloads exact bytes", async () => {
    const artifact = createEncryptedExportEnvelope(
      "AES-256-GCM",
      crypto.randomBytes(12),
      crypto.randomBytes(16),
      crypto.randomBytes(48)
    );
    const encryptedSha256 = crypto.createHash("sha256").update(artifact).digest("hex");
    const { service } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-40",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256,
          objectStorageKey: "obj-40",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      storageRead: jest.fn().mockResolvedValue(artifact),
    });
    const res = await service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-40" });
    expect(res.buffer.equals(artifact)).toBe(true);
  });

  it("EXP-41: Tampered artifact fails closed when bytes do not match encryptedSha256", async () => {
    const original = Buffer.from("artifact-original", "utf8");
    const tampered = Buffer.from("artifact-tampered", "utf8");
    const encryptedSha256 = crypto.createHash("sha256").update(original).digest("hex");
    const update = jest.fn().mockResolvedValue({});
    const auditLog = jest.fn().mockResolvedValue(undefined);
    const { service, prisma, audit } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-41",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256,
          objectStorageKey: "obj-41",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
        update,
      },
      storageRead: jest.fn().mockResolvedValue(tampered),
    });
    audit.log = auditLog as never;
    await expect(service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-41" })).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(prisma.organizationDataExport.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          downloadedByUserId: "admin-a",
        }),
      })
    );
    expect(audit.log).not.toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_DOWNLOADED,
      "OrganizationDataExport",
      expect.anything()
    );
  });

  it("EXP-42: Truncated artifact fails closed when hash was from complete artifact", async () => {
    const full = Buffer.from("artifact-complete", "utf8");
    const truncated = full.subarray(0, full.length - 4);
    const encryptedSha256 = crypto.createHash("sha256").update(full).digest("hex");
    const { service } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-42",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256,
          objectStorageKey: "obj-42",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      storageRead: jest.fn().mockResolvedValue(truncated),
    });
    await expect(service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-42" })).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it("EXP-43: Missing encryptedSha256 prevents completed export download", async () => {
    const { service } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-43",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256: null,
          objectStorageKey: "obj-43",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
      },
    });
    await expect(service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-43" })).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it("EXP-44: Malformed encryptedSha256 fails closed", async () => {
    const { service } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-44",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256: "zz-not-hex",
          objectStorageKey: "obj-44",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
      },
    });
    await expect(service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-44" })).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it("EXP-45: Missing objectStorageKey or missing stored artifact fails closed", async () => {
    const noKeyCase = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-45a",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256: "a".repeat(64),
          objectStorageKey: null,
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
      },
    });
    await expect(
      noKeyCase.service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-45a" })
    ).rejects.toThrow("Encrypted artifact unavailable");

    const withMissingArtifactHash = crypto.createHash("sha256").update(Buffer.from("abc", "utf8")).digest("hex");
    const missingArtifactCase = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-45b",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256: withMissingArtifactHash,
          objectStorageKey: "obj-45b",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
      },
      storageRead: jest.fn().mockResolvedValue(null),
    });
    await expect(
      missingArtifactCase.service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-45b" })
    ).rejects.toThrow("Encrypted artifact unavailable");
  });

  it("EXP-46: Failed integrity check does not mark downloaded or emit success download audit", async () => {
    const expected = Buffer.from("expected-46", "utf8");
    const tampered = Buffer.from("tampered-46", "utf8");
    const encryptedSha256 = crypto.createHash("sha256").update(expected).digest("hex");
    const update = jest.fn().mockResolvedValue({});
    const auditLog = jest.fn().mockResolvedValue(undefined);
    const { service, prisma, audit } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-46",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256,
          objectStorageKey: "obj-46",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
        update,
      },
      storageRead: jest.fn().mockResolvedValue(tampered),
    });
    audit.log = auditLog as never;
    await expect(service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-46" })).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(prisma.organizationDataExport.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          downloadedAt: expect.any(Date),
          downloadedByUserId: "admin-a",
        }),
      })
    );
    expect(audit.log).not.toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_DOWNLOADED,
      "OrganizationDataExport",
      expect.anything()
    );
  });

  it("EXP-47: Successful integrity check happens before downloaded lifecycle mutation", async () => {
    const artifact = Buffer.from("artifact-47", "utf8");
    const encryptedSha256 = crypto.createHash("sha256").update(artifact).digest("hex");
    let readFinished = false;
    const storageRead = jest.fn().mockImplementation(async () => {
      readFinished = true;
      return artifact;
    });
    const update = jest.fn().mockImplementation(async (args) => {
      if (args?.data?.downloadedAt || args?.data?.downloadedByUserId) {
        expect(readFinished).toBe(true);
      }
      return {};
    });
    const { service } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-47",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256,
          objectStorageKey: "obj-47",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
        update,
      },
      storageRead,
    });
    await expect(
      service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-47" })
    ).resolves.toEqual(
      expect.objectContaining({
        buffer: artifact,
      })
    );
    const readOrder = storageRead.mock.invocationCallOrder[0] ?? 0;
    const updateOrder = update.mock.invocationCallOrder[0] ?? 0;
    expect(readOrder).toBeGreaterThan(0);
    expect(updateOrder).toBeGreaterThan(0);
    expect(readOrder).toBeLessThan(updateOrder);
  });

  it("EXP-48: Legacy encrypted artifact passes integrity when stored bytes match encryptedSha256", async () => {
    const legacyArtifact = Buffer.from("legacy-cipher-bytes-48", "utf8");
    const encryptedSha256 = crypto.createHash("sha256").update(legacyArtifact).digest("hex");
    const { service } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-48",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256,
          objectStorageKey: "obj-48",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      storageRead: jest.fn().mockResolvedValue(legacyArtifact),
    });
    const res = await service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-48" });
    expect(res.buffer.equals(legacyArtifact)).toBe(true);
  });

  it("EXP-49: listExports response does not contain objectStorageKey", async () => {
    const row = makeExportRow({
      objectStorageKey: "s3://internal-bucket/private/path/export.enc",
    });
    const { service } = makeService({
      organizationDataExport: {
        findMany: jest.fn().mockResolvedValue([row]),
      },
    });
    const rows = await service.listExports("admin-a", "fac-a", 20, 0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("objectStorageKey");
    expect(JSON.stringify(rows[0])).not.toContain("internal-bucket/private/path");
  });

  it("EXP-50: getExport response does not contain objectStorageKey", async () => {
    const row = makeExportRow({
      id: "exp-50",
      objectStorageKey: "obj/private/exp-50",
    });
    const { service } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue(row),
      },
    });
    const result = await service.getExport("admin-a", "fac-a", "exp-50");
    expect(result).not.toHaveProperty("objectStorageKey");
    expect(JSON.stringify(result)).not.toContain("obj/private/exp-50");
  });

  it("EXP-51: public responses do not expose wrapped/export key internals or storage paths", async () => {
    const row = makeExportRow({
      id: "exp-51",
      objectStorageKey: "bucket/private/object",
      wrappedKeyReference: "mfa-secret-encryption:v1",
    });
    const { service } = makeService({
      organizationDataExport: {
        findMany: jest.fn().mockResolvedValue([row]),
        findFirst: jest.fn().mockResolvedValue(row),
      },
    });
    const createResult = await service.requestExport({ actorUserId: "admin-a", facilityId: "fac-a", format: "ZIP" });
    const listResult = await service.listExports("admin-a", "fac-a", 20, 0);
    const detailResult = await service.getExport("admin-a", "fac-a", "exp-51");
    expect(createResult).not.toHaveProperty("objectStorageKey");
    expect(createResult).not.toHaveProperty("exportKeyWrappedJson");
    expect(createResult).not.toHaveProperty("wrappedKeyReference");
    expect(listResult[0]).not.toHaveProperty("objectStorageKey");
    expect(listResult[0]).not.toHaveProperty("exportKeyWrappedJson");
    expect(listResult[0]).not.toHaveProperty("wrappedKeyReference");
    expect(detailResult).not.toHaveProperty("objectStorageKey");
    expect(detailResult).not.toHaveProperty("exportKeyWrappedJson");
    expect(detailResult).not.toHaveProperty("wrappedKeyReference");
    expect(JSON.stringify({ createResult, listResult, detailResult })).not.toContain("bucket/private/object");
  });

  it("EXP-52: downloadExport still uses internal DB objectStorageKey after serialization hardening", async () => {
    const artifact = Buffer.from("artifact-52", "utf8");
    const encryptedSha256 = crypto.createHash("sha256").update(artifact).digest("hex");
    const storageRead = jest.fn().mockResolvedValue(artifact);
    const { service } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-52",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256,
          objectStorageKey: "internal-obj-52",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      storageRead,
    });
    const res = await service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-52" });
    expect(storageRead).toHaveBeenCalledWith("internal-obj-52", "exp-52");
    expect(res.buffer.equals(artifact)).toBe(true);
  });

  it("EXP-53: MED1 public metadata keeps supported fields without exposing storage internals", async () => {
    const row = makeExportRow({
      id: "exp-53",
      encryptedSha256: "a".repeat(64),
      encryptionAlgorithm: "AES-256-GCM",
      objectStorageKey: "internal/med1/53",
    });
    const { service } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue(row),
      },
    });
    const result = await service.getExport("admin-a", "fac-a", "exp-53");
    expect(result).toEqual(
      expect.objectContaining({
        id: "exp-53",
        encryptedSha256: "a".repeat(64),
        encryptionAlgorithm: "AES-256-GCM",
        status: OrganizationDataExportStatus.COMPLETED,
      })
    );
    expect(result).not.toHaveProperty("objectStorageKey");
  });

  it("EXP-54: legacy IV/tag and wrapped-key internals are absent from public responses", async () => {
    const row = makeExportRow({
      id: "exp-54",
      encryptionIvBase64: "legacy-iv-b64",
      encryptionAuthTagBase64: "legacy-tag-b64",
      wrappedKeyReference: "legacy-wrapped-ref",
      objectStorageKey: "legacy/internal/object",
    });
    const { service } = makeService({
      organizationDataExport: {
        findMany: jest.fn().mockResolvedValue([row]),
        findFirst: jest.fn().mockResolvedValue(row),
      },
    });
    const list = await service.listExports("admin-a", "fac-a", 20, 0);
    const detail = await service.getExport("admin-a", "fac-a", "exp-54");
    for (const result of [list[0], detail]) {
      expect(result).not.toHaveProperty("encryptionIvBase64");
      expect(result).not.toHaveProperty("encryptionAuthTagBase64");
      expect(result).not.toHaveProperty("wrappedKeyReference");
      expect(result).not.toHaveProperty("objectStorageKey");
      expect(result).not.toHaveProperty("exportKeyWrappedJson");
    }
  });

  it("EXP-55: failure message is sanitized and does not leak storage internals", async () => {
    const row = makeExportRow({
      id: "exp-55",
      status: OrganizationDataExportStatus.FAILED,
      failureCode: "EXPORT_PROCESSING_FAILED",
      failureMessage: "storage failure at s3://internal-bucket/private/obj-55 with object key obj-55",
      objectStorageKey: "internal/obj-55",
      failedAt: new Date("2026-09-08T06:06:00.000Z"),
      completedAt: null,
    });
    const { service } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue(row),
      },
    });
    const result = await service.getExport("admin-a", "fac-a", "exp-55");
    expect(result.failureCode).toBe("EXPORT_PROCESSING_FAILED");
    expect(result.failureMessage).toBe("Export failed (EXPORT_PROCESSING_FAILED).");
    expect(result.failureMessage).not.toContain("s3://");
    expect(result.failureMessage).not.toContain("obj-55");
  });

  it("EXP-56: QUEUED to PROCESSING claim transition occurs only once", async () => {
    const wrapped = wrapServerSecret(crypto.randomBytes(32).toString("base64url"));
    const updateMany = jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const { service, prisma } = makeService({
      organizationDataExport: {
        findUnique: jest.fn().mockResolvedValue({
          id: "exp-56",
          facilityId: "fac-a",
          requestedByUserId: "admin-a",
          exportFormat: OrganizationDataExportFormat.ZIP,
          status: OrganizationDataExportStatus.QUEUED,
          exportKeyWrappedJson: wrapped,
        }),
        updateMany,
        update: jest.fn().mockResolvedValue({}),
      },
    });
    jest.spyOn(service as any, "buildPlaintextPackage").mockResolvedValue({
      zipBuffer: Buffer.from("zip-56", "utf8"),
      patientCount: 1,
      encounterCount: 1,
      providerDocumentationVersionCount: 0,
    });
    await (service as any).processQueuedExport("exp-56");
    await (service as any).processQueuedExport("exp-56");
    const claimCalls = prisma.organizationDataExport.updateMany.mock.calls.filter(
      (call) => call[0]?.data?.status === OrganizationDataExportStatus.PROCESSING
    );
    expect(claimCalls).toHaveLength(2);
    expect(claimCalls[0]?.[0]?.where?.status).toBe(OrganizationDataExportStatus.QUEUED);
    expect(claimCalls[0]?.[0]?.data?.status).toBe(OrganizationDataExportStatus.PROCESSING);
  });

  it("EXP-57: duplicate processing attempt cannot claim already claimed export", async () => {
    const wrapped = wrapServerSecret(crypto.randomBytes(32).toString("base64url"));
    const updateMany = jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const storagePut = jest.fn().mockResolvedValue({ objectKey: "obj-57", sizeBytes: 16 });
    const { service, storage } = makeService({
      organizationDataExport: {
        findUnique: jest.fn().mockResolvedValue({
          id: "exp-57",
          facilityId: "fac-a",
          requestedByUserId: "admin-a",
          exportFormat: OrganizationDataExportFormat.ZIP,
          status: OrganizationDataExportStatus.QUEUED,
          exportKeyWrappedJson: wrapped,
        }),
        updateMany,
        update: jest.fn().mockResolvedValue({}),
      },
      storagePut,
    });
    jest.spyOn(service as any, "buildPlaintextPackage").mockResolvedValue({
      zipBuffer: Buffer.from("zip-57", "utf8"),
      patientCount: 1,
      encounterCount: 1,
      providerDocumentationVersionCount: 0,
    });
    await (service as any).processQueuedExport("exp-57");
    await (service as any).processQueuedExport("exp-57");
    expect(storage.put).toHaveBeenCalledTimes(1);
  });

  it("EXP-58: put and completed persistence succeed, completed audit emitted after persistence, no cleanup", async () => {
    const wrapped = wrapServerSecret(crypto.randomBytes(32).toString("base64url"));
    const update = jest.fn().mockResolvedValue({});
    const { service, prisma, storage, audit } = makeService({
      organizationDataExport: {
        findUnique: jest.fn().mockResolvedValue({
          id: "exp-58",
          facilityId: "fac-a",
          requestedByUserId: "admin-a",
          exportFormat: OrganizationDataExportFormat.ZIP,
          status: OrganizationDataExportStatus.QUEUED,
          exportKeyWrappedJson: wrapped,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update,
      },
      storagePut: jest.fn().mockResolvedValue({ objectKey: "obj-58", sizeBytes: 24 }),
    });
    jest.spyOn(service as any, "buildPlaintextPackage").mockResolvedValue({
      zipBuffer: Buffer.from("zip-58", "utf8"),
      patientCount: 2,
      encounterCount: 2,
      providerDocumentationVersionCount: 0,
    });
    await (service as any).processQueuedExport("exp-58");
    const completedUpdateOrder = update.mock.invocationCallOrder[0] ?? 0;
    const completedAuditOrder = audit.log.mock.calls
      .map((call, idx) => ({ idx, action: call[0] }))
      .find(({ action }) => action === AuditAction.ORGANIZATION_EXPORT_COMPLETED);
    const completedAuditCallOrder = completedAuditOrder ? audit.log.mock.invocationCallOrder[completedAuditOrder.idx] : 0;
    expect(completedUpdateOrder).toBeGreaterThan(0);
    expect(completedAuditCallOrder).toBeGreaterThan(completedUpdateOrder);
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("EXP-59: put succeeds but completed DB update fails, cleanup attempted, failed path used, no completed audit", async () => {
    const wrapped = wrapServerSecret(crypto.randomBytes(32).toString("base64url"));
    const update = jest.fn().mockRejectedValue(new Error("db completed update failed"));
    const updateMany = jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    const { service, prisma, storage, audit } = makeService({
      organizationDataExport: {
        findUnique: jest.fn().mockResolvedValue({
          id: "exp-59",
          facilityId: "fac-a",
          requestedByUserId: "admin-a",
          exportFormat: OrganizationDataExportFormat.ZIP,
          status: OrganizationDataExportStatus.QUEUED,
          exportKeyWrappedJson: wrapped,
        }),
        updateMany,
        update,
      },
      storagePut: jest.fn().mockResolvedValue({ objectKey: "obj-59", sizeBytes: 20 }),
    });
    jest.spyOn(service as any, "buildPlaintextPackage").mockResolvedValue({
      zipBuffer: Buffer.from("zip-59", "utf8"),
      patientCount: 1,
      encounterCount: 1,
      providerDocumentationVersionCount: 0,
    });
    await (service as any).processQueuedExport("exp-59");
    expect(storage.delete).toHaveBeenCalledWith("obj-59", "exp-59");
    expect(prisma.organizationDataExport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: OrganizationDataExportStatus.FAILED,
        }),
      })
    );
    expect(audit.log).not.toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_COMPLETED,
      "OrganizationDataExport",
      expect.anything()
    );
  });

  it("EXP-60: cleanup targets only the exact current object key", async () => {
    const wrapped = wrapServerSecret(crypto.randomBytes(32).toString("base64url"));
    const { service, storage } = makeService({
      organizationDataExport: {
        findUnique: jest.fn().mockResolvedValue({
          id: "exp-60",
          facilityId: "fac-a",
          requestedByUserId: "admin-a",
          exportFormat: OrganizationDataExportFormat.ZIP,
          status: OrganizationDataExportStatus.QUEUED,
          exportKeyWrappedJson: wrapped,
        }),
        updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }),
        update: jest.fn().mockRejectedValue(new Error("db write fail")),
      },
      storagePut: jest.fn().mockResolvedValue({ objectKey: "obj-60-current-only", sizeBytes: 21 }),
    });
    jest.spyOn(service as any, "buildPlaintextPackage").mockResolvedValue({
      zipBuffer: Buffer.from("zip-60", "utf8"),
      patientCount: 1,
      encounterCount: 1,
      providerDocumentationVersionCount: 0,
    });
    await (service as any).processQueuedExport("exp-60");
    expect(storage.delete).toHaveBeenCalledTimes(1);
    expect(storage.delete).toHaveBeenCalledWith("obj-60-current-only", "exp-60");
  });

  it("EXP-61: cleanup failure does not mask original failure and no completed audit emitted", async () => {
    const wrapped = wrapServerSecret(crypto.randomBytes(32).toString("base64url"));
    const updateMany = jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    const { service, storage, audit } = makeService({
      organizationDataExport: {
        findUnique: jest.fn().mockResolvedValue({
          id: "exp-61",
          facilityId: "fac-a",
          requestedByUserId: "admin-a",
          exportFormat: OrganizationDataExportFormat.ZIP,
          status: OrganizationDataExportStatus.QUEUED,
          exportKeyWrappedJson: wrapped,
        }),
        updateMany,
        update: jest.fn().mockRejectedValue(new Error("db update failed")),
      },
      storagePut: jest.fn().mockResolvedValue({ objectKey: "obj-61", sizeBytes: 16 }),
    });
    storage.delete.mockRejectedValueOnce(new Error("cleanup delete failed"));
    jest.spyOn(service as any, "buildPlaintextPackage").mockResolvedValue({
      zipBuffer: Buffer.from("zip-61", "utf8"),
      patientCount: 1,
      encounterCount: 1,
      providerDocumentationVersionCount: 0,
    });
    await expect((service as any).processQueuedExport("exp-61")).resolves.toBeUndefined();
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_FAILED,
      "OrganizationDataExport",
      expect.objectContaining({ entityId: "exp-61" })
    );
    expect(audit.log).not.toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_COMPLETED,
      "OrganizationDataExport",
      expect.anything()
    );
  });

  it("EXP-62: failExport does not overwrite terminal COMPLETED export", async () => {
    const { service, prisma, audit } = makeService({
      organizationDataExport: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    });
    await (service as any).failExport(
      { id: "exp-62", facilityId: "fac-a", requestedByUserId: "admin-a" },
      "EXPORT_PROCESSING_FAILED",
      "should not overwrite completed"
    );
    expect(prisma.organizationDataExport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: expect.objectContaining({
            in: [OrganizationDataExportStatus.QUEUED, OrganizationDataExportStatus.PROCESSING],
          }),
        }),
      })
    );
    expect(audit.log).not.toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_FAILED,
      "OrganizationDataExport",
      expect.objectContaining({ entityId: "exp-62" })
    );
  });

  it("EXP-63: failExport does not overwrite terminal EXPIRED export", async () => {
    const { service, audit } = makeService({
      organizationDataExport: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    });
    await (service as any).failExport(
      { id: "exp-63", facilityId: "fac-a", requestedByUserId: "admin-a" },
      "EXPORT_PROCESSING_FAILED",
      "should not overwrite expired"
    );
    expect(audit.log).not.toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_FAILED,
      "OrganizationDataExport",
      expect.objectContaining({ entityId: "exp-63" })
    );
  });

  it("EXP-64: STARTED audit corresponds to successful PROCESSING claim", async () => {
    const wrapped = wrapServerSecret(crypto.randomBytes(32).toString("base64url"));
    const updateMany = jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    const { service, audit } = makeService({
      organizationDataExport: {
        findUnique: jest.fn().mockResolvedValue({
          id: "exp-64",
          facilityId: "fac-a",
          requestedByUserId: "admin-a",
          exportFormat: OrganizationDataExportFormat.ZIP,
          status: OrganizationDataExportStatus.QUEUED,
          exportKeyWrappedJson: wrapped,
        }),
        updateMany,
        update: jest.fn().mockRejectedValue(new Error("fail after started")),
      },
      storagePut: jest.fn().mockResolvedValue({ objectKey: "obj-64", sizeBytes: 20 }),
    });
    jest.spyOn(service as any, "buildPlaintextPackage").mockResolvedValue({
      zipBuffer: Buffer.from("zip-64", "utf8"),
      patientCount: 1,
      encounterCount: 1,
      providerDocumentationVersionCount: 0,
    });
    await (service as any).processQueuedExport("exp-64");
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_STARTED,
      "OrganizationDataExport",
      expect.objectContaining({ entityId: "exp-64" })
    );
  });

  it("EXP-65: COMPLETED audit is emitted only after COMPLETED persistence succeeds", async () => {
    const wrapped = wrapServerSecret(crypto.randomBytes(32).toString("base64url"));
    const update = jest.fn().mockResolvedValue({});
    const { service, audit } = makeService({
      organizationDataExport: {
        findUnique: jest.fn().mockResolvedValue({
          id: "exp-65",
          facilityId: "fac-a",
          requestedByUserId: "admin-a",
          exportFormat: OrganizationDataExportFormat.ZIP,
          status: OrganizationDataExportStatus.QUEUED,
          exportKeyWrappedJson: wrapped,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update,
      },
      storagePut: jest.fn().mockResolvedValue({ objectKey: "obj-65", sizeBytes: 20 }),
    });
    jest.spyOn(service as any, "buildPlaintextPackage").mockResolvedValue({
      zipBuffer: Buffer.from("zip-65", "utf8"),
      patientCount: 1,
      encounterCount: 1,
      providerDocumentationVersionCount: 0,
    });
    await (service as any).processQueuedExport("exp-65");
    const updateOrder = update.mock.invocationCallOrder[0] ?? 0;
    const completedIdx = audit.log.mock.calls.findIndex((call) => call[0] === AuditAction.ORGANIZATION_EXPORT_COMPLETED);
    const completedOrder = completedIdx >= 0 ? audit.log.mock.invocationCallOrder[completedIdx] : 0;
    expect(updateOrder).toBeGreaterThan(0);
    expect(completedOrder).toBeGreaterThan(updateOrder);
  });

  it("EXP-66: FAILED audit corresponds to FAILED state transition", async () => {
    const wrapped = wrapServerSecret(crypto.randomBytes(32).toString("base64url"));
    const updateMany = jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    const { service, audit } = makeService({
      organizationDataExport: {
        findUnique: jest.fn().mockResolvedValue({
          id: "exp-66",
          facilityId: "fac-a",
          requestedByUserId: "admin-a",
          exportFormat: OrganizationDataExportFormat.ZIP,
          status: OrganizationDataExportStatus.QUEUED,
          exportKeyWrappedJson: wrapped,
        }),
        updateMany,
        update: jest.fn().mockRejectedValue(new Error("force failure")),
      },
      storagePut: jest.fn().mockResolvedValue({ objectKey: "obj-66", sizeBytes: 20 }),
    });
    jest.spyOn(service as any, "buildPlaintextPackage").mockResolvedValue({
      zipBuffer: Buffer.from("zip-66", "utf8"),
      patientCount: 1,
      encounterCount: 1,
      providerDocumentationVersionCount: 0,
    });
    await (service as any).processQueuedExport("exp-66");
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_FAILED,
      "OrganizationDataExport",
      expect.objectContaining({ entityId: "exp-66", metadata: expect.objectContaining({ failureCode: "EXPORT_PROCESSING_FAILED" }) })
    );
  });

  it("EXP-67: download success ordering remains integrity verify then lifecycle update then success audit", async () => {
    const artifact = Buffer.from("artifact-67", "utf8");
    const encryptedSha256 = crypto.createHash("sha256").update(artifact).digest("hex");
    let readDone = false;
    const storageRead = jest.fn().mockImplementation(async () => {
      readDone = true;
      return artifact;
    });
    const update = jest.fn().mockImplementation(async () => {
      expect(readDone).toBe(true);
      return {};
    });
    const { service, audit } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-67",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256,
          objectStorageKey: "obj-67",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
        update,
      },
      storageRead,
    });
    await service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-67" });
    const readOrder = storageRead.mock.invocationCallOrder[0] ?? 0;
    const updateOrder = update.mock.invocationCallOrder[0] ?? 0;
    const auditIdx = audit.log.mock.calls.findIndex((call) => call[0] === AuditAction.ORGANIZATION_EXPORT_DOWNLOADED);
    const auditOrder = auditIdx >= 0 ? audit.log.mock.invocationCallOrder[auditIdx] : 0;
    expect(readOrder).toBeLessThan(updateOrder);
    expect(updateOrder).toBeLessThan(auditOrder);
  });

  it("EXP-68: integrity failure still does not write download success lifecycle/audit", async () => {
    const expected = Buffer.from("exp-68-expected", "utf8");
    const tampered = Buffer.from("exp-68-tampered", "utf8");
    const encryptedSha256 = crypto.createHash("sha256").update(expected).digest("hex");
    const update = jest.fn().mockResolvedValue({});
    const { service, prisma, audit } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-68",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256,
          objectStorageKey: "obj-68",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
        update,
      },
      storageRead: jest.fn().mockResolvedValue(tampered),
    });
    await expect(service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-68" })).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(prisma.organizationDataExport.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          downloadedByUserId: "admin-a",
        }),
      })
    );
    expect(audit.log).not.toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_DOWNLOADED,
      "OrganizationDataExport",
      expect.anything()
    );
  });

  it("EXP-69: expired export transitions to EXPIRED then emits expiration audit without FAILED transition", async () => {
    const update = jest.fn().mockResolvedValue({});
    const { service, prisma, audit } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-69",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-08T05:00:00.000Z"),
          encryptedSha256: "a".repeat(64),
          objectStorageKey: "obj-69",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
        update,
      },
    });
    await expect(
      service.downloadExport({ actorUserId: "admin-a", facilityId: "fac-a", exportId: "exp-69" })
    ).rejects.toBeInstanceOf(ForbiddenException);
    const updateOrder = update.mock.invocationCallOrder[0] ?? 0;
    const expIdx = audit.log.mock.calls.findIndex((call) => call[0] === AuditAction.ORGANIZATION_EXPORT_EXPIRED);
    const expAuditOrder = expIdx >= 0 ? audit.log.mock.invocationCallOrder[expIdx] : 0;
    expect(updateOrder).toBeGreaterThan(0);
    expect(expAuditOrder).toBeGreaterThan(updateOrder);
    expect(audit.log).not.toHaveBeenCalledWith(
      AuditAction.ORGANIZATION_EXPORT_FAILED,
      "OrganizationDataExport",
      expect.objectContaining({ entityId: "exp-69" })
    );
  });

  it("EXP-70: known limitation - scheduling remains in-process via setTimeout", async () => {
    jest.useFakeTimers();
    try {
      const { service, prisma } = makeService();
      ((service as any).scheduleProcessing as jest.SpyInstance).mockRestore();
      (service as any).scheduleProcessing("exp-70");
      expect(prisma.organizationDataExport.findUnique).not.toHaveBeenCalled();
      await jest.runOnlyPendingTimersAsync();
      expect(prisma.organizationDataExport.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "exp-70" } })
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
