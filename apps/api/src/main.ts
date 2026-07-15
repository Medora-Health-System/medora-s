import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "body-parser";
import cookieParser = require("cookie-parser");
import { randomUUID } from "crypto";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { getLogPolicy, resetLogPolicyCache } from "./common/logging/log-policy";
import { MedoraNestLogger } from "./common/logging/medora-nest-logger";
import { createStructuredLogger } from "./common/logging/structured-logger";
import { buildCorsOriginList } from "./config/cors-origins";

resetLogPolicyCache();
const bootstrapLog = createStructuredLogger("Bootstrap");
const processLog = createStructuredLogger("Process");

async function bootstrap() {
  const logPolicy = getLogPolicy();
  bootstrapLog.log("bootstrap_started", {
    nodeEnv: logPolicy.nodeEnv,
    nestLevels: logPolicy.nestLevels,
    startupRoutesEnabled: logPolicy.startupRoutesEnabled,
    httpSuccessEnabled: logPolicy.httpSuccessEnabled,
  });

  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: new MedoraNestLogger(),
  });
  const http = app.getHttpAdapter().getInstance() as { set?: (key: string, value: unknown) => void };
  if (typeof http?.set === "function") {
    /** Correct client IP behind reverse proxies (rate limits, audit). */
    http.set("trust proxy", true);
  }
  /** Résultats labo/imagerie avec pièces jointes base64 — évite PayloadTooLargeError (limite express par défaut ~100 ko). */
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ limit: "50mb", extended: true }));
  app.use((req: any, res: any, next: () => void) => {
    const incoming = req.headers?.["x-request-id"];
    const fromHeader = typeof incoming === "string" && incoming.trim() ? incoming.trim() : "";
    const requestId = fromHeader || randomUUID();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  if (process.env.NODE_ENV !== "production") {
    app.use((req: any, _res: any, next: () => void) => {
      const auth = req.headers?.authorization;
      const hasAuth = !!auth;
      const hasBearer = typeof auth === "string" && auth.startsWith("Bearer ");
      bootstrapLog.log("dev_auth_header_probe", {
        hasAuthHeader: hasAuth,
        hasBearer,
      });
      next();
    });
  }

  const corsOrigins = buildCorsOriginList();
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-facility-id", "Cookie"],
  });
  
  // Register global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason: unknown) => {
    processLog.error("unhandled_rejection", {
      isError: reason instanceof Error,
      errorName: reason instanceof Error ? reason.name : typeof reason,
    });
  });

  process.on("uncaughtException", (error: Error) => {
    processLog.error("uncaught_exception", { errorName: error.name });
    process.exit(1);
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");

  bootstrapLog.log("bootstrap_listening", {
    nodeEnv: process.env.NODE_ENV,
    corsConfigured: !!process.env.CORS_ORIGINS?.trim(),
    port: Number(process.env.PORT ?? 3001),
  });
}

void bootstrap();

