import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
} from "./providerDocumentationModel";
import {
  CUSTOM_HPI_DIMENSION_TEMPLATE_IDS,
  getTemplateHpiDimensionGroups,
  HPI_DIMENSION_TITLE_KEYS,
  resolveHpiChipGroupsForTemplate,
  templateUsesCustomHpiDimensions,
} from "./providerDocumentationTemplateHpiDimensions";

const GENERIC_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locLimbPain",
];

const baseHpiChipGroups: Array<{
  titleKey: string;
  field: "hpi";
  chips: Array<{ labelKey: string; fragmentKey: string }>;
}> = [
  {
    titleKey: HPI_DIMENSION_TITLE_KEYS.location,
    field: "hpi" as const,
    chips: [
      { labelKey: "erMseHpiChips.locChestPain", fragmentKey: "erMseHpiChips.locChestPain" },
      { labelKey: "erMseHpiChips.locAbdominalPain", fragmentKey: "erMseHpiChips.locAbdominalPain" },
      { labelKey: "erMseHpiChips.locHeadache", fragmentKey: "erMseHpiChips.locHeadache" },
      { labelKey: "erMseHpiChips.locLimbPain", fragmentKey: "erMseHpiChips.locLimbPain" },
    ],
  },
  {
    titleKey: HPI_DIMENSION_TITLE_KEYS.timing,
    field: "hpi" as const,
    chips: [{ labelKey: "erMseHpiChips.timSuddenOnset", fragmentKey: "erMseHpiChips.timSuddenOnset" }],
  },
  {
    titleKey: HPI_DIMENSION_TITLE_KEYS.quality,
    field: "hpi" as const,
    chips: [{ labelKey: "erMseHpiChips.qualSharp", fragmentKey: "erMseHpiChips.qualSharp" }],
  },
  {
    titleKey: HPI_DIMENSION_TITLE_KEYS.associated,
    field: "hpi" as const,
    chips: [{ labelKey: "erMseHpiChips.assocNausea", fragmentKey: "erMseHpiChips.assocNausea" }],
  },
];

function fragmentKeysForTemplate(templateId: Parameters<typeof getTemplateHpiDimensionGroups>[0]) {
  return (getTemplateHpiDimensionGroups(templateId) ?? []).flatMap((group) =>
    group.chips.map((chip) => chip.fragmentKey)
  );
}

