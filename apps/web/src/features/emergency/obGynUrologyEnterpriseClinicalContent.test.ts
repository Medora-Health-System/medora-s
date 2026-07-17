import { describe, expect, it } from "vitest";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import { OBGYN_UROLOGY_COMPLAINT_V1_TEMPLATE_IDS } from "@/lib/providerDocumentationObGynUrologyIntelligence";
import { GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS } from "@/lib/providerDocumentationGuRenalComplaintIntelligence19Mdm5";
import { TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_TEMPLATE_IDS } from "@/lib/providerDocumentationToxicologyIntelligence";
import { resolveEarlyPregnancyBleedingPainContext } from "@/lib/earlyPregnancyBleedingPainClinicalIntelligence";
import { resolveHypertensivePostpartumObstetricEmergencyContext } from "@/lib/hypertensivePostpartumObstetricEmergencyClinicalIntelligence";
import { resolveAcuteScrotalPenileEmergencyContext } from "@/lib/acuteScrotalPenileEmergencyClinicalIntelligence";
import { flattenComplaintIntelligenceKeys } from "@/lib/providerDocumentationComplaintIntelligence";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

describe("obGynUrologyEnterpriseClinicalContent — Phase 17 (Commit 1)", () => {
  it("exposes exactly six OB/GYN / urology adaptive templates", () => {
    for (const id of OBGYN_UROLOGY_COMPLAINT_V1_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.filter((t) => t.id === id)).toHaveLength(1);
    }
    expect(OBGYN_UROLOGY_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(6);
  });

  it("does not create per-diagnosis visible template explosion", () => {
    expect(
      PROVIDER_DOCUMENTATION_TEMPLATES.some((t) =>
        /^(ectopic|preeclampsia|ovarian_torsion|testicular_torsion|nephrolithiasis)_complaint/.test(t.id)
      )
    ).toBe(false);
  });

  it("preserves Batch14 GU templates, Batch7 discharge, Phase13 NSTI, Phase16 tox, and female_pelvic_gyn_complaint", () => {
    expect(GU_RENAL_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(9);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "urinary_symptoms")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "soft_tissue_infection_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "high_risk_wound_infection_adult_v1")).toBe(true);
    expect(TOXICOLOGY_ENVENOMATION_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(4);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "toxic_ingestion_overdose_adult_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "female_pelvic_gyn_complaint")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((t) => t.id === "observation_reassessment")).toBe(true);
  });

  it("withholds routine discharge for ruptured ectopic", () => {
    const context = resolveEarlyPregnancyBleedingPainContext({
      displayName: "Ruptured ectopic pregnancy with hemoperitoneum",
    });
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for severe preeclampsia", () => {
    const context = resolveHypertensivePostpartumObstetricEmergencyContext({
      displayName: "Severe preeclampsia with headache and hypertension in pregnancy",
    });
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("withholds routine discharge for testicular torsion", () => {
    const context = resolveAcuteScrotalPenileEmergencyContext({
      displayName: "Testicular torsion with sudden scrotal pain",
    });
    expect(context.dischargeFamilyId).toBeNull();
  });

  it("chip dictionaries avoid forbidden reassurance language", () => {
    const forbidden = [
      "ectopic excluded",
      "torsion excluded",
      "fetal well-being confirmed",
      "medically cleared",
      "viability confirmed",
    ];
    const obgynEn = (en as Record<string, unknown>).providerDocumentationComplaintIntel as Record<
      string,
      Record<string, string>
    >;
    const namespaces = [
      "earlyPregnancyBleedingPainV1",
      "latePregnancyLaborEmergencyV1",
      "hypertensivePostpartumObstetricEmergencyV1",
      "acuteGynecologicPelvicComplaintV1",
      "renalUrinaryEmergencyV1",
      "acuteScrotalPenileEmergencyV1",
    ];
    for (const ns of namespaces) {
      const blob = Object.values(obgynEn[ns] ?? {}).join(" ").toLowerCase();
      for (const phrase of forbidden) {
        if (phrase === "medically cleared" && blob.includes("no medically cleared")) continue;
        if (phrase === "ectopic excluded" && blob.includes("no ectopic excluded")) continue;
        if (phrase === "torsion excluded" && blob.includes("no torsion excluded")) continue;
        if (phrase === "fetal well-being confirmed" && blob.includes("no fetal well-being confirmed")) continue;
        if (phrase === "viability confirmed" && blob.includes("no fetal viability confirmed")) continue;
        expect(blob.includes(phrase)).toBe(false);
      }
    }
  });

  it("resolves EN/FR template titles", () => {
    const workspaceEn = (en as Record<string, unknown>).providerDocumentationWorkspace as Record<string, string>;
    const workspaceFr = (fr as Record<string, unknown>).providerDocumentationWorkspace as Record<string, string>;
    expect(workspaceEn.templateEarlyPregnancyBleedingPainV1).toBe("Early Pregnancy Bleeding / Pelvic Pain");
    expect(workspaceFr.templateEarlyPregnancyBleedingPainV1).toBe(
      "Saignement du début de grossesse / Douleur pelvienne"
    );
    expect(workspaceEn.templateLatePregnancyLaborEmergencyV1).toBe("Late Pregnancy / Labor Emergency");
    expect(workspaceFr.templateLatePregnancyLaborEmergencyV1).toBe(
      "Urgence de grossesse avancée / Travail obstétrical"
    );
    expect(workspaceEn.templateHypertensivePostpartumObstetricEmergencyV1).toBe(
      "Hypertensive / Postpartum Obstetric Emergency"
    );
    expect(workspaceFr.templateHypertensivePostpartumObstetricEmergencyV1).toBe(
      "Urgence obstétricale hypertensive / Post-partum"
    );
    expect(workspaceEn.templateAcuteGynecologicPelvicComplaintV1).toBe("Acute Gynecologic / Pelvic Complaint");
    expect(workspaceFr.templateAcuteGynecologicPelvicComplaintV1).toBe("Urgence gynécologique / Douleur pelvienne");
    expect(workspaceEn.templateRenalUrinaryEmergencyV1).toBe("Renal / Urinary Emergency");
    expect(workspaceFr.templateRenalUrinaryEmergencyV1).toBe("Urgence rénale / Urinaire");
    expect(workspaceEn.templateAcuteScrotalPenileEmergencyV1).toBe("Acute Scrotal / Penile Emergency");
    expect(workspaceFr.templateAcuteScrotalPenileEmergencyV1).toBe("Urgence scrotale / Pénienne aiguë");
  });

  it("has complete i18n keys for OB/GYN / urology complaint intelligence chips", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((t) => t.id === "early_pregnancy_bleeding_pain_v1");
    expect(template?.complaintIntelligence).toBeTruthy();
    const keys = flattenComplaintIntelligenceKeys(template!.complaintIntelligence!);
    const obgynEn = (en as Record<string, unknown>).providerDocumentationComplaintIntel as Record<
      string,
      Record<string, string>
    >;
    for (const key of keys) {
      const match = key.match(/^providerDocumentationComplaintIntel\.(\w+)\.(\w+)$/);
      expect(match).toBeTruthy();
      const [, ns, leaf] = match!;
      expect(obgynEn[ns]?.[leaf]).toBeTruthy();
    }
  });
});
