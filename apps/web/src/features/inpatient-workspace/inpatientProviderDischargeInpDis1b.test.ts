/**
 * INP.DIS.1B — Provider inpatient discharge UI regression.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("INP.DIS.1B inpatient provider discharge UI", () => {
  it("integrates provider discharge section in inpatient discharge workflow", () => {
    const panel = readFileSync(
      join(__dirname, "InpatientWorkspacePanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("InpatientProviderDischargeSection");
    expect(panel).toContain('canAuthor={roles.includes("PROVIDER")}');
  });

  it("uses localized chrome and separates planning from final disposition", () => {
    const section = readFileSync(
      join(__dirname, "InpatientProviderDischargeSection.tsx"),
      "utf8"
    );
    expect(section).toContain("inpatientProviderDischargeInpDis1b");
    expect(section).toContain("planningContextHint");
    expect(section).toContain("inpatient-provider-discharge-planned-destination");
    expect(section).toContain("inpatient-provider-discharge-final-disposition");
    expect(section).toContain("usePlanningSuggestion");
    expect(section).not.toContain("INP.DIS.1B");
  });

  it("mirrors i18n keys in EN/FR message modules", () => {
    const en = readFileSync(
      join(__dirname, "../../i18n/messages/inpatientProviderDischargeInpDis1b.en.ts"),
      "utf8"
    );
    const fr = readFileSync(
      join(__dirname, "../../i18n/messages/inpatientProviderDischargeInpDis1b.fr.ts"),
      "utf8"
    );
    expect(en).toContain("Provider discharge documentation");
    expect(fr).toContain("Documentation médicale de sortie");
    expect(en).toContain('HOME: "Home"');
    expect(fr).toContain("Domicile");
  });
});
