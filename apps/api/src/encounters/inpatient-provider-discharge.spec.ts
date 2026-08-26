/**
 * INP.DIS.1B — Provider inpatient discharge API surface regression.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("INP.DIS.1B inpatient provider discharge API", () => {
  it("registers governed GET/PATCH routes on InpatientOperationsController", () => {
    const controller = readFileSync(
      join(__dirname, "inpatient-operations.controller.ts"),
      "utf8"
    );
    expect(controller).toContain(
      '@Get("encounters/:encounterId/inpatient-provider-discharge")'
    );
    expect(controller).toContain(
      '@Patch("encounters/:encounterId/inpatient-provider-discharge")'
    );
    expect(controller).toContain("@RequireRoles(RoleCode.PROVIDER)");
    expect(controller).toContain("InpatientProviderDischargeService");
  });

  it("service enforces provider-only write and server-side authorship", () => {
    const service = readFileSync(
      join(__dirname, "inpatient-provider-discharge.service.ts"),
      "utf8"
    );
    expect(service).toContain("requireProviderWrite");
    expect(service).toContain("sanitizeInpatientProviderDischargeClientPayload");
    expect(service).toContain("buildClinicalAuthorSnapshotPersist");
    expect(service).toContain("assertSameClinicalAuthor");
    expect(service).toContain("mergeInpatientProviderDischargeIntoDischargeSummary");
    expect(service).toContain("EncounterType.INPATIENT");
    expect(service).toContain("INPATIENT_PROVIDER_DISCHARGE_REVISION_CONFLICT");
  });
});
