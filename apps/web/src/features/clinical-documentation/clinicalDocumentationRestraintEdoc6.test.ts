import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RESTRAINT_INITIATION_CARD_ID,
  RESTRAINT_REASSESSMENT_CARD_ID,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation restraint (EDOC.6)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const restraintForm = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationRestraintForm.tsx"),
    "utf8"
  );

  it("Restraint Documentation category renders in hub", () => {
    expect(hub).toContain("isEdoc6RestraintFormCard");
    expect(hub).toContain("ClinicalDocumentationRestraintForm");
  });

  it("restraint forms open for all EDOC.6 cards", () => {
    expect(restraintForm).toContain("RESTRAINT_INITIATION_CARD_ID");
    expect(restraintForm).toContain("RESTRAINT_FACE_TO_FACE_CARD_ID");
    expect(restraintForm).toContain("RESTRAINT_REASSESSMENT_CARD_ID");
    expect(restraintForm).toContain("RESTRAINT_RENEWAL_CARD_ID");
    expect(restraintForm).toContain("RESTRAINT_DISCONTINUATION_CARD_ID");
    expect(restraintForm).toContain("EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS");
    expect(restraintForm).toContain("validateRestraintPayloadForCard");
    expect(restraintForm).toContain("ClinicalDocumentationSelectField");
    expect(restraintForm).toContain("ClinicalDocumentationBooleanField");
  });

  it("initiation form shows witness notice and structured enums", () => {
    expect(restraintForm).toContain("clinical-documentation-restraint-initiation-form");
    expect(restraintForm).toContain("clinical-documentation-restraint-witness-notice");
    expect(restraintForm).toContain("RESTRAINT_TYPE_OPTIONS");
    expect(restraintForm).toContain("REASON_FOR_RESTRAINT_OPTIONS");
    expect(restraintForm).toContain("ALTERNATIVES_ATTEMPTED_OPTIONS");
    expect(restraintForm).toContain("initiationWitnessNotice");
  });

  it("face-to-face, renewal, and discontinuation forms save", () => {
    expect(restraintForm).toContain("clinical-documentation-restraint-face-to-face-form");
    expect(restraintForm).toContain("clinical-documentation-restraint-renewal-form");
    expect(restraintForm).toContain("clinical-documentation-restraint-discontinuation-form");
    expect(restraintForm).toContain("clinical-documentation-restraint-save");
  });

  it("validation errors visible", () => {
    expect(restraintForm).toContain("clinical-documentation-restraint-validation-error");
  });

  it("hub uses shared append-only save path", () => {
    expect(hub).toContain("saveObservationEntry");
    expect(hub).toContain("loadEntries");
    expect(hub).toContain("setExpandedCardId(null)");
  });

  it("witness pending badge path unchanged in hub", () => {
    expect(hub).toContain("badgePendingWitness");
    expect(hub).toContain("clinicalDocumentationPendingWitness");
  });
});

describe("EDOC.6 regression guards", () => {
  it("I&O and stroke forms still wired", () => {
    const hub = readFileSync(
      join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
      "utf8"
    );
    expect(hub).toContain("ClinicalDocumentationIntakeOutputForm");
    expect(hub).toContain("ClinicalDocumentationStrokeForm");
  });

  it("reassessment card id preserved from safety registry", () => {
    expect(RESTRAINT_REASSESSMENT_CARD_ID).toBe("safety_restraint_reassessment");
    expect(RESTRAINT_INITIATION_CARD_ID).toBe("safety_restraint_initial");
  });
});
