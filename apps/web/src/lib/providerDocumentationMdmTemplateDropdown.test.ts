import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildMdmTemplateDropdownOptions,
  HIGH_VALUE_MDM_TEMPLATES,
} from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  documentationFragmentPresentInField,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { applyProviderDocumentationTemplate } from "@/lib/providerDocumentationModel";

const workspaceSource = readFileSync(
  new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
  "utf8"
);
const dropdownSource = readFileSync(
  new URL("../components/encounters/ProviderDocumentationTemplateDropdown.tsx", import.meta.url),
  "utf8"
);
const enMessages = readFileSync(
  new URL("../i18n/messages/en.ts", import.meta.url),
  "utf8"
);
const frMessages = readFileSync(
  new URL("../i18n/messages/fr.ts", import.meta.url),
  "utf8"
);

const mockT = (key: string): string => {
  const fragments: Record<string, string> = {
    "providerDocumentationMdmHighValue.standardMdm":
      "The patient lives at home with family and has good family/social support.\n\nI have considered the above differential diagnoses as the potential cause of the patient's condition.",
    "providerDocumentationMdmHighValue.patientConcern":
      "The patient was substantially concerned that their symptoms were potentially risking their life and that emergency care was immediately required.",
    "providerDocumentationMdmHighValue.ekgNormal":
      "The EKG showed normal sinus rhythm, normal QT, normal QRS morphology, and no ischemic changes of the ST/T segment — interpretation by me: Normal EKG.",
    "providerDocumentationMdmHighValue.smokingCessation":
      "The patient was counseled on smoking cessation, including e-cigarettes and vaping; less than or equal to 10 minutes spent on discussion.",
    "providerDocumentationMdmHighValue.pmpReviewed": "State prescription monitoring program reviewed.",
    "erMseMdmChips.waTrauma": "traumatic injury considered",
    "erMseMdmChips.planReassess": "reassessment planned",
    "providerDocumentationComplaintIntel.laceration.mdmNeurovascularExamDocumented":
      "neurovascular status addressed",
  };
  return fragments[key] ?? key;
};

const traumaTemplate =
  PROVIDER_DOCUMENTATION_TEMPLATES.find((template) => template.id === "laceration") ?? null;

describe("providerDocumentationMdmTemplateDropdown — section structure", () => {
  it("shows only one Active Template MDM section and removes duplicate labels", () => {
    expect(workspaceSource).toContain("activeTemplateMdmUnified");
    expect(workspaceSource).toContain("ProviderDocumentationMdmTemplateDropdown");
    expect(workspaceSource).not.toContain('title={t("providerDocumentationWorkspace.activeTemplateGuidance")}');
    expect(workspaceSource).not.toContain('title={t("providerDocumentationWorkspace.activeTemplateMdm")}');
    expect(workspaceSource).not.toContain("complaintIntelSectionMdmAssessment");
    expect(workspaceSource).not.toContain("MDM_CHIPS.map");
  });

  it("renders dropdown placeholder and grouped options", () => {
    expect(dropdownSource).toContain("placeholder");
    expect(dropdownSource).toContain("<optgroup");
    expect(dropdownSource).toContain('data-testid="provider-documentation-mdm-selected-templates"');
    expect(enMessages).toContain('selectMdmTemplate: "Select a template…"');
    expect(enMessages).toContain('mdmHighValueTemplatesGroup: "High value templates"');
    expect(enMessages).toContain('mdmExistingTemplatesGroup: "Existing templates"');
  });
});

describe("providerDocumentationMdmTemplateDropdown — catalog", () => {
  it("lists high value templates before existing templates", () => {
    const options = buildMdmTemplateDropdownOptions(traumaTemplate);
    expect(options.slice(0, 5).every((option) => option.group === "highValue")).toBe(true);
    const firstExistingIndex = options.findIndex((option) => option.group === "existing");
    expect(firstExistingIndex).toBeGreaterThanOrEqual(5);
  });

  it("includes all five high-value options", () => {
    const options = buildMdmTemplateDropdownOptions(null);
    const highValueIds = options.filter((option) => option.group === "highValue").map((option) => option.id);
    expect(highValueIds).toEqual(HIGH_VALUE_MDM_TEMPLATES.map((item) => item.id));
  });

  it("retains existing MDM helper/sticker options", () => {
    const options = buildMdmTemplateDropdownOptions(traumaTemplate);
    const labels = options
      .filter((option) => option.group === "existing")
      .map((option) => option.fragmentKey);
    expect(labels).toContain("erMseMdmChips.waTrauma");
    expect(labels).toContain("erMseMdmChips.planReassess");
    expect(labels).toContain("providerDocumentationComplaintIntel.laceration.mdmNeurovascularExamDocumented");
  });
});

