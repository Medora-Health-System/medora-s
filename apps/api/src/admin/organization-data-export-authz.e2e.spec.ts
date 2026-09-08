import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { OrganizationDataExportFormat, OrganizationDataExportStatus, RoleCode } from "@prisma/client";
import * as argon2 from "argon2";
import { randomBytes } from "crypto";
import * as request from "supertest";
import { AppModule } from "../app.module";
import { DocumentSecureExportStorage } from "./organization-data-export.storage";
import { PrismaService } from "../prisma/prisma.service";
import { applyE2eAuthTestEnv, assertE2eLoginAccessToken } from "../test-utils/e2e-auth-env";
import { closeE2eApp, createE2eApp } from "../test-utils/e2e-app";

jest.setTimeout(60_000);

describe("Organization export authorization & tenant isolation (e2e)", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  const storage = {
    put: jest.fn().mockResolvedValue({ objectKey: "e2e-put-key", sizeBytes: 0 }),
    read: jest.fn().mockResolvedValue(Buffer.from("e2e-artifact", "utf8")),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  let facilityIdA: string;
  let facilityIdB: string;
  let adminAUserId: string;

  let adminAToken: string;
  let adminBToken: string;
  let nonAdminToken: string;

  let exportAId: string;
  let exportBId: string;

  const createdUserIds: string[] = [];
  const createdExportIds: string[] = [];
  const suiteSuffix = randomBytes(4).toString("hex");
  const email = (local: string) => `${local}+${suiteSuffix}@export-authz-e2e.local`;
  const password = "Test123!";

  beforeAll(async () => {
    applyE2eAuthTestEnv();

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DocumentSecureExportStorage)
      .useValue(storage)
      .compile();

    app = await createE2eApp(moduleRef);
    applyE2eAuthTestEnv();
    prisma = moduleRef.get<PrismaService>(PrismaService);

    const [facilityA, facilityB] = await Promise.all([
      prisma.facility.create({
        data: {
          code: `EXP-A-${suiteSuffix}`,
          name: "Export Auth Facility A",
          country: "Test",
          timezone: "UTC",
        },
      }),
      prisma.facility.create({
        data: {
          code: `EXP-B-${suiteSuffix}`,
          name: "Export Auth Facility B",
          country: "Test",
          timezone: "UTC",
        },
      }),
    ]);
    facilityIdA = facilityA.id;
    facilityIdB = facilityB.id;

    const [adminRole, providerRole] = await Promise.all([
      prisma.role.upsert({
        where: { code: RoleCode.ADMIN },
        update: {},
        create: { code: RoleCode.ADMIN, name: "Admin" },
      }),
      prisma.role.upsert({
        where: { code: RoleCode.PROVIDER },
        update: {},
        create: { code: RoleCode.PROVIDER, name: "Provider" },
      }),
    ]);

    const [adminA, adminB, nonAdmin] = await Promise.all([
      prisma.user.create({
        data: {
          email: email("admin-a"),
          firstName: "Admin",
          lastName: "A",
          passwordHash: await argon2.hash(password),
        },
      }),
      prisma.user.create({
        data: {
          email: email("admin-b"),
          firstName: "Admin",
          lastName: "B",
          passwordHash: await argon2.hash(password),
        },
      }),
      prisma.user.create({
        data: {
          email: email("non-admin-a"),
          firstName: "Non",
          lastName: "Admin",
          passwordHash: await argon2.hash(password),
        },
      }),
    ]);
    createdUserIds.push(adminA.id, adminB.id, nonAdmin.id);
    adminAUserId = adminA.id;

    await Promise.all([
      prisma.userRole.create({
        data: {
          userId: adminA.id,
          roleId: adminRole.id,
          facilityId: facilityIdA,
          professionCode: "ADMINISTRATION",
        },
      }),
      prisma.userRole.create({
        data: {
          userId: adminB.id,
          roleId: adminRole.id,
          facilityId: facilityIdB,
          professionCode: "ADMINISTRATION",
        },
      }),
      prisma.userRole.create({
        data: {
          userId: nonAdmin.id,
          roleId: providerRole.id,
          facilityId: facilityIdA,
          professionCode: "PROVIDER_UNSPECIFIED",
        },
      }),
    ]);

    const login = async (username: string) => {
      const response = await request(app.getHttpServer()).post("/auth/login").send({ username, password }).expect(201);
      return assertE2eLoginAccessToken(response.body, username);
    };
    adminAToken = await login(email("admin-a"));
    adminBToken = await login(email("admin-b"));
    nonAdminToken = await login(email("non-admin-a"));

    const [rowA, rowB] = await Promise.all([
      prisma.organizationDataExport.create({
        data: {
          facilityId: facilityIdA,
          requestedByUserId: adminA.id,
          status: OrganizationDataExportStatus.COMPLETED,
          exportFormat: OrganizationDataExportFormat.ZIP,
          schemaVersion: 1,
          patientCount: 1,
          encounterCount: 1,
          plaintextSha256: "a".repeat(64),
          encryptedSha256: "b".repeat(64),
          encryptionAlgorithm: "AES-256-GCM",
          objectStorageKey: `storage-a-${suiteSuffix}`,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
      prisma.organizationDataExport.create({
        data: {
          facilityId: facilityIdB,
          requestedByUserId: adminB.id,
          status: OrganizationDataExportStatus.COMPLETED,
          exportFormat: OrganizationDataExportFormat.ZIP,
          schemaVersion: 1,
          patientCount: 1,
          encounterCount: 1,
          plaintextSha256: "c".repeat(64),
          encryptedSha256: "d".repeat(64),
          encryptionAlgorithm: "AES-256-GCM",
          objectStorageKey: `storage-b-${suiteSuffix}`,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
    ]);
    exportAId = rowA.id;
    exportBId = rowB.id;
    createdExportIds.push(exportAId, exportBId);
  });

  afterEach(() => {
    storage.put.mockClear();
    storage.read.mockClear();
    storage.delete.mockClear();
  });

  afterAll(async () => {
    try {
      if (prisma) {
        if (createdExportIds.length > 0) {
          await prisma.organizationDataExport.deleteMany({ where: { id: { in: createdExportIds } } });
        }
        if (facilityIdA && facilityIdB) {
          await prisma.userRole.deleteMany({ where: { facilityId: { in: [facilityIdA, facilityIdB] } } });
          if (createdUserIds.length > 0) {
            await prisma.user.updateMany({ where: { id: { in: createdUserIds } }, data: { isActive: false } });
          }
          await prisma.facility.updateMany({ where: { id: { in: [facilityIdA, facilityIdB] } }, data: { isActive: false } });
        }
      }
    } finally {
      await closeE2eApp({ app, moduleRef, prisma });
    }
  });

  const forbiddenOrNotFound = (status: number) => {
    expect([403, 404]).toContain(status);
  };

  const assertNoSensitiveLeak = (response: request.Response) => {
    const bodyJson = JSON.stringify(response.body ?? {});
    const text = `${bodyJson}\n${String(response.text ?? "")}`.toLowerCase();
    const disallowed = [
      "objectstoragekey",
      "objectkey",
      "storagekey",
      "s3://",
      "signedurl",
      "exportkeywrappedjson",
      "wrappedkey",
      "database_url",
      "postgresql://",
      "/home/runner/",
      "prisma",
      "stack",
      "trace",
      "ciphertext",
      "auth tag",
      "secret",
      "bucket",
      "storage-b-",
      "storage-a-",
    ];
    for (const token of disallowed) {
      expect(text).not.toContain(token);
    }
  };

  const bearer = (token: string) => "Bearer " + token;

  it("EXP-71: unauthenticated organization-export request is rejected", async () => {
    await request(app.getHttpServer()).get("/admin/data-exports").set("x-facility-id", facilityIdA).expect(401);
  });

  it("EXP-72: authenticated non-admin/unauthorized role is rejected", async () => {
    await request(app.getHttpServer())
      .get("/admin/data-exports")
      .set("Authorization", bearer(nonAdminToken))
      .set("x-facility-id", facilityIdA)
      .expect(403);
  });

  it("EXP-73: authorized Facility A admin can access permitted Facility A export route", async () => {
    const response = await request(app.getHttpServer())
      .get("/admin/data-exports")
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdA)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((row: { id: string }) => row.id === exportAId)).toBe(true);
    expect(response.body.some((row: { id: string }) => row.id === exportBId)).toBe(false);
  });

  it("EXP-74: Facility A admin cannot retrieve Facility B export metadata", async () => {
    const response = await request(app.getHttpServer())
      .get(`/admin/data-exports/${exportBId}`)
      .query({ facilityId: facilityIdB })
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdA);
    forbiddenOrNotFound(response.status);
    assertNoSensitiveLeak(response);
  });

  it("EXP-75: Facility A admin cannot download Facility B export", async () => {
    const response = await request(app.getHttpServer())
      .post(`/admin/data-exports/${exportBId}/download`)
      .query({ facilityId: facilityIdB })
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdA);
    forbiddenOrNotFound(response.status);
    expect(response.headers["content-disposition"]).toBeUndefined();
    expect(response.headers["content-type"] ?? "").not.toContain("application/octet-stream");
    assertNoSensitiveLeak(response);
  });

  it("EXP-76: cross-facility denial occurs before secure storage artifact retrieval", async () => {
    const response = await request(app.getHttpServer())
      .post(`/admin/data-exports/${exportBId}/download`)
      .query({ facilityId: facilityIdB })
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdA);
    forbiddenOrNotFound(response.status);
    expect(storage.read).not.toHaveBeenCalled();
  });

  it("EXP-77: knowing a valid foreign export UUID does not bypass scope", async () => {
    const response = await request(app.getHttpServer())
      .get(`/admin/data-exports/${exportBId}`)
      .query({ facilityId: facilityIdA })
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdA);
    expect(response.status).toBe(404);
    expect(response.body?.id).toBeUndefined();
    assertNoSensitiveLeak(response);
  });

  it("EXP-78: foreign facility_id injection during export creation cannot cross tenant boundary", async () => {
    const beforeCount = await prisma.organizationDataExport.count({
      where: { facilityId: facilityIdB, requestedByUserId: adminAUserId },
    });
    const response = await request(app.getHttpServer())
      .post("/admin/data-exports")
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdA)
      .send({ facility_id: facilityIdB, format: "ZIP" });
    expect([403, 404]).toContain(response.status);
    const afterCount = await prisma.organizationDataExport.count({
      where: { facilityId: facilityIdB, requestedByUserId: adminAUserId },
    });
    expect(afterCount).toBe(beforeCount);
    expect(storage.put).not.toHaveBeenCalled();
    assertNoSensitiveLeak(response);
  });

  it("EXP-79: Facility B admin cannot retrieve Facility A export (inverse isolation)", async () => {
    const response = await request(app.getHttpServer())
      .get(`/admin/data-exports/${exportAId}`)
      .query({ facilityId: facilityIdA })
      .set("Authorization", bearer(adminBToken))
      .set("x-facility-id", facilityIdB);
    forbiddenOrNotFound(response.status);
    assertNoSensitiveLeak(response);
  });

  it("EXP-80: cross-tenant response contains no object storage locator", async () => {
    const response = await request(app.getHttpServer())
      .get(`/admin/data-exports/${exportBId}`)
      .query({ facilityId: facilityIdB })
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdA);
    forbiddenOrNotFound(response.status);
    const bodyJson = JSON.stringify(response.body ?? {});
    const text = `${bodyJson}\n${String(response.text ?? "")}`;
    expect(text).not.toContain("objectStorageKey");
    expect(text).not.toContain("objectKey");
    expect(text).not.toContain("storageKey");
    expect(text).not.toContain("s3://");
  });

  it("EXP-81: cross-tenant response contains no wrapped key material", async () => {
    const response = await request(app.getHttpServer())
      .post(`/admin/data-exports/${exportBId}/download`)
      .query({ facilityId: facilityIdB })
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdA);
    forbiddenOrNotFound(response.status);
    const text = `${JSON.stringify(response.body ?? {})}\n${String(response.text ?? "")}`;
    expect(text).not.toContain("exportKeyWrappedJson");
    expect(text).not.toContain("wrappedKey");
    expect(text).not.toContain("wrapped_key");
  });

  it("EXP-82: cross-tenant denial produces no sensitive storage/crypto/database internals", async () => {
    const response = await request(app.getHttpServer())
      .post(`/admin/data-exports/${exportBId}/download`)
      .query({ facilityId: facilityIdB })
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdA);
    forbiddenOrNotFound(response.status);
    assertNoSensitiveLeak(response);
  });

  it("EXP-83: Admin A cannot list Facility B exports by query injection", async () => {
    const response = await request(app.getHttpServer())
      .get("/admin/data-exports")
      .query({ facilityId: facilityIdB })
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdA);
    expect(response.status).toBe(403);
    expect(Array.isArray(response.body)).toBe(false);
    assertNoSensitiveLeak(response);
  });

  it("EXP-84: spoofed x-facility-id cannot grant cross-facility export access", async () => {
    const response = await request(app.getHttpServer())
      .get("/admin/data-exports")
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdB);
    expect(response.status).toBe(403);
    assertNoSensitiveLeak(response);
  });

  it("EXP-85: query/header facility conflict cannot grant foreign facility access", async () => {
    const response = await request(app.getHttpServer())
      .get(`/admin/data-exports/${exportBId}`)
      .query({ facilityId: facilityIdB })
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdA);
    expect(response.status).toBe(403);
    assertNoSensitiveLeak(response);
  });

  it("EXP-86: body/header facility conflict cannot create foreign facility export", async () => {
    const beforeCount = await prisma.organizationDataExport.count({
      where: { facilityId: facilityIdB, requestedByUserId: adminAUserId },
    });
    const response = await request(app.getHttpServer())
      .post("/admin/data-exports")
      .set("Authorization", bearer(adminAToken))
      .set("x-facility-id", facilityIdA)
      .send({ facility_id: facilityIdB, format: "ZIP" });
    expect(response.status).toBe(403);
    const afterCount = await prisma.organizationDataExport.count({
      where: { facilityId: facilityIdB, requestedByUserId: adminAUserId },
    });
    expect(afterCount).toBe(beforeCount);
    expect(storage.put).not.toHaveBeenCalled();
    assertNoSensitiveLeak(response);
  });
});
