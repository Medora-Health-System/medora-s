import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MedicationSourceBackedValidationController } from "./medication-source-backed-validation.controller";
import { MedicationSourceBackedValidationHttpService } from "./medication-source-backed-validation.http-service";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationSourceBackedValidationController],
  providers: [MedicationSourceBackedValidationHttpService],
  exports: [MedicationSourceBackedValidationHttpService],
})
export class MedicationSourceBackedValidationModule {}
