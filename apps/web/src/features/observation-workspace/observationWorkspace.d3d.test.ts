import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  OBSERVATION_CENSUS_PATH,
  observationActiveWorkspacePath,
  isObservationWorkspaceEnabledInBrowser,
} from "./observationWorkspacePaths";
import {
  OBSERVATION_WORKSPACE_SECTIONS,
  parseObservationWorkspaceSection,
} from "./observationWorkspaceSections";

describe("D3D Observation workspace UI contracts", () => {
  it("keeps browser feature flag OFF by default", () => {
    expect(isObservationWorkspaceEnabledInBrowser()).toBe(false);
  });

  it("census and active workspace routes are distinct", () => {
    expect(OBSERVATION_CENSUS_PATH).toBe("/app/hospitalisation/observation");
    expect(observationActiveWorkspacePath("enc-1")).toBe(
      "/app/hospitalisation/observation/active/enc-1"
    );
  });

  it("exposes required dashboard tabs", () => {
    const ids = OBSERVATION_WORKSPACE_SECTIONS.map((s) => s.id);
    for (const required of [
      "overview",
      "providerNotes",
      "nursing",
      "orders",
      "results",
      "medications",
      "reassessment",
      "carePlan",
      "summary",
      "disposition",
      "timeline",
    ]) {
      expect(ids).toContain(required);
    }
  });

  it("parses section query aliases", () => {
    expect(parseObservationWorkspaceSection("providerNotes")).toBe("providerNotes");
    expect(parseObservationWorkspaceSection("mar")).toBe("medications");
    expect(parseObservationWorkspaceSection("nope")).toBeNull();
  });

  it("keeps EN/FR observationD3d module titles", () => {
    expect(en.observationD3d.census.title).toBe("Observation");
    expect(fr.observationD3d.census.title).toBe("Observation");
    expect(en.observationD3d.workspace.title).toBe("Observation workspace");
    expect(fr.observationD3d.workspace.title).toBe("Espace Observation");
  });
});
