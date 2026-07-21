import { Module } from "@nestjs/common";
import { EncountersController } from "./encounters.controller";
import { EncountersService } from "./encounters.service";
import { EncounterChartExportService } from "./chart-export.service";
import { UnifiedEncounterTimelineService } from "./unified-encounter-timeline.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";
import { DiagnosesModule } from "../diagnoses/diagnoses.module";
import { OrdersModule } from "../orders/orders.module";
import { ObservationOrderTemplateService } from "./observation-order-template.service";
import { TrackboardModule } from "../trackboard/trackboard.module";
import { FacilitiesModule } from "../facilities/facilities.module";
import { BillingClassificationService } from "./billing-classification.service";
import { FacilityBillingWorkflowService } from "./facility-billing-workflow.service";
import { BillingExportReadinessService } from "./billing-export-readiness.service";
import { BillingLedgerReadinessService } from "./billing-ledger-readiness.service";
import { FacilityFeeReadinessService } from "./facility-fee-readiness.service";
import { ChargeCaptureReviewService } from "./charge-capture-review.service";
import { CodingIntegrityReviewService } from "./coding-integrity-review.service";
import { ClaimAssemblyPreviewService } from "./claim-assembly-preview.service";
import { EncounterNotesService } from "./encounter-notes.service";
import { ClinicalDocumentationService } from "./clinical-documentation.service";
import { ChartCertificationB1Service } from "./chart-certification-b1.service";
import { HospitalEpisodeService } from "./hospital-episode.service";
import { InternalPlacementService } from "./internal-placement.service";

@Module({
  imports: [PrismaModule, DiagnosesModule, OrdersModule, TrackboardModule, FacilitiesModule],
  controllers: [EncountersController],
  providers: [
    EncountersService,
    ChartCertificationB1Service,
    HospitalEpisodeService,
    InternalPlacementService,
    EncounterChartExportService,
    UnifiedEncounterTimelineService,
    ObservationOrderTemplateService,
    BillingClassificationService,
    FacilityBillingWorkflowService,
    BillingExportReadinessService,
    BillingLedgerReadinessService,
    FacilityFeeReadinessService,
    ChargeCaptureReviewService,
    CodingIntegrityReviewService,
    ClaimAssemblyPreviewService,
    EncounterNotesService,
    ClinicalDocumentationService,
    AuditService,
  ],
  exports: [
    EncountersService,
    EncounterChartExportService,
    UnifiedEncounterTimelineService,
    FacilityBillingWorkflowService,
    HospitalEpisodeService,
    InternalPlacementService,
  ],
})
export class EncountersModule {}

