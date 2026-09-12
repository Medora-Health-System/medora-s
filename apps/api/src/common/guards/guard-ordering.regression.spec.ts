/**
 * Regression coverage for authentication → authorization ordering.
 * Verifies `@UseGuards(AuthGuard("jwt"), RolesGuard)` runs authentication
 * before role/facility authorization, so unauthenticated callers get 401.
 */
import {
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { AuthGuard } from "@nestjs/passport";
import { RoleCode } from "@prisma/client";
import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import { RolesGuard, RequireRoles } from "./roles.guard";
import { PrismaService } from "../../prisma/prisma.service";

const FACILITY_ID = "fac-guard-ordering";
const OTHER_FACILITY_ID = "fac-other";
const USER_ID = "user-guard-ordering";

const orderLog: string[] = [];

@Injectable()
class RecordingJwtAuthGuard extends AuthGuard("jwt") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    orderLog.push("auth");
    const req = context.switchToHttp().getRequest();
    if (req.headers.authorization !== "Bearer valid-token") {
      throw new UnauthorizedException("Missing or invalid token");
    }
    req.user = {
      userId: USER_ID,
      sessionId: "session-1",
      mfaVerifiedAt: new Date().toISOString(),
    };
    return true;
  }
}

@Controller("guard-ordering-regression")
@UseGuards(RecordingJwtAuthGuard, RolesGuard)
class GuardOrderingRegressionController {
  @Get("provider-only")
  @RequireRoles(RoleCode.PROVIDER)
  providerOnly() {
    return { ok: true };
  }
}

function buildPrismaMock() {
  const membership = { role: { code: RoleCode.PROVIDER }, facilityId: FACILITY_ID };
  return {
    userRole: {
      findMany: jest.fn(async (args: any) => {
        const wantedFacilityId = args?.where?.facilityId;
        if (wantedFacilityId && wantedFacilityId !== membership.facilityId) {
          return [];
        }
        return [membership];
      }),
      findFirst: jest.fn(async (args: any) => {
        const wantedFacilityId = args?.where?.facilityId;
        if (wantedFacilityId && wantedFacilityId !== membership.facilityId) {
          return null;
        }
        return membership;
      }),
    },
    msppUserRoleAssignment: { findMany: jest.fn(async () => []) },
    breakGlassSession: { findFirst: jest.fn(async () => null) },
  };
}

describe("Guard ordering regression (MEDORA AI prerequisite)", () => {
  let app: INestApplication;
  let prismaMock: ReturnType<typeof buildPrismaMock>;

  beforeAll(async () => {
    orderLog.length = 0;
    prismaMock = buildPrismaMock();
    const moduleRef = await Test.createTestingModule({
      controllers: [GuardOrderingRegressionController],
      providers: [RolesGuard, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    orderLog.length = 0;
    jest.clearAllMocks();
  });

  it("unauthenticated request is denied with 401 before role authorization", async () => {
    const res = await request(app.getHttpServer())
      .get("/guard-ordering-regression/provider-only")
      .set("x-facility-id", FACILITY_ID)
      .expect(401);
    expect(res.body.message).toMatch(/Missing or invalid token/i);
    expect(orderLog).toEqual(["auth"]);
    expect(prismaMock.userRole.findMany).not.toHaveBeenCalled();
  });

  it("authenticated provider with correct facility is allowed", async () => {
    const res = await request(app.getHttpServer())
      .get("/guard-ordering-regression/provider-only")
      .set("Authorization", "Bearer valid-token")
      .set("x-facility-id", FACILITY_ID)
      .expect(200);
    expect(res.body).toEqual({ ok: true });
    expect(orderLog).toEqual(["auth"]);
  });

  it("authenticated user without required role is denied with 403", async () => {
    prismaMock.userRole.findMany.mockResolvedValueOnce([]);
    await request(app.getHttpServer())
      .get("/guard-ordering-regression/provider-only")
      .set("Authorization", "Bearer valid-token")
      .set("x-facility-id", FACILITY_ID)
      .expect(403);
    expect(orderLog).toEqual(["auth"]);
  });

  it("authenticated provider at a different facility is denied with 403", async () => {
    await request(app.getHttpServer())
      .get("/guard-ordering-regression/provider-only")
      .set("Authorization", "Bearer valid-token")
      .set("x-facility-id", OTHER_FACILITY_ID)
      .expect(403);
    expect(orderLog).toEqual(["auth"]);
  });

  it("no protected endpoint becomes public: missing token always fails", async () => {
    const res = await request(app.getHttpServer())
      .get("/guard-ordering-regression/provider-only")
      .expect(401);
    expect(res.body.message).toMatch(/Missing or invalid token/i);
  });
});
