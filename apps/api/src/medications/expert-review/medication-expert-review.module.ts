import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MedicationExpertReviewController } from "./medication-expert-review.controller";
import { MedicationExpertReviewHttpService } from "./medication-expert-review.http-service";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationExpertReviewController],
  providers: [MedicationExpertReviewHttpService],
  exports: [MedicationExpertReviewHttpService],
})
export class MedicationExpertReviewModule {}
