import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID,
  enterpriseClinicalRulesEngineStarted,
  enterpriseClinicalRulesMustNotStartPlacement,
} from "@medora/shared";
import {
  HOSPITAL_CARE_ENTERPRISE_CLINICAL_RULES,
  ADMIN_ENTERPRISE_CLINICAL_RULES,
} from "./hospitalCarePaths";

const root = __dirname;

describe("MEDUI.ENTERPRISE_RULES_ENGINE.D4A2_8A web", () => {
  it("certifies rules engine and blocks placement", () => {
    expect(ENTERPRISE_CLINICAL_RULES_ENGINE_CERTIFICATION_ID).toBe(
      "MEDUI.ENTERPRISE_RULES_ENGINE.D4A2_8A"
    );
    expect(enterpriseClinicalRulesEngineStarted()).toBe(true);
    expect(enterpriseClinicalRulesMustNotStartPlacement()).toBe(true);
  });

  it("routes rules builder under hospitalisation and admin", () => {
    expect(HOSPITAL_CARE_ENTERPRISE_CLINICAL_RULES).toBe(
      "/app/hospitalisation/enterprise-clinical-rules"
    );
    expect(ADMIN_ENTERPRISE_CLINICAL_RULES).toBe("/app/admin/enterprise-clinical-rules");
  });

  it("UI consumes clinical-rules APIs only", () => {
    const api = readFileSync(join(root, "./enterpriseClinicalRulesApi.ts"), "utf8");
    expect(api).toContain("/hospital-care/enterprise-clinical-rules");
    expect(api).not.toContain("prisma");
    const builder = readFileSync(
      join(root, "./EnterpriseClinicalRulesBuilderView.tsx"),
      "utf8"
    );
    expect(builder).toContain("fetchClinicalRulesCatalog");
    expect(builder).toContain("simulateClinicalRulesRemote");
    expect(builder).not.toContain("evaluateClinicalRules(");
  });

  it("exposes pages and mirrored i18n keys", () => {
    const page = readFileSync(
      join(root, "../../../app/app/hospitalisation/enterprise-clinical-rules/page.tsx"),
      "utf8"
    );
    expect(page).toContain("EnterpriseClinicalRulesBuilderView");
    const admin = readFileSync(
      join(root, "../../../app/app/admin/enterprise-clinical-rules/page.tsx"),
      "utf8"
    );
    expect(admin).toContain("EnterpriseClinicalRulesBuilderView");
    const en = readFileSync(
      join(root, "../../i18n/messages/enterpriseClinicalRulesD4a28a.en.ts"),
      "utf8"
    );
    const fr = readFileSync(
      join(root, "../../i18n/messages/enterpriseClinicalRulesD4a28a.fr.ts"),
      "utf8"
    );
    expect(en).toContain("builderTitle");
    expect(fr).toContain("Éditeur de règles");
    expect(en).toContain("simulatePanel");
    expect(fr).toContain("simulatePanel");
  });
});
