/**
 * Shared Nest e2e application bootstrap — mirrors production request parsing
 * (bodyParser:false + body-parser json/urlencoded) without starting divergent Express defaults.
 */
import type { INestApplication } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { json, urlencoded } from "body-parser";
import cookieParser = require("cookie-parser");
import { AllExceptionsFilter } from "../common/filters/all-exceptions.filter";
import { MedoraNestLogger } from "../common/logging/medora-nest-logger";
import { drainMedoraAlerts } from "../common/logging/medoraAlert";
import { resetLogPolicyCache } from "../common/logging/log-policy";
import type { PrismaService } from "../prisma/prisma.service";

export type E2eAppHandles = {
  app: INestApplication;
  moduleRef: TestingModule;
};

/**
 * Create and init a Nest app for e2e with production-like parsers + exception filter.
 * Callers must still `applyE2eAuthTestEnv()` before compiling AppModule when auth is involved.
 */
export async function createE2eApp(moduleRef: TestingModule): Promise<INestApplication> {
  resetLogPolicyCache();
  const app = moduleRef.createNestApplication({
    bodyParser: false,
    logger: new MedoraNestLogger(),
  });
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

/**
 * Deterministic teardown: drain alerts, close Nest app/module, disconnect Prisma when provided.
 * Safe when `app` / `moduleRef` / `prisma` are partially initialized.
 */
export async function closeE2eApp(handles: {
  app?: INestApplication | null;
  moduleRef?: TestingModule | null;
  prisma?: PrismaService | null;
}): Promise<void> {
  try {
    await drainMedoraAlerts();
  } catch {
    /* ignore */
  }
  try {
    if (handles.app) await handles.app.close();
  } catch {
    /* ignore */
  }
  try {
    if (handles.moduleRef) await handles.moduleRef.close();
  } catch {
    /* ignore */
  }
  try {
    if (handles.prisma) await handles.prisma.$disconnect();
  } catch {
    /* ignore */
  }
}
