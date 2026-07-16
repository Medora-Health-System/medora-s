import { describe, expect, it } from "vitest";
import { ASIA_ISNCSCI_CERTIFICATION_STATUS, asiaIsncsciFoundationStatus } from "./spineAsiaIsncsciFoundation";

describe("ASIA/ISNCSCI foundation", () => {
  it("is explicitly not certified and never auto-grades AIS", () => {
    expect(ASIA_ISNCSCI_CERTIFICATION_STATUS).toBe("FOUNDATION_NOT_CERTIFIED");
    expect(asiaIsncsciFoundationStatus().aisGrade).toBeNull();
  });
});
