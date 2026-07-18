import { Module } from "@nestjs/common";
import { MedicationClinicalKnowledgeController } from "./medication-clinical-knowledge.controller";
import { MedicationClinicalKnowledgeHttpService } from "./medication-clinical-knowledge.http-service";

@Module({
  controllers: [MedicationClinicalKnowledgeController],
  providers: [MedicationClinicalKnowledgeHttpService],
  exports: [MedicationClinicalKnowledgeHttpService],
})
export class MedicationClinicalKnowledgeModule {}
