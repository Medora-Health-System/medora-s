/**
 * INP.DIS.1E — Final discharge UI + prose cleanup regressions.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("INP.DIS.1E final discharge UI", () => {
  it("final discharge section retains Discharge Patient CTA and revision guards", () => {
    const section = readFileSync(join(__dirname, "InpatientFinalDischargeSection.tsx"), "utf8");
    expect(section).toContain("dischargePatient");
    expect(section).toContain("inpatient-final-discharge-execute");
    expect(section).toContain("expectedProviderRevision: readiness.providerRevision");
    expect(section).toContain("expectedNursingRevision: readiness.nursingRevision");
    expect(section).not.toContain("lifecycle convergence");
    expect(section).not.toContain("INP.DIS.1E");
  });

  it("INP.DIS.1F board mounts from workspace panel for discharge", () => {
    const panel = readFileSync(join(__dirname, "InpatientWorkspacePanel.tsx"), "utf8");
    expect(panel).toContain("InpatientDischargeBoard");
  });

  it("EN/FR final discharge labels", () => {
    const en = readFileSync(
      join(__dirname, "../../i18n/messages/inpatientFinalDischargeInpDis1e.en.ts"),
      "utf8"
    );
    const fr = readFileSync(
      join(__dirname, "../../i18n/messages/inpatientFinalDischargeInpDis1e.fr.ts"),
      "utf8"
    );
    expect(en).toContain("Discharge Patient");
    expect(fr).toContain("Sortir le patient");
  });

  it("removes permanent architecture prose from discharge board strings", () => {
    const providerEn = readFileSync(
      join(__dirname, "../../i18n/messages/inpatientProviderDischargeInpDis1b.en.ts"),
      "utf8"
    );
    const nursingEn = readFileSync(
      join(__dirname, "../../i18n/messages/inpatientNursingDischargeInpDis1d.en.ts"),
      "utf8"
    );
    const cmEn = readFileSync(
      join(__dirname, "../../i18n/messages/enterpriseCaseManagementDischargePlanningD4b7.en.ts"),
      "utf8"
    );
    expect(providerEn).not.toContain("not medical discharge authorization");
    expect(nursingEn).not.toContain("does not close the encounter");
    expect(cmEn).not.toContain("Uses enterprise clinical documentation foundation");
    expect(cmEn).toContain('title: "Discharge Planning"');
  });
});
