import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import * as argon2 from "argon2";
import cookieParser = require("cookie-parser");
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";

describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = "test_access_secret";
    process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
    process.env.JWT_ACCESS_TTL = "15m";
    process.env.JWT_REFRESH_TTL = "14d";
    process.env.TOKEN_ISSUER = "medora-s";

    const adminId = "u_admin";
    const adminEmail = "admin@medora.local";
    const roleAdminId = "r_admin";
    const facilityId = "f_dr";
    const passwordHash = await argon2.hash("MedoraAdmin123!");

    const sessions = new Map<
      string,
      { userId: string; refreshTokenHash: string; revokedAt: Date | null; expiresAt: Date }
    >();

    const db: any = {
      authSession: {
        create: jest.fn(async ({ data }: any) => {
          sessions.set(data.id, {
            userId: data.userId,
            refreshTokenHash: data.refreshTokenHash,
            revokedAt: null,
            expiresAt: data.expiresAt,
          });
          return { ...data };
        }),
        findFirst: jest.fn(async ({ where }: any): Promise<any> => {
          const id = where?.id;
          if (!id) return null;
          const s = sessions.get(id);
          if (!s || s.userId !== where.userId) return null;
          return {
            id,
            userId: s.userId,
            refreshTokenHash: s.refreshTokenHash,
            revokedAt: s.revokedAt,
            expiresAt: s.expiresAt,
          };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const s = sessions.get(where.id);
          if (!s) return { id: where.id };
          if (data.refreshTokenHash) s.refreshTokenHash = data.refreshTokenHash;
          if (data.revokedAt) s.revokedAt = data.revokedAt;
          if (data.lastUsedAt) {
            /* noop */
          }
          if (data.expiresAt) s.expiresAt = data.expiresAt;
          return { id: where.id, ...s };
        }),
        updateMany: jest.fn(async () => ({ count: 0 })),
      },
      user: {
        findFirst: jest.fn(async ({ where, include }: any): Promise<any> => {
          if (where?.email === adminEmail) {
            const base: any = {
              id: adminId,
              email: adminEmail,
              firstName: "Admin",
              lastName: "User",
              passwordHash,
              refreshTokenHash: null,
              isActive: true,
              canCreateFacilities: true,
            };
            if (include?.userRoles) {
              base.userRoles = [
                {
                  id: "ur_1",
                  facilityId,
                  departmentId: null,
                  isActive: true,
                  roleId: roleAdminId,
                  userId: adminId,
                  role: { id: roleAdminId, code: "ADMIN", name: "Admin" },
                  facility: { id: facilityId, name: "Test Facility" }
                }
              ];
            }
            return base;
          }
          return null;
        }),
        findUnique: jest.fn(async ({ where, include }: any): Promise<any> => {
          if (where?.id !== adminId) return null;
          const base: any = {
            id: adminId,
            email: adminEmail,
            firstName: "Admin",
            lastName: "User",
            passwordHash,
            refreshTokenHash: (db as any)._refreshTokenHash ?? null,
            isActive: true,
            canCreateFacilities: true,
          };
          if (!include?.userRoles) return base;
          return {
            ...base,
            userRoles: [
              {
                id: "ur_1",
                facilityId,
                departmentId: null,
                isActive: true,
                roleId: roleAdminId,
                userId: adminId,
                role: { id: roleAdminId, code: "ADMIN", name: "Admin" }
              }
            ]
          };
        }),
        update: jest.fn(async ({ data }: any): Promise<any> => {
          if (Object.prototype.hasOwnProperty.call(data, "refreshTokenHash")) {
            (db as any)._refreshTokenHash = data.refreshTokenHash;
          }
          return { ok: true };
        })
      }
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("login returns tokens", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: "admin@medora.local", password: "MedoraAdmin123!" })
      .expect(201);

    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeUndefined();
    const sc = res.headers["set-cookie"];
    expect(sc).toBeDefined();
    const cookieStr = Array.isArray(sc) ? sc.join(";") : String(sc);
    expect(cookieStr).toContain("refreshToken=");
    expect(res.body.user?.facilityRoles?.length).toBeGreaterThan(0);
  });

  it("/auth/me requires auth", async () => {
    await request(app.getHttpServer()).get("/auth/me").expect(401);
  });

  it("refresh rotates refresh token", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: "admin@medora.local", password: "MedoraAdmin123!" })
      .expect(201);

    const loginCookies = login.headers["set-cookie"];
    expect(loginCookies).toBeDefined();
    const cookieHeader = Array.isArray(loginCookies) ? loginCookies.map((c) => c.split(";")[0]).join("; ") : loginCookies;

    const res = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", cookieHeader ?? "")
      .expect(201);

    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeUndefined();
    const outCookies = res.headers["set-cookie"];
    expect(outCookies).toBeDefined();
    const outStr = Array.isArray(outCookies) ? outCookies.join(";") : String(outCookies);
    expect(outStr).toContain("refreshToken=");
  });
});