describe("providerDocumentationMdmTemplateDropdown — selection behavior", () => {
  it("inserts Standard MDM into clinical rationale", () => {
    const fragment = mockT("providerDocumentationMdmHighValue.standardMdm");
    const next = toggleDocumentationFragment("", fragment);
    expect(next).toContain("The patient lives at home with family");
    expect(next).toContain("differential diagnoses");
  });

  it("inserts Patient concern into working assessment", () => {
    const fragment = mockT("providerDocumentationMdmHighValue.patientConcern");
    const next = toggleDocumentationFragment("", fragment);
    expect(next).toContain("substantially concerned");
    expect(next).toContain("symptoms");
  });

  it("inserts EKG normal into data reviewed field via catalog mapping", () => {
    const option = HIGH_VALUE_MDM_TEMPLATES.find((item) => item.id === "hv-ekg-normal");
    expect(option?.field).toBe("mdmDataReviewed");
    const next = toggleDocumentationFragment("", mockT(option!.fragmentKey));
    expect(next).toContain("Normal EKG");
  });

  it("inserts Smoking Cessation and PMP Reviewed fragments", () => {
    const smoking = toggleDocumentationFragment("", mockT("providerDocumentationMdmHighValue.smokingCessation"));
    expect(smoking).toContain("smoking cessation");
    const pmp = toggleDocumentationFragment("", mockT("providerDocumentationMdmHighValue.pmpReviewed"));
    expect(pmp).toContain("prescription monitoring program");
  });

  it("keeps prior selections when adding another template", () => {
    let field = toggleDocumentationFragment("", mockT("providerDocumentationMdmHighValue.pmpReviewed"));
    field = toggleDocumentationFragment(field, mockT("providerDocumentationMdmHighValue.patientConcern"));
    expect(documentationFragmentPresentInField(field, mockT("providerDocumentationMdmHighValue.pmpReviewed"))).toBe(
      true
    );
    expect(documentationFragmentPresentInField(field, mockT("providerDocumentationMdmHighValue.patientConcern"))).toBe(
      true
    );
  });

  it("removes only the toggled fragment when deselected", () => {
    let field = toggleDocumentationFragment("", mockT("providerDocumentationMdmHighValue.pmpReviewed"));
    field = toggleDocumentationFragment(field, mockT("providerDocumentationMdmHighValue.patientConcern"));
    field = toggleDocumentationFragment(field, mockT("providerDocumentationMdmHighValue.pmpReviewed"));
    expect(documentationFragmentPresentInField(field, mockT("providerDocumentationMdmHighValue.pmpReviewed"))).toBe(
      false
    );
    expect(documentationFragmentPresentInField(field, mockT("providerDocumentationMdmHighValue.patientConcern"))).toBe(
      true
    );
  });

  it("does not stack duplicate fragments", () => {
    const fragment = mockT("providerDocumentationMdmHighValue.pmpReviewed");
    const once = toggleDocumentationFragment("", fragment);
    const twice = toggleDocumentationFragment(once, fragment);
    expect(twice).toBe("");
    expect(once.split(";").length).toBe(1);
  });
});

describe("providerDocumentationMdmTemplateDropdown — safety", () => {
  it("does not auto-insert high-value MDM templates on template apply", () => {
    const next = applyProviderDocumentationTemplate({
      state: emptyProviderDocumentationWorkspaceState(),
      templateId: "laceration",
      resolveFragment: mockT,
    });
    for (const item of HIGH_VALUE_MDM_TEMPLATES) {
      const fragment = mockT(item.fragmentKey);
      const fieldValue = String(next[item.field] ?? "");
      expect(documentationFragmentPresentInField(fieldValue, fragment)).toBe(false);
    }
  });

  it("does not change save/autosave/sign code paths", () => {
    expect(workspaceSource).toContain("shouldAutosaveProviderDocumentation");
    expect(workspaceSource).toContain("providerDocumentationCanSubmitSignature");
    expect(workspaceSource).toContain("runManualSave");
  });

  it("keeps English clinical fragments in French locale messages", () => {
    expect(frMessages).toContain("providerDocumentationMdmHighValue");
    expect(frMessages).toContain("The patient lives at home with family");
    expect(frMessages).toContain('mdmHighValueTemplatesGroup: "Modèles à haute valeur"');
    expect(frMessages).not.toMatch(/providerDocumentationMdmHighValue[\s\S]{0,200}Le patient vit/);
  });

  it("exposes aria-pressed on selected template chips", () => {
    expect(dropdownSource).toContain("aria-pressed={selected}");
  });
});
