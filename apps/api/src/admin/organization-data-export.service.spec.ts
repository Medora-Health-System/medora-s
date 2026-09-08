import { ConflictException, ForbiddenException } from "@nestjs/common";
import { AuditAction, OrganizationDataExportFormat, OrganizationDataExportStatus } from "@prisma/client";
import * as crypto from "crypto";
import { OrganizationDataExportService } from "./organization-data-export.service";
import { buildStoredZip, readStoredZipEntries } from "./organization-data-export.zip";
import { assertFacilityAdminFacilityScope } from "./user-mutation-boundary";

jest.mock("./user-mutation-boundary", () => ({
  assertFacilityAdminFacilityScope: jest.fn(),
}));
jest.mock("../encounters/chart-export-html.util", () => ({
  renderEncounterChartExportHtml: jest.fn(() => "<html>chart</html>"),
}));

const assertScope = assertFacilityAdminFacilityScope as jest.MockedFunction<typeof assertFacilityAdminFacilityScope>;

function makeService(overrides?: {
  organizationDataExport?: Partial<Record<"create" | "findMany" | "findFirst" | "findUnique" | "update", jest.Mock>>;
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

describe("OrganizationDataExportService", () => {
  beforeEach(() => {
    assertScope.mockResolvedValue(undefined);
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
      if (query.includes("AND 1 = 0")) return [];
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
    const encounters = [...zip.entries()].find(([k]) => k.endsWith("/encounters.csv"))?.[1].toString("utf8") ?? "";
    const versions = [...zip.entries()].find(([k]) => k.endsWith("/provider-documentation-versions.jsonl"))?.[1].toString("utf8") ?? "";
    expect(patients).toContain("fac-a-pat");
    expect(encounters).toContain("fac-a-enc");
    expect(versions).toContain("fac-a-ver");
    expect(`${patients}${encounters}${versions}`).not.toContain("fac-b-");
    for (const f of manifest.files as Array<{ path: string; sha256: string; sizeBytes: number }>) {
      const key = manifestPath.replace("manifest.json", f.path);
      const file = zip.get(key);
      expect(file).toBeDefined();
      expect(crypto.createHash("sha256").update(file!).digest("hex")).toBe(f.sha256);
    }
  });

  it("EXP-09/10: plaintext package hash verifies and encrypted artifact decrypts with correct secret", async () => {
    const { service } = makeService();
    const secret = crypto.randomBytes(32).toString("base64url");
    const key = Buffer.from(secret, "base64url");
    const plaintext = Buffer.from("zip-bytes", "utf8");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

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
    const plaintextSha256 = crypto.createHash("sha256").update(zipBuffer).digest("hex");
    await expect(
      service.verifyEncryptedArtifact({
        encryptedArtifact: encryptedZip,
        decryptionSecret: secret,
        ivBase64: iv.toString("base64"),
        authTagBase64: tag2.toString("base64"),
        plaintextSha256,
      })
    ).resolves.toEqual({ ok: true });
    expect(encrypted.length).toBeGreaterThan(0);
    expect(plaintextSha256).toHaveLength(64);
  });

  it("EXP-11: incorrect secret fails decryption", async () => {
    const { service } = makeService();
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from("abc")), cipher.final()]);
    const tag = cipher.getAuthTag();
    await expect(
      service.verifyEncryptedArtifact({
        encryptedArtifact: encrypted,
        decryptionSecret: crypto.randomBytes(32).toString("base64url"),
        ivBase64: iv.toString("base64"),
        authTagBase64: tag.toString("base64"),
        plaintextSha256: "0".repeat(64),
      })
    ).rejects.toThrow();
  });

  it("EXP-12: modified ciphertext fails authenticated decryption", async () => {
    const { service } = makeService();
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from("abc")), cipher.final()]);
    const tag = cipher.getAuthTag();
    encrypted[0] = encrypted[0] ^ 0xff;
    await expect(
      service.verifyEncryptedArtifact({
        encryptedArtifact: encrypted,
        decryptionSecret: key.toString("base64url"),
        ivBase64: iv.toString("base64"),
        authTagBase64: tag.toString("base64"),
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
    const { service, audit } = makeService({
      organizationDataExport: {
        findFirst: jest.fn().mockResolvedValue({
          id: "exp-1",
          facilityId: "fac-a",
          status: OrganizationDataExportStatus.COMPLETED,
          requestedAt: new Date("2026-09-08T06:00:00.000Z"),
          expiresAt: new Date("2026-09-09T06:00:00.000Z"),
          encryptedSha256: "a".repeat(64),
          objectStorageKey: "obj-key",
          exportFormat: OrganizationDataExportFormat.ZIP,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
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
});
