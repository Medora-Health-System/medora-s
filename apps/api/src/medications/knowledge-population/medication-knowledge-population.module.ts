import { Module } from "@nestjs/common";
import { MedicationKnowledgePopulationController } from "./medication-knowledge-population.controller";
import { MedicationKnowledgePopulationHttpService } from "./medication-knowledge-population.http-service";

@Module({
  controllers: [MedicationKnowledgePopulationController],
  providers: [MedicationKnowledgePopulationHttpService],
  exports: [MedicationKnowledgePopulationHttpService],
})
export class MedicationKnowledgePopulationModule {}
