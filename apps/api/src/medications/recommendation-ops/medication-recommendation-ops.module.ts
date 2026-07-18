import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MedicationRecommendationOpsController } from "./medication-recommendation-ops.controller";
import { MedicationRecommendationOpsHttpService } from "./medication-recommendation-ops.http-service";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationRecommendationOpsController],
  providers: [MedicationRecommendationOpsHttpService],
  exports: [MedicationRecommendationOpsHttpService],
})
export class MedicationRecommendationOpsModule {}
