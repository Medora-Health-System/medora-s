import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  
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
  await app.listen(port);
}

void bootstrap();

