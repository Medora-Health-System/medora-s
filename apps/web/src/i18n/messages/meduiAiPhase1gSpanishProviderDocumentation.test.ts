import { describe, expect, it } from "vitest";
import { resolveClinicalUiMessage } from "./registry";

const EXPECTED: Record<string, string> = {
  "providerDocumentationComplaintIntel.chestPain.waAtypicalChestPain": "dolor torácico atípico",
  "providerDocumentationComplaintIntel.chestPain.waSuspectedMusculoskeletalChestPain": "sospecha de dolor torácico musculoesquelético",
  "providerDocumentationComplaintIntel.chestPain.waSuspectedGerd": "sospecha de ERGE",
  "providerDocumentationComplaintIntel.chestPain.waConcernForAcs": "preocupación por síndrome coronario agudo",
  "providerDocumentationComplaintIntel.chestPain.waLowSuspicionAcs": "baja sospecha de síndrome coronario agudo",
  "providerDocumentationComplaintIntel.chestPain.waLowSuspicionPulmonaryEmbolism": "baja sospecha de embolia pulmonar",
  "providerDocumentationComplaintIntel.chestPain.diffAcuteCoronarySyndrome": "síndrome coronario agudo",
  "providerDocumentationComplaintIntel.chestPain.diffPulmonaryEmbolism": "embolia pulmonar",
  "providerDocumentationComplaintIntel.chestPain.mdmEkgReviewed": "ECG revisado",
  "providerDocumentationComplaintIntel.chestPain.mdmTroponinReviewed": "troponina revisada",
  "providerDocumentationComplaintIntel.chestPain.riskObservationRequiredModerate": "requiere observación",
  "providerDocumentationComplaintIntel.chestPain.reasoningNoEvidenceAcuteIschemia": "sin evidencia de isquemia aguda",
  "providerDocumentationComplaintIntel.chestPain.reassessChestPainImproved": "mejoría del dolor torácico",
  "providerDocumentationComplaintIntel.chestPain.dispReturnWorseningChestPain": "regresar si empeora el dolor torácico",
  "providerDocumentationSmartSentences.reassessedAfterAnalgesia": "Paciente reevaluado después de la analgesia, con mejoría en la exploración",
  "providerDocumentationSmartSentences.sharedDecisionMakingImaging": "Se realizó toma de decisiones compartida sobre la obtención de imágenes por TC",
  "providerDocumentationSmartSentences.returnPrecautionsWorseningPain": "Se explicaron precauciones para regresar, incluyendo empeoramiento del dolor o aparición de síntomas nuevos",
};

describe("Phase 1G Spanish provider documentation", () => {
  it("renders governed Spanish for the chest-pain documentation intelligence shown in the workspace", () => {
    for (const [key, value] of Object.entries(EXPECTED)) {
      const resolved = resolveClinicalUiMessage("es", key);
      expect(resolved, key).toBe(value);
      expect(resolved, key).not.toContain("UNLOCALIZED_ES::");
    }
  });

  it("does not regress these clinical strings back to the English source", () => {
    expect(resolveClinicalUiMessage("es", "providerDocumentationComplaintIntel.chestPain.diffAnxiety")).toBe("ansiedad");
    expect(resolveClinicalUiMessage("es", "providerDocumentationComplaintIntel.chestPain.diffAorticDissection")).toBe("disección aórtica");
    expect(resolveClinicalUiMessage("es", "providerDocumentationComplaintIntel.chestPain.planAdmissionRecommended")).toBe("se recomienda ingreso hospitalario");
  });
});
