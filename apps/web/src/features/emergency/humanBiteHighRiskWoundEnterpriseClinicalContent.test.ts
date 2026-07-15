import { describe, expect, it } from "vitest";
import { COMMON_DIAGNOSES } from "@/constants/clinicalTemplates";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationTemplateCatalog";
import {
  filterProviderDocumentationTemplates,
  providerDocumentationTemplateSearchableText,
} from "@/lib/providerDocumentationTemplateSearch";
import { HUMAN_BITE_HIGH_RISK_WOUND_ADULT_COMPLAINT_V1_INTEL } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";
import { resolveProviderDischargeTemplateForDiagnosis } from "./providerDischargeTemplateRegistry";

function resolveWorkspaceLabel(key: string, messages: typeof enMessages): string {
  return key.split(".").reduce<unknown>((value, part) => (
    value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined
  ), messages) as string;
}

describe("MEDUI.CLINICAL.INJURY_INTELLIGENCE_PHASE_8_HUMAN_BITE", () => {
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find(
    (item) => item.id === "human_bite_high_risk_wound_adult_complaint_v1",
  );

  it("registers the human-bite high-risk wound template", () => {
    expect(template?.pickerSubgroupKey).toBe("msk_trauma");
    expect(enMessages.providerDocumentationWorkspace.templateHumanBiteHighRiskWoundAdultComplaintV1).toBe(
      "Human Bite / High-Risk Contaminated Wound",
    );
    expect(frMessages.providerDocumentationWorkspace.templateHumanBiteHighRiskWoundAdultComplaintV1).toMatch(
      /morsure humaine/i,
    );
  });

  it.each(["human bite", "fight bite", "clenched fist", "contaminated wound", "dirty wound"])(
    "finds the template for %s",
    (query) => {
      const matches = filterProviderDocumentationTemplates(query, (key) => resolveWorkspaceLabel(key, enMessages));
      expect(matches.some((item) => item.id === "human_bite_high_risk_wound_adult_complaint_v1")).toBe(true);
      expect(
        providerDocumentationTemplateSearchableText(template!, (key) => resolveWorkspaceLabel(key, enMessages)).toLowerCase(),
      ).toContain(query.split(/\s+/)[0]!);
    },
  );

  it("includes fight-bite and tetanus prompts without rabies plan language", () => {
    expect(HUMAN_BITE_HIGH_RISK_WOUND_ADULT_COMPLAINT_V1_INTEL.hpi?.some((key) => key.includes("hpiFightBite"))).toBe(true);
    expect(HUMAN_BITE_HIGH_RISK_WOUND_ADULT_COMPLAINT_V1_INTEL.mdmPlanSummary?.some((key) => key.includes("planTetanusUpdate"))).toBe(true);
    expect(JSON.stringify(HUMAN_BITE_HIGH_RISK_WOUND_ADULT_COMPLAINT_V1_INTEL).toLowerCase()).not.toMatch(/rabies/);
  });

  it("documents Kanavel signs and dorsal MCP fight-bite findings without auto-diagnosis", () => {
    const blob = JSON.stringify(HUMAN_BITE_HIGH_RISK_WOUND_ADULT_COMPLAINT_V1_INTEL);
    expect(blob).toMatch(/examKanavelSignsDocumented|hpiDorsalMcpWound|examPainWithPassiveExtension/);
    expect(blob).not.toMatch(/automatically diagnosed flexor tenosynovitis/i);
  });

  it("routes human bite and fight bite away from animal bite", () => {
    expect(
      resolveProviderDischargeTemplateForDiagnosis({
        code: "W50.3XXA",
        displayName: "Accidental bite by another person",
      }).template.id,
    ).toBe("human_bite_v1");
    expect(
      resolveProviderDischargeTemplateForDiagnosis({
        code: "Y04.1XXA",
        displayName: "Assault by human bite",
      }).template.id,
    ).toBe("human_bite_v1");
    expect(
      resolveProviderDischargeTemplateForDiagnosis({
        code: "",
        displayName: "Fight bite clenched fist",
      }).template.id,
    ).toBe("fight_bite_v1");
  });

  it("keeps dog/cat and open-bite anatomic codes on animal bite", () => {
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "W54.0XXA", displayName: "Dog bite" }).template.id).toBe(
      "animal_bite_v1",
    );
    expect(resolveProviderDischargeTemplateForDiagnosis({ code: "W55.01XA", displayName: "Cat bite" }).template.id).toBe(
      "animal_bite_v1",
    );
    expect(
      resolveProviderDischargeTemplateForDiagnosis({
        code: "S61.459A",
        displayName: "Open bite of unspecified finger",
      }).template.id,
    ).toBe("animal_bite_v1");
  });

  it("forbids rabies language in human bite discharge content", () => {
    const resolved = resolveProviderDischargeTemplateForDiagnosis({
      code: "W50.3XXA",
      displayName: "Human bite",
    });
    const blob = JSON.stringify(resolved.template.suggestedText).toLowerCase();
    expect(blob).not.toMatch(/rabies|animal control/);
    expect(blob).toMatch(/infection|wound|tetanus|hand/);
  });

  it("retains the human-bite quick pick without duplicate codes", () => {
    expect(COMMON_DIAGNOSES.filter((diagnosis) => diagnosis.code === "W50.3XXA")).toHaveLength(1);
  });
});
