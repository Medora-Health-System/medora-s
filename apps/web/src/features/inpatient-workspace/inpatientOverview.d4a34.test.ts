/**
 * MEDUI.D4A.3.4 — Final inpatient header placement + Overview audit/projection.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  formatCareTeamDisplayName,
  formatInpatientCodeStatusDisplay,
  formatInpatientIsolationDisplay,
  formatInpatientClinicalStateLabel,
} from "./inpatientClinicalDisplayLabels";
import { projectInpatientOverview } from "./projectInpatientOverview";

const root = join(__dirname);
function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const tEn = (key: string) => {
  const parts = key.split(".");
  let cur: unknown = en;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return key;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : key;
};

describe("MEDUI.D4A.3.4 inpatient header final placement", () => {
  it("removes IV card and uses compact syringe control with a11y", () => {
    const src = read("EnterpriseHospitalPatientHeader.tsx");
    expect(src).not.toContain("inpatient-header-iv-card");
    expect(src).not.toContain("ivCompactCard");
    expect(src).toContain("inpatient-header-iv-syringe");
    expect(src).toContain("inpatientOverviewD4a34.manageIvAccess");
    expect(src).toContain("aria-pressed");
    expect(src).toContain("onOpenIvAccess");
  });

  it("places status cards with D4A.3.4 sizes and status-row separation from vitals", () => {
    const src = read("EnterpriseHospitalPatientHeader.tsx");
    expect(src).toContain("inpatient-header-status-row");
    expect(src).toContain("minWidth: 180");
    expect(src).toContain("maxWidth: 210");
    expect(src).toContain("minWidth: 170");
    expect(src).toContain("maxWidth: 200");
    expect(src).toContain("minHeight: 80");
    expect(src).toContain("justifyContent: \"flex-end\"");
    expect(src).not.toContain("overflowX: \"auto\"");
  });

  it("formats DOB date-only and bolds DOB/Age/Sex values", () => {
    const src = read("EnterpriseHospitalPatientHeader.tsx");
    expect(src).toContain("formatEncounterChromeDate");
    expect(src).toContain("inpatient-header-dob");
    expect(src).toContain("demoValue");
    expect(src).not.toMatch(/formatEncounterChromeDateTime\(header\.dateOfBirth/);
  });

  it("maps code status and isolation enums to display labels", () => {
    expect(formatInpatientCodeStatusDisplay("DNR_DNI", tEn, "—")).toBe("DNR / DNI");
    expect(formatInpatientCodeStatusDisplay("FULL_CODE", tEn, "—")).toBe("Full Code");
    expect(formatInpatientIsolationDisplay(["STANDARD"], tEn, "—")).toBe("Standard");
    expect(formatInpatientIsolationDisplay(["CONTACT", "DROPLET"], tEn, "—")).toBe(
      "Contact, Droplet"
    );
    const src = read("EnterpriseHospitalPatientHeader.tsx");
    expect(src).toContain("formatInpatientCodeStatusDisplay");
    expect(src).toContain("formatInpatientIsolationDisplay");
  });
});

describe("MEDUI.D4A.3.4 inpatient Overview projection", () => {
  it("omits header duplicates and hides rounding for nursing", () => {
    const nursing = projectInpatientOverview({
      role: "NURSING",
      emptyClinicianLabel: "Not assigned",
      alerts: ["Medication reconciliation incomplete"],
      synthesis: {
        overview: {
          codeStatus: "DNR_DNI",
          isolation: "STANDARD",
          currentBed: "MS-1",
          admissionDate: "2026-07-23T01:35:00.000Z",
          attending: "Rajnil Shah",
          resident: "Unknown clinician",
          consultServices: ["INTERNAL_MEDICINE"],
          hospitalDay: 2,
          lengthOfStayHours: 35,
        },
        laboratories: { critical: [{ label: "K+", current: "6.2", critical: true }] },
        medications: {
          groups: {
            OTHER: [
              {
                drug: "Acetaminophen",
                dose: "500 mg",
                route: "PO",
                frequency: "Q6H",
                held: false,
              },
            ],
          },
        },
        tasks: {
          critical: [
            { taskId: "t1", title: "Ack critical K+", priority: "CRITICAL", linkedSection: "results" },
          ],
        },
        events: [
          {
            eventId: "e1",
            type: "CRITICAL_RESULT",
            severity: "CRITICAL",
            summary: "Critical K+",
            status: "NEW",
            occurredAt: "2026-07-24T12:00:00.000Z",
          },
        ],
      },
      authProjection: {
        pain: { state: "MISSING" },
        fallRisk: { state: "MISSING" },
        wounds: { state: "MISSING" },
      },
      nursingOps: { admissionAssessmentComplete: false, lastShiftAssessmentAt: null },
      canProviderWrite: false,
    });

    expect(nursing.showRoundingMode).toBe(false);
    expect(nursing.headerDuplicatesOmitted).toContain("codeStatus");
    expect(nursing.headerDuplicatesOmitted).toContain("isolation");
    expect(nursing.headerDuplicatesOmitted).toContain("room");
    expect(nursing.careTeam.resident).toBe("Not assigned");
    expect(nursing.careTeam.attending).toBe("Rajnil Shah");
    expect(nursing.alerts.items).toHaveLength(1);
    expect(nursing.results.critical[0]?.label).toBe("K+");
    expect(nursing.medications.lines[0]?.drug).toBe("Acetaminophen");
    expect(nursing.tasks.items[0]?.bucket).toBe("critical");
    expect(nursing.devices.availability).toBe("UNSUPPORTED");
    expect(nursing.intakeOutput.availability).toBe("EMPTY");
  });

  it("enables rounding for provider and maps clinical state keys", () => {
    const provider = projectInpatientOverview({
      role: "PROVIDER",
      emptyClinicianLabel: "Not assigned",
      alerts: [],
      synthesis: null,
      authProjection: {
        pain: {
          state: "RESOLVED",
          summary: "4/10",
          clinicalTimestamp: "2026-07-24T08:00:00.000Z",
        },
      },
      canProviderWrite: true,
    });
    expect(provider.showRoundingMode).toBe(true);
    expect(provider.clinicalState.items.find((i) => i.key === "pain")?.state).toBe("RESOLVED");
    expect(formatInpatientClinicalStateLabel("fallRisk", tEn)).toBe("Fall risk");
    expect(formatCareTeamDisplayName("Unknown clinician", "Not assigned")).toBe("Not assigned");
  });

  it("overview UI removes architecture prose and Set full code controls", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).not.toContain('InpatientClinicalOpsPanel encounterId={encounterId} mode="overview"');
    expect(panel).toContain('mode="overview"');
    expect(panel).toContain("workspaceRole={workspaceRole}");
    const overviewCase = panel.match(/case "overview":([\s\S]*?)case "admission":/)?.[1] ?? "";
    expect(overviewCase).not.toContain("EnterpriseProviderClinicalWorkspaceD4b8");

    const provider = read("InpatientProviderWorkspacePanel.tsx");
    expect(provider).toContain("projectInpatientOverview");
    expect(provider).toContain("InpatientOverviewView");
    expect(provider).toContain("overviewProjection.showRoundingMode");
    expect(provider).not.toContain("providerNotNursing");
    expect(provider).not.toContain("ProviderClinicalSynthesisOverview");

    const overview = read("InpatientOverviewView.tsx");
    expect(overview).not.toMatch(/Unresolved authoritative source/i);
    expect(overview).not.toContain('"fallRisk"');
    expect(overview).toContain("formatInpatientClinicalStateLabel");
    expect(overview).toContain("overview-work-attention");
    expect(overview).toContain("overview-mar");
    expect(overview).toContain("overview-labs-critical");
  });

  it("clinical ops overview mode no longer mounted; setFullCode remains elsewhere only", () => {
    const ops = read("InpatientClinicalOpsPanel.tsx");
    expect(ops).toContain("setFullCode");
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain('<InpatientClinicalOpsPanel encounterId={encounterId} mode="consults"');
    expect(panel).not.toContain('InpatientClinicalOpsPanel encounterId={encounterId} mode="overview"');
  });

  it("mirrors D4A.3.4 i18n EN/FR keys", () => {
    expect(Object.keys(en.inpatientOverviewD4a34.modules)).toEqual(
      Object.keys(fr.inpatientOverviewD4a34.modules)
    );
    expect(Object.keys(en.inpatientOverviewD4a34.clinicalState.keys)).toEqual(
      Object.keys(fr.inpatientOverviewD4a34.clinicalState.keys)
    );
    expect(fr.inpatientOverviewD4a34.manageIvAccess).toBeTruthy();
    expect(fr.inpatientOverviewD4a34.manageIvAccess).not.toMatch(/Manage/i);
    expect(en.inpatientHeaderNursingD4a33.codeStatusEditor.options.DNR_DNI).toBe("DNR / DNI");
    expect(fr.inpatientHeaderNursingD4a33.codeStatusEditor.options.DNR_DNI).toBe("DNR / DNI");
  });
});
