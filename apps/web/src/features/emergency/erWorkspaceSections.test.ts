import { describe, expect, it } from "vitest";
import { parseErWorkspaceSection } from "./erWorkspaceSections";

describe("parseErWorkspaceSection", () => {
  it("parses exact camelCase and lowercase section values", () => {
    expect(parseErWorkspaceSection("orders")).toBe("orders");
    expect(parseErWorkspaceSection("visitSummary")).toBe("visitSummary");
    expect(parseErWorkspaceSection("providerMse")).toBe("providerMse");
    expect(parseErWorkspaceSection("triage")).toBe("triage");
    expect(parseErWorkspaceSection("disposition")).toBe("disposition");
  });

  it("accepts lowercase aliases for camelCase sections", () => {
    expect(parseErWorkspaceSection("visitsummary")).toBe("visitSummary");
    expect(parseErWorkspaceSection("providermse")).toBe("providerMse");
  });

  it("accepts case-insensitive aliases for all-lowercase sections", () => {
    expect(parseErWorkspaceSection(" Orders ")).toBe("orders");
    expect(parseErWorkspaceSection("ORDERS")).toBe("orders");
  });

  it("returns null for invalid values", () => {
    expect(parseErWorkspaceSection(null)).toBeNull();
    expect(parseErWorkspaceSection("")).toBeNull();
    expect(parseErWorkspaceSection("unknown")).toBeNull();
    expect(parseErWorkspaceSection("visit summary")).toBeNull();
  });
});
