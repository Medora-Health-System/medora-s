import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { MedicationCatalogBackfillAnalysisService } from "./medication-catalog-backfill-analysis.service";
import { MedicationFormularyImportService } from "./medication-formulary-import.service";
import { PriorityErInventoryImportService } from "./priority-er-inventory-import.service";
import { PriorityErInventoryPromotionService } from "./priority-er-inventory-promotion.service";
import { MedicationFormularyPromotionService } from "./medication-formulary-promotion.service";
import { CatalogCanonicalReadService } from "./catalog-canonical-read.service";
import { MedicationMasterExplorerService } from "./medication-master-explorer.service";
import { MedicationMasterGovernanceService } from "./medication-master-governance.service";
import { MedicationStagingDuplicateGovernanceService } from "./medication-staging-duplicate-governance.service";
import { MedicationProductGovernanceService } from "./medication-product-governance.service";
import { MedicationProductActivationGovernanceService } from "./medication-product-activation-governance.service";
import { MedicationMasterController } from "./medication-master.controller";

@Module({
  imports: [PrismaModule],
  controllers: [MedicationMasterController],
  providers: [
    MedicationFormularyImportService,
    PriorityErInventoryImportService,
    PriorityErInventoryPromotionService,
    MedicationCatalogBackfillAnalysisService,
    MedicationFormularyPromotionService,
    MedicationMasterExplorerService,
    MedicationMasterGovernanceService,
    MedicationStagingDuplicateGovernanceService,
    MedicationProductGovernanceService,
    MedicationProductActivationGovernanceService,
    CatalogCanonicalReadService,
    AuditService,
  ],
  exports: [
    MedicationFormularyImportService,
    PriorityErInventoryImportService,
    PriorityErInventoryPromotionService,
    MedicationCatalogBackfillAnalysisService,
    MedicationFormularyPromotionService,
    MedicationMasterExplorerService,
    MedicationMasterGovernanceService,
    MedicationStagingDuplicateGovernanceService,
    MedicationProductGovernanceService,
    MedicationProductActivationGovernanceService,
    CatalogCanonicalReadService,
  ],
})
export class MedicationMasterModule {}
