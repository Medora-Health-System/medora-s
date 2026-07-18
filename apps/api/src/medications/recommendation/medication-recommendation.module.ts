import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MedicationRecommendationController } from "./medication-recommendation.controller";
import { MedicationRecommendationHttpService } from "./medication-recommendation.http-service";

/**
 * Phase 16 — Controlled Shadow Recommendation Engine API.
 * No Pilot / Enterprise Active / order-from-recommendation.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MedicationRecommendationController],
  providers: [MedicationRecommendationHttpService],
  exports: [MedicationRecommendationHttpService],
})
export class MedicationRecommendationModule {}
