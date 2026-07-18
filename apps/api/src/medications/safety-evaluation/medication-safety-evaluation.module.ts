import { Module } from "@nestjs/common";
import { MedicationSafetyEvaluationController } from "./medication-safety-evaluation.controller";
import { MedicationSafetyEvaluationHttpService } from "./medication-safety-evaluation.http-service";

@Module({
  controllers: [MedicationSafetyEvaluationController],
  providers: [MedicationSafetyEvaluationHttpService],
  exports: [MedicationSafetyEvaluationHttpService],
})
export class MedicationSafetyEvaluationModule {}
