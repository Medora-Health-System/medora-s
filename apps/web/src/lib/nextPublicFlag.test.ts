import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isTruthyNextPublicFlag } from "./nextPublicFlag";
import {
  isInpatientWorkspaceEnabledInBrowser,
  inpatientActiveWorkspacePath,
} from "@/features/inpatient-workspace/inpatientWorkspacePaths";

const WORKSPACE_FLAG = "NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED";

describe("isTruthyNextPublicFlag", () => {
  it("treats true / 1 / yes / on as enabled", () => {
    for (const value of ["true", "TRUE", "1", "yes", "YES", "on", "On", " true "]) {
      expect(isTruthyNextPublicFlag(value)).toBe(true);
    }
  });

  it("treats false / unset / other values as disabled", () => {
    for (const value of [undefined, null, "", "false", "0", "off", "no", "enabled"]) {
      expect(isTruthyNextPublicFlag(value)).toBe(false);
    }
  });
});

describe("inpatient workspace public flag (static NEXT_PUBLIC_*)", () => {
  const prior = process.env[WORKSPACE_FLAG];

  afterEach(() => {
    if (prior === undefined) delete process.env[WORKSPACE_FLAG];
    else process.env[WORKSPACE_FLAG] = prior;
  });

  it("is disabled when the public flag is unset", () => {
    delete process.env[WORKSPACE_FLAG];
    expect(isInpatientWorkspaceEnabledInBrowser()).toBe(false);
  });

  it("is disabled when the public flag is false", () => {
    process.env[WORKSPACE_FLAG] = "false";
    expect(isInpatientWorkspaceEnabledInBrowser()).toBe(false);
  });

  it("enables the inpatient workspace route helpers when the public flag is true", () => {
    process.env[WORKSPACE_FLAG] = "true";
    expect(isInpatientWorkspaceEnabledInBrowser()).toBe(true);
    expect(inpatientActiveWorkspacePath("enc-42")).toBe(
      "/app/hospitalisation/inpatient/active/enc-42"
    );
  });

  it("enables when the public flag is built as 1 / yes / on", () => {
    for (const value of ["1", "yes", "on"]) {
      process.env[WORKSPACE_FLAG] = value;
      expect(isInpatientWorkspaceEnabledInBrowser()).toBe(true);
    }
  });

  it("uses a static process.env.NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED reference (Next inline-safe)", () => {
    const src = readFileSync(
      join(__dirname, "../features/inpatient-workspace/inpatientWorkspacePaths.ts"),
      "utf8"
    );
    expect(src).toContain("process.env.NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED");
    expect(src).not.toMatch(/process\.env\[[^\]]+\]/);
  });
});
