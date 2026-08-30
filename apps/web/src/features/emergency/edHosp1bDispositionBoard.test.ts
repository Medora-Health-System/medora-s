import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getErPrintPacketHtml } from "./erPrintPacket";
import { ER_DISCHARGE_MODE_ADMISSION, ER_DISCHARGE_MODE_HOME } from "./emergencyDispositionV1";
import { ED_HOSP_1B_PROVIDER_OUTCOMES } from "./edHosp1bDispositionOutcomeMapping";
import { projectEdDispositionReadiness } from "./edDispositionReadinessProjection";
import { projectEdDispositionState } from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("ED.HOSP.1B ED disposition board UI convergence", () => {
  const panel = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
  const placement = readSrc("features/emergency/AdmissionObservationDecisionBoard.tsx");
  const mapping = readSrc("features/emergency/edHosp1bDispositionOutcomeMapping.ts");
  const en = readSrc("i18n/messages/en.ts");
  const fr = readSrc("i18n/messages/fr.ts");
  const workspace = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
  const archive = readSrc("features/emergency/EmergencyClosedChartArchiveView.tsx");

  it("1-3. provider outcomes include separate top-level OBSERVATION and ADMISSION", () => {
    expect(ED_HOSP_1B_PROVIDER_OUTCOMES).toContain("OBSERVATION");
    expect(ED_HOSP_1B_PROVIDER_OUTCOMES).toContain("ADMISSION");
    expect(panel).toContain("ED_HOSP_1B_PROVIDER_OUTCOMES");
    expect(panel).toContain('data-testid={`ed-disposition-outcome-${opt.id}`}');
    expect(panel).toContain('? "OBSERVATION"');
    expect(panel).toContain('? "ADMISSION"');
    expect(panel).not.toContain("ADMISSION_OBSERVATION");
  });

  it("4-5. selecting OBSERVATION/ADMISSION does not require a second dest radio", () => {
    expect(placement).toContain('requestedEncounterType: "OBSERVATION" | "INPATIENT"');
    expect(placement).not.toContain('name="d3c-requested-encounter-type"');
    expect(placement).not.toContain("setRequestedEncounterType");
    expect(panel).toContain("requestedEncounterType={requestedPlacementType");
    expect(panel).not.toContain("initialRequestedType");
  });

  it("6-11. mapping helper covers placement OFF/ON observation and admission", () => {
    expect(mapping).toContain('if (outcome === "OBSERVATION") return "OBSERVATION"');
    expect(mapping).toContain('if (outcome === "ADMISSION") return "INPATIENT"');
    expect(mapping).toContain('return "OBSERVATION"');
    expect(mapping).toContain('return "MEDICAL_SURGICAL"');
    expect(mapping).toContain("requestedEncounterType");
  });

  it("12. HOME engine unchanged", () => {
    expect(panel).toContain('const showProviderDischargeDocumentation = outcomeUi === "HOME"');
    expect(panel).toContain('const showProviderDischargeOnSave = effectiveOutcome === "HOME"');
    expect(panel).toContain("ProviderDischargeDocumentationSection");
    expect(workspace).toContain("NursingDischargeExecutionSection");
  });

  it("13-18. TRANSFER AMA LWBS ELOPEMENT DECEASED OTHER boards unchanged", () => {
    expect(panel).toContain("AmaDispositionBoard");
    expect(panel).toContain("LwbsDispositionBoard");
    expect(panel).toContain("ElopementDispositionBoard");
    expect(panel).toContain("DeceasedDispositionBoard");
    expect(panel).toContain("GovernedOtherDispositionBoard");
    expect(panel).toContain('outcomeUi === "TRANSFER"');
    expect(panel).toContain('outcomeUi === "AMA"');
    expect(panel).toContain('outcomeUi === "LWBS"');
    expect(panel).toContain('outcomeUi === "ELOPEMENT"');
    expect(panel).toContain('outcomeUi === "DECEASED"');
    expect(panel).toContain('outcomeUi === "OTHER"');
  });

  it("19-20. does not import inpatient discharge namespace or lifecycle endpoints", () => {
    expect(panel).not.toContain("InpatientDischargeBoard");
    expect(panel).not.toContain("inpatientProviderDischarge");
    expect(panel).not.toContain("inpatientNursingDischarge");
    expect(panel).not.toContain("inpatientMedRecon");
    expect(panel).not.toContain("createDirectAdmission");
    expect(panel).not.toContain("confirmInpatientTransfer");
    expect(panel).not.toMatch(/\/encounters\/\$\{.*\}\/close/);
    expect(mapping).not.toContain("InpatientDischargeBoard");
  });

  it("21-22. ED provider and nursing persistence keys unchanged", () => {
    expect(panel).toContain("mergeErDispositionV1IntoNursingAssessment");
    expect(panel).toContain("/admission/decision");
    expect(panel).not.toMatch(/body\.admissionSummaryJson\s*=/);
    expect(workspace).toContain("AdaptiveDispositionNursingSection");
    expect(workspace).toContain("NursingDischargeExecutionSection");
    expect(readSrc("features/emergency/AdaptiveDispositionNursingSection.tsx")).toContain(
      "mergeAdaptiveEdNursingIntoNursingAssessment"
    );
  });

  it("23. billing destination mapping helper is unchanged identity", () => {
    const billing = readFileSync(
      join(webSrcRoot, "../../../packages/shared/src/encounters/admissionDestinationGuardV1.ts"),
      "utf8"
    );
    expect(billing).toContain("export function billingClassificationForPlacementDestination");
    expect(billing).toMatch(/return destination;/);
  });

  it("24. existing close behavior unchanged (panel does not close)", () => {
    expect(panel).toContain("decisionDoesNotClose");
    expect(panel).not.toContain("endEncounter");
    expect(archive).not.toContain("EmergencyDispositionPanel");
  });

  it("25-26. board renders human-readable Observation and Admission", () => {
    expect(en).toContain('outcomeOBSERVATION: "Observation"');
    expect(en).toContain('outcomeADMISSION: "Admission"');
    expect(fr).toContain('outcomeOBSERVATION: "Observation"');
    expect(fr).toContain('outcomeADMISSION: "Admission"');
    expect(en).toContain('OBSERVATION: "Observation Decision Board"');
    expect(en).toContain('ADMISSION: "Admission Decision Board"');
    expect(fr).toContain("Tableau — Décision d’observation");
    expect(fr).toContain("Tableau — Décision d’admission");
  });

  it("27. keyboard-accessible outcome radios remain", () => {
    expect(panel).toContain('type="radio"');
    expect(panel).toContain('name="er-disposition-outcome"');
    expect(panel).toContain('role="radiogroup"');
    expect(panel).toContain("outcomeSelectionLegend");
  });

  it("28-29. EN and FR messages present for 1B keys", () => {
    for (const key of [
      "outcomeOBSERVATION",
      "outcomeADMISSION",
      "signObservationButton",
      "sectionObservationPhysician",
      "readiness:",
      "summaryProviderTitle",
      "htmlTitleObservation",
      "h1ObservationSummary",
      "sectionObservationClinical",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });

  it("30. closed/print record labels observation vs admission without raw enums", () => {
    const printSrc = readSrc("features/emergency/erPrintPacket.ts");
    expect(printSrc).toContain("h1ObservationSummary");
    expect(printSrc).toContain("inferOutcomeHintsFromAdmissionSummary");
    expect(printSrc).not.toContain("requestedEncounterType}");
    const htmlObs = getErPrintPacketHtml({
      patient: { firstName: "Ada", lastName: "Lovelace", dob: "1980-01-01", sex: "F" },
      encounter: {
        createdAt: "2026-05-18T10:00:00.000Z",
        dischargeSummaryJson: { dischargeMode: ER_DISCHARGE_MODE_ADMISSION },
        admissionSummaryJson: { careLevel: "OBSERVATION" },
        nursingAssessment: {},
      },
      triageSnapshot: null,
      language: "en",
    });
    expect(htmlObs).toContain("Emergency Department Observation Summary");
    expect(htmlObs).toContain("Observation");
    expect(htmlObs).toContain("Disposition outcome");
    expect(htmlObs).not.toContain("requestedEncounterType");
    expect(htmlObs).not.toContain(">INPATIENT<");
    const htmlAdm = getErPrintPacketHtml({
      patient: { firstName: "Ada", lastName: "Lovelace", dob: "1980-01-01", sex: "F" },
      encounter: {
        createdAt: "2026-05-18T10:00:00.000Z",
        dischargeSummaryJson: { dischargeMode: ER_DISCHARGE_MODE_ADMISSION },
        admissionSummaryJson: { careLevel: "MEDICAL_SURGICAL" },
        nursingAssessment: {},
      },
      triageSnapshot: null,
      language: "en",
    });
    expect(htmlAdm).toContain("Emergency Department Admission Summary");
    expect(htmlAdm).not.toContain("Emergency Department Observation Summary");
  });

  it("production mount remains EmergencyActiveWorkspaceView → EmergencyDispositionPanel", () => {
    expect(workspace).toContain("EmergencyDispositionPanel");
    expect(workspace).toContain('activeSection === "disposition"');
  });

  it("removes permanent engineering/help prose from the live board", () => {
    expect(panel).not.toContain("outcomeHint1");
    expect(panel).not.toContain("outcomeHint2");
    expect(panel).not.toContain("admissionWarningBody");
    expect(panel).not.toContain("smartPacketProvenanceHint");
    expect(placement).not.toContain("boardHint");
    expect(placement).not.toContain("noFalseBedHint");
    expect(placement).not.toContain("step1Title");
  });

  it("HOME print path is unchanged for HOME packets", () => {
    const html = getErPrintPacketHtml({
      patient: { firstName: "Ada", lastName: "Lovelace", dob: "1980-01-01", sex: "F" },
      encounter: {
        createdAt: "2026-05-18T10:00:00.000Z",
        dischargeSummaryJson: { dischargeMode: ER_DISCHARGE_MODE_HOME },
        nursingAssessment: {},
      },
      triageSnapshot: null,
      language: "en",
    });
    expect(html).not.toContain("Observation summary");
    expect(html).not.toContain("Admission summary");
  });

  it("8-9. unsaved Observation/Admission does not mutate nursing persistence", () => {
    expect(panel).toContain("const applyOutcomeFromUi = useCallback");
    const applyIdx = panel.indexOf("const applyOutcomeFromUi = useCallback");
    const setOutcomeIdx = panel.indexOf("const setOutcomeFromUi = ");
    const applyBlock = panel.slice(applyIdx, setOutcomeIdx);
    expect(applyBlock).not.toContain("apiFetch");
    expect(applyBlock).not.toContain("mergeAdaptiveEdNursingIntoNursingAssessment");
    expect(applyBlock).not.toContain("mergeDischargeSortieExecutionIntoNursingAssessment");
    expect(applyBlock).not.toContain("/nursing");
    expect(workspace).not.toMatch(/AdaptiveDispositionNursingSection[\s\S]{0,400}outcomeUi=/);
    expect(workspace).toContain("pathwayFromDispositionBadgeVariant");
    expect(workspace).toContain("erDispositionBadgeFromEncounterJson(encounter)");
  });

  it("12. committed placement dest lock is wired to outcome radios", () => {
    expect(panel).toContain("isObservationAdmissionDestinationSwitchBlocked");
    expect(panel).toContain("committedPlacementBlocksTypeSwitch");
    expect(panel).toContain("ed-disposition-committed-placement-lock");
    expect(en).toContain("committedPlacementBlocksTypeSwitch");
    expect(fr).toContain("committedPlacementBlocksTypeSwitch");
    expect(placement).toContain('placement.status !== "DRAFT"');
    expect(placement).toContain('placement.status !== "SIGNED"');
  });

  it("19-20. no receiving encounter or encounter type mutation in 1B files", () => {
    expect(panel).not.toContain("EncounterType.OBSERVATION");
    expect(panel).not.toContain('type: "OBSERVATION"');
    expect(mapping).not.toContain("EncounterType.OBSERVATION");
    expect(panel).not.toContain("createDirectAdmission");
    expect(panel).not.toContain("confirmInpatientTransfer");
    expect(panel).not.toContain("receivingEncounterId");
    expect(panel).not.toContain("hospitalEpisode");
    const hosp = readSrc("features/hospitalization/HospitalizationBoardView.tsx");
    expect(hosp).toContain("outcomeOBSERVATION");
    expect(hosp).not.toContain("createDirectAdmission");
    expect(hosp).not.toContain("confirmInpatientTransfer");
  });

  it("21. 1B mapping is projection only — no persisted edHosp1b JSON namespace", () => {
    expect(mapping).not.toMatch(/edHosp1b\w*Json/);
    expect(panel).not.toContain("edHosp1bJson");
    expect(panel).toContain("/admission/decision");
    expect(panel).toContain("mergeErDispositionV1IntoNursingAssessment");
    const adaptive = readFileSync(
      join(webSrcRoot, "../../../packages/shared/src/encounters/adaptiveEdNursingExecutionD4a2.ts"),
      "utf8"
    );
    expect(adaptive).toContain('if (o === "OBSERVATION") return "OBSERVATION"');
    expect(adaptive).toContain("erAdaptiveNursingExecutionV1");
  });

  it("encounter page OBSERVATION key is label-map only for existing observation-stay chips", () => {
    const page = readFileSync(join(webSrcRoot, "../app/app/encounters/[id]/page.tsx"), "utf8");
    expect(page).toContain("outcomeOBSERVATION");
    expect(page).toContain('"HOME"');
    expect(page).toContain('"ADMISSION"');
    expect(page).not.toContain("createDirectAdmission");
    expect(page).not.toContain("confirmInpatientTransfer");
    expect(page).not.toContain("EncounterType.OBSERVATION");
  });

  it("readiness projection is ED-specific and path-aware", () => {
    const state = projectEdDispositionState({
      status: "OPEN",
      dischargeSummaryJson: { dischargeMode: ER_DISCHARGE_MODE_HOME },
      admissionSummaryJson: null,
      nursingAssessment: {},
    });
    const home = projectEdDispositionReadiness({
      outcomeUi: "HOME",
      dispositionState: state,
      hasSavedAdmission: false,
      nursingAssessment: {},
    });
    expect(home.map((c) => c.id)).toEqual([
      "provider",
      "nursing",
      "instructions",
      "medications",
      "departure",
      "final",
    ]);
    const other = projectEdDispositionReadiness({
      outcomeUi: "OTHER",
      dispositionState: state,
      hasSavedAdmission: false,
      nursingAssessment: {},
    });
    expect(other.map((c) => c.id)).toEqual(["provider", "final"]);
    expect(other.every((c) => c.state === "pending" || c.state === "ready")).toBe(true);
  });

  it("readiness: Observation/Admission omit HOME instruction/medication chips; Final is conservative", () => {
    const state = projectEdDispositionState({
      status: "OPEN",
      dischargeSummaryJson: { dischargeMode: ER_DISCHARGE_MODE_ADMISSION },
      admissionSummaryJson: null,
      nursingAssessment: {},
    });
    const obs = projectEdDispositionReadiness({
      outcomeUi: "OBSERVATION",
      dispositionState: state,
      hasSavedAdmission: false,
      nursingAssessment: {},
    });
    expect(obs.map((c) => c.id)).not.toContain("instructions");
    expect(obs.map((c) => c.id)).not.toContain("medications");
    expect(obs.find((c) => c.id === "final")?.state).toBe("pending");
    const filledUnsaved = projectEdDispositionReadiness({
      outcomeUi: "ADMISSION",
      dispositionState: { ...state, decisionSigned: false },
      hasSavedAdmission: false,
      nursingAssessment: {},
    });
    expect(filledUnsaved.find((c) => c.id === "final")?.state).toBe("pending");
    const signedSaved = projectEdDispositionReadiness({
      outcomeUi: "OBSERVATION",
      dispositionState: { ...state, decisionSigned: true },
      hasSavedAdmission: true,
      nursingAssessment: {},
    });
    expect(signedSaved.find((c) => c.id === "final")?.state).toBe("ready");
  });
});
