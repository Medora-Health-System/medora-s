import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");
const repoRoot = join(webSrcRoot, "..", "..");

describe("clinical documentation witness (EDOC.4)", () => {
  it("exposes witness API route and hub witness action", () => {
    const api = readFileSync(join(webSrcRoot, "lib/clinicalDocumentationApi.ts"), "utf8");
    expect(api).toContain("/clinical-documentation/${entryId}/witness");
    expect(api).toContain("witnessClinicalDocumentationEntry");

    const hub = readFileSync(
      join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
      "utf8"
    );
    expect(hub).toContain("clinical-documentation-witness-button");
    expect(hub).toContain("badgePendingWitness");
    expect(hub).toContain("witnessClinicalDocumentationEntry");
  });

  it("controller registers witness POST endpoint", () => {
    const controller = readFileSync(
      join(repoRoot, "api/src/encounters/encounters.controller.ts"),
      "utf8"
    );
    expect(controller).toContain("clinical-documentation/:entryId/witness");
    expect(controller).toContain("witnessClinicalDocumentationEntry");
  });
});
