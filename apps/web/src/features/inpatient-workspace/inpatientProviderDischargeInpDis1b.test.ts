/**
 * INP.DIS.1C — Provider inpatient discharge UI regression.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("INP.DIS.1C inpatient discharge completion UI", () => {
  it("integrates smart discharge section with chart refresh and instruction generation", () => {
    const section = readFileSync(
      join(__dirname, "InpatientProviderDischargeSection.tsx"),
      "utf8"
    );
    expect(section).toContain("refreshFromChart");
    expect(section).toContain("generateInpatientPatientInstructionsFromDiagnoses");
    expect(section).toContain("inpatient-discharge-readiness");
    expect(section).toContain("inpatient-discharge-transfer-details");
    expect(section).toContain("inpatient-discharge-deceased-details");
    expect(section).toContain("finalizeHint");
    expect(section).not.toContain("schemaVersion");
  });

  it("reuses ED template engine without duplicating registry", () => {
    const gen = readFileSync(
      join(__dirname, "inpatientPatientInstructionsFromDiagnoses.ts"),
      "utf8"
    );
    expect(gen).toContain("buildProviderDischargeCardFromDiagnosis");
    expect(gen).toContain('careSetting: "INPATIENT"');
    expect(gen).toContain("patientInstructionsGiven: false");
  });

  it("mirrors expanded disposition labels in EN/FR", () => {
    const en = readFileSync(
      join(__dirname, "../../i18n/messages/inpatientProviderDischargeInpDis1b.en.ts"),
      "utf8"
    );
    const fr = readFileSync(
      join(__dirname, "../../i18n/messages/inpatientProviderDischargeInpDis1b.fr.ts"),
      "utf8"
    );
    expect(en).toContain("Correctional facility");
    expect(fr).toContain("Établissement correctionnel");
    expect(en).toContain("Eloped");
    expect(fr).toContain("Départ sans autorisation");
    expect(en).toContain("Deceased");
    expect(fr).toContain("Décédé");
  });
});
