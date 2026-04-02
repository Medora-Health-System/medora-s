/**
 * Integration tests: multi-facility tenant boundaries (facilityId + RolesGuard).
 * Proves users cannot read/write another facility’s data by ID or by spoofing x-facility-id.
 */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { randomBytes } from "crypto";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import * as argon2 from "argon2";
import { EncounterType, EncounterStatus, OrderStatus, RoleCode } from "@prisma/client";

describe("Facility isolation (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let facilityIdA: string;
  let facilityIdB: string;

  let providerTokenA: string;
  let labTokenA: string;
  let labTokenB: string;
  let pharmacyTokenA: string;

  let patientIdA: string;
  let patientIdB: string;
  let encounterIdA: string;
  let encounterIdB: string;
  let orderIdA: string;
  let orderIdB: string;
  let orderItemLabA: string;
  let orderItemLabB: string;
  let orderItemMedA: string;

  const suffix = randomBytes(4).toString("hex");
  const email = (local: string) => `${local}+${suffix}@fi-test.local`;
  const password = "Test123!";

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "test_access_secret";
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test_refresh_secret";
    process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
    process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? "14d";
    process.env.TOKEN_ISSUER = process.env.TOKEN_ISSUER ?? "medora-s";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const facilityA = await prisma.facility.create({
      data: {
        code: `FI-A-${suffix}`,
        name: "Facility A ISO",
        country: "Test",
        timezone: "UTC",
      },
    });
    const facilityB = await prisma.facility.create({
      data: {
        code: `FI-B-${suffix}`,
        name: "Facility B ISO",
        country: "Test",
        timezone: "UTC",
      },
    });
    facilityIdA = facilityA.id;
    facilityIdB = facilityB.id;

    const roleProvider = await prisma.role.upsert({
      where: { code: RoleCode.PROVIDER },
      update: {},
      create: { code: RoleCode.PROVIDER, name: "Provider" },
    });
    const roleLab = await prisma.role.upsert({
      where: { code: RoleCode.LAB },
      update: {},
      create: { code: RoleCode.LAB, name: "Lab" },
    });
    const rolePharmacy = await prisma.role.upsert({
      where: { code: RoleCode.PHARMACY },
      update: {},
      create: { code: RoleCode.PHARMACY, name: "Pharmacy" },
    });

    const userProviderA = await prisma.user.create({
      data: {
        email: email("provider"),
        firstName: "Prov",
        lastName: "A",
        passwordHash: await argon2.hash(password),
      },
    });
    const userLabA = await prisma.user.create({
      data: {
        email: email("laba"),
        firstName: "Lab",
        lastName: "A",
        passwordHash: await argon2.hash(password),
      },
    });
    const userLabB = await prisma.user.create({
      data: {
        email: email("labb"),
        firstName: "Lab",
        lastName: "B",
        passwordHash: await argon2.hash(password),
      },
    });
    const userPharmA = await prisma.user.create({
      data: {
        email: email("pharma"),
        firstName: "Pharm",
        lastName: "A",
        passwordHash: await argon2.hash(password),
      },
    });

    await prisma.userRole.create({
      data: { userId: userProviderA.id, roleId: roleProvider.id, facilityId: facilityIdA },
    });
    await prisma.userRole.create({
      data: { userId: userLabA.id, roleId: roleLab.id, facilityId: facilityIdA },
    });
    await prisma.userRole.create({
      data: { userId: userLabB.id, roleId: roleLab.id, facilityId: facilityIdB },
    });
    await prisma.userRole.create({
      data: { userId: userPharmA.id, roleId: rolePharmacy.id, facilityId: facilityIdA },
    });

    const login = async (u: string) => {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ username: u, password })
        .expect(201);
      return res.body.accessToken as string;
    };

    providerTokenA = await login(email("provider"));
    labTokenA = await login(email("laba"));
    labTokenB = await login(email("labb"));
    pharmacyTokenA = await login(email("pharma"));

    const patientA = await prisma.patient.create({
      data: {
        facilityId: facilityIdA,
        registeredAtFacilityId: facilityIdA,
        firstName: "Pat",
        lastName: "A",
        mrn: `MRN-A-${suffix}`,
        globalMrn: `GM-A-${suffix}`,
      },
    });
    const patientB = await prisma.patient.create({
      data: {
        facilityId: facilityIdB,
        registeredAtFacilityId: facilityIdB,
        firstName: "Pat",
        lastName: "B",
        mrn: `MRN-B-${suffix}`,
        globalMrn: `GM-B-${suffix}`,
      },
    });
    patientIdA = patientA.id;
    patientIdB = patientB.id;

    const encA = await prisma.encounter.create({
      data: {
        facilityId: facilityIdA,
        patientId: patientIdA,
        type: EncounterType.OUTPATIENT,
        status: EncounterStatus.OPEN,
      },
    });
    const encB = await prisma.encounter.create({
      data: {
        facilityId: facilityIdB,
        patientId: patientIdB,
        type: EncounterType.OUTPATIENT,
        status: EncounterStatus.OPEN,
      },
    });
    encounterIdA = encA.id;
    encounterIdB = encB.id;

    const orderA = await prisma.order.create({
      data: {
        encounterId: encounterIdA,
        facilityId: facilityIdA,
        patientId: patientIdA,
        type: "LAB",
        status: OrderStatus.PENDING,
        items: {
          create: [
            {
              catalogItemType: "LAB_TEST",
              status: OrderStatus.PENDING,
              manualLabel: "ISO CBC",
            },
          ],
        },
      },
      include: { items: true },
    });
    orderIdA = orderA.id;
    orderItemLabA = orderA.items[0].id;

    const orderMed = await prisma.order.create({
      data: {
        encounterId: encounterIdA,
        facilityId: facilityIdA,
        patientId: patientIdA,
        type: "MEDICATION",
        status: OrderStatus.PENDING,
        items: {
          create: [
            {
              catalogItemType: "MEDICATION",
              status: OrderStatus.PENDING,
              manualLabel: "ISO Med",
            },
          ],
        },
      },
      include: { items: true },
    });
    orderItemMedA = orderMed.items[0].id;

    const orderB = await prisma.order.create({
      data: {
        encounterId: encounterIdB,
        facilityId: facilityIdB,
        patientId: patientIdB,
        type: "LAB",
        status: OrderStatus.PENDING,
        items: {
          create: [
            {
              catalogItemType: "LAB_TEST",
              status: OrderStatus.PENDING,
              manualLabel: "ISO B CBC",
            },
          ],
        },
      },
      include: { items: true },
    });
    orderIdB = orderB.id;
    orderItemLabB = orderB.items[0].id;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({
      where: { order: { facilityId: { in: [facilityIdA, facilityIdB] } } },
    });
    await prisma.order.deleteMany({
      where: { facilityId: { in: [facilityIdA, facilityIdB] } },
    });
    await prisma.encounter.deleteMany({
      where: { facilityId: { in: [facilityIdA, facilityIdB] } },
    });
    await prisma.patient.deleteMany({
      where: { facilityId: { in: [facilityIdA, facilityIdB] } },
    });
    await prisma.userRole.deleteMany({
      where: { facilityId: { in: [facilityIdA, facilityIdB] } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "@fi-test.local" } },
    });
    await prisma.facility.deleteMany({
      where: { id: { in: [facilityIdA, facilityIdB] } },
    });
    await app.close();
  });

  describe("Patients: tenant boundary on GET/PATCH", () => {
    it("provider in facility A can GET patient in A", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientIdA}`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdA)
        .expect(200);
    });

    it("same user cannot GET patient that exists only in B (wrong id for tenant A)", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientIdB}`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdA)
        .expect(404);
    });

    it("provider in A can PATCH patient in A", () => {
      return request(app.getHttpServer())
        .patch(`/patients/${patientIdA}`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdA)
        .send({ lastName: `Updated-${suffix}` })
        .expect(200);
    });

    it("same user cannot PATCH patient in B while scoped to A", () => {
      return request(app.getHttpServer())
        .patch(`/patients/${patientIdB}`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdA)
        .send({ lastName: "Nope" })
        .expect(404);
    });

    it("spoofing x-facility-id to B without membership in B is denied (403)", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientIdB}`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdB)
        .expect(403);
    });
  });

  describe("Encounters: tenant boundary", () => {
    it("provider in A can GET encounter in A when role allows", () => {
      return request(app.getHttpServer())
        .get(`/encounters/${encounterIdA}`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdA)
        .expect(200);
    });

    it("cannot GET encounter in B while tenant is A", () => {
      return request(app.getHttpServer())
        .get(`/encounters/${encounterIdB}`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdA)
        .expect(404);
    });

    it("wrong facility header (B) without role in B is denied (403)", () => {
      return request(app.getHttpServer())
        .get(`/encounters/${encounterIdA}`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdB)
        .expect(403);
    });
  });

  describe("Orders: tenant boundary", () => {
    it("provider in A can GET order in A", () => {
      return request(app.getHttpServer())
        .get(`/orders/${orderIdA}`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdA)
        .expect(200);
    });

    it("cannot GET order that exists only in B while scoped to A", () => {
      return request(app.getHttpServer())
        .get(`/orders/${orderIdB}`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdA)
        .expect(404);
    });

    it("encounter order list does not return other facility’s orders (B encounter + A tenant → empty)", async () => {
      const res = await request(app.getHttpServer())
        .get(`/encounters/${encounterIdB}/orders`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdA)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });
  });

  describe("Queue / order item PATCH: facility + department", () => {
    /** Run denial cases while LAB line A is still PENDING, before any successful transition. */
    it("LAB user in A cannot mutate a line that belongs to facility B", () => {
      return request(app.getHttpServer())
        .patch(`/orders/items/${orderItemLabB}/status`)
        .set("Authorization", `Bearer ${labTokenA}`)
        .set("x-facility-id", facilityIdA)
        .send({ status: "IN_PROGRESS" })
        .expect(400);
    });

    it("LAB user in B cannot mutate A’s line even with B header (item not in B)", () => {
      return request(app.getHttpServer())
        .patch(`/orders/items/${orderItemLabA}/status`)
        .set("Authorization", `Bearer ${labTokenB}`)
        .set("x-facility-id", facilityIdB)
        .send({ status: "IN_PROGRESS" })
        .expect(400);
    });

    it("PHARMACY user cannot transition a LAB_TEST line (wrong department)", () => {
      return request(app.getHttpServer())
        .patch(`/orders/items/${orderItemLabA}/status`)
        .set("Authorization", `Bearer ${pharmacyTokenA}`)
        .set("x-facility-id", facilityIdA)
        .send({ status: "IN_PROGRESS" })
        .expect(403);
    });

    it("LAB user cannot transition a MEDICATION line (wrong item type for LAB)", () => {
      return request(app.getHttpServer())
        .patch(`/orders/items/${orderItemMedA}/status`)
        .set("Authorization", `Bearer ${labTokenA}`)
        .set("x-facility-id", facilityIdA)
        .send({ status: "IN_PROGRESS" })
        .expect(403);
    });

    it("LAB user in A can transition a LAB line in A (allowed status)", () => {
      return request(app.getHttpServer())
        .patch(`/orders/items/${orderItemLabA}/status`)
        .set("Authorization", `Bearer ${labTokenA}`)
        .set("x-facility-id", facilityIdA)
        .send({ status: "IN_PROGRESS" })
        .expect(200);
    });
  });

  describe("RolesGuard + facility membership", () => {
    it("valid role + membership + correct facility succeeds (patient read)", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientIdA}`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdA)
        .expect(200);
    });

    it("correct JWT but x-facility-id for a facility with no userRole → 403", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientIdA}`)
        .set("Authorization", `Bearer ${providerTokenA}`)
        .set("x-facility-id", facilityIdB)
        .expect(403);
    });

    it("LAB cannot open patient chart (wrong role for route) → 403", () => {
      return request(app.getHttpServer())
        .get(`/patients/${patientIdA}`)
        .set("Authorization", `Bearer ${labTokenA}`)
        .set("x-facility-id", facilityIdA)
        .expect(403);
    });
  });
});
