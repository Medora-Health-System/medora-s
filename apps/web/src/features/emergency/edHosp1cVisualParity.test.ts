import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ED_HOSP_1B_PROVIDER_OUTCOMES } from "./edHosp1bDispositionOutcomeMapping";
import { projectEdDispositionReadiness } from "./edDispositionReadinessProjection";
import { projectEdDispositionState } from "@medora/shared";
import { ER_DISCHARGE_MODE_HOME } from "./emergencyDispositionV1";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("ED.HOSP.1C visual parity with inpatient discharge board", () => {
  const panel = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
  const styles = readSrc("features/emergency/edDispositionBoardStyles.ts");
  const readiness = readSrc("features/emergency/edDispositionReadinessProjection.ts");
  const workspace = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
  const en = readSrc("i18n/messages/en.ts");
  const fr = readSrc("i18n/messages/fr.ts");
  const mapping = readSrc("features/emergency/edHosp1bDispositionOutcomeMapping.ts");

  it("1-2. readiness items use compact layout without giant min-height/fixed-height", () => {
    expect(styles).toContain("edChipBase");
    expect(styles).toContain('padding: "5px 12px"');
    expect(styles).toContain("height: \"auto\"");
    expect(styles).toContain("minHeight: 0");
    expect(styles).toContain("flex: \"0 0 auto\"");
    expect(styles).toContain("alignSelf: \"flex-start\"");
    expect(styles).toContain(".ed-disposition-readiness [data-ed-readiness-chip]");
    expect(styles).toContain("min-height: 0 !important");
    expect(panel).toContain("data-ed-readiness-chip");
    expect(panel).toContain("edReadinessChipStyle");
    expect(panel).not.toContain("MedoraCardInner");
    expect(panel).not.toContain("MedoraCardIdentity");
    expect(styles).not.toMatch(/minHeight:\s*[4-9]\d{2,}/);
    expect(styles).not.toMatch(/height:\s*["']?\d{3,}px/);
  });

  it("3-7. outcome choices are a contained wrapping selector with all 9 radios", () => {
    expect(panel).toContain("ed-disposition-outcome-group");
    expect(panel).toContain("edOutcomeChoiceGroupStyle");
    expect(panel).toContain("edOutcomeChoiceLabelStyle");
    expect(panel).toContain('type="radio"');
    expect(panel).toContain('name="er-disposition-outcome"');
    expect(panel).toContain('role="radiogroup"');
    expect(ED_HOSP_1B_PROVIDER_OUTCOMES).toEqual([
      "HOME",
      "OBSERVATION",
      "ADMISSION",
      "TRANSFER",
      "AMA",
      "LWBS",
      "ELOPEMENT",
      "DECEASED",
      "OTHER",
    ]);
    for (const id of ED_HOSP_1B_PROVIDER_OUTCOMES) {
      expect(panel).toContain(`data-testid={\`ed-disposition-outcome-\${opt.id}\`}`);
    }
    expect(ED_HOSP_1B_PROVIDER_OUTCOMES[1]).toBe("OBSERVATION");
    expect(ED_HOSP_1B_PROVIDER_OUTCOMES[2]).toBe("ADMISSION");
    expect(panel).toContain('? "OBSERVATION"');
    expect(panel).toContain('? "ADMISSION"');
  });

  it("8-12. clinician UI has no internal architecture labels or duplicate draft bar", () => {
    expect(en).not.toMatch(/Decision \(shared chart\)/i);
    expect(en).not.toMatch(/Disposition decision timestamp \(V1\)/i);
    const enDisp = en.slice(en.indexOf("emergencyDisposition:"), en.indexOf("emergencyDisposition:") + 20000);
    const frDisp = fr.slice(fr.indexOf("emergencyDisposition:"), fr.indexOf("emergencyDisposition:") + 20000);
    expect(frDisp).not.toMatch(/dossier partagé/i);
    expect(enDisp).not.toContain("requestedEncounterType");
    expect(enDisp).not.toMatch(/\(V1\)/);
    expect(enDisp).not.toMatch(/SHARED CHART/i);
    expect(panel).not.toContain("SHARED CHART");
    expect(panel).not.toContain("shared chart");
    expect(panel).not.toContain("(V1)");
    expect(panel).not.toContain("edHosp1cJson");
    expect(panel).not.toContain("Home Discharge Board · Draft");
    expect(panel).not.toContain("boardTitle.${outcomeUi}");
    expect(panel).toContain("decisionDraftBadge");
    expect(panel).toContain("pathwayShort");
  });

  it("13-21. pathway workspaces still mount", () => {
    expect(panel).toContain("ed-disposition-home-workspace");
    expect(panel).toContain("ProviderDischargeDocumentationSection");
    expect(panel).toContain("ed-disposition-observation-workspace");
    expect(panel).toContain("ed-disposition-admission-workspace");
    expect(panel).toContain("AdmissionObservationDecisionBoard");
    expect(panel).toContain("ed-disposition-transfer-board");
    expect(panel).toContain("ed-disposition-ama-workspace");
    expect(panel).toContain("AmaDispositionBoard");
    expect(panel).toContain("ed-disposition-lwbs-workspace");
    expect(panel).toContain("LwbsDispositionBoard");
    expect(panel).toContain("ed-disposition-elopement-workspace");
    expect(panel).toContain("ElopementDispositionBoard");
    expect(panel).toContain("ed-disposition-deceased-workspace");
    expect(panel).toContain("DeceasedDispositionBoard");
    expect(panel).toContain("ed-disposition-other-workspace");
    expect(panel).toContain("GovernedOtherDispositionBoard");
  });

  it("22-25. nursing engines, ED readiness, and lifecycle remain unchanged", () => {
    expect(workspace).toContain("NursingDischargeExecutionSection");
    expect(workspace).toContain("AdaptiveDispositionNursingSection");
    expect(readSrc("features/emergency/nursingDischargeExecutionModel.ts")).toContain(
      "erDispositionExecutionV1"
    );
    expect(readSrc("features/emergency/AdaptiveDispositionNursingSection.tsx")).toContain(
      "mergeAdaptiveEdNursingIntoNursingAssessment"
    );
    expect(
      readFileSync(
        join(webSrcRoot, "../../../packages/shared/src/encounters/adaptiveEdNursingExecutionD4a2.ts"),
        "utf8"
      )
    ).toContain("erAdaptiveNursingExecutionV1");
    expect(readiness).not.toContain("inpatientProviderDischarge");
    expect(readiness).not.toContain("InpatientDischargeBoard");
    expect(panel).not.toContain("InpatientDischargeBoard");
    expect(panel).not.toContain("inpatientProviderDischarge");
    expect(panel).not.toContain("inpatientNursingDischarge");
    expect(panel).not.toContain("inpatientMedRecon");
    expect(mapping).not.toContain("InpatientDischargeBoard");
    expect(panel).not.toContain("createDirectAdmission");
    expect(panel).not.toContain("confirmInpatientTransfer");
    expect(panel).not.toMatch(/\/encounters\/\$\{.*\}\/close/);
    expect(panel).not.toContain("decisionDoesNotClose");
    const state = projectEdDispositionState({
      status: "OPEN",
      dischargeSummaryJson: { dischargeMode: ER_DISCHARGE_MODE_HOME },
      admissionSummaryJson: null,
      nursingAssessment: {},
    });
    const chips = projectEdDispositionReadiness({
      outcomeUi: "HOME",
      dispositionState: state,
      hasSavedAdmission: false,
      nursingAssessment: {},
    });
    expect(chips.map((c) => c.id)).toEqual([
      "provider",
      "nursing",
      "instructions",
      "medications",
      "departure",
      "final",
    ]);
  });

  it("26. containment tokens prevent horizontal overflow and stretched chips", () => {
    expect(styles).toContain("width: 100%");
    expect(styles).toContain("max-width: 100%");
    expect(styles).toContain("min-width: 0");
    expect(panel).toContain('minWidth: 0');
    expect(panel).toContain("maxWidth: \"100%\"");
    expect(styles).toContain("@media (max-width: 1199px)");
    expect(styles).toContain("@media (max-width: 799px)");
  });

  it("27-28. EN and FR labels for the visual chrome exist", () => {
    for (const key of [
      "choiceHOME",
      "choiceOBSERVATION",
      "choiceADMISSION",
      "choiceTRANSFER",
      "choiceAMA",
      "choiceLWBS",
      "choiceELOPEMENT",
      "choiceDECEASED",
      "choiceOTHER",
      "pathwayShort",
      "finalNotFinalized",
      "printButton",
      "nursingExecutionTitle",
      "summaryFinalTitle",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
    expect(en).toContain('cardTitle: "Disposition"');
    expect(fr).toContain('cardTitle: "Disposition"');
  });

  it("29-30. print remains available and actions stay role-aware", () => {
    expect(panel).toContain('data-testid="ed-disposition-print"');
    expect(panel).toContain("handlePrintDischargeSummary");
    expect(panel).toContain("canPrintDischargeSummary");
    expect(panel).toContain('data-testid="ed-disposition-action-bar"');
    expect(panel).toContain('data-testid="ed-disposition-save-draft"');
    expect(panel).toContain('data-testid="ed-disposition-sign-decision"');
    expect(panel).toContain("canEditMedicalDischarge || canPrescribe");
    expect(panel).toContain("ed-disposition-final");
  });
});
