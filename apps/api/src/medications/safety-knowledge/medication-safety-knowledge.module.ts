import { Module } from "@nestjs/common";
import { MedicationSafetyKnowledgeController } from "./medication-safety-knowledge.controller";
import { MedicationSafetyKnowledgeHttpService } from "./medication-safety-knowledge.http-service";

@Module({
  controllers: [MedicationSafetyKnowledgeController],
  providers: [MedicationSafetyKnowledgeHttpService],
  exports: [MedicationSafetyKnowledgeHttpService],
})
export class MedicationSafetyKnowledgeModule {}
