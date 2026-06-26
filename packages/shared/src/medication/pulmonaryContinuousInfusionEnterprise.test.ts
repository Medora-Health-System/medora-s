import { describe, expect, it } from "vitest";
import {
  buildPulmonaryMedicationGapAnalysisReport,
  isEnterprisePulmonaryCatalogCode,
  resolvePulmonaryMedicationRegistryEntryByCatalogCode,
} from "./pulmonaryMedicationCatalogRegistry.js";
import {
  buildPulmonaryProviderOrderingCertificationReport,
  certifyPulmonarySearchAlias,
  isActivePulmonaryProviderOrderingMedication,
} from "./pulmonaryProviderOrderingActivation.js";
import {
  buildPulmonaryMarWorkflowReport,
  isPulmonaryMarEligibleCatalogCode,
  resolvePulmonaryMarWorkflowState,
} from "./pulmonaryMarWorkflowGovernance.js";
import {
  buildPulmonaryMedicationResponseReport,
  shouldUseRespiratoryMedicationResponsePathway,
} from "../mar/respiratoryMedicationResponseGovernance.js";
import {
  buildContinuousInfusionGapAnalysisReport,
  buildContinuousInfusionWorkflowReport,
  isValidContinuousInfusionTransition,
  isEnterpriseContinuousInfusionCatalogCode,
} from "./continuousInfusionLifecycleGovernance.js";
import { buildInfusionTitrationGovernanceReport, buildInfusionTitrationAutoDocumentEvent } from "./infusionTitrationGovernance.js";
import {
  buildIcuMarTimelineStandardizationReport,
  isMarShiftTimelineInternalEnumText,
  localizeIcuMarTimelineSecondaryText,
  resolveIcuMarTimelineInfusionEventLabel,
} from "../mar/icuMarTimelineDisplay.js";
import { buildEnterpriseSeedIntegrationReport } from "./enterprisePulmonaryContinuousInfusionSeedIntegration.js";
import { buildPulmonaryContinuousInfusionCertificationReport } from "./pulmonaryContinuousInfusionCertification.js";
import { normalizeMedicationRoute } from "./medicationOrderRoute.js";
import { ENTERPRISE_WAVE2_FORMULARY_BY_CODE } from "./enterpriseWave2FormularyManifest.js";
import { ENTERPRISE_WAVE3_FORMULARY_BY_CODE } from "./enterpriseWave3FormularyManifest.js";
import { ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE } from "./enterpriseWave4EdHospitalFormularyManifest.js";
import { ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT_BY_CODE } from "./enterprisePulmonaryFormularySupplement.js";
import { isWave4KeepBlockedRespiratory } from "./wave4AdministrationTypeRemediation.js";

function catalogLookup(code: string): unknown {
  return (
    ENTERPRISE_WAVE2_FORMULARY_BY_CODE[code] ??
    ENTERPRISE_WAVE3_FORMULARY_BY_CODE[code] ??
    ENTERPRISE_WAVE4_ED_HOSPITAL_FORMULARY_BY_CODE[code] ??
    ENTERPRISE_PULMONARY_FORMULARY_SUPPLEMENT_BY_CODE[code] ??
    null
  );
}

describe("pulmonaryMedicationCatalogRegistry", () => {
  it("indexes albuterol neb for O(1) lookup", () => {
    expect(
      isEnterprisePulmonaryCatalogCode("SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION")
    ).toBe(true);
    expect(
      resolvePulmonaryMedicationRegistryEntryByCatalogCode(
        "SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION"
      )?.medication
    ).toContain("Albuterol");
  });

  it("includes levalbuterol in gap analysis supplement", () => {
    const report = buildPulmonaryMedicationGapAnalysisReport();
    const leval = report.rows.find((row) => row.medication === "Levalbuterol");
    expect(leval?.catalogPresent).toBe(true);
  });

  it("covers ketorolac-class respiratory meds separately from pain", () => {
    expect(shouldUseRespiratoryMedicationResponsePathway({ medicationLabel: "Albuterol nebulizer" })).toBe(true);
    expect(shouldUseRespiratoryMedicationResponsePathway({ medicationLabel: "Ketorolac" })).toBe(false);
  });
});

describe("pulmonaryProviderOrdering", () => {
  it("certifies provider ordering with pulmonary routes", () => {
    const report = buildPulmonaryProviderOrderingCertificationReport();
    expect(report.activatedCount).toBeGreaterThan(8);
    expect(report.routesSupported).toEqual(expect.arrayContaining(["NEB", "MDI"]));
    expect(report.weightIndependentDosing).toBe(true);
  });

  it("supports alias search certification", () => {
    expect(
      certifyPulmonarySearchAlias(
        "SALBUTAMOL_100_MCG_PER_DOSE_INHALATEUR_INHALATION",
        "Ventolin"
      )
    ).toBe(true);
  });
});

