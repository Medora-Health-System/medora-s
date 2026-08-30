/**
 * ED.HOSP.1C — lifecycle/receiving/conversion source proofs (no behavior change to type-flip).
 */

import { readFileSync } from "fs";
import { join } from "path";
import { observationToInpatientRequiresNewEncounter } from "@medora/shared";

const encSvc = readFileSync(join(__dirname, "encounters.service.ts"), "utf8");
const placementSvc = readFileSync(join(__dirname, "internal-placement.service.ts"), "utf8");
const inpOps = readFileSync(join(__dirname, "inpatient-operations.service.ts"), "utf8");

describe("ED.HOSP.1C lifecycle unchanged", () => {
  it("does not retire confirmInpatientTransfer", () => {
    expect(encSvc).toContain("confirmInpatientTransfer === true");
    expect(encSvc).toContain("updateData.type = EncounterType.INPATIENT");
  });

  it("type-flip does not rewrite dest or force INPATIENT billing", () => {
    const start = encSvc.indexOf("if (data.confirmInpatientTransfer === true)");
    expect(start).toBeGreaterThan(0);
    const flip = encSvc.slice(start, start + 2500);
    expect(flip).toContain("updateData.type = EncounterType.INPATIENT");
    expect(flip).not.toContain("requestedEncounterType");
    expect(flip).not.toContain("billingClassification");
    expect(flip).not.toContain("EncounterType.OBSERVATION");
  });

  it("22. recordAdmissionDecision does not create a receiving encounter", () => {
    const writer = encSvc.slice(
      encSvc.indexOf("async recordAdmissionDecision("),
      encSvc.indexOf("async cancelAdmissionDecision(")
    );
    expect(writer).not.toContain("prisma.encounter.create");
    expect(writer).not.toContain("receivingEncounterId");
  });
});

describe("ED.HOSP.1C receiving foundation semantics", () => {
  it("ARRIVED create keeps EncounterType.INPATIENT and dest-derived billing", () => {
    expect(placementSvc).toContain("billingClassificationForPlacementDestination(destType)");
    expect(placementSvc).toContain("type: EncounterType.INPATIENT");
    expect(placementSvc).toContain("requestedEncounterType: destType");
    expect(placementSvc).not.toContain("EncounterType.OBSERVATION");
  });
});

describe("ED.HOSP.1C explicit observation conversion", () => {
  it("32-33. conversion remains an explicit API; dest helper does not auto-convert", () => {
    expect(inpOps).toContain("async convertObservationToInpatient(");
    expect(observationToInpatientRequiresNewEncounter()).toBe(true);
    expect(encSvc).not.toMatch(/elapsed hours|midnight count/);
  });
});
