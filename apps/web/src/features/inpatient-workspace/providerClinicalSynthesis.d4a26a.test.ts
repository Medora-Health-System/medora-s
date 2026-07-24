import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname);

describe("D4A.2.6A provider clinical synthesis workspace", () => {
  it("wires live synthesis overview and progress note workflow", () => {
    const panel = readFileSync(join(root, "InpatientProviderWorkspacePanel.tsx"), "utf8");
    const overview = readFileSync(join(root, "ProviderClinicalSynthesisOverview.tsx"), "utf8");
    const census = readFileSync(join(root, "ProviderCensusBoard.tsx"), "utf8");
    const workspace = readFileSync(join(root, "InpatientWorkspacePanel.tsx"), "utf8");
    const hub = readFileSync(join(root, "InpatientGraphicalHubView.tsx"), "utf8");

    // D4A.3.4 — overview mounts projected InpatientOverviewView; legacy synthesis component retained.
    expect(panel).toContain("InpatientOverviewView");
    expect(panel).toContain("projectInpatientOverview");
    expect(panel).toContain("fetchProviderClinicalSynthesis");
    expect(panel).toContain('mode === "progressNotes"');
    expect(panel).toContain("saveProviderProgressNote");
    expect(panel).toContain("carryForwardProviderProgressNote");
    expect(panel).toContain("beforeunload");
    expect(panel).toContain("providerClinicalSynthesisD4a26a.concurrency.stale");
    expect(overview).toContain("provider-vitals-live");
    expect(overview).toContain("provider-io-live");
    expect(overview).toContain("provider-labs-live");
    expect(overview).toContain("provider-radiology-live");
    expect(overview).toContain("provider-meds-live");
    expect(overview).toContain("provider-current-vs-admission");
    expect(overview).toContain("neverAutoAck");
    expect(overview).toContain("fetchProviderPrintPackage");
    expect(panel).toContain("fetchProviderPrintPackage");
    expect(census).toContain("filterProviderCensusRows");
    expect(census).toContain("sortProviderCensusRows");
    expect(hub).toContain("ProviderCensusBoard");
    expect(workspace).toContain('mode="progressNotes"');
  });

  it("exposes synthesis API client methods", () => {
    const api = readFileSync(
      join(root, "../hospital-care/inpatientOperationsApi.ts"),
      "utf8"
    );
    expect(api).toContain("fetchProviderClinicalSynthesis");
    expect(api).toContain("provider-clinical-synthesis");
    expect(api).toContain("fetchProviderPrintPackage");
    expect(api).toContain("carryForwardProviderProgressNote");
  });

  it("mirrors EN/FR synthesis message keys", () => {
    const en = readFileSync(
      join(root, "../../i18n/messages/providerClinicalSynthesisD4a26a.en.ts"),
      "utf8"
    );
    const fr = readFileSync(
      join(root, "../../i18n/messages/providerClinicalSynthesisD4a26a.fr.ts"),
      "utf8"
    );
    for (const key of [
      "overview.title",
      "vitals.title",
      "io.title",
      "labs.neverAutoAck",
      "radiology.neverAutoAck",
      "progress.neverSilentCopy",
      "census.title",
      "discharge.neverAuto",
      "currentVsAdmission.separated",
      "safety.noAuto",
    ]) {
      expect(en).toContain(key.split(".").pop()!);
      expect(fr).toContain(key.split(".").pop()!);
    }
    expect(en).toContain("MEDUI.PROVIDER_CLINICAL_SYNTHESIS.D4A2_6A");
    expect(fr).toContain("MEDUI.PROVIDER_CLINICAL_SYNTHESIS.D4A2_6A");
  });
});
