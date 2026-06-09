import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  marHighAlertNeedsVerifierSelection,
  marHighAlertWorkflowVisible,
  marInfusionStartWitnessRequired,
} from "@/components/medication/MarHighAlertFields";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("MAR high-alert witness modal (M1.8B.4A.5)", () => {
  const marTab = readFileSync(
    join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
    "utf8"
  );
  const marHighAlertFields = readFileSync(
    join(webSrcRoot, "components/medication/MarHighAlertFields.tsx"),
    "utf8"
  );
  const sharedModal = readFileSync(
    join(webSrcRoot, "components/clinical/SecondClinicianVerificationModal.tsx"),
    "utf8"
  );

  it("wires dedicated verifier modal on save instead of inline autocomplete", () => {
    expect(marTab).toContain("SecondClinicianVerificationModal");
    expect(marTab).toContain("mar-high-alert-verifier-modal");
    expect(marTab).toContain("marHighAlertNeedsVerifierSelection");
    expect(marTab).toContain("setShowHighAlertVerifierModal(true)");
    expect(marHighAlertFields).not.toContain("ClinicalUserRoleAutocomplete");
    expect(marHighAlertFields).toContain("mar-high-alert-verifier-pending");
  });

  it("shared modal requires roster selection and rejects self", () => {
    expect(sharedModal).toContain("ClinicalUserRoleAutocomplete");
    expect(sharedModal).toContain("require-second-clinician");
    expect(sharedModal).toContain("cannotBeAuthor");
    expect(sharedModal).toContain("second-clinician-verification-modal-confirm");
  });

  it("insulin SQ requires verifier selection before save", () => {
    const governance = {
      isHighAlert: true,
      highAlertClass: "HIGH_ALERT_INSULIN",
      requiresDoubleSign: true,
    };
    expect(marHighAlertWorkflowVisible(governance, "administered", { orderRoute: "SQ" })).toBe(
      true
    );
    expect(
      marHighAlertNeedsVerifierSelection(
        governance,
        "administered",
        {
          verifierUserId: null,
          verifierDisplayName: "",
          highAlertOverrideReason: "",
          highAlertOverrideAcknowledged: false,
          useOverride: false,
        },
        { orderRoute: "SQ" }
      )
    ).toBe(true);
    expect(
      marHighAlertNeedsVerifierSelection(
        governance,
        "administered",
        {
          verifierUserId: "rn-2",
          verifierDisplayName: "Jane Doe",
          highAlertOverrideReason: "",
          highAlertOverrideAcknowledged: false,
          useOverride: false,
        },
        { orderRoute: "SQ" }
      )
    ).toBe(false);
  });

  it("heparin SQ does not require verifier modal", () => {
    const governance = {
      isHighAlert: true,
      highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
      requiresDoubleSign: true,
    };
    expect(marHighAlertWorkflowVisible(governance, "administered", { orderRoute: "SQ" })).toBe(
      false
    );
    expect(
      marHighAlertNeedsVerifierSelection(
        governance,
        "administered",
        {
          verifierUserId: null,
          verifierDisplayName: "",
          highAlertOverrideReason: "",
          highAlertOverrideAcknowledged: false,
          useOverride: false,
        },
        { orderRoute: "SQ" }
      )
    ).toBe(false);
  });

  it("wires infusion START witness modal before note modal (M1.8B.7E.1)", () => {
    expect(marTab).toContain("mar-infusion-start-verifier-modal");
    expect(marTab).toContain("marInfusionStartWitnessRequired");
    expect(marTab).toContain("setInfusionStartWitnessModal");
  });

  it("heparin IVPB infusion START requires witness before note modal", () => {
    const governance = {
      isHighAlert: true,
      highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
      requiresDoubleSign: true,
    };
    expect(
      marInfusionStartWitnessRequired(governance, {
        orderRoute: "IVPB",
        isContinuousInfusion: true,
      })
    ).toBe(true);
    expect(
      marInfusionStartWitnessRequired(
        { isHighAlert: false, highAlertClass: null, requiresDoubleSign: false },
        { orderRoute: "IVPB", isContinuousInfusion: true, genericName: "Vancomycin" }
      )
    ).toBe(false);
  });

  it("KCl IVPB infusion START requires witness before note modal (M1.8B.7E.2B)", () => {
    const governance = {
      isHighAlert: true,
      highAlertClass: "HIGH_ALERT_ELECTROLYTE",
      requiresDoubleSign: true,
    };
    expect(
      marInfusionStartWitnessRequired(governance, {
        orderRoute: "IVPB",
        isContinuousInfusion: true,
        genericName: "Potassium chloride",
        catalogCode: "POTASSIUM_CHLORIDE_10_MEQ_100_ML_PERFUSION_INTRAVEINEUSE",
        administrationType: "INFUSION",
      })
    ).toBe(true);
  });

  it("Mg IVPB infusion START requires witness before note modal (M1.8B.7E.2B)", () => {
    const governance = {
      isHighAlert: true,
      highAlertClass: "HIGH_ALERT_ELECTROLYTE",
      requiresDoubleSign: true,
    };
    expect(
      marInfusionStartWitnessRequired(governance, {
        orderRoute: "IVPB",
        isContinuousInfusion: true,
        genericName: "Magnesium sulfate",
        catalogCode: "MAGNESIUM_SULFATE_4_G_100_ML_PERFUSION_INTRAVEINEUSE",
        administrationType: "INFUSION",
      })
    ).toBe(true);
  });

  it("vancomycin IVPB infusion START opens note modal directly (M1.8B.7E.2B)", () => {
    expect(
      marInfusionStartWitnessRequired(
        { isHighAlert: false, highAlertClass: null, requiresDoubleSign: false },
        {
          orderRoute: "IVPB",
          isContinuousInfusion: true,
          genericName: "Vancomycin",
        }
      )
    ).toBe(false);
  });

  it("heparin IVP requires verifier selection", () => {
    const governance = {
      isHighAlert: true,
      highAlertClass: "HIGH_ALERT_ANTICOAGULANT",
      requiresDoubleSign: true,
    };
    expect(marHighAlertWorkflowVisible(governance, "administered", { orderRoute: "IVP" })).toBe(
      true
    );
    expect(
      marHighAlertNeedsVerifierSelection(
        governance,
        "administered",
        {
          verifierUserId: null,
          verifierDisplayName: "",
          highAlertOverrideReason: "",
          highAlertOverrideAcknowledged: false,
          useOverride: false,
        },
        { orderRoute: "IVP" }
      )
    ).toBe(true);
  });
});
