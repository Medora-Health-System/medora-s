import { EncounterWorkflowState } from "@prisma/client";
import { assertValidEncounterWorkflowTransition } from "./encounter-workflow-state.machine";

describe("assertValidEncounterWorkflowTransition", () => {
  it("allows ARRIVED → TRIAGE", () => {
    expect(() =>
      assertValidEncounterWorkflowTransition(EncounterWorkflowState.ARRIVED, EncounterWorkflowState.TRIAGE)
    ).not.toThrow();
  });

  it("rejects ARRIVED → IN_TREATMENT", () => {
    expect(() =>
      assertValidEncounterWorkflowTransition(EncounterWorkflowState.ARRIVED, EncounterWorkflowState.IN_TREATMENT)
    ).toThrow();
  });

  it("allows idempotent same state", () => {
    expect(() =>
      assertValidEncounterWorkflowTransition(EncounterWorkflowState.TRIAGE, EncounterWorkflowState.TRIAGE)
    ).not.toThrow();
  });

  it("rejects FINALIZED → CLOSED via validator (close endpoint applies CLOSED)", () => {
    expect(() =>
      assertValidEncounterWorkflowTransition(EncounterWorkflowState.FINALIZED, EncounterWorkflowState.CLOSED)
    ).toThrow();
  });
});
