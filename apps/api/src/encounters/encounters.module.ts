import { Module } from "@nestjs/common";
import { EncountersController } from "./encounters.controller";
import { InternalPlacementController } from "./internal-placement.controller";
import { ObservationWorkspaceController } from "./observation-workspace.controller";
import { ObservationOperationsController } from "./observation-operations.controller";
import { InpatientWorkspaceController } from "./inpatient-workspace.controller";
import { HospitalCareController } from "./hospital-care.controller";
import { InpatientOperationsController } from "./inpatient-operations.controller";
import { EncountersService } from "./encounters.service";
import { InpatientOperationsService } from "./inpatient-operations.service";
import { ObservationOperationsService } from "./observation-operations.service";
import { InpatientLifecycleService } from "./inpatient-lifecycle.service";
import { HospitalCensusService } from "./hospital-census.service";
import { HospitalUnitRegistryService } from "./hospital-unit-registry.service";
import { SchemaCompatibleEncounterRepository } from "./schema-compatible-encounter.repository";
import { HospitalEncounterAuthorityService } from "./hospital-encounter-authority.service";
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
import { AdmissionCorrelationService } from "./admission-correlation.service";
import { AdmissionCorrelationController } from "./admission-correlation.controller";
import { AdmissionCommandCenterService } from "./admission-command-center.service";
import { ClinicalSynthesisService } from "./clinical-synthesis.service";
import { EnterpriseCommandService } from "./enterprise-command.service";
import { EnterpriseCommandController } from "./enterprise-command.controller";
import { OperationalGovernanceService } from "./operational-governance.service";
import { OperationalGovernanceController } from "./operational-governance.controller";
import { EnterpriseWorkflowController } from "./enterprise-workflow/enterprise-workflow.controller";
import { EnterpriseWorkflowOrchestrationService } from "./enterprise-workflow/enterprise-workflow-orchestration.service";
import { EnterpriseTaskEngine } from "./enterprise-workflow/enterprise-task.engine";
import { EnterpriseWorkflowEngine } from "./enterprise-workflow/enterprise-workflow.engine";
import { ClinicalEventEngine } from "./enterprise-workflow/clinical-event.engine";
import { EscalationEngine } from "./enterprise-workflow/escalation.engine";
import { HospitalTimelineEngine } from "./enterprise-workflow/hospital-timeline.engine";
import { ClinicalRulesController } from "./enterprise-workflow/clinical-rules.controller";
import { ClinicalRulesEngine } from "./enterprise-workflow/clinical-rules.engine";
import { ClinicalRulesActionAdapter } from "./enterprise-workflow/clinical-rules-action.adapter";
import { ClinicalRulesOrchestrationService } from "./enterprise-workflow/clinical-rules-orchestration.service";
import { EnterpriseEncounterLifecycleService } from "./enterprise-encounter-lifecycle.service";
import { EnterpriseAssignmentService } from "./enterprise-assignment.service";
import { EncounterCarePlanController } from "./encounter-care-plan.controller";
import { EncounterCarePlanService } from "./encounter-care-plan.service";
import { InpatientProviderDischargeService } from "./inpatient-provider-discharge.service";
import { InpatientNursingDischargeService } from "./inpatient-nursing-discharge.service";
import { InpatientFinalDischargeService } from "./inpatient-final-discharge.service";

@Module({
  imports: [PrismaModule, DiagnosesModule, OrdersModule, TrackboardModule, FacilitiesModule],
  controllers: [
    EncountersController,
    InternalPlacementController,
    ObservationWorkspaceController,
    ObservationOperationsController,
    InpatientWorkspaceController,
    HospitalCareController,
    InpatientOperationsController,
    AdmissionCorrelationController,
    EnterpriseCommandController,
    OperationalGovernanceController,
    EnterpriseWorkflowController,
    ClinicalRulesController,
    EncounterCarePlanController,
  ],
  providers: [
    EncounterCarePlanService,
    EnterpriseAssignmentService,
    EnterpriseEncounterLifecycleService,
    EncountersService,
    InpatientOperationsService,
    InpatientProviderDischargeService,
    InpatientNursingDischargeService,
    InpatientFinalDischargeService,
    ObservationOperationsService,
    InpatientLifecycleService,
    AdmissionCorrelationService,
    AdmissionCommandCenterService,
    ClinicalSynthesisService,
    EnterpriseCommandService,
    OperationalGovernanceService,
    EnterpriseTaskEngine,
    EnterpriseWorkflowEngine,
    ClinicalEventEngine,
    EscalationEngine,
    HospitalTimelineEngine,
    ClinicalRulesEngine,
    ClinicalRulesActionAdapter,
    ClinicalRulesOrchestrationService,
    EnterpriseWorkflowOrchestrationService,
    SchemaCompatibleEncounterRepository,
    HospitalEncounterAuthorityService,
    HospitalCensusService,
    HospitalUnitRegistryService,
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
    EnterpriseAssignmentService,
    EnterpriseEncounterLifecycleService,
    EncountersService,
    EncounterChartExportService,
    UnifiedEncounterTimelineService,
    FacilityBillingWorkflowService,
    HospitalEpisodeService,
    InternalPlacementService,
    HospitalEncounterAuthorityService,
    AdmissionCorrelationService,
    AdmissionCommandCenterService,
    EnterpriseCommandService,
    OperationalGovernanceService,
    ClinicalSynthesisService,
    EnterpriseWorkflowOrchestrationService,
    ClinicalRulesOrchestrationService,
  ],
})
export class EncountersModule {}

