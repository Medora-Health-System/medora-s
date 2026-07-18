import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { MfaModule } from "./auth/mfa/mfa.module";
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
import { MedicationMasterModule } from "./medication-master/medication-master.module";
import { RxNormReviewModule } from "./medications/rxnorm-review/rxnorm-review.module";
import { MedicationBatchModule } from "./medications/batch/medication-batch.module";
import { MedicationClinicalKnowledgeModule } from "./medications/clinical-knowledge/medication-clinical-knowledge.module";
import { MedicationSafetyKnowledgeModule } from "./medications/safety-knowledge/medication-safety-knowledge.module";
import { MedicationSafetyEvaluationModule } from "./medications/safety-evaluation/medication-safety-evaluation.module";
import { MedicationSafetyValidationModule } from "./medications/safety-validation/medication-safety-validation.module";
import { MedicationKnowledgePopulationModule } from "./medications/knowledge-population/medication-knowledge-population.module";
import { MedicationSourceBackedValidationModule } from "./medications/source-backed-validation/medication-source-backed-validation.module";
import { MedicationEvidenceGovernanceModule } from "./medications/evidence-governance/medication-evidence-governance.module";
import { MedicationExpertReviewModule } from "./medications/expert-review/medication-expert-review.module";
import { MedicationShadowEvaluationModule } from "./medications/shadow-evaluation/medication-shadow-evaluation.module";
import { MedicationRemediationModule } from "./medications/remediation/medication-remediation.module";
import { MedicationRecommendationModule } from "./medications/recommendation/medication-recommendation.module";
import { MedicationRecommendationPilotModule } from "./medications/recommendation-pilot/medication-recommendation-pilot.module";
import { MedicationRecommendationOpsModule } from "./medications/recommendation-ops/medication-recommendation-ops.module";
import { OrderCatalogModule } from "./order-catalog/order-catalog.module";
import { PublicHealthModule } from "./public-health/public-health.module";
import { DiagnosesModule } from "./diagnoses/diagnoses.module";
import { FollowUpsModule } from "./follow-ups/follow-ups.module";
import { AdminModule } from "./admin/admin.module";
import { MedicationAdministrationModule } from "./medication-administration/medication-administration.module";
import { MedicationDoseModule } from "./medication-dose/medication-dose.module";
import { MsppModule } from "./mspp/mspp.module";
import { FhirModule } from "./fhir/fhir.module";
import { InsuranceModule } from "./insurance/insurance.module";
import { DocumentsModule } from "./documents/documents.module";
import { BillingProcedureCodesModule } from "./billing-procedure-codes/billing-procedure-codes.module";
import { ReportsModule } from "./reports/reports.module";
import { RoiModule } from "./roi/roi.module";
import { FacilitiesModule } from "./facilities/facilities.module";
import { PlatformAnnouncementsModule } from "./platform-announcements/platform-announcements.module";
import { AuditContextInterceptor } from "./common/audit/audit-context.interceptor";
import { RequestLoggerMiddleware } from "./common/middleware/request-logger.middleware";
import { RecentHttpErrorMetricsModule } from "./common/metrics/recent-http-error-metrics.module";

const imports = [
  ConfigModule.forRoot({ isGlobal: true }),
  RecentHttpErrorMetricsModule,
  ThrottlerModule.forRoot({
    throttlers: [
      {
        name: "default",
        ttl: 60_000,
        limit: 10_000,
      },
    ],
  }),
  PrismaModule,
  AuthModule,
  MfaModule,
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
  MedicationMasterModule,
  RxNormReviewModule,
  MedicationBatchModule,
  MedicationClinicalKnowledgeModule,
  MedicationSafetyKnowledgeModule,
  MedicationSafetyEvaluationModule,
  MedicationSafetyValidationModule,
  MedicationKnowledgePopulationModule,
  MedicationSourceBackedValidationModule,
  MedicationEvidenceGovernanceModule,
  MedicationExpertReviewModule,
  MedicationShadowEvaluationModule,
  MedicationRemediationModule,
  MedicationRecommendationModule,
  MedicationRecommendationPilotModule,
  MedicationRecommendationOpsModule,
  OrderCatalogModule,
  PublicHealthModule,
  DiagnosesModule,
  FollowUpsModule,
  AdminModule,
  MedicationAdministrationModule,
  MedicationDoseModule,
  MsppModule,
  FhirModule,
  InsuranceModule,
  DocumentsModule,
  BillingProcedureCodesModule,
  ReportsModule,
  RoiModule,
  FacilitiesModule,
  PlatformAnnouncementsModule,
];

@Module({
  imports,
  controllers: [AppController],
  providers: [
    RequestLoggerMiddleware,
    { provide: APP_INTERCEPTOR, useClass: AuditContextInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}

