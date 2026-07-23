import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname);

describe("D4A.2.6B provider legal record + synthesis service", () => {
  it("wires reusable ClinicalSynthesisService into provider endpoint", () => {
    const ops = readFileSync(
      join(root, "../../../../api/src/encounters/inpatient-operations.service.ts"),
      "utf8"
    );
    const synth = readFileSync(
      join(root, "../../../../api/src/encounters/clinical-synthesis.service.ts"),
      "utf8"
    );
    const mod = readFileSync(
      join(root, "../../../../api/src/encounters/encounters.module.ts"),
      "utf8"
    );
    expect(ops).toContain("clinicalSynthesis.buildProviderProjection");
    expect(ops).toContain("getCommandCenterClinicalSynthesis");
    expect(synth).toContain("buildCommandCenterProjection");
    expect(synth).toContain("reusedClinicalSynthesisService: true");
    expect(mod).toContain("ClinicalSynthesisService");
  });

  it("exposes amendment/handoff/print-class APIs and conflict UX", () => {
    const controller = readFileSync(
      join(root, "../../../../api/src/encounters/inpatient-operations.controller.ts"),
      "utf8"
    );
    const api = readFileSync(join(root, "../hospital-care/inpatientOperationsApi.ts"), "utf8");
    const panel = readFileSync(join(root, "InpatientProviderWorkspacePanel.tsx"), "utf8");
    const overview = readFileSync(join(root, "ProviderClinicalSynthesisOverview.tsx"), "utf8");
    expect(controller).toContain("provider-workspace/amendments");
    expect(controller).toContain("handoff/acknowledge");
    expect(controller).toContain("command-center-clinical-synthesis");
    expect(api).toContain("appendProviderAmendment");
    expect(api).toContain("fetchCommandCenterClinicalSynthesis");
    expect(panel).toContain("provider-conflict-banner");
    expect(panel).toContain("providerLegalRecordD4a26b.reload");
    expect(overview).toContain("unsignedSynthesisReport");
    expect(overview).toContain("neverAutoAck");
  });

  it("mirrors EN/FR legal-record keys", () => {
    const en = readFileSync(
      join(root, "../../i18n/messages/providerLegalRecordD4a26b.en.ts"),
      "utf8"
    );
    const fr = readFileSync(
      join(root, "../../i18n/messages/providerLegalRecordD4a26b.fr.ts"),
      "utf8"
    );
    for (const key of [
      "clinicalSynthesis",
      "enteredInError",
      "unknownClinician",
      "unsignedSynthesisReport",
      "neverAutoAck",
      "facetUnsupported",
    ]) {
      expect(en).toContain(key);
      expect(fr).toContain(key);
    }
  });
});
