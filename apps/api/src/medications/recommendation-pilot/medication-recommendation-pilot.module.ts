import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MedicationRecommendationPilotController } from "./medication-recommendation-pilot.controller";
import { MedicationRecommendationPilotHttpService } from "./medication-recommendation-pilot.http-service";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationRecommendationPilotController],
  providers: [MedicationRecommendationPilotHttpService],
  exports: [MedicationRecommendationPilotHttpService],
})
export class MedicationRecommendationPilotModule {}
