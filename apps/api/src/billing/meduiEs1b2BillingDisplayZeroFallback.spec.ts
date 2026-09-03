import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAutoBillDecision, getBillingReadinessStatus } from "./billing.service";
import { displayNameForCatalog, documentedProcedureDisplayNameForProductUi } from "./billing-catalog-display.util";
import type { BillingExportRowDto } from "./dto/billing-readiness.dto";

describe("MEDUI.ES.1B.2 billing catalog display zero-fallback", () => {
  const catalog = {
    displayNameEn: "Glucose",
    displayNameFr: "Glucose plasmatique",
    name: "Glucose",
    code: "GLU",
  };

  it("EN localized value is rendered when present", () => {
    expect(displayNameForCatalog(catalog, null, "en")).toBe("Glucose");
    expect(displayNameForCatalog(catalog, null, "en")).not.toBe("Glucose plasmatique");
  });

  it("EN missing localized label does not use French", () => {
    const label = displayNameForCatalog({ ...catalog, displayNameEn: "" }, null, "en");
    expect(label).toBe("GLU");
    expect(label).not.toBe("Glucose plasmatique");
  });

  it("FR localized value is rendered when present", () => {
    expect(displayNameForCatalog(catalog, null, "fr")).toBe("Glucose plasmatique");
    expect(displayNameForCatalog(catalog, null, "fr")).not.toBe("Glucose");
  });

  it("FR missing localized label does not use English", () => {
    const label = displayNameForCatalog({ ...catalog, displayNameFr: "" }, null, "fr");
    expect(label).toBe("GLU");
    expect(label).not.toBe("Glucose");
  });

  it("unsupported es does not receive EN or FR labels", () => {
    const label = displayNameForCatalog(catalog, null, "es");
    expect(label).toBe("GLU");
    expect(label).not.toBe("Glucose");
    expect(label).not.toBe("Glucose plasmatique");
  });

  it("omitted locale uses F-boundary EN only, never French", () => {
    const label = displayNameForCatalog({ ...catalog, displayNameEn: "" }, null, undefined);
    expect(label).toBe("GLU");
    expect(label).not.toBe("Glucose plasmatique");
  });

  it("documented procedure display is locale-isolated", () => {
    expect(documentedProcedureDisplayNameForProductUi("EKG", "en")).toMatch(/documented/i);
    expect(documentedProcedureDisplayNameForProductUi("EKG", "en")).not.toMatch(/documenté/i);
    expect(documentedProcedureDisplayNameForProductUi("EKG", "fr")).toMatch(/documenté/i);
    expect(documentedProcedureDisplayNameForProductUi("EKG", "es")).toBe("PROCEDURE_EKG");
  });

  it("canonical billing code and readiness are independent of display language", () => {
    const status = getBillingReadinessStatus({
      category: "LAB",
      medoraCode: "GLU",
      billingCodeDefault: "80053",
      officialLabBillingCodeMatched: true,
    });
    expect(status).toBe("official_validated");
    expect(displayNameForCatalog(catalog, null, "fr")).not.toBe("GLU");
    expect(catalog.code).toBe("GLU");
  });

  it("auto-bill decision does not change when only displayName language changes", () => {
    const base: BillingExportRowDto = {
      orderItemId: "oi-1",
      medoraCode: "GLU",
      category: "LAB",
      displayName: "Glucose",
      billingStatus: "official_validated",
      billingCodeDefault: "80053",
      quantity: 1,
      unit: null,
      notes: "ok",
    };
    const en = getAutoBillDecision(base);
    const fr = getAutoBillDecision({ ...base, displayName: "Glucose plasmatique" });
    expect(en.canAutoBill).toBe(true);
    expect(fr.canAutoBill).toBe(en.canAutoBill);
    expect(fr.requiredReview).toBe(en.requiredReview);
    expect(fr.medoraCode).toBe("GLU");
    expect(fr.billingStatus).toBe("official_validated");
  });

  it("billing.service no longer coalesces displayNameEn || displayNameFr", () => {
    const src = readFileSync(join(__dirname, "billing.service.ts"), "utf8");
    expect(src).not.toMatch(/displayNameEn\?\.trim\(\)\s*\|\|\s*catalog\?\.displayNameFr/);
    expect(src).not.toMatch(/displayNameEn\?\.trim\(\)\s*\|\|\s*.*displayNameFr\?\.trim\(\)/);
  });
});
