import { describe, expect, it } from "vitest";
import {
  PEDIATRIC_CROUP_COMPLAINT_INTEL,
  PEDIATRIC_DEHYDRATION_COMPLAINT_INTEL,
  PEDIATRIC_FEVER_COMPLAINT_INTEL,
  PEDIATRIC_RASH_COMPLAINT_INTEL,
  PEDIATRIC_RSV_LIKE_ILLNESS_COMPLAINT_INTEL,
  PEDIATRIC_SEIZURE_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import {
  assertTrackCCompliance,
  auditTrackCi18nMessageValues,
  collectTrackCViolations,
} from "./providerDocumentationComplaintIntelligenceTrackC";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "./providerDocumentationComplaintIntelligenceWorkspaceChips";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import { providerDocumentationPediatricLegacyComplaintIntelEn } from "@/i18n/messages/providerDocumentationPediatricLegacyComplaintIntel.en";
import { providerDocumentationPediatricLegacyComplaintIntelFr } from "@/i18n/messages/providerDocumentationPediatricLegacyComplaintIntel.fr";

export const PEDIATRIC_LEGACY_GOLD_STANDARD_BUNDLES = [
  PEDIATRIC_FEVER_COMPLAINT_INTEL,
  PEDIATRIC_SEIZURE_COMPLAINT_INTEL,
  PEDIATRIC_RASH_COMPLAINT_INTEL,
  PEDIATRIC_DEHYDRATION_COMPLAINT_INTEL,
  PEDIATRIC_CROUP_COMPLAINT_INTEL,
  PEDIATRIC_RSV_LIKE_ILLNESS_COMPLAINT_INTEL,
] as const;

export const PEDIATRIC_LEGACY_TEMPLATE_IDS = [
  "fever",
  "seizure",
  "pediatric_rash",
  "dehydration",
  "croup",
  "rsv_like_illness",
] as const;

const CANNOT_MISS_BY_TEMPLATE: Record<(typeof PEDIATRIC_LEGACY_TEMPLATE_IDS)[number], readonly string[]> = {
  fever: ["diffSepsis", "diffMeningitis", "diffPneumonia", "diffUti", "diffKawasakiDisease", "diffMisc", "diffDehydration"],
  seizure: [
    "diffStatusEpilepticus",
    "diffHypoglycemia",
    "diffIntracranialPathology",
    "diffMeningitis",
    "diffElectrolyteAbnormality",
    "diffToxicIngestion",
    "diffFebrileSeizure",
  ],
  pediatric_rash: [
    "diffAnaphylaxis",
    "diffStevensJohnsonSyndrome",
    "diffToxicEpidermalNecrolysis",
    "diffMeningococcemia",
    "diffKawasakiDisease",
    "diffCellulitis",
    "diffAbscess",
    "diffSepsis",
  ],
  dehydration: [
    "diffSevereDehydration",
    "diffHypoglycemia",
    "diffElectrolyteAbnormality",
    "diffShock",
    "diffSepsis",
  ],
  croup: [
    "diffEpiglottitis",
    "diffBacterialTracheitis",
    "diffForeignBodyAspiration",
    "diffRespiratoryFailure",
    "diffSevereCroup",
  ],
  rsv_like_illness: [
    "diffBronchiolitis",
    "diffPneumonia",
    "diffApneaOfInfancy",
    "diffRespiratoryFailure",
    "diffDehydration",
  ],
};

const BUNDLE_BY_TEMPLATE_ID = {
  fever: PEDIATRIC_FEVER_COMPLAINT_INTEL,
  seizure: PEDIATRIC_SEIZURE_COMPLAINT_INTEL,
  pediatric_rash: PEDIATRIC_RASH_COMPLAINT_INTEL,
  dehydration: PEDIATRIC_DEHYDRATION_COMPLAINT_INTEL,
  croup: PEDIATRIC_CROUP_COMPLAINT_INTEL,
  rsv_like_illness: PEDIATRIC_RSV_LIKE_ILLNESS_COMPLAINT_INTEL,
} as const;

function fragmentKeySuffix(fragmentKey: string): string {
  return fragmentKey.split(".").pop() ?? "";
}

function messagesForBundle(
  bundle: (typeof PEDIATRIC_LEGACY_GOLD_STANDARD_BUNDLES)[number],
  locale: "en" | "fr"
) {
  const prefix = flattenComplaintIntelligenceKeys(bundle)[0]?.split(".").slice(0, -1).join(".") ?? "";
  const namespace = prefix.split(".").pop() ?? "";
  const namespaceObject =
    (locale === "en"
      ? providerDocumentationPediatricLegacyComplaintIntelEn
      : providerDocumentationPediatricLegacyComplaintIntelFr)[
      namespace as keyof typeof providerDocumentationPediatricLegacyComplaintIntelEn
    ] ?? {};
  const out: Record<string, string> = {};
  for (const fragmentKey of flattenComplaintIntelligenceKeys(bundle)) {
    const key = fragmentKeySuffix(fragmentKey);
    if (namespaceObject[key as keyof typeof namespaceObject]) {
      out[key] = namespaceObject[key as keyof typeof namespaceObject] as string;
    }
  }
  return out;
}

describe("providerDocumentationPediatricLegacyTrackC — MEDUI.ED.ME.2V-R", () => {
  it("accounts for all discovered pediatric legacy template IDs", () => {
    for (const templateId of PEDIATRIC_LEGACY_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it.each(PEDIATRIC_LEGACY_GOLD_STANDARD_BUNDLES)("passes Track C compliance", (bundle) => {
    expect(collectTrackCViolations(bundle)).toEqual([]);
    expect(() => assertTrackCCompliance(bundle)).not.toThrow();
  });

  it.each(PEDIATRIC_LEGACY_TEMPLATE_IDS)("covers cannot-miss diagnoses for %s", (templateId) => {
    const bundle = BUNDLE_BY_TEMPLATE_ID[templateId];
    const suffixes = (bundle.mdmDifferentialSynthesis ?? []).map(fragmentKeySuffix);
    expect(suffixes).toEqual(expect.arrayContaining([...CANNOT_MISS_BY_TEMPLATE[templateId]]));
  });

  it.each(PEDIATRIC_LEGACY_GOLD_STANDARD_BUNDLES)("has no duplicate fragment keys", (bundle) => {
    const keys = flattenComplaintIntelligenceKeys(bundle);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(PEDIATRIC_LEGACY_GOLD_STANDARD_BUNDLES)("excludes prohibited wording from HPI and exam keys", (bundle) => {
    const prohibited = ["reviewed", "ifdocumented", "considered", "ifindicated", "ifgiven", "ifperformed"];
    for (const fragmentKey of bundle.hpi ?? []) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} HPI key`).not.toContain(token);
      }
    }
    for (const fragmentKey of Object.values(bundle.physicalExam ?? {}).flat()) {
      const suffix = fragmentKeySuffix(fragmentKey).toLowerCase();
      for (const token of prohibited) {
        expect(suffix, `${fragmentKey} exam key`).not.toContain(token);
      }
    }
  });

  it.each(PEDIATRIC_LEGACY_GOLD_STANDARD_BUNDLES)("has chart-ready EN i18n for every key", (bundle) => {
    const messages = messagesForBundle(bundle, "en");
    const keys = flattenComplaintIntelligenceKeys(bundle).map(fragmentKeySuffix);
    for (const key of keys) {
      expect(messages[key], `missing EN i18n for ${key}`).toBeTruthy();
    }
    const chartReadyMessages = Object.fromEntries(
      Object.entries(messages).filter(([key]) => !key.toLowerCase().includes("reviewed"))
    );
    const dataReviewedMessages = Object.fromEntries(
      Object.entries(messages).filter(([key]) => key.toLowerCase().includes("reviewed"))
    );
    expect(auditTrackCi18nMessageValues(chartReadyMessages)).toEqual([]);
    expect(auditTrackCi18nMessageValues(dataReviewedMessages, { allowReviewLanguage: true })).toEqual([]);
  });

  it("maintains EN/FR i18n key parity for all pediatric legacy namespaces", () => {
    for (const namespace of Object.keys(providerDocumentationPediatricLegacyComplaintIntelEn)) {
      const enKeys = Object.keys(
        providerDocumentationPediatricLegacyComplaintIntelEn[
          namespace as keyof typeof providerDocumentationPediatricLegacyComplaintIntelEn
        ]
      ).sort();
      const frKeys = Object.keys(
        providerDocumentationPediatricLegacyComplaintIntelFr[
          namespace as keyof typeof providerDocumentationPediatricLegacyComplaintIntelFr
        ]
      ).sort();
      expect(frKeys, namespace).toEqual(enKeys);
    }
  });

  it.each(PEDIATRIC_LEGACY_TEMPLATE_IDS)("exposes MDM.1 workspace bindings for %s", (templateId) => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;
    expect(complaintIntelligenceMdmChipBindingsForTemplate(template).map((binding) => binding.intelField)).toEqual([
      "mdmWorkingAssessment",
      "mdmDifferentialSynthesis",
      "mdmDataReviewed",
      "mdmRiskStratification",
      "mdmClinicalRationale",
      "clinicalImpression",
      "mdmPlanSummary",
    ]);
  });
});
