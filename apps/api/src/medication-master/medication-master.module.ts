import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { MedicationCatalogBackfillAnalysisService } from "./medication-catalog-backfill-analysis.service";
import { MedicationFormularyImportService } from "./medication-formulary-import.service";
import { MedicationFormularyPromotionService } from "./medication-formulary-promotion.service";
import { MedicationMasterController } from "./medication-master.controller";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationMasterController],
  providers: [
    MedicationFormularyImportService,
    MedicationCatalogBackfillAnalysisService,
    MedicationFormularyPromotionService,
    AuditService,
  ],
  exports: [
    MedicationFormularyImportService,
    MedicationCatalogBackfillAnalysisService,
    MedicationFormularyPromotionService,
  ],
})
export class MedicationMasterModule {}
