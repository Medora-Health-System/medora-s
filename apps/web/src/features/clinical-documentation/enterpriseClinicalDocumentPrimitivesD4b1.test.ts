/**
 * MEDUI.D4B.1 — Primitive smoke tests (no dashboard).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("EnterpriseClinicalDocumentPrimitivesD4b1", () => {
  const src = readFileSync(
    join(__dirname, "EnterpriseClinicalDocumentPrimitivesD4b1.tsx"),
    "utf8"
  );

  it("exports foundation primitives only", () => {
    expect(src).toContain("EnterpriseClinicalDocumentStatusBadge");
    expect(src).toContain("EnterpriseClinicalDocumentUnsignedDraftWarning");
    expect(src).toContain("EnterpriseClinicalDocumentAmendmentBanner");
    expect(src).toContain("EnterpriseClinicalDocumentSignatureMeta");
    expect(src).toContain("EnterpriseClinicalDocumentCompletenessSummary");
    expect(src).toContain("EnterpriseClinicalDocumentValidationIssueList");
    expect(src).toContain("EnterpriseClinicalDocumentLegalRecordHeader");
    expect(src).toContain("EnterpriseClinicalDocumentReadOnlySignedRenderer");
  });

  it("uses i18n keys and stays foundation-scoped", () => {
    expect(src).toContain("enterpriseClinicalDocumentD4b1.");
    expect(src).toContain("useI18n");
    expect(src).not.toContain("NursingClinicalWorkspace");
    expect(src).not.toContain("care plan suite");
  });
});
