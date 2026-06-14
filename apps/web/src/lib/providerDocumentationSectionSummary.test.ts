import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  PROVIDER_DOCUMENTATION_ACCORDION_SECTION_IDS,
  accordionSectionsToExpandForDictation,
  defaultExpandedAccordionSections,
  providerDocumentationAccordionSelectedCounts,
  providerDocumentationAccordionSummaries,
} from "./providerDocumentationSectionSummary";
import {
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS,
} from "./providerDocumentationModel";

describe("providerDocumentationSectionSummary", () => {
  it("lists all major accordion section ids", () => {
    expect(PROVIDER_DOCUMENTATION_ACCORDION_SECTION_IDS).toEqual([
      "presentation",
      "hpi",
      "ros",
      "physicalExam",
      "mdm",
      "impressionPlan",
      "actions",
    ]);
  });

  it("builds collapsed-row summaries from non-empty fields", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.chiefComplaint = "Shortness of breath";
    state.hpi = "began today; sudden onset";
    state.physicalExam.respiratory = "clear breath sounds";
    state.physicalExam.cardiovascular = "regular rhythm";
    state.mdmWorkingAssessment = "likely viral URI";
    state.clinicalImpression = "Acute bronchitis";

    const summaries = providerDocumentationAccordionSummaries(state);
    expect(summaries.presentation).toContain("Shortness of breath");
    expect(summaries.hpi).toContain("Shortness of breath");
    expect(summaries.physicalExam).toContain("Respiratory");
    expect(summaries.physicalExam).toContain("Cardiovascular");
    expect(summaries.mdm).toContain("likely viral URI");
    expect(summaries.impressionPlan).toContain("Acute bronchitis");
  });

  it("counts non-empty section fields for selected badges", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.chiefComplaint = "Chest pain";
    state.hpi = "started 2 hours ago";
    state.rosImportantPositives = "chest pain";
    state.physicalExam.heent = "PERRLA";
    state.mdmWorkingAssessment = "ACS considered";
    state.treatmentPlan = "ECG, troponin";

    const counts = providerDocumentationAccordionSelectedCounts(state);
    expect(counts.presentation).toBe(1);
    expect(counts.hpi).toBe(1);
    expect(counts.ros).toBe(1);
    expect(counts.physicalExam).toBe(1);
    expect(counts.mdm).toBe(1);
    expect(counts.impressionPlan).toBe(1);
    expect(counts.actions).toBe(0);
  });

  it("defaults expanded sections to incomplete recommended areas or HPI", () => {
    expect(
      defaultExpandedAccordionSections({
        missingSectionIds: ["chiefComplaintHpi", "mdm"],
      })
    ).toEqual(["presentation", "hpi", "mdm"]);

    expect(
      defaultExpandedAccordionSections({
        missingSectionIds: [],
      })
    ).toEqual(["hpi"]);
  });

  it("maps dictation focus to accordion sections including chief complaint", () => {
    expect(accordionSectionsToExpandForDictation("mdm")).toEqual(["mdm"]);
    expect(
      accordionSectionsToExpandForDictation(
        "hpi",
        PROVIDER_DOCUMENTATION_DICTATION_TEXTAREA_IDS.chiefComplaint
      )
    ).toEqual(["presentation", "hpi"]);
  });
});

describe("ProviderDocumentationWorkspace accordion UI (19N.2)", () => {
  it("renders collapsible accordion sections with chip panels hidden by default", () => {
    const workspaceSource = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    const accordionSource = readFileSync(
      new URL("../components/encounters/ProviderDocumentationAccordionSection.tsx", import.meta.url),
      "utf8"
    );
    const chipPanelSource = readFileSync(
      new URL("../components/encounters/ProviderDocumentationChipPanel.tsx", import.meta.url),
      "utf8"
    );
    for (const sectionId of PROVIDER_DOCUMENTATION_ACCORDION_SECTION_IDS) {
      expect(workspaceSource).toContain(`sectionId="${sectionId}"`);
    }
    expect(accordionSource).toContain('data-testid={`provider-documentation-accordion-${sectionId}`}');
    expect(accordionSource).toContain("aria-expanded={expanded}");
    expect(accordionSource).toContain("aria-controls={panelId}");
    expect(chipPanelSource).toContain("aria-expanded={expanded}");
    expect(chipPanelSource).toContain("defaultExpanded = false");
    expect(workspaceSource).toContain("ProviderDocumentationAccordionSection");
    expect(workspaceSource).toContain("ProviderDocumentationChipPanel");
    expect(workspaceSource).toContain("expandedSections");
    expect(workspaceSource).toContain("toggleAccordionSection");
    expect(workspaceSource).toContain("accordionSectionsToExpandForDictation");
    expect(workspaceSource).toContain("defaultExpandedAccordionSections");
    expect(workspaceSource).not.toContain("WorkspaceSection");
    expect(workspaceSource).toContain('sectionId="hpi"');
    expect(workspaceSource).toContain("hpiChipGroups.map");
    expect(workspaceSource).toContain("rosChipGroups.map");
    expect(workspaceSource).toContain("examChipGroups.map");
    expect(workspaceSource).toContain("ProviderDocumentationMdmTemplateDropdown");
    expect(workspaceSource).toContain("templateGuidanceChips");
    expect(workspaceSource).toContain('sectionId="actions"');
    expect(workspaceSource).toContain("signAttestation");
  });

  it("expands matching accordion when focus dictation navigates to MDM", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("focusDictationSection");
    expect(source).toContain('provider-documentation-accordion-${accordionId}');
    expect(source).toMatch(/accordionSectionsToExpandForDictation\(sectionId/);
  });

  it("preserves template picker from 19N.1 and MDM guidance chips", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain('data-testid="provider-documentation-template-picker"');
    expect(source).toContain("PROVIDER_DOCUMENTATION_MAJOR_GROUP_KEYS.map");
    expect(source).toContain("activeTemplateMdmUnified");
    expect(source).toContain("ProviderDocumentationMdmTemplateDropdown");
    expect(source).toContain("activeTemplateSmartSentences");
    expect(source).toContain("shouldAutosaveProviderDocumentation");
    expect(source).toContain("runManualSave");
    expect(source).toContain("providerDocumentationCanSubmitSignature");
  });
});
