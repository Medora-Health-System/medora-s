import {
  assertNoBulkRealMappingApproval,
  assertPilotClinicalActivationDisabled,
  EM_PILOT_DATASET_ROWS,
  EM_PILOT_DEFAULT_MANIFEST_META,
} from "@medora/shared";
import { buildEmPilotManifestPayload } from "./medication-em-pilot.service";

describe("medication-em-pilot.service — workflow guards", () => {
  it("builds a deterministic manifest hash for the curated EM dataset", () => {
    const a = buildEmPilotManifestPayload();
    const b = buildEmPilotManifestPayload();
    expect(a.sourceManifestHash).toBe(b.sourceManifestHash);
    expect(a.medicationCountExpected).toBe(EM_PILOT_DATASET_ROWS.length);
    expect(a.clinicalActivationAllowed).toBe(false);
    expect(a.medicationCountExpected).toBeGreaterThanOrEqual(75);
    expect(a.medicationCountExpected).toBeLessThanOrEqual(125);
  });

  it("keeps clinical activation and bulk mapping approval disabled", () => {
    expect(() => assertPilotClinicalActivationDisabled(false)).not.toThrow();
    expect(() => assertPilotClinicalActivationDisabled(true)).toThrow();
    expect(() => assertNoBulkRealMappingApproval("BULK_APPROVE")).toThrow();
  });

  it("shared manifest meta matches service payload scope", () => {
    const payload = buildEmPilotManifestPayload();
    expect(payload.pilotId).toBe(EM_PILOT_DEFAULT_MANIFEST_META.pilotId);
    expect(payload.clinicalDomain).toBe("EMERGENCY_MEDICINE");
    expect(payload.dataClassification).toBe("CONTROLLED_REAL_PILOT");
  });
});
