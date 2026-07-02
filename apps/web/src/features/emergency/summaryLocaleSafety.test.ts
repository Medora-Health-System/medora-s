import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildEncounterClinicalRecord } from "@medora/shared";
import enMessages from "@/i18n/messages/en";
import frMessages from "@/i18n/messages/fr";
import {
  buildEnterpriseClinicalChartLayout,
  stripTriageDisplayValue,
} from "./enterpriseClinicalChartLayout";
import {
  formatClinicalRecordAttributionPart,
} from "./clinicalRecordAttributionDisplay";
import { getErClinicalRecordPrintPacketHtml } from "./erClinicalRecordPrintPacket";
import { emptyErDispositionSupplementForm, localizedErDischargeModeLabel } from "./emergencyDispositionV1";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

function tEn(key: string): string {
  const parts = key.split(".");
  let cur: unknown = enMessages;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return key;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : key;
}

function tFr(key: string): string {
  const parts = key.split(".");
  let cur: unknown = frMessages;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return key;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : key;
}

describe("summaryLocaleSafety (hotfix)", () => {
  it("English summary view uses i18n attribution keys, not hardcoded French", () => {
    const view = readSrc("features/emergency/EncounterClinicalRecordSummaryView.tsx");
    expect(view).not.toMatch(/Non renseigné|Documenté par|Signé par/);
    expect(view).toContain("formatClinicalRecordAttributionPart");
    expect(view).toContain("getOrderItemChartLabel");
    expect(view).toContain("localizedErDischargeModeLabel");
  });

  it("strips French triage label prefix from display values", () => {
    expect(stripTriageDisplayValue("Mode d'arrivée: ambulance")).toBe("ambulance");
    expect(stripTriageDisplayValue("ESI: 3")).toBe("3");
  });

  it("English attribution missing state uses Not recorded", () => {
    const line = formatClinicalRecordAttributionPart(
      "documentedBy",
      { name: null, initials: null, role: null, at: "2026-06-23T10:00:00.000Z" },
      tEn,
      "en"
    );
    expect(line).toContain("Not recorded");
    expect(line).not.toContain("Non renseigné");
  });

  it("French attribution missing state uses Non renseigné", () => {
    const line = formatClinicalRecordAttributionPart(
      "documentedBy",
      { name: null, initials: null, role: null, at: "2026-06-23T10:00:00.000Z" },
      tFr,
      "fr"
    );
    expect(line).toContain("Non renseigné");
  });

  it("localizes discharge mode label for English overview", () => {
    const label = localizedErDischargeModeLabel("HOME", emptyErDispositionSupplementForm(), "en");
    expect(label.toLowerCase()).not.toContain("domicile");
    expect(label.length).toBeGreaterThan(0);
  });

  it("print packet V2 uses English attribution labels when language is en", () => {
    const record = buildEncounterClinicalRecord({
      locale: "en",
      encounter: { id: "enc-1", createdAt: "2026-06-23T08:00:00.000Z" },
      providerAssessment: {
        documentationStatus: "SIGNED",
        signedAt: "2026-06-23T10:00:00.000Z",
        signedByDisplayName: "Dr Provider",
        sections: [{ label: "Assessment", text: "Stable." }],
      },
    });
    const html = getErClinicalRecordPrintPacketHtml({
      patient: { firstName: "Jean", lastName: "Patient", dob: "1990-01-01", sex: "M" },
      encounter: { createdAt: "2026-06-23T08:00:00.000Z", dischargeSummaryJson: null },
      language: "en",
      record,
    });
    expect(html).toContain("Signed by");
    expect(html).not.toContain("Signé par");
  });

  it("enterprise layout keeps English clinical presentation when locale is en", () => {
    const layout = buildEnterpriseClinicalChartLayout(
      buildEncounterClinicalRecord({
        locale: "en",
        encounter: { id: "enc-1", createdAt: "2026-06-23T08:00:00.000Z" },
        presentationLines: ["ESI: 3", "Mode d'arrivée: ambulance"],
        disposition: { dischargeMode: "HOME", summaryLines: ["Discharged home."] },
      })
    );
    expect(layout.triageSummary.esi).toBe("3");
    expect(layout.triageSummary.arrivalMode).toBe("ambulance");
  });
});
