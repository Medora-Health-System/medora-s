import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { EncounterStatus, EncounterType, RoleCode } from "@prisma/client";
import * as argon2 from "argon2";
import { randomBytes } from "crypto";
import * as request from "supertest";
import { AppModule } from "../app.module";
import { ENCOUNTER_CONCURRENT_MODIFICATION_CODE } from "./encounter-concurrency.util";
import { PrismaService } from "../prisma/prisma.service";
import { assertE2eLoginAccessToken, applyE2eAuthTestEnv } from "../test-utils/e2e-auth-env";
import { closeE2eApp, createE2eApp } from "../test-utils/e2e-app";

jest.setTimeout(45_000);

describe("Provider documentation version endpoints + concurrency (e2e)", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  const suffix = randomBytes(4).toString("hex");
  const password = "Test123!";
  const email = (local: string) => `${local}+${suffix}@provider-version-e2e.local`;

  let facilityIdA: string;
  let facilityIdB: string;
  let providerTokenA: string;
  let rnTokenA: string;
  let labTokenA: string;
  let providerTokenB: string;
  let historyEncounterId: string;
  let historyVersionId: string;
  let concurrencyEncounterId: string;

  beforeAll(async () => {
    applyE2eAuthTestEnv();
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = await createE2eApp(moduleRef);
    applyE2eAuthTestEnv();
    prisma = moduleRef.get<PrismaService>(PrismaService);

    const [facilityA, facilityB] = await Promise.all([
      prisma.facility.create({
        data: {
          code: `PDV-A-${suffix}`,
          name: "Provider Version Facility A",
          country: "Test",
          timezone: "UTC",
        },
      }),
      prisma.facility.create({
        data: {
          code: `PDV-B-${suffix}`,
          name: "Provider Version Facility B",
          country: "Test",
          timezone: "UTC",
        },
      }),
    ]);
    facilityIdA = facilityA.id;
    facilityIdB = facilityB.id;

    const [providerRole, rnRole, labRole] = await Promise.all([
      prisma.role.upsert({
        where: { code: RoleCode.PROVIDER },
        update: {},
        create: { code: RoleCode.PROVIDER, name: "Provider" },
      }),
      prisma.role.upsert({
        where: { code: RoleCode.RN },
        update: {},
        create: { code: RoleCode.RN, name: "Nurse" },
      }),
      prisma.role.upsert({
        where: { code: RoleCode.LAB },
        update: {},
        create: { code: RoleCode.LAB, name: "Lab" },
      }),
    ]);

    const [providerA, rnA, labA, providerB] = await Promise.all([
      prisma.user.create({
        data: {
          email: email("provider-a"),
          firstName: "Provider",
          lastName: "A",
          passwordHash: await argon2.hash(password),
        },
      }),
      prisma.user.create({
        data: {
          email: email("rn-a"),
          firstName: "Nurse",
          lastName: "A",
          passwordHash: await argon2.hash(password),
        },
      }),
      prisma.user.create({
        data: {
          email: email("lab-a"),
          firstName: "Lab",
          lastName: "A",
          passwordHash: await argon2.hash(password),
        },
      }),
      prisma.user.create({
        data: {
          email: email("provider-b"),
          firstName: "Provider",
          lastName: "B",
          passwordHash: await argon2.hash(password),
        },
      }),
    ]);

    await prisma.userRole.createMany({
      data: [
        {
          userId: providerA.id,
          roleId: providerRole.id,
          facilityId: facilityIdA,
          professionCode: "PROVIDER_UNSPECIFIED",
        },
        {
          userId: rnA.id,
          roleId: rnRole.id,
          facilityId: facilityIdA,
          professionCode: "NURSE_RN",
        },
        {
          userId: labA.id,
          roleId: labRole.id,
          facilityId: facilityIdA,
          professionCode: "TECHNICIAN",
        },
        {
          userId: providerB.id,
          roleId: providerRole.id,
          facilityId: facilityIdB,
          professionCode: "PROVIDER_UNSPECIFIED",
        },
      ],
    });

    const login = async (username: string) => {
      const res = await request(app.getHttpServer()).post("/auth/login").send({ username, password }).expect(201);
      return assertE2eLoginAccessToken(res.body, username);
    };
    providerTokenA = await login(email("provider-a"));
    rnTokenA = await login(email("rn-a"));
    labTokenA = await login(email("lab-a"));
    providerTokenB = await login(email("provider-b"));

    const [patientA, patientB] = await Promise.all([
      prisma.patient.create({
        data: {
          facilityId: facilityIdA,
          registeredAtFacilityId: facilityIdA,
          firstName: "Pat",
          lastName: "A",
          mrn: `PDV-A-${suffix}`,
          globalMrn: `PDV-GA-${suffix}`,
        },
      }),
      prisma.patient.create({
        data: {
          facilityId: facilityIdB,
          registeredAtFacilityId: facilityIdB,
          firstName: "Pat",
          lastName: "B",
          mrn: `PDV-B-${suffix}`,
          globalMrn: `PDV-GB-${suffix}`,
        },
      }),
    ]);

    const [historyEncounter, concurrentEncounter] = await Promise.all([
      prisma.encounter.create({
        data: {
          facilityId: facilityIdA,
          patientId: patientA.id,
          type: EncounterType.OUTPATIENT,
          status: EncounterStatus.OPEN,
          providerNote: "history sign content",
        },
      }),
      prisma.encounter.create({
        data: {
          facilityId: facilityIdA,
          patientId: patientA.id,
          type: EncounterType.OUTPATIENT,
          status: EncounterStatus.OPEN,
          providerNote: "concurrency sign content",
        },
      }),
    ]);
    historyEncounterId = historyEncounter.id;
    concurrencyEncounterId = concurrentEncounter.id;

    await request(app.getHttpServer())
      .post(`/encounters/${historyEncounterId}/sign-provider-documentation`)
      .auth(providerTokenA, { type: "bearer" })
      .set("x-facility-id", facilityIdA)
      .send({ attestationAccepted: true })
      .expect(201);

    const historyVersion = await prisma.encounterProviderDocumentationVersion.findFirst({
      where: { encounterId: historyEncounterId, facilityId: facilityIdA },
      select: { id: true },
    });
    if (!historyVersion) throw new Error("Expected signed provider documentation version");
    historyVersionId = historyVersion.id;

    await prisma.encounter.create({
      data: {
        facilityId: facilityIdB,
        patientId: patientB.id,
        type: EncounterType.OUTPATIENT,
        status: EncounterStatus.OPEN,
        providerNote: "other facility encounter",
      },
    });
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.encounterProviderDocumentationVersion.deleteMany({
          where: { facilityId: { in: [facilityIdA, facilityIdB].filter(Boolean) } },
        });
        await prisma.encounterClinicalEvent.deleteMany({
          where: { facilityId: { in: [facilityIdA, facilityIdB].filter(Boolean) } },
        });
        await prisma.encounter.deleteMany({
          where: { facilityId: { in: [facilityIdA, facilityIdB].filter(Boolean) } },
        });
        await prisma.patient.deleteMany({
          where: { facilityId: { in: [facilityIdA, facilityIdB].filter(Boolean) } },
        });
        await prisma.userRole.deleteMany({
          where: { facilityId: { in: [facilityIdA, facilityIdB].filter(Boolean) } },
        });
        await prisma.user.updateMany({
          where: { email: { contains: `+${suffix}@provider-version-e2e.local` } },
          data: { isActive: false },
        });
        await prisma.facility.updateMany({
          where: { id: { in: [facilityIdA, facilityIdB].filter(Boolean) } },
          data: { isActive: false },
        });
      }
    } finally {
      await closeE2eApp({ app, moduleRef, prisma });
    }
  });

  it("same-facility authorized user can list signed provider documentation versions", async () => {
    const res = await request(app.getHttpServer())
      .get(`/encounters/${historyEncounterId}/provider-documentation/versions`)
      .auth(rnTokenA, { type: "bearer" })
      .set("x-facility-id", facilityIdA)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: historyVersionId,
          versionNumber: 1,
        }),
      ])
    );
  });

  it("same-facility authorized user can retrieve a specific historical provider documentation version", async () => {
    const res = await request(app.getHttpServer())
      .get(`/encounters/${historyEncounterId}/provider-documentation/versions/${historyVersionId}`)
      .auth(rnTokenA, { type: "bearer" })
      .set("x-facility-id", facilityIdA)
      .expect(200);

    expect(res.body).toMatchObject({
      id: historyVersionId,
      encounterId: historyEncounterId,
      versionNumber: 1,
    });
  });

  it("unauthenticated requests are rejected", async () => {
    await request(app.getHttpServer())
      .get(`/encounters/${historyEncounterId}/provider-documentation/versions`)
      .set("x-facility-id", facilityIdA)
      .expect(401);
  });

  it("disallowed role is rejected", async () => {
    await request(app.getHttpServer())
      .get(`/encounters/${historyEncounterId}/provider-documentation/versions`)
      .auth(labTokenA, { type: "bearer" })
      .set("x-facility-id", facilityIdA)
      .expect(403);
  });

  it("authenticated user from another facility cannot list or retrieve signed versions", async () => {
    await request(app.getHttpServer())
      .get(`/encounters/${historyEncounterId}/provider-documentation/versions`)
      .auth(providerTokenB, { type: "bearer" })
      .set("x-facility-id", facilityIdB)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/encounters/${historyEncounterId}/provider-documentation/versions/${historyVersionId}`)
      .auth(providerTokenB, { type: "bearer" })
      .set("x-facility-id", facilityIdB)
      .expect(404);
  });

  it("IMM-10 true concurrency: two concurrent sign attempts yield one success, one canonical conflict, no duplicates, no orphan history", async () => {
    const sign = () =>
      request(app.getHttpServer())
        .post(`/encounters/${concurrencyEncounterId}/sign-provider-documentation`)
        .auth(providerTokenA, { type: "bearer" })
        .set("x-facility-id", facilityIdA)
        .send({ attestationAccepted: true });

    const [a, b] = await Promise.all([sign(), sign()]);
    const responses = [a, b];
    const success = responses.filter((r) => r.status === 201);
    const conflict = responses.filter((r) => r.status === 409);

    expect(success).toHaveLength(1);
    expect(conflict).toHaveLength(1);
    expect(conflict[0]?.body).toMatchObject({
      statusCode: 409,
      code: ENCOUNTER_CONCURRENT_MODIFICATION_CODE,
      message: ENCOUNTER_CONCURRENT_MODIFICATION_CODE,
    });

    const versions = await prisma.encounterProviderDocumentationVersion.findMany({
      where: { facilityId: facilityIdA, encounterId: concurrencyEncounterId },
      orderBy: { versionNumber: "asc" },
      select: {
        id: true,
        versionNumber: true,
        previousVersionId: true,
        previousVersion: { select: { id: true } },
      },
    });

    const uniqueVersionNumbers = new Set(versions.map((v) => v.versionNumber));
    const orphaned = versions.filter((v) => v.previousVersionId !== null && v.previousVersion === null);

    expect(versions).toHaveLength(1);
    expect(uniqueVersionNumbers.size).toBe(versions.length);
    expect(orphaned).toHaveLength(0);
  });
});
