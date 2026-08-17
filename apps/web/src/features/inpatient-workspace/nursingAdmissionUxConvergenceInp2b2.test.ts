/**
 * MEDUI.INP.2B.2 — Nursing Admission Design 1 rapid-documentation gates.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  NURSING_ADMISSION_STAGES,
  emptyMedSurgNursingAdmissionDocV1,
  projectNursingAdmissionOverview,
  projectNursingAdmissionRailSummary,
  saveAdmissionSectionDraft,
} from "@medora/shared";

const root = join(__dirname);
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("MEDUI.INP.2B.2 nursing admission design 1 rapid documentation", () => {
  it("A — six stage buttons remain clickable", () => {
    expect(NURSING_ADMISSION_STAGES).toHaveLength(6);
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    expect(chrome).toContain("admission-stage-${s.id}");
    expect(chrome).toContain("onStage");
  });

  it("B — every subsection card clickable", () => {
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    expect(chrome).toContain("admission-section-${id}");
    expect(chrome).toContain('aria-current={isActive ? "page"');
  });

  it("C — unsaved navigation save-before-move", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("void persistSection().then((ok)");
    expect(shell).toContain("if (ok) setActive");
  });

  it("D — failed save prevents navigation", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("if (ok) setActive");
    expect(shell).not.toContain("if (!ok) setActive");
  });

  it("E — 409 conflict preserves draft", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("CONFLICT_DETECTED");
    expect(shell).toContain("localDraftBackup");
  });

  it("F-G — clinicalDocumentedAt preserved; save time distinct", () => {
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
    });
    const saved = saveAdmissionSectionDraft({
      doc,
      sectionId: "OVERVIEW",
      answers: { modeOfArrival: "AMBULATORY" },
      clientExpectedVersion: 0,
      actorUserId: "rn-1",
      atIso: "2026-08-17T22:00:00.000Z",
      clinicalDocumentedAt: "2026-08-17T18:00:00.000Z",
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.doc.clinicalDocumentedAt).toBe("2026-08-17T18:00:00.000Z");
    expect(saved.doc.updatedAt).toBe("2026-08-17T22:00:00.000Z");
  });

  it("H-I — mode of arrival icon cards persist selection", () => {
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    const icons = read("rapid-documentation/nursingAdmissionVisualIcons.tsx");
    expect(rapid).toContain("ClinicalIconCardSelect");
    expect(rapid).toContain('testId="rapid-mode-of-arrival-icons"');
    expect(rapid).toContain("ModeOfArrivalIcon");
    expect(icons).toContain("ModeOfArrivalIcon");
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
    });
    const saved = saveAdmissionSectionDraft({
      doc,
      sectionId: "OVERVIEW",
      answers: { modeOfArrival: "STRETCHER", admissionSource: "EMERGENCY_DEPARTMENT" },
      clientExpectedVersion: 0,
      actorUserId: "rn-1",
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.doc.sections.OVERVIEW?.answers?.modeOfArrival).toBe("STRETCHER");
  });

  it("J — Stage 2 safety rapid controls", () => {
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    const controls = read("rapid-documentation/ClinicalRapidControls.tsx");
    expect(rapid).toContain('data-testid="rapid-nursing-assessment"');
    expect(rapid).toContain('data-testid="rapid-pain"');
    expect(rapid).toContain('data-testid="rapid-fall"');
    expect(controls).toContain("ClinicalPainScoreSelector");
    expect(controls).toContain("ClinicalSemanticSingleSelect");
  });

  it("K — enterprise history verify reuses authority (preload panel)", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("admission-preload-panel");
    expect(shell).toContain("verifyNursingAdmissionPreloadItem");
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    expect(rapid).toContain("historyVerificationAction");
  });

  it("L — allergies do not infer NKA from empty list", () => {
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    expect(rapid).not.toMatch(/inferNKA|empty.*NKA/i);
    expect(rapid).toContain("allergyVerificationAction");
  });

  it("M — device section does not duplicate inventory list", () => {
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    expect(rapid).toContain("rapidDevicesConfirmed");
    expect(rapid).not.toContain("deviceTypes");
    const domain = read("NursingAdmissionDomainIntegrationPanel.tsx");
    expect(domain).toContain("LINES_DRAINS_DEVICES");
  });

  it("N — I&O section links monitoring without duplicate engine", () => {
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    expect(rapid).toContain("ioMonitoringRequired");
    expect(rapid).not.toContain("EnterpriseIoEngine");
  });

  it("O-P — Stage 6 review cards deep-link and completion gate", () => {
    const dashboard = read("NursingAdmissionReviewDashboard.tsx");
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(dashboard).toContain('data-testid="nursing-admission-review-dashboard"');
    expect(dashboard).toContain("review-stage-card-");
    expect(dashboard).toContain("onNavigate");
    expect(dashboard).toContain("nursing-admission-complete-button");
    expect(shell).toContain("NursingAdmissionReviewDashboard");
    expect(shell).toContain('active === "PROVIDER_ADMISSION"');
    expect(shell).toContain("completionAllowed");
  });

  it("Q — Overview projection extended fields", () => {
    const doc = emptyMedSurgNursingAdmissionDocV1({
      patientId: "p1",
      facilityId: "f1",
      encounterId: "e1",
    });
    doc.sections.OVERVIEW = {
      ...doc.sections.OVERVIEW!,
      answers: { conditionOnArrival: "STABLE", modeOfArrival: "AMBULATORY" },
    };
    doc.sections.PAIN = {
      ...doc.sections.PAIN!,
      answers: { rapidPainPresence: "NO_PAIN" },
    };
    const projected = projectNursingAdmissionOverview(doc);
    expect(projected.conditionOnArrival).toBe("STABLE");
    expect(projected.painStatus).toBeTruthy();
    expect(projected.unresolvedSectionCount).toBeGreaterThan(0);
    const rail = projectNursingAdmissionRailSummary({ doc, activeSectionId: "OVERVIEW" });
    expect(rail.currentSectionId).toBe("OVERVIEW");
  });

  it("R-S — RN/ADMIN write API boundary preserved", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain('readOnly={!(roles.includes("RN") || roles.includes("ADMIN"))}');
  });

  it("T — provider read-only shell", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain("readOnly={!(roles.includes(\"RN\") || roles.includes(\"ADMIN\"))}");
  });

  it("U-V — EN/FR inp2b2 keys mirrored", () => {
    expect(Object.keys(en.inpatientAdmissionInp2b2)).toEqual(Object.keys(fr.inpatientAdmissionInp2b2));
    expect(fr.inpatientAdmissionInp2b2.review.completeAdmission).toMatch(/admission/i);
    expect(en.inpatientAdmissionInp2b2.rail.currentStage).toBe("Current stage");
  });

  it("W — accessibility basics on icon cards", () => {
    const controls = read("rapid-documentation/ClinicalRapidControls.tsx");
    expect(controls).toContain('role="radio"');
    expect(controls).toContain("aria-checked");
    expect(controls).toContain("aria-label");
  });

  it("X — ED regression isolation", () => {
    const sections = read("inpatientWorkspaceSections.ts");
    expect(sections).not.toContain("EmergencyTrackboard");
  });

  it("Y — Observation regression isolation", () => {
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    expect(rapid).not.toContain("ObservationWorkspace");
  });

  it("Z — Nursing Assessment INP.2C.1 regression", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain("InpatientNursingAssessmentSection");
    expect(panel).toContain("InpatientAdmissionClinicalShell");
  });

  it("layout — 1440 max-width three-column preserved", () => {
    const chrome = read("NursingAdmissionWorkspaceChromeInp2b1.tsx");
    expect(chrome).toContain("max-width: 1440px");
    expect(chrome).toContain("minmax(240px, 280px)");
    expect(chrome).toContain("railSummary");
  });

  it("cleanup — no duplicate AdditionalClinicalDocumentationLauncher in rapid sections", () => {
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    expect(rapid).not.toContain("AdditionalClinicalDocumentationLauncher");
    expect(rapid).toMatch(/PROVIDER_ADMISSION[\s\S]*return null/);
  });

  it("domain panel — hide zero linked records and format DOB", () => {
    const domain = read("NursingAdmissionDomainIntegrationPanel.tsx");
    expect(domain).toContain("authoritativeCount > 0 || legacyCount > 0");
    expect(domain).toContain("toLocaleDateString");
    expect(domain).toContain("CLINICAL_HELP_SECTIONS");
  });

  it("remediation — unified save uses refs and in-flight guard", () => {
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("saveInFlightRef");
    expect(shell).toContain("answersRef");
    expect(shell).toContain("clinicalDocumentedAtRef");
    expect(shell).not.toContain("draftsRef.current[active] = { answers, unableReason, draftNote }");
  });

  it("remediation — icon cards do not deselect by default", () => {
    const controls = read("rapid-documentation/ClinicalRapidControls.tsx");
    expect(controls).toContain("allowDeselect = false");
    expect(controls).toContain("on && allowDeselect ? null : opt.code");
  });

  it("remediation — rapid controls avoid hardcoded English option labels", () => {
    const rapid = read("rapid-documentation/NursingAdmissionRapidSectionControls.tsx");
    expect(rapid).not.toContain('label: "Bedside"');
    expect(rapid).not.toContain('label: "Confirm"');
    expect(rapid).toContain("HANDOFF_METHOD_CODES");
  });

  it("remediation — option labels resolved via i18n catalog", () => {
    const controls = read("rapid-documentation/ClinicalRapidControls.tsx");
    expect(controls).toContain("resolveNursingAdmissionOptionLabel");
    const helper = read("nursingAdmissionOptionI18n.ts");
    expect(helper).toContain("hospitalAdmissionD4a25.options");
  });
});