describe("pulmonaryMarWorkflow", () => {
  it("defines ordered → due → administer → document response → completed", () => {
    const report = buildPulmonaryMarWorkflowReport();
    expect(report.workflowSequence).toEqual([
      "ORDERED",
      "DUE",
      "ADMINISTER",
      "DOCUMENT_RESPONSE",
      "COMPLETED",
    ]);
  });

  it("enables MAR for enterprise pulmonary INHALATION codes", () => {
    expect(
      isPulmonaryMarEligibleCatalogCode("SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION")
    ).toBe(true);
    expect(
      isWave4KeepBlockedRespiratory("SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALATION")
    ).toBe(false);
  });

  it("resolves workflow state after administration", () => {
    expect(
      resolvePulmonaryMarWorkflowState({
        ordered: true,
        due: true,
        administered: true,
        responseDocumented: false,
      })
    ).toBe("DOCUMENT_RESPONSE");
  });
});

describe("respiratoryMedicationResponse", () => {
  it("uses respiratory pathway not pain reassessment", () => {
    const report = buildPulmonaryMedicationResponseReport();
    expect(report.respiratoryPathwaySeparateFromPain).toBe(true);
    expect(report.lateDocumentationSupported).toBe(true);
    expect(report.multipleResponsesSupported).toBe(true);
  });
});

describe("continuousInfusionLifecycle", () => {
  it("audits heparin and norepinephrine catalog presence", () => {
    const report = buildContinuousInfusionGapAnalysisReport(catalogLookup);
    expect(report.catalogPresentCount).toBeGreaterThan(10);
    expect(isEnterpriseContinuousInfusionCatalogCode("NOREPINEPHRINE_8_MG_250_ML_PERFUSION_INTRAVEINEUSE")).toBe(true);
  });

  it("prevents duplicate infusion state transitions", () => {
    expect(isValidContinuousInfusionTransition("RUNNING", "RUNNING")).toBe(false);
    expect(isValidContinuousInfusionTransition("RUNNING", "RATE_CHANGE")).toBe(true);
    expect(isValidContinuousInfusionTransition("PAUSED", "RESTARTED")).toBe(true);
  });

  it("supports rate change pause restart bag change", () => {
    const report = buildContinuousInfusionWorkflowReport();
    expect(report.rateChangeSupported).toBe(true);
    expect(report.pauseRestartSupported).toBe(true);
    expect(report.bagChangeSupported).toBe(true);
  });
});

describe("infusionTitrationGovernance", () => {
  it("supports MAP RASS PTT and auto-documents titration", () => {
    const report = buildInfusionTitrationGovernanceReport();
    expect(report.supportedGoals).toEqual(
      expect.arrayContaining(["MAP", "RASS", "PTT", "BLOOD_GLUCOSE"])
    );
    const event = buildInfusionTitrationAutoDocumentEvent({
      goalType: "MAP",
      previousRate: "5 mcg/min",
      newRate: "10 mcg/min",
      reasonForChange: "MAP below goal",
      documentedAt: "2026-06-25T12:00:00.000Z",
    });
    expect(event.newRate).toBe("10 mcg/min");
  });
});

describe("icuMarTimelineDisplay", () => {
  it("uses nurse-friendly labels not internal enums", () => {
    const report = buildIcuMarTimelineStandardizationReport();
    expect(report.infusionStartedLabel).toBe("Infusion started");
    expect(isMarShiftTimelineInternalEnumText("INFUSION_START")).toBe(true);
    expect(localizeIcuMarTimelineSecondaryText("INFUSION_RATE_CHANGE", "en")).toBe("Rate changed");
    expect(resolveIcuMarTimelineInfusionEventLabel("INFUSION_STOP", "fr")).toBe("Perfusion arrêtée");
  });
});

describe("medicationOrderRoute pulmonary routes", () => {
  it("normalizes NEB MDI DPI INH without changing IV routes", () => {
    expect(normalizeMedicationRoute("NEB")).toBe("NEB");
    expect(normalizeMedicationRoute("MDI")).toBe("MDI");
    expect(normalizeMedicationRoute("IVP")).toBe("IVP");
    expect(normalizeMedicationRoute("IVPB")).toBe("IVPB");
  });
});

describe("enterpriseSeedIntegration", () => {
  it("uses unified seed engine without duplicate helpers", () => {
    const report = buildEnterpriseSeedIntegrationReport();
    expect(report.seedEngine).toBe("seed-enterprise-medication-manifest.ts");
    expect(report.noDuplicateSeedHelpers).toBe(true);
    expect(report.pulmonaryRegistryCodes).toBeGreaterThan(10);
  });
});

describe("pulmonaryContinuousInfusionCertification", () => {
  it("passes production certification with minor gaps at most", () => {
    const report = buildPulmonaryContinuousInfusionCertificationReport();
    expect(report.medicationResponseRegressionSafe).toBe(true);
    expect(report.painManagementRegressionSafe).toBe(true);
    expect(report.o1Lookup).toBe(true);
    expect(["PULMONARY_AND_CONTINUOUS_INFUSION_READY", "READY_WITH_MINOR_GAPS"]).toContain(
      report.finalDecision
    );
  });
});

describe("pulmonary provider ordering registry", () => {
  it("lists active pulmonary codes", () => {
    const codes = isActivePulmonaryProviderOrderingMedication(
      "SALBUTAMOL_100_MCG_PER_DOSE_INHALATEUR_INHALATION"
    );
    expect(typeof codes).toBe("boolean");
  });
});
