import { describe, expect, it } from "vitest";
import {
  isObservationDepartmentalOrdersEnabledInBrowser,
  isObservationDocumentationEnabledInBrowser,
  isObservationMarEnabledInBrowser,
  isObservationWorkspaceEnabledInBrowser,
} from "./observationWorkspacePaths";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

describe("D3DA Observation departmental UI contracts", () => {
  it("keeps all Observation departmental browser flags OFF by default", () => {
    expect(isObservationWorkspaceEnabledInBrowser()).toBe(false);
    expect(isObservationDepartmentalOrdersEnabledInBrowser()).toBe(false);
    expect(isObservationMarEnabledInBrowser()).toBe(false);
    expect(isObservationDocumentationEnabledInBrowser()).toBe(false);
  });

  it("exposes EN/FR worklist encounter context labels", () => {
    expect(en.worklistDepartments.shared.encounterContext.ed).toBe("ED");
    expect(en.worklistDepartments.shared.encounterContext.observation).toBe("Observation");
    expect(fr.worklistDepartments.shared.encounterContext.ed).toBe("Urgences");
    expect(fr.worklistDepartments.shared.encounterContext.observation).toBe("Observation");
  });

  it("documents shared order engine copy", () => {
    expect(en.observationD3da.sharedOrderEngineHint.length).toBeGreaterThan(20);
    expect(fr.observationD3da.sharedOrderEngineHint.length).toBeGreaterThan(20);
  });
});
