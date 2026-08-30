import { ServiceUnavailableException } from "@nestjs/common";
import { AppController } from "./app.controller";
import { PrismaService } from "./prisma/prisma.service";
import {
  markCriticalDependenciesReady,
  markOptionalPrewarmRuntime,
  markSchemaGuardRuntime,
  resetRuntimeAvailabilityStateForTests,
} from "./common/runtime/runtime-availability.state";

describe("PLAT.AVAIL.1A health live/ready", () => {
  const prisma = {
    $queryRaw: jest.fn(),
  } as unknown as PrismaService;

  beforeEach(() => {
    resetRuntimeAvailabilityStateForTests();
    (prisma.$queryRaw as jest.Mock).mockReset();
  });

  it("GET /health/live is cheap and unauthenticated", async () => {
    const controller = new AppController(prisma);
    const body = controller.live();
    expect(body).toEqual({ ok: true, live: true, service: "medora-api" });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("GET /health/ready succeeds when schema + DB ping ok, ignoring prewarm", async () => {
    markSchemaGuardRuntime("ok");
    markCriticalDependenciesReady();
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ "?column?": 1 }]);
    const controller = new AppController(prisma);
    const body = await controller.ready();
    expect(body.ok).toBe(true);
    expect(body.ready).toBe(true);
    expect(body.db).toBe("ok");
    expect(body.optionalPrewarm).toBe("idle");
  });

  it("GET /health/ready stays 200 while optional medication prewarm is running or failed", async () => {
    markSchemaGuardRuntime("ok");
    markCriticalDependenciesReady();
    markOptionalPrewarmRuntime("started");
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ "?column?": 1 }]);
    const controller = new AppController(prisma);
    const running = await controller.ready();
    expect(running.ready).toBe(true);
    expect(running.optionalPrewarm).toBe("started");
    markOptionalPrewarmRuntime("failed");
    const failed = await controller.ready();
    expect(failed.ready).toBe(true);
    expect(failed.optionalPrewarm).toBe("failed");
  });

  it("GET /health/ready fails when DB ping fails", async () => {
    markSchemaGuardRuntime("ok");
    markCriticalDependenciesReady();
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error("db down"));
    const controller = new AppController(prisma);
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("GET /health/ready fails when schema guard has not passed", async () => {
    const controller = new AppController(prisma);
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("routes are declared without AuthGuard", () => {
    const src = require("fs").readFileSync(require("path").join(__dirname, "app.controller.ts"), "utf8");
    expect(src).toContain('@Get("/health/live")');
    expect(src).toContain('@Get("/health/ready")');
    expect(src).not.toMatch(/@Get\("\/health\/live"\)[\s\S]{0,80}@UseGuards/);
    expect(src).not.toMatch(/@Get\("\/health\/ready"\)[\s\S]{0,120}@UseGuards/);
  });
});
