import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "src/features/clinic-care");
const workflow = readFileSync(join(root, "ClinicCareAmbulatoryDischargeWorkflow.tsx"), "utf8");
const details = readFileSync(join(root, "ClinicCareCheckoutDetailsPanel.tsx"), "utf8");

describe("Clinic disposition actions", () => {
  it("provides an explicit confirmation action for every clinic checkout state", () => {
    for (const state of ["HOME", "CLINIC_FOLLOW_UP", "REFERRAL", "TRANSFER_ED", "AMA", "OTHER"]) {
      expect(workflow).toContain(`case \"${state}\"`);
    }
    expect(workflow).toContain("clinic-checkout-confirm-${checkoutState.toLowerCase()}");
  });

  it("persists a canonical confirmation and advances the open encounter to DISCHARGE_READY", () => {
    expect(workflow).toContain("clinicAmbulatoryCheckoutConfirmation");
    expect(workflow).toContain("state: checkoutState");
    expect(workflow).toContain('workflowState: "DISCHARGE_READY"');
    expect(workflow).toContain("confirmedAt: nowIso");
    expect(workflow).toContain("confirmedByDisplayName: actor");
  });

  it("requires meaningful detail for referral, transfer, AMA, and Other", () => {
    expect(details).toContain('state === "REFERRAL"');
    expect(details).toContain("details.referral.destination.trim()");
    expect(details).toContain("details.referral.reason.trim()");
    expect(details).toContain('state === "TRANSFER_ED"');
    expect(details).toContain("details.transferEd.destination.trim()");
    expect(details).toContain("details.transferEd.reason.trim()");
    expect(details).toContain('state === "AMA"');
    expect(details).toContain("details.ama.risksDiscussed");
    expect(details).toContain("details.ama.alternativesDiscussed");
    expect(details).toContain('state === "OTHER"');
    expect(details).toContain("details.other.explanation.trim()");
  });

  it("uses shared discharge validation for normal ambulatory completion paths", () => {
    expect(workflow).toContain("validateProviderDischargeDocumentation");
    expect(workflow).toContain("requireFinalDiagnosis: true");
    expect(workflow).toContain("requireInstructionsCommunicated: true");
    expect(workflow).toContain('state === "HOME"');
    expect(workflow).toContain('state === "CLINIC_FOLLOW_UP"');
  });

  it("creates or reuses the enterprise FollowUp when Clinic Follow-up is confirmed", () => {
    expect(workflow).toContain('import { createFollowUp, fetchPatientFollowUps } from "@/lib/followUpsApi"');
    expect(workflow).toContain('checkoutState === "CLINIC_FOLLOW_UP"');
    expect(workflow).toContain("ensureEnterpriseClinicFollowUp");
    expect(workflow).toContain("fetchPatientFollowUps");
    expect(workflow).toContain("item.encounterId === input.encounterId");
    expect(workflow).toContain("createFollowUp(input.facilityId");
    expect(workflow).toContain("encounter.followUpDate");
    expect(workflow).toContain("clinicAmbulatoryFollowUpId");
  });

  it("reuses diagnosis-driven discharge content to suggest referral and transfer documentation", () => {
    expect(details).toContain("buildClinicCheckoutDiagnosisSuggestions");
    expect(details).toContain("primary?.displayName");
    expect(details).toContain("primary?.diagnosisInstructions");
    expect(details).toContain("primary?.returnPrecautions");
    expect(details).toContain("form.returnPrecautions");
    expect(details).toContain("form.followUps");
    expect(workflow).toContain("buildClinicCheckoutDiagnosisSuggestions(providerForm, language)");
    expect(workflow).toContain("suggestions={checkoutSuggestions}");
  });

  it("uses editable datalist suggestions instead of locking providers into fixed dropdown values", () => {
    expect(details).toContain("<datalist");
    expect(details).toContain("list={options.length ? listId : undefined}");
    expect(details).toContain("onChange={(e) => onChange(e.target.value)}");
    expect(details).toContain("Apply diagnosis suggestion");
    expect(details).toContain("EMS / ambulance");
    expect(details).toContain("Vehículo privado");
    expect(details).toContain("SMU / ambulance");
  });

  it("does not auto-confirm AMA risk discussions from a suggestion", () => {
    expect(details).toContain("risksDiscussed: false");
    expect(details).toContain("alternativesDiscussed: false");
    expect(details).toContain("checked={details.ama.risksDiscussed}");
    expect(details).toContain("checked={details.ama.alternativesDiscussed}");
  });

  it("does not falsely claim that confirming Transfer to ED created an ED encounter", () => {
    expect(workflow).toContain("creating an ED encounter remains a separate action");
    expect(details).toContain("does not create an ED encounter");
  });
});
