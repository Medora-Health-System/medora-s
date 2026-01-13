import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { PatientsModule } from "./patients/patients.module";
import { EncountersModule } from "./encounters/encounters.module";
import { OrdersModule } from "./orders/orders.module";
import { DebugModule } from "./debug/debug.module";

const imports = [
  ConfigModule.forRoot({ isGlobal: true }),
  PrismaModule,
  AuthModule,
  PatientsModule,
  EncountersModule,
  OrdersModule,
];

// Only include DebugModule in non-production environments
if (process.env.NODE_ENV !== "production") {
  imports.push(DebugModule);
}

@Module({
  imports,
  controllers: [AppController]
})
export class AppModule {}

