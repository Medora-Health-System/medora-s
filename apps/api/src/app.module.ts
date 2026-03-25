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
import { PharmacyInventoryModule } from "./pharmacy-inventory/pharmacy-inventory.module";
import { PharmacyDispenseModule } from "./pharmacy-dispense/pharmacy-dispense.module";
import { MedicationCatalogModule } from "./medication-catalog/medication-catalog.module";
import { OrderCatalogModule } from "./order-catalog/order-catalog.module";
import { PublicHealthModule } from "./public-health/public-health.module";
import { DiagnosesModule } from "./diagnoses/diagnoses.module";
import { FollowUpsModule } from "./follow-ups/follow-ups.module";
import { DebugModule } from "./debug/debug.module";
import { AdminModule } from "./admin/admin.module";
import { MedicationAdministrationModule } from "./medication-administration/medication-administration.module";

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
  PharmacyInventoryModule,
  PharmacyDispenseModule,
  MedicationCatalogModule,
  OrderCatalogModule,
  PublicHealthModule,
  DiagnosesModule,
  FollowUpsModule,
  AdminModule,
  MedicationAdministrationModule,
];

// Only include DebugModule in non-production environments
if (process.env.NODE_ENV !== "production") {
  imports.push(DebugModule);
}

@Module({
  imports,
  controllers: [AppController],
})
export class AppModule {}

