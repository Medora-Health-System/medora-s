import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BLOOD_PRODUCT_INITIATION_CARD_ID,
  BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID,
  BLOOD_PRODUCT_REASSESSMENT_CARD_ID,
  getClinicalDocumentationCardById,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation blood product (EDOC.7A)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationBloodProductForm.tsx"),
    "utf8"
  );
  const modal = readFileSync(
    join(
      webSrcRoot,
      "features/clinical-documentation/ClinicalDocumentationWitnessSearchModal.tsx"
    ),
    "utf8"
  );

  it("registry renames and adds pre-assessment card", () => {
    expect(getClinicalDocumentationCardById(BLOOD_PRODUCT_PRE_ASSESSMENT_CARD_ID)?.titleEn).toBe(
      "Blood Product Pre-Assessment"
    );
    expect(getClinicalDocumentationCardById(BLOOD_PRODUCT_REASSESSMENT_CARD_ID)?.titleEn).toBe(
      "Blood Product Reassessment (15-Minute Check)"
    );
    expect(getClinicalDocumentationCardById(BLOOD_PRODUCT_INITIATION_CARD_ID)?.requiresWitnessSignature).toBe(
      true
    );
  });

  it("witness workflow uses search modal and finalize (not confirm only)", () => {
    expect(hub).toContain("ClinicalDocumentationWitnessSearchModal");
    expect(hub).toContain("witnessModalEntry");
    expect(modal).toContain("clinical-documentation-witness-search-modal");
    expect(hub).not.toContain("window.confirm(t(\"clinicalDocumentation.witnessConfirm\"))");
    expect(modal).toContain("clinical-documentation-witness-modal-finalize");
    expect(modal).toContain("ClinicalUserRoleAutocomplete");
  });

  it("form includes volume fields and reaction rules", () => {
    expect(form).toContain("BloodProductVolumeSelect");
    expect(form).toContain('testIdPrefix="blood-verification"');
    expect(form).toContain('testIdPrefix="blood-initiation"');
    expect(form).toContain("NO_REACTION");
    expect(form).toContain("interventionRequired");
    expect(form).toContain("blood-pre-assessment-time");
    expect(form).toContain("postHeartRate");
    expect(form).toContain("reactionObserved");
  });
});
