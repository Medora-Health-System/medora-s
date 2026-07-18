import { Module } from "@nestjs/common";
import { MedicationSafetyValidationController } from "./medication-safety-validation.controller";
import { MedicationSafetyValidationHttpService } from "./medication-safety-validation.http-service";

@Module({
  controllers: [MedicationSafetyValidationController],
  providers: [MedicationSafetyValidationHttpService],
  exports: [MedicationSafetyValidationHttpService],
})
export class MedicationSafetyValidationModule {}
