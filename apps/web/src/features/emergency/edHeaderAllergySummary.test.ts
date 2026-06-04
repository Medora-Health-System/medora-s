/**
 * M1.7B.8 — ED header allergy summary + vitals layout regression guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildEdHeaderAllergySummary,
  defaultEdHeaderAllergySummaryLabels,
} from "@/features/emergency/edHeaderAllergySummary";
import { emptyErTriageV1Form } from "@/features/emergency/medoraErTriageV1";
import {
  clinicalVitalsShellStyle,
  clinicalVitalsValueStyle,
} from "@/lib/clinicalViewport";

const webRoot = join(import.meta.dirname, "../../..");

function readWebSource(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

function emptyVitalsSlice() {
  return { allergyNote: "" };
}

describe("M1.7B.8 ED header allergy summary", () => {
  const labels = defaultEdHeaderAllergySummaryLabels("en");

  it("shows NKDA only when NKDA chip selected without drug allergies", () => {
    const er = {
      ...emptyErTriageV1Form(),
      allergyDetailSelections: ["NKDA"],
      additionalAllergyInfo: "Aucune allergie médicamenteuse connue",
    };
    expect(buildEdHeaderAllergySummary(emptyVitalsSlice(), er, "fr", labels)).toBe("NKDA");
  });

  it("shows drug names only for Penicillin and Latex chip", () => {
    const er = {
      ...emptyErTriageV1Form(),
      allergyDetailSelections: ["LATEX_ALLERGY"],
      medicationAllergiesDetail: "Drug allergy: Penicillin — reaction: rash.",
    };
    expect(buildEdHeaderAllergySummary(emptyVitalsSlice(), er, "en", labels)).toBe(
      "Penicillin · Latex"
    );
  });

  it("does not render long French clinical instruction text in the header", () => {
    const er = {
      ...emptyErTriageV1Form(),
      allergyDetailSelections: ["NKDA"],
      additionalAllergyInfo:
        "Préciser allergies au latex ou aux anesthésiques locaux si soins ou suture envisagés., Aucune allergie médicamenteuse connue",
      medicationAllergiesDetail: "",
    };
    const summary = buildEdHeaderAllergySummary(emptyVitalsSlice(), er, "fr", labels);
    expect(summary).toBe("NKDA");
    expect(summary).not.toContain("Préciser");
    expect(summary).not.toContain("anesthésiques");
  });

  it('shows "Allergies documented" when only unparseable long free-text exists', () => {
    const frLabels = defaultEdHeaderAllergySummaryLabels("fr");
    const er = {
      ...emptyErTriageV1Form(),
      additionalAllergyInfo:
        "Préciser allergies au latex ou aux anesthésiques locaux si soins ou suture envisagés.",
    };
    expect(buildEdHeaderAllergySummary(emptyVitalsSlice(), er, "fr", frLabels)).toBe(
      "Allergies consignées"
    );
  });

  it("returns empty string when nothing allergy-related is documented", () => {
    expect(buildEdHeaderAllergySummary(emptyVitalsSlice(), emptyErTriageV1Form(), "en", labels)).toBe(
      ""
    );
  });
});

describe("M1.7B.8 ED header vitals layout", () => {
  it("uses wide desktop vitals shell without compressed 160px flex basis", () => {
    const shell = clinicalVitalsShellStyle("desktopDense", false);
    expect(shell.minWidth).toBe(240);
    expect(String(shell.flex)).toContain("240px");
    expect(String(shell.flex)).not.toContain("160px");
  });

  it("does not use word-break on desktop vitals values", () => {
    const valueStyle = clinicalVitalsValueStyle("desktopDense");
    expect(valueStyle.wordBreak).toBeUndefined();
    expect(valueStyle.whiteSpace).toBe("nowrap");
  });

  it("clinical strip source avoids narrow-only vitals flex and break-word on allergy card", () => {
    const strip = readWebSource("src/features/emergency/EmergencyWorkspaceClinicalStrip.tsx");
    expect(strip).toContain('flex: "2 1 240px"');
    expect(strip).not.toContain("wordBreak: \"break-word\"");
    expect(strip).toContain("clinicalVitalsShellStyle");
  });

  it("active workspace clinical rail reserves min width for vitals column", () => {
    const active = readWebSource("src/features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(active).toContain('flex: "1 1 320px"');
    expect(active).toContain("minWidth: 280");
  });

  it("does not modify medication administration tab", () => {
    const mar = readWebSource("src/components/encounters/MedicationAdministrationTab.tsx");
    expect(mar).toContain("MedicationAdministrationTab");
    expect(mar).not.toContain("buildEdHeaderAllergySummary");
  });
});
