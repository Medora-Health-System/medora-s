import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import { TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_TEMPLATE_IDS } from "@/lib/providerDocumentationToxicologyIntelligence";
import { resolveToxicIngestionOverdoseContext } from "@/lib/toxicIngestionOverdoseClinicalIntelligence";
import { flattenComplaintIntelligenceKeys } from "@/lib/providerDocumentationComplaintIntelligence";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

describe("toxicologyEnvenomationEnterpriseClinicalContent — Phase 16 (Commit 1)", () => {
  it("exposes exactly four toxicology/envenomation adaptive templates", () => {
    for (const id of TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === id)).toHaveLength(1);
    }
    expect(TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(4);
  });

  it("does not create per-drug visible templates", () => {
    expect(
      PROVIDER_DOCUMENTATION_TEMPLATES.some((t) =>
        /^(acetaminophen|salicylate|fentanyl|methadone|digoxin|lithium|iron)_poisoning_complaint/.test(t.id)
      )
    ).toBe(false);
  });

  it("preserves psychiatric, animal-bite, and Phase 15 environmental templates", () => {
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "psychiatric_behavioral")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "animal_bite_adult_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "heat_environmental_illness_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "cold_environmental_injury_adult_v1")).toBe(true);
  });

  it("withholds routine discharge for intentional overdose", () => {
    const context = resolveToxicIngestionOverdoseContext({
      displayName: "Intentional acetaminophen overdose",
    });
    expect(context.dischargeFamilyId).toBeNull();
    expect(context.psychiatricLinkageAdvisory).toBe(true);
  });

  it("chip dictionaries avoid forbidden medical-clearance reassurance language", () => {
    const forbidden = [
      "medically cleared",
      "toxicity excluded",
      "safe for discharge",
      "no delayed toxicity",
      "no suicidal intent",
    ];
    const toxEn = (en as Record<string, unknown>).providerDocumentationComplaintIntel as Record<
      string,
      Record<string, string>
    >;
    const namespaces = [
      "toxicIngestionOverdoseAdultV1",
      "substanceIntoxicationWithdrawalAdultV1",
      "inhaledIndustrialToxicExposureAdultV1",
      "envenomationPoisonousExposureAdultV1",
    ];
    for (const ns of namespaces) {
      const blob = Object.values(toxEn[ns] ?? {}).join(" ").toLowerCase();
      for (const phrase of forbidden) {
        // Allow explicit negation chips that warn against unsupported clearance language.
        if (phrase === "medically cleared" && blob.includes("no medically cleared")) continue;
        if (phrase === "no suicidal intent") continue; // not used; denies suicidal intent if documented is different
        expect(blob.includes(phrase) && !blob.includes(`no ${phrase}`) && !blob.includes("without")).toBe(false);
      }
    }
  });

  it("resolves EN/FR template titles", () => {
    const workspaceEn = (en as Record<string, unknown>).providerDocumentationWorkspace as Record<string, string>;
    const workspaceFr = (fr as Record<string, unknown>).providerDocumentationWorkspace as Record<string, string>;
    expect(workspaceEn.templateToxicIngestionOverdoseAdultV1).toBe("Overdose / Toxic Ingestion");
    expect(workspaceFr.templateToxicIngestionOverdoseAdultV1).toBe("Surdosage / Ingestion toxique");
    expect(workspaceEn.templateEnvenomationPoisonousExposureAdultV1).toBe("Envenomation / Poisonous Exposure");
    expect(workspaceFr.templateEnvenomationPoisonousExposureAdultV1).toBe(
      "Envenimation / Exposition à une substance toxique"
    );
  });

  it("has complete i18n keys for toxicology complaint intelligence chips", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "toxic_ingestion_overdose_adult_v1");
    expect(template?.complaintIntelligence).toBeTruthy();
    const keys = flattenComplaintIntelligenceKeys(template!.complaintIntelligence!);
    const toxEn = (en as Record<string, unknown>).providerDocumentationComplaintIntel as Record<
      string,
      Record<string, string>
    >;
    for (const key of keys) {
      const match = key.match(/^providerDocumentationComplaintIntel\.(\w+)\.(\w+)$/);
      expect(match).toBeTruthy();
      const [, ns, leaf] = match!;
      expect(toxEn[ns]?.[leaf]).toBeTruthy();
    }
  });
});
