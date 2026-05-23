import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  isDocumentationChipSelected,
  resolveDocumentationChipStyles,
} from "./providerDocumentationChipSelection";
import {
  appendDocumentationFragment,
  applyCompleteNormalPhysicalExamPrefill,
  documentationFragmentPresentInField,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS,
} from "./providerDocumentationModel";
import {
  HPI_GENERIC_LOCATION_CHIP_GROUP_TITLE_KEY,
  resolveHpiChipGroupsForTemplate,
  templateUsesComplaintSpecificLocationChips,
} from "./providerDocumentationTemplateLocationChips";

const workspaceSource = readFileSync(
  new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
  "utf8"
);

const mockResolveFragment = (key: string) => {
  const fragments: Record<string, string> = {
    "erMseExamChips.genAlert": "alert",
    "erMseExamChips.genNoAcuteDistress": "no acute distress",
    "erMseExamChips.heentHeadAtraumatic": "head atraumatic",
    "erMseExamChips.heentPerrla": "pupils equal and reactive",
    "erMseExamChips.heentOropharynxClear": "oropharynx clear",
    "erMseExamChips.cardioRrr": "regular rate and rhythm",
    "erMseExamChips.cardioNoMurmur": "no murmur appreciated",
    "erMseExamChips.cardioPeripheralPulsesPresent": "peripheral pulses present",
    "erMseExamChips.respNoDistress": "no respiratory distress",
    "erMseExamChips.respClearBs": "clear breath sounds",
    "erMseExamChips.abdSoft": "soft",
    "erMseExamChips.abdNonTender": "non-tender",
    "erMseExamChips.abdNoGuarding": "no guarding",
    "erMseExamChips.neuroAlertOriented": "alert and oriented",
    "erMseExamChips.neuroFollowsCommands": "follows commands",
    "erMseExamChips.neuroSpeechClear": "speech clear",
    "erMseExamChips.mskRomNormal": "normal range of motion",
    "erMseExamChips.mskNoDeformityNoted": "no deformity noted",
    "erMseExamChips.skinWarmDry": "warm and dry",
    "erMseExamChips.skinNoRash": "no rash",
    "erMseMdmChips.planReassess": "reassessment planned",
  };
  return fragments[key] ?? key;
};

const baseHpiChipGroups = [
  {
    titleKey: HPI_GENERIC_LOCATION_CHIP_GROUP_TITLE_KEY,
    field: "hpi" as const,
    chips: [{ labelKey: "erMseHpiChips.locChestPain", fragmentKey: "erMseHpiChips.locChestPain" }],
  },
  {
    titleKey: "providerDocumentationWorkspace.chipTiming",
    field: "hpi" as const,
    chips: [{ labelKey: "erMseHpiChips.timSuddenOnset", fragmentKey: "erMseHpiChips.timSuddenOnset" }],
  },
];

