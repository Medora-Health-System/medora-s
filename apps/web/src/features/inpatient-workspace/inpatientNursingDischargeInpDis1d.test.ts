/**
 * INP.DIS.1D — Nursing discharge UI + 1C post-merge hardening regressions.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("INP.DIS.1D nursing discharge UI", () => {
  it("mounts nursing section in discharge workspace", () => {
    const panel = readFileSync(join(__dirname, "InpatientWorkspacePanel.tsx"), "utf8");
    expect(panel).toContain("InpatientNursingDischargeSection");
    expect(panel).toContain('canAuthor={roles.includes("RN")}');
  });

  it("nursing section uses timezone helpers and disposition gates", () => {
    const section = readFileSync(
      join(__dirname, "InpatientNursingDischargeSection.tsx"),
      "utf8"
    );
    expect(section).toContain("instantToLocalDateTimeInput");
    expect(section).toContain("localDateTimeInputToIso");
    expect(section).toContain("inpatient-nursing-departure-now");
    expect(section).toContain("res.readiness");
    expect(section).toContain("dispositionMismatch");
    expect(section).not.toContain("finalDisposition");
    expect(section).not.toContain("dischargeEncounter");
  });

  it("mirrors nursing EN/FR labels", () => {
    const en = readFileSync(
      join(__dirname, "../../i18n/messages/inpatientNursingDischargeInpDis1d.en.ts"),
      "utf8"
    );
    const fr = readFileSync(
      join(__dirname, "../../i18n/messages/inpatientNursingDischargeInpDis1d.fr.ts"),
      "utf8"
    );
    expect(en).toContain("Complete nursing discharge");
    expect(fr).toContain("Compléter la sortie infirmière");
    expect(en).toContain("Elopement documentation");
    expect(fr).toContain("Documentation de départ sans autorisation");
    expect(en).toContain("Set departure time to now");
    expect(fr).toContain("Définir l'heure de départ à maintenant");
  });
});

describe("INP.DIS.1C post-merge hardening UI", () => {
  it("chart refresh passes forceReplaceFields on confirm and empty on decline", () => {
    const section = readFileSync(
      join(__dirname, "InpatientProviderDischargeSection.tsx"),
      "utf8"
    );
    expect(section).toContain("forceReplaceFields: []");
    expect(section).toContain("forceReplaceFields: edited");
    expect(section).toContain("window.confirm");
    expect(section).toContain("instantToLocalDateTimeInput");
    expect(section).toContain("localDateTimeInputToIso");
    expect(section).not.toContain(".slice(0, 16)");
    expect(section).toContain("res.readiness");
  });
});
