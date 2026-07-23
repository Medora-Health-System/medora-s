import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

const webRoot = join(__dirname, "../..");
const apiRoot = join(__dirname, "../../../../api/src/encounters");

function deepKeys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) return deepKeys(v, path);
    return [path];
  });
}

describe("D4A.2.5A nursing domain integration UI/API contracts", () => {
  it("mirrors hospitalAdmissionD4a25a EN/FR keys", () => {
    const enKeys = deepKeys(en.hospitalAdmissionD4a25a).sort();
    const frKeys = deepKeys(fr.hospitalAdmissionD4a25a).sort();
    expect(enKeys).toEqual(frKeys);
    expect(en.hospitalAdmissionD4a25a.certification).toBe(
      "MEDUI.NURSING_DOMAIN_INTEGRATION.D4A2_5A"
    );
  });

  it("keeps nursing admission shell and launches additional documentation (D4A.2.7C)", () => {
    const shell = readFileSync(
      join(webRoot, "features/inpatient-workspace/InpatientAdmissionClinicalShell.tsx"),
      "utf8"
    );
    expect(shell).toContain("NursingAdmissionDomainIntegrationPanel");
    expect(shell).toContain("NursingAdmissionPrintSummaryModal");
    expect(shell).toContain("NursingAdmissionAmendmentDialog");
    expect(shell).toContain("NursingAdmissionStructuredSectionForm");
    expect(shell).not.toContain("window.print()");
    expect(shell).toContain("providerHpNotRequired");

    const domain = readFileSync(
      join(webRoot, "features/inpatient-workspace/NursingAdmissionDomainIntegrationPanel.tsx"),
      "utf8"
    );
    expect(domain).toContain("AdditionalClinicalDocumentationLauncher");
    expect(domain).not.toContain("ClinicalDocumentationHub");
    expect(domain).toContain("nursing-demographics-readonly");
  });

  it("exposes domain-reference, amendment, and print-summary API routes", () => {
    const controller = readFileSync(
      join(apiRoot, "inpatient-operations.controller.ts"),
      "utf8"
    );
    expect(controller).toContain("nursing-admission/domain-references");
    expect(controller).toContain("nursing-admission/amendments");
    expect(controller).toContain("nursing-admission/print-summary");
    expect(controller).toContain("@RequireRoles(RoleCode.RN)");

    const api = readFileSync(join(__dirname, "inpatientOperationsApi.ts"), "utf8");
    expect(api).toContain("linkNursingAdmissionDomainReference");
    expect(api).toContain("createNursingAdmissionAmendment");
    expect(api).toContain("fetchNursingAdmissionPrintSummary");
  });
});