describe("providerDocumentationChipUx", () => {
  it("detects multiple selected chip fragments in the same field", () => {
    const fieldText = appendDocumentationFragment(
      appendDocumentationFragment("", "mid chest"),
      "substernal chest"
    );
    expect(documentationFragmentPresentInField(fieldText, "mid chest")).toBe(true);
    expect(documentationFragmentPresentInField(fieldText, "substernal chest")).toBe(true);
    expect(isDocumentationChipSelected(fieldText, "mid chest")).toBe(true);
    expect(isDocumentationChipSelected(fieldText, "with exertion")).toBe(false);
  });

  it("uses selected styling and aria-pressed semantics via chip style helper", () => {
    const selected = resolveDocumentationChipStyles({ selected: true, readOnly: false });
    const unselected = resolveDocumentationChipStyles({ selected: false, readOnly: false });
    expect(selected.background).not.toBe(unselected.background);
    expect(selected.borderColor).not.toBe(unselected.borderColor);
    expect(workspaceSource).toContain("aria-pressed={selected}");
  });

  it("prevents duplicate text when the same chip is clicked twice", () => {
    const first = appendDocumentationFragment("mid chest", "mid chest");
    const second = appendDocumentationFragment(first, "Mid Chest");
    expect(second).toBe("mid chest");
    expect(isDocumentationChipSelected(second, "mid chest")).toBe(true);
  });

  it("shows chest-pain-specific location chips instead of generic pain locations", () => {
    const groups = resolveHpiChipGroupsForTemplate("chest_pain", baseHpiChipGroups);
    const locationGroup = groups.find((group) => group.titleKey === HPI_GENERIC_LOCATION_CHIP_GROUP_TITLE_KEY);
    expect(locationGroup?.chips.some((chip) => chip.fragmentKey.includes("chestPain.midChest"))).toBe(true);
    expect(locationGroup?.chips.some((chip) => chip.fragmentKey === "erMseHpiChips.locChestPain")).toBe(false);
    expect(templateUsesComplaintSpecificLocationChips("chest_pain")).toBe(true);
  });

  it("shows abdominal-pain-specific location chips", () => {
    const groups = resolveHpiChipGroupsForTemplate("abdominal_pain", baseHpiChipGroups);
    const locationGroup = groups.find((group) => group.titleKey === HPI_GENERIC_LOCATION_CHIP_GROUP_TITLE_KEY);
    expect(locationGroup?.chips.some((chip) => chip.fragmentKey.includes("abdominal.rightUpperQuadrant"))).toBe(
      true
    );
    expect(locationGroup?.chips.some((chip) => chip.fragmentKey === "erMseHpiChips.locAbdominalPain")).toBe(false);
  });

  it("shows dyspnea context chips for SOB instead of generic pain locations", () => {
    const groups = resolveHpiChipGroupsForTemplate("sob", baseHpiChipGroups);
    const contextGroup = groups.find(
      (group) => group.titleKey === "providerDocumentationWorkspace.chipDyspneaContext"
    );
    expect(contextGroup?.chips.some((chip) => chip.fragmentKey.includes("sob.atRest"))).toBe(true);
    expect(contextGroup?.chips.some((chip) => chip.fragmentKey.includes("sob.withExertion"))).toBe(true);
    expect(contextGroup?.chips.some((chip) => chip.fragmentKey === "erMseHpiChips.locChestPain")).toBe(false);
  });

  it("keeps generic location chips as fallback for templates without complaint-specific locations", () => {
    const groups = resolveHpiChipGroupsForTemplate("fever", baseHpiChipGroups);
    const locationGroup = groups.find((group) => group.titleKey === HPI_GENERIC_LOCATION_CHIP_GROUP_TITLE_KEY);
    expect(locationGroup?.chips[0]?.fragmentKey).toBe("erMseHpiChips.locChestPain");
    expect(templateUsesComplaintSpecificLocationChips("fever")).toBe(false);
  });

  it("removes the physical exam reminder box while keeping MDM advisory reminders", () => {
    const physicalExamBlockStart = workspaceSource.indexOf('sectionId="physicalExam"');
    const mdmBlockStart = workspaceSource.indexOf('sectionId="mdm"');
    expect(physicalExamBlockStart).toBeGreaterThan(-1);
    expect(mdmBlockStart).toBeGreaterThan(physicalExamBlockStart);
    const physicalExamBlock = workspaceSource.slice(physicalExamBlockStart, mdmBlockStart);
    expect(physicalExamBlock).not.toContain("templatePromptReminders(activeTemplate)");
    expect(workspaceSource).toContain("{templatePromptReminders(activeTemplate)}");
  });

  it("fills empty physical exam sections with complete normal findings", () => {
    const next = applyCompleteNormalPhysicalExamPrefill({
      state: emptyProviderDocumentationWorkspaceState(),
      resolveFragment: mockResolveFragment,
    });
    expect(next.physicalExam.general).toContain("alert");
    expect(next.physicalExam.general).toContain("no acute distress");
    expect(next.physicalExam.cardiovascular).toContain("regular rate and rhythm");
    expect(next.physicalExam.respiratory).toContain("clear breath sounds");
    expect(next.physicalExam.abdomen).toContain("no guarding");
    expect(next.physicalExam.reassessment).toContain("reassessment planned");
    for (const sectionId of PROVIDER_DOCUMENTATION_EXAM_SECTION_IDS) {
      expect(next.physicalExam[sectionId].trim().length).toBeGreaterThan(0);
    }
  });

  it("does not overwrite existing abnormal physical exam findings", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.physicalExam.cardiovascular = "murmur appreciated";
    state.physicalExam.abdomen = "guarding present";
    const next = applyCompleteNormalPhysicalExamPrefill({
      state,
      resolveFragment: mockResolveFragment,
    });
    expect(next.physicalExam.cardiovascular).toBe("murmur appreciated");
    expect(next.physicalExam.abdomen).toBe("guarding present");
    expect(next.physicalExam.general).toContain("alert");
    expect(next.physicalExam.respiratory).toContain("clear breath sounds");
  });

  it("preserves accordion and chip panel structure in the workspace", () => {
    expect(workspaceSource).toContain("ProviderDocumentationAccordionSection");
    expect(workspaceSource).toContain("ProviderDocumentationChipPanel");
    expect(workspaceSource).toContain("insertCompleteNormalExam");
  });

  it("does not change autosave or sign handlers in the workspace", () => {
    expect(workspaceSource).toContain("shouldAutosaveProviderDocumentation");
    expect(workspaceSource).toContain("providerDocumentationCanSubmitSignature");
    expect(workspaceSource).toContain("applyCompleteNormalExam");
  });
});
