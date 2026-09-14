import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { enterpriseOrderSetByCode } from "@medora/shared";
import { orderSetWarningsForLocale } from "./enterpriseOrderSetAdapter";

const webRoot = join(import.meta.dirname, "../../..");
const createOrderSource = readFileSync(
  join(webRoot, "components/orders/CreateOrderModal.tsx"),
  "utf8"
);
const prioritySource = readFileSync(
  join(webRoot, "components/orders/createOrderModal/OrderPriorityField.tsx"),
  "utf8"
);

describe("Create Order presentation cleanup", () => {
  it("hides only the requested presentation clutter inside the Create Order form", () => {
    expect(prioritySource).toContain('data-testid="create-order-priority-field"');
    expect(prioritySource).toContain('textarea[rows="2"]');
    expect(prioritySource).toContain('[data-testid="enterprise-order-set-browser"] > p');
    expect(prioritySource).toContain('div[role="group"][aria-label]');
    expect(prioritySource).toContain('div[role="status"]:has(> ul)');
  });

  it("keeps Search and Add and the order-entry engines intact", () => {
    expect(createOrderSource).toContain('t("createOrderModal.sectionSearchAdd")');
    expect(createOrderSource).toContain("<SharedCatalogAutocomplete");
    expect(createOrderSource).toContain("<ManualOrderEntry");
    expect(createOrderSource).toContain('activeTab === "CARE"');
    expect(createOrderSource).toContain("carePickerQuery");
  });

  it("keeps clinical safety validation while suppressing informational callouts", () => {
    expect(createOrderSource).toContain("validateOxygenTherapyDraft");
    expect(createOrderSource).toContain('t("createOrderModal.errIvConfirmationRequired")');
    expect(createOrderSource).toContain('t("createOrderModal.errMedicationAllergyAckRequired")');

    const chestPain = enterpriseOrderSetByCode("ed_chest_pain_v1");
    expect(chestPain).toBeTruthy();
    expect(orderSetWarningsForLocale(chestPain!, "en")).toEqual([]);
    expect(orderSetWarningsForLocale(chestPain!, "fr")).toEqual([]);
    expect(orderSetWarningsForLocale(chestPain!, "es")).toEqual([]);
  });
});
