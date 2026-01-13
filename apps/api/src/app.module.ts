import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { PatientsModule } from "./patients/patients.module";
import { EncountersModule } from "./encounters/encounters.module";
import { OrdersModule } from "./orders/orders.module";
import { QueuesModule } from "./queues/queues.module";
import { RegistrationModule } from "./registration/registration.module";
import { TrackboardModule } from "./trackboard/trackboard.module";
import { TriageModule } from "./triage/triage.module";
import { WorklistsModule } from "./worklists/worklists.module";
import { ResultsModule } from "./results/results.module";
import { PathwaysModule } from "./pathways/pathways.module";
import { DebugModule } from "./debug/debug.module";
import { APP_GUARD } from "@nestjs/core";
import { RolesGuard } from "./common/auth/roles.guard";
import { Reflector } from "@nestjs/core";

const imports = [
  ConfigModule.forRoot({ isGlobal: true }),
  PrismaModule,
  AuthModule,
  PatientsModule,
  EncountersModule,
  OrdersModule,
  QueuesModule,
  RegistrationModule,
  TrackboardModule,
  TriageModule,
  WorklistsModule,
  ResultsModule,
  PathwaysModule,
];

// Only include DebugModule in non-production environments
if (process.env.NODE_ENV !== "production") {
  imports.push(DebugModule);
}

@Module({
  imports,
  controllers: [AppController],
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

