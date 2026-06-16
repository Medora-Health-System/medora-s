import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SEIZURE_COMPLAINT_V1_INTEL,
  TREMOR_MOVEMENT_COMPLAINT_V1_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import {
  auditHumanDocumentationValues,
  collectBorderlineMetaWarnings,
  HUMAN_DOC_BORDERLINE_PATTERNS,
  messagesForBundle,
} from "./providerDocumentationHumanDocumentationAudit";
import { providerDocumentationNeuroExpansionComplaintIntel19Mdm9En } from "@/i18n/messages/providerDocumentationNeuroExpansionComplaintIntel19Mdm9.en";
import { providerDocumentationNeuroExpansionComplaintIntel19Mdm9Fr } from "@/i18n/messages/providerDocumentationNeuroExpansionComplaintIntel19Mdm9.fr";
import { providerDocumentationPsychBehavioralComplaintIntelEn } from "@/i18n/messages/providerDocumentationPsychBehavioralComplaintIntel.en";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";

const PLACEHOLDER_RE =
  /Document if present|Document if verified|if documented|Consider documenting|considered in differential|Reassess and document|Disposition should reflect|documented per (clinical assessment|protocol)/i;

const NINETEEN_MDM_DIR = join(process.cwd(), "src/i18n/messages");

function nineteenMdmFiles(locale: "en" | "fr") {
  return readdirSync(NINETEEN_MDM_DIR).filter(
    (file) => file.includes("19Mdm") && file.endsWith(`.${locale}.ts`)
  );
}

function scanFileForPlaceholders(fileName: string): string[] {
  const content = readFileSync(join(NINETEEN_MDM_DIR, fileName), "utf8");
  const hits: string[] = [];
  for (const line of content.split("\n")) {
    if (PLACEHOLDER_RE.test(line)) hits.push(line.trim());
  }
  return hits;
}

function namespaceMessages(
  source: Record<string, Record<string, string>>,
  namespace: string
): Record<string, string> {
  return source[namespace] ?? {};
}

describe("providerDocumentationLegacyAdultUtilitiesTrackC — MEDUI.ED.ME.2AB-R", () => {
  it("eliminates placeholder strings from all 19Mdm EN/FR complaint-intel files", () => {
    const FR_PLACEHOLDER_RE =
      /À documenter si pertinent|À documenter :|Documenter si vérifié|Documenter à l'examen si présent|Documenter l'aspect général|Évaluer :|Revoir si pertinent|à considérer dans le différentiel|Réévaluer et documenter|La sortie doit refléter/i;
    for (const locale of ["en", "fr"] as const) {
      for (const file of nineteenMdmFiles(locale)) {
        const hits = scanFileForPlaceholders(file);
        const frHits =
          locale === "fr"
            ? readFileSync(join(NINETEEN_MDM_DIR, file), "utf8")
                .split("\n")
                .filter((line) => FR_PLACEHOLDER_RE.test(line))
            : [];
        expect([...hits, ...frHits], file).toEqual([]);
      }
    }
  });

  it("remediates A3 audited psych exam language", () => {
    expect(providerDocumentationPsychBehavioralComplaintIntelEn.psychiatricBehavioral.examHallucinationsNoted).toBe(
      "hallucinations present"
    );
    expect(
      collectBorderlineMetaWarnings({
        phase: "MEDUI.ED.ME.2AB-R",
        templateId: "psychiatric_behavioral",
        bundle: { physicalExam: { neuroPsych: ["providerDocumentationComplaintIntel.psychiatricBehavioral.examHallucinationsNoted"] } },
        messages: {
          examHallucinationsNoted:
            providerDocumentationPsychBehavioralComplaintIntelEn.psychiatricBehavioral.examHallucinationsNoted,
        },
      })
    ).toEqual([]);
  });

  it("remediates A3 workspace shared chips", () => {
    expect(enMessages.erMseExamChips.neuroFocalDeficitNoted).toBe("focal neurologic deficit present");
    expect(enMessages.erMseExamChips.mskDeformityNoted).toBe("deformity present");
    expect(enMessages.erMseMdmChips.planSdM).toBe("shared decision-making discussed");
    expect(enMessages.erMseMdmChips.dispReturnPrecautions).toBe("return precautions provided");
    expect(enMessages.providerDocumentationComplaintIntel.hypertension.mdmNeurologicExamDocumented).toBe(
      "neurologic examination without focal deficit"
    );
    expect(enMessages.providerDocumentationComplaintIntel.hyperglycemia.hpiElevatedGlucoseNoted).toBe(
      "elevated glucose on arrival"
    );
    expect(frMessages.erMseExamChips.neuroFocalDeficitNoted).toBe("déficit neurologique focal présent");
    expect(frMessages.erMseMdmChips.planSdM).toBe("décision partagée discutée");
  });

  it("passes human documentation value audit for live legacy neuro utility bundles", () => {
    for (const [templateId, bundle, namespace] of [
      ["seizure_complaint_v1", SEIZURE_COMPLAINT_V1_INTEL, "seizureComplaintV1"],
      ["tremor_movement_complaint_v1", TREMOR_MOVEMENT_COMPLAINT_V1_INTEL, "tremorMovementComplaintV1"],
    ] as const) {
      const messages = messagesForBundle(bundle, providerDocumentationNeuroExpansionComplaintIntel19Mdm9En);
      const violations = auditHumanDocumentationValues({
        phase: "MEDUI.ED.ME.2AB-R",
        templateId,
        bundle,
        messages,
      });
      expect(violations, templateId).toEqual([]);

      const enKeys = Object.keys(namespaceMessages(providerDocumentationNeuroExpansionComplaintIntel19Mdm9En, namespace));
      const frKeys = Object.keys(namespaceMessages(providerDocumentationNeuroExpansionComplaintIntel19Mdm9Fr, namespace));
      expect(frKeys.sort()).toEqual(enKeys.sort());
    }
  });

  it("exposes borderline psychiatric patterns for warning-only governance", () => {
    expect(HUMAN_DOC_BORDERLINE_PATTERNS.length).toBe(5);
    const warnings = collectBorderlineMetaWarnings({
      phase: "MEDUI.ED.ME.2AB-R",
      templateId: "unit-test",
      bundle: { physicalExam: { neuroPsych: ["providerDocumentationComplaintIntel.test.examHallucinationsNoted"] } },
      messages: { examHallucinationsNoted: "hallucinations noted" },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.pattern).toContain("hallucinations noted");
  });

  it("reports legacy neuro utility key coverage", () => {
    expect(flattenComplaintIntelligenceKeys(SEIZURE_COMPLAINT_V1_INTEL).length).toBeGreaterThan(20);
    expect(flattenComplaintIntelligenceKeys(TREMOR_MOVEMENT_COMPLAINT_V1_INTEL).length).toBeGreaterThan(20);
  });
});
