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
import { MedicationGlobalBaselineService } from "./medication-global-baseline.service";
import { MedicationGlobalBaselineAutoApproveService } from "./medication-global-baseline-auto-approve.service";
import { MedicationMasterController } from "./medication-master.controller";
import { ControlledCatalogImportController } from "./controlled-catalog-import.controller";
import { HighRiskMedicationReviewController } from "./high-risk-medication-review.controller";
import { HighRiskMedicationReviewService } from "./high-risk-medication-review.service";
import { ControlledCatalogImportMedicationService } from "./controlled-catalog-import-medication.service";
import { ControlledCatalogImportProcedureService } from "./controlled-catalog-import-procedure.service";

@Module({
  imports: [PrismaModule],
  controllers: [
    MedicationMasterController,
    ControlledCatalogImportController,
    HighRiskMedicationReviewController,
  ],
  providers: [
    ControlledCatalogImportMedicationService,
    ControlledCatalogImportProcedureService,
    HighRiskMedicationReviewService,
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
    MedicationGlobalBaselineService,
    MedicationGlobalBaselineAutoApproveService,
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
    MedicationGlobalBaselineService,
    MedicationGlobalBaselineAutoApproveService,
    CatalogCanonicalReadService,
  ],
})
export class MedicationMasterModule {}
