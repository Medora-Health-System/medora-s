import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MedicationShadowEvaluationController } from "./medication-shadow-evaluation.controller";
import { MedicationShadowEvaluationHttpService } from "./medication-shadow-evaluation.http-service";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationShadowEvaluationController],
  providers: [MedicationShadowEvaluationHttpService],
  exports: [MedicationShadowEvaluationHttpService],
})
export class MedicationShadowEvaluationModule {}
