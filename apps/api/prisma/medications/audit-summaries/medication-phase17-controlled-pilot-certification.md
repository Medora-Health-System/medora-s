# Medication Intelligence Phase 17 Certification

**Certification ID:** MEDUI.MEDICATION_INTELLIGENCE_PHASE_17_CONTROLLED_PILOT_QUALIFICATION_SAFETY_MONITORING_LIMITED_CLINICAL_ADVISORY

**Decision:** MEDICATION_INTELLIGENCE_PHASE_17_CERTIFIED_PILOT_READY_NOT_ACTIVATED

## Live metrics

```json
{
  "Phase16Certified": true,
  "Wave1ShadowDefinitions": 8,
  "AcetaminophenDefinitions": 0,
  "EnterpriseLifecycleDefinitions": 0,
  "EligibleQualifications": 8,
  "QualificationRows": 8,
  "PilotProgramCount": 0,
  "ActivePilotCount": 0,
  "FacilityScopeCount": 0,
  "ProviderCohortSize": 0,
  "ActiveDefinitionCount": 0,
  "AdvisoryExposureCount": 0,
  "Acknowledgements": 0,
  "Dismissals": 0,
  "Disagreements": 0,
  "SafetyEventCount": 0,
  "AutomaticSuspensions": 0,
  "OrderMutations": 0,
  "MarMutations": 0,
  "ChartMutations": 0,
  "EnterpriseActivations": 0,
  "OrderFromRecommendationPrograms": 0,
  "ProductionCdsPrograms": 0,
  "ProgramClinicalActivation": false,
  "ProgramControlledPilotAllowed": false,
  "ProgramEnterpriseActiveAllowed": false,
  "ProgramOrderFromRecommendationAllowed": false,
  "ClinicalActivations": 0,
  "ProviderAlerts": 0,
  "OrderBlocks": 0,
  "ProductionCds": "OFF",
  "Defaults": {
    "providerFacingAlertsEnabled": false,
    "orderBlockingEnabled": false,
    "clinicalActivationEnabled": false,
    "activeCdsModeAvailable": false,
    "knowledgeControlsPatientCare": false,
    "orderingChanged": false,
    "dispensingChanged": false,
    "administrationChanged": false,
    "marChanged": false,
    "billingChanged": false,
    "medicationReconciliationChanged": false,
    "orderFromRecommendationAllowed": false,
    "fabricateRecommendations": false,
    "expandBeyondWave1": false,
    "resolveAcetaminophenIdentity": false,
    "shadowRecommendationAllowed": true,
    "controlledPilotAllowed": false,
    "enterpriseActiveAllowed": false,
    "shadowImpliesProduction": false,
    "shadowImpliesControlledPilot": false,
    "productionCdsEnabled": false,
    "providerAlertsEnabled": false,
    "orderFromRecommendationEnabled": false,
    "autoOrderEnabled": false,
    "autoSelectEnabled": false
  }
}
```

## Constitutional locks

- Enterprise Activation: BLOCKED
- Order From Recommendation: DISABLED
- Order / MAR / Chart mutations: ZERO required
- Production CDS: OFF
- Controlled pilot only when explicitly authorized

## Not claimed

- Enterprise-wide activation
- Automatic ordering / prescribing / MAR
- Acetaminophen identity resolution
- Fabricated pilot evidence
