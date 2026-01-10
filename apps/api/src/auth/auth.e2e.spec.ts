import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import * as argon2 from "argon2";
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
    const passwordHash = await argon2.hash("Admin123!");

    const db: any = {
      user: {
        findFirst: jest.fn(async ({ where }: any): Promise<any> => {
          if (where?.email === adminEmail && where?.isActive === true) {
            return {
              id: adminId,
              email: adminEmail,
              firstName: "Admin",
              lastName: "User",
              passwordHash,
              refreshTokenHash: null,
              isActive: true
            };
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
            isActive: true
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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("login returns tokens", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: "admin@medora.local", password: "Admin123!" })
      .expect(201);

    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.user?.facilityRoles?.length).toBeGreaterThan(0);
  });

  it("/auth/me requires auth", async () => {
    await request(app.getHttpServer()).get("/auth/me").expect(401);
  });

  it("refresh rotates refresh token", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ username: "admin@medora.local", password: "Admin123!" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: login.body.refreshToken })
      .expect(201);

    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.refreshToken).not.toBe(login.body.refreshToken);
  });
});

