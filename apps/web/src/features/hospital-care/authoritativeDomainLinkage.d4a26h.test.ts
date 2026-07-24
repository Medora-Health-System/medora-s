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

describe("D4A.2.6H authoritative domain linkage UI/API", () => {
  it("mirrors hospitalAdmissionD4a26h EN/FR keys", () => {
    const enKeys = deepKeys(en.hospitalAdmissionD4a26h).sort();
    const frKeys = deepKeys(fr.hospitalAdmissionD4a26h).sort();
    expect(enKeys).toEqual(frKeys);
    expect(en.hospitalAdmissionD4a26h.certification).toBe(
      "MEDUI.AUTHORITATIVE_DOMAIN_LINKAGE.D4A2_6H"
    );
  });

  it("removes synthetic Date.now domain link generation from nursing panel", () => {
    const panel = readFileSync(
      join(webRoot, "features/inpatient-workspace/NursingAdmissionDomainIntegrationPanel.tsx"),
      "utf8"
    );
    expect(panel).not.toContain("`edoc-${");
    expect(panel).not.toContain("`ref-${");
    expect(panel).toContain("AdditionalClinicalDocumentationLauncher");
    expect(panel).toContain("isPersistedEdocRecordId");
    expect(panel).toContain("isSyntheticDomainRecordId");
    expect(panel).toContain("authoritativeCodeStatus");

    const hub = readFileSync(
      join(webRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
      "utf8"
    );
    expect(hub).toContain("onEntriesChanged?.(saved)");
    expect(hub).toContain("refreshEntries(saved)");
  });

  it("exposes authoritative projection and hardened link/print APIs", () => {
    const controller = readFileSync(
      join(apiRoot, "inpatient-operations.controller.ts"),
      "utf8"
    );
    expect(controller).toContain("authoritative-clinical-projection");
    expect(controller).toContain("nursing-admission/domain-references");

    const service = readFileSync(join(apiRoot, "inpatient-operations.service.ts"), "utf8");
    expect(service).toContain("DOMAIN_REFERENCE_SYNTHETIC");
    expect(service).toContain("AUTHORITATIVE_DOMAIN_RECORD_REQUIRED");
    expect(service).toContain("NURSING_DOMAIN_SYNTHETIC_REFERENCE_REJECTED");
    expect(service).toContain("loadEncounterForNursingAmendment");
    expect(service).toContain("getInpatientAuthoritativeClinicalProjection");

    const provider = readFileSync(
      join(webRoot, "features/inpatient-workspace/InpatientProviderWorkspacePanel.tsx"),
      "utf8"
    );
    expect(provider).toContain("fetchAuthoritativeClinicalProjection");
    // D4A.3.4 — authoritative projection feeds projectInpatientOverview clinicalState module
    expect(provider).toContain("projectInpatientOverview");
    expect(provider).toContain("authProjection");
  });
});
