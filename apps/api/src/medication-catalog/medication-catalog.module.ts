import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MedicationMasterModule } from "../medication-master/medication-master.module";
import { MedicationCatalogController } from "./medication-catalog.controller";
import { MedicationCatalogService } from "./medication-catalog.service";
import { MedicationRegistryPrewarmService } from "./medication-registry-prewarm.service";

@Module({
  imports: [PrismaModule, MedicationMasterModule],
  controllers: [MedicationCatalogController],
  providers: [MedicationCatalogService, MedicationRegistryPrewarmService],
  exports: [MedicationCatalogService],
})
export class MedicationCatalogModule {}