describe("providerDocumentationTemplateHpiDimensions (19N.14)", () => {
  it("customizes the minimum required complaint templates", () => {
    expect(CUSTOM_HPI_DIMENSION_TEMPLATE_IDS).toEqual(
      expect.arrayContaining([
        "male_genital_complaint",
        "female_pelvic_gyn_complaint",
        "urinary_symptoms",
        "flank_pain",
        "adult_nausea_vomiting",
        "adult_diarrhea",
        "chest_pain",
        "sob",
        "abdominal_pain",
        "headache",
        "dizziness_syncope",
        "stroke_symptoms",
        "psychiatric_behavioral",
        "medication_refill",
        "observation_reassessment",
      ])
    );
    expect(CUSTOM_HPI_DIMENSION_TEMPLATE_IDS.length).toBe(15);
  });

  it("male_genital_complaint does not show generic chest/abdominal/headache/limb location chips", () => {
    const groups = resolveHpiChipGroupsForTemplate("male_genital_complaint", baseHpiChipGroups);
    const keys = groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
    for (const generic of GENERIC_FRAGMENT_KEYS) {
      expect(keys).not.toContain(generic);
    }
  });

  it("male_genital_complaint shows testicular/scrotal/groin/penile/suprapubic chips", () => {
    const keys = fragmentKeysForTemplate("male_genital_complaint");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.maleGenitalComplaint.locTesticle");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.maleGenitalComplaint.locScrotum");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.maleGenitalComplaint.locGroin");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.maleGenitalComplaint.locPenis");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.maleGenitalComplaint.locSuprapubic");
  });

  it("female_pelvic_gyn_complaint shows pelvic/suprapubic/adnexal/vaginal chips", () => {
    const keys = fragmentKeysForTemplate("female_pelvic_gyn_complaint");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.femalePelvicGynComplaint.locPelvic");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.femalePelvicGynComplaint.locSuprapubic");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.femalePelvicGynComplaint.locAdnexalArea");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.femalePelvicGynComplaint.locVaginal");
    expect(keys.some((key) => GENERIC_FRAGMENT_KEYS.includes(key))).toBe(false);
  });

  it("chest_pain shows chest-specific location chips without generic headache/limb chips", () => {
    const groups = resolveHpiChipGroupsForTemplate("chest_pain", baseHpiChipGroups);
    const locationGroup = groups.find((group) => group.titleKey === HPI_DIMENSION_TITLE_KEYS.location);
    const keys = locationGroup?.chips.map((chip) => chip.fragmentKey) ?? [];
    expect(keys).toContain("providerDocumentationTemplateLocation.chestPain.midChest");
    expect(keys).not.toContain("erMseHpiChips.locHeadache");
    expect(keys).not.toContain("erMseHpiChips.locLimbPain");
    expect(groups.some((group) => group.titleKey === HPI_DIMENSION_TITLE_KEYS.timing)).toBe(true);
    expect(groups.some((group) => group.titleKey === HPI_DIMENSION_TITLE_KEYS.quality)).toBe(true);
    expect(groups.some((group) => group.titleKey === HPI_DIMENSION_TITLE_KEYS.associated)).toBe(true);
  });

  it("sob uses context chips instead of generic pain location chips", () => {
    const groups = resolveHpiChipGroupsForTemplate("sob", baseHpiChipGroups);
    const contextGroup = groups.find(
      (group) => group.titleKey === HPI_DIMENSION_TITLE_KEYS.dyspneaContext
    );
    const keys = contextGroup?.chips.map((chip) => chip.fragmentKey) ?? [];
    expect(keys).toContain("providerDocumentationTemplateLocation.sob.atRest");
    expect(keys).toContain("providerDocumentationTemplateLocation.sob.withExertion");
    expect(keys.some((key) => GENERIC_FRAGMENT_KEYS.includes(key))).toBe(false);
  });

  it("abdominal_pain shows quadrant-specific location chips", () => {
    const groups = resolveHpiChipGroupsForTemplate("abdominal_pain", baseHpiChipGroups);
    const locationGroup = groups.find((group) => group.titleKey === HPI_DIMENSION_TITLE_KEYS.location);
    const keys = locationGroup?.chips.map((chip) => chip.fragmentKey) ?? [];
    expect(keys).toContain("providerDocumentationTemplateLocation.abdominal.rightUpperQuadrant");
    expect(keys).toContain("providerDocumentationTemplateLocation.abdominal.leftLowerQuadrant");
  });

  it("headache shows head-region chips", () => {
    const keys = fragmentKeysForTemplate("headache");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.headache.locFrontal");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.headache.locOccipital");
    expect(keys.some((key) => GENERIC_FRAGMENT_KEYS.includes(key))).toBe(false);
  });

  it("dizziness_syncope shows symptom-context chips", () => {
    const groups = resolveHpiChipGroupsForTemplate("dizziness_syncope", baseHpiChipGroups);
    const contextGroup = groups.find((group) => group.titleKey === HPI_DIMENSION_TITLE_KEYS.context);
    const keys = contextGroup?.chips.map((chip) => chip.fragmentKey) ?? [];
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.dizzinessSyncope.ctxRoomSpinning");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.dizzinessSyncope.ctxNearSyncope");
    expect(keys.some((key) => GENERIC_FRAGMENT_KEYS.includes(key))).toBe(false);
  });

  it("psychiatric_behavioral shows context chips instead of pain location chips", () => {
    const groups = resolveHpiChipGroupsForTemplate("psychiatric_behavioral", baseHpiChipGroups);
    const contextGroup = groups.find((group) => group.titleKey === HPI_DIMENSION_TITLE_KEYS.context);
    const keys = contextGroup?.chips.map((chip) => chip.fragmentKey) ?? [];
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.psychiatricBehavioral.ctxSuicidalThoughts");
    expect(keys.some((key) => GENERIC_FRAGMENT_KEYS.includes(key))).toBe(false);
  });

  it("medication_refill shows medication-context chips instead of pain location chips", () => {
    const groups = resolveHpiChipGroupsForTemplate("medication_refill", baseHpiChipGroups);
    const contextGroup = groups.find((group) => group.titleKey === HPI_DIMENSION_TITLE_KEYS.context);
    const keys = contextGroup?.chips.map((chip) => chip.fragmentKey) ?? [];
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.medicationRefill.ctxMedicationNameReviewed");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.medicationRefill.ctxRefillLapse");
    expect(keys.some((key) => GENERIC_FRAGMENT_KEYS.includes(key))).toBe(false);
  });

  it("observation_reassessment shows interval-course chips", () => {
    const groups = resolveHpiChipGroupsForTemplate("observation_reassessment", baseHpiChipGroups);
    expect(groups.some((group) => group.titleKey === HPI_DIMENSION_TITLE_KEYS.intervalCourse)).toBe(true);
    const keys = fragmentKeysForTemplate("observation_reassessment");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.observationReassessment.timIntervalReassessment");
    expect(keys).toContain("providerDocumentationTemplateHpiDimensions.observationReassessment.qualImproved");
    expect(keys.some((key) => GENERIC_FRAGMENT_KEYS.includes(key))).toBe(false);
  });

  it("keeps generic fallback for templates without custom dimensions", () => {
    const groups = resolveHpiChipGroupsForTemplate("fever", baseHpiChipGroups);
    expect(groups).toBe(baseHpiChipGroups);
    expect(templateUsesCustomHpiDimensions("fever")).toBe(false);
    const locationGroup = groups.find((group) => group.titleKey === HPI_DIMENSION_TITLE_KEYS.location);
    expect(locationGroup?.chips[0]?.fragmentKey).toBe("erMseHpiChips.locChestPain");
  });

  it("returns all four dimension groups for customized templates", () => {
    for (const templateId of CUSTOM_HPI_DIMENSION_TEMPLATE_IDS) {
      const groups = getTemplateHpiDimensionGroups(templateId);
      expect(groups?.length).toBe(4);
    }
  });

  it("uses i18n keys for all custom HPI dimension chips", () => {
    for (const templateId of CUSTOM_HPI_DIMENSION_TEMPLATE_IDS) {
      for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
        for (const chip of group.chips) {
          expect(chip.labelKey).toBe(chip.fragmentKey);
          expect(
            chip.fragmentKey.startsWith("providerDocumentationTemplateHpiDimensions.") ||
              chip.fragmentKey.startsWith("providerDocumentationTemplateLocation.")
          ).toBe(true);
        }
      }
    }
  });

  it("does not auto-insert custom HPI dimension chips on template apply", () => {
    for (const templateId of CUSTOM_HPI_DIMENSION_TEMPLATE_IDS) {
      const next = applyProviderDocumentationTemplate({
        state: emptyProviderDocumentationWorkspaceState(),
        templateId,
        resolveFragment: (key) => key,
      });
      expect(JSON.stringify(next)).not.toContain("providerDocumentationTemplateHpiDimensions");
      expect(JSON.stringify(next)).not.toContain("providerDocumentationTemplateLocation");
    }
  });

  it("preserves chip toggle wiring in the workspace", () => {
    const source = readFileSync(
      new URL("../components/encounters/ProviderDocumentationWorkspace.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toContain("resolveHpiChipGroupsForTemplate");
    expect(source).toContain("toggleDocumentationFragment");
    expect(source).toContain("hpiChipGroups.map");
  });
});
