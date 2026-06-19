import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

describe("marTimingReasonRemoval (MEDUI.ED.MAR.HOTFIX.TIME.2)", () => {
  const tab = readFileSync(
    join(webRoot, "components/encounters/MedicationAdministrationTab.tsx"),
    "utf8"
  );
  const clinicalField = readFileSync(
    join(webRoot, "components/mar/MedicationClinicalDateTimeField.tsx"),
    "utf8"
  );
  const effectiveModal = readFileSync(
    join(webRoot, "components/encounters/MedicationAdministrationEffectiveTimeModal.tsx"),
    "utf8"
  );

  it("changed clinical time does not render override reason dropdown in MAR tab", () => {
    expect(tab).not.toContain('data-testid="mar-infusion-timing-override-fields"');
    expect(tab).not.toContain("marTimingOverride.reasonPlaceholder");
    expect(tab).not.toContain('t("marScheduleTiming.reasonRequired")');
  });

  it("changed clinical time does not render clinical detail required by default", () => {
    expect(clinicalField).toContain("showReasonWhenRequired = false");
  });

  it("post-hoc effective time modal does not block save on missing reason", () => {
    expect(effectiveModal).toContain("const reasonRequired = false");
    expect(effectiveModal).not.toContain('setError(t("marTab.adminTime.reasonRequired"))');
    expect(effectiveModal).not.toContain("reasonTooShort");
  });
});
