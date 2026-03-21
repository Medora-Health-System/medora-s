import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "body-parser";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  /** Résultats labo/imagerie avec pièces jointes base64 — évite PayloadTooLargeError (limite express par défaut ~100 ko). */
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ limit: "50mb", extended: true }));

  // [DEV] Log incoming Authorization header for auth debugging (local dev only)
  if (process.env.NODE_ENV !== "production") {
    app.use((req: any, _res: any, next: () => void) => {
      const auth = req.headers?.authorization;
      const hasAuth = !!auth;
      const hasBearer = typeof auth === "string" && auth.startsWith("Bearer ");
      const tokenLength = hasBearer && auth ? auth.slice(7).length : 0;
      console.log("[nest auth]", {
        hasAuthHeader: hasAuth,
        hasBearer,
        tokenLength
      });
      next();
    });
  }

  const envOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const defaultOrigins = ["http://localhost:3002", "http://localhost:3003"];
  app.enableCors({
    origin: [...defaultOrigins, ...envOrigins],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-facility-id"],
  });
  
  // Register global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());
  
  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    if (reason instanceof Error) {
      console.error("Stack:", reason.stack);
    }
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error: Error) => {
    console.error("Uncaught Exception:", error);
    console.error("Stack:", error.stack);
    process.exit(1);
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();

