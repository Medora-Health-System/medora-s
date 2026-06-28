import { describe, expect, it } from "vitest";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import {
  isClinicianFacingUuid,
  resolveMedicationOrderGovernanceClinicalHeader,
} from "@/lib/medicationOrderGovernanceClinicalHeader";

const ORDER_ITEM_ID = "43ed4aaa-0108-41a4-bf74-d6fae600f862";

const tEn = (key: string) => i18nMessage("en", key);
const tFr = (key: string) => i18nMessage("fr", key);

describe("MEDUI.ORDERS.GOVERNANCE_DIALOG_CLINICAL_HEADER.1", () => {
  it("detects raw UUIDs as clinician-facing leaks", () => {
    expect(isClinicianFacingUuid(ORDER_ITEM_ID)).toBe(true);
    expect(isClinicianFacingUuid("Piperacillin-tazobactam")).toBe(false);
  });

  it("builds clinical header from catalog medication with route and frequency", () => {
    const header = resolveMedicationOrderGovernanceClinicalHeader({
      orderItem: {
        catalogItemType: "MEDICATION",
        strength: "3.375 g",
        route: "IVPB",
        frequencyCode: "Q8H",
        catalogMedication: {
          code: "PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE",
          displayNameEn: "Piperacillin-tazobactam",
          displayNameFr: "Pipéracilline-tazobactam",
          genericName: "Piperacillin-tazobactam",
          strength: "3.375 g",
        },
      },
      language: "en",
      t: tEn,
    });
    expect(header).toContain("Piperacillin");
    expect(header).toContain("3.375 g");
    expect(header).toContain("IVPB");
    expect(header).toContain("q8h");
    expect(header).not.toContain(ORDER_ITEM_ID);
  });

  it("uses French frequency labels when locale is fr", () => {
    const header = resolveMedicationOrderGovernanceClinicalHeader({
      orderItem: {
        catalogItemType: "MEDICATION",
        route: "PO",
        frequencyCode: "BID",
        catalogMedication: {
          displayNameFr: "Paracétamol",
          displayNameEn: "Acetaminophen",
          genericName: "Paracetamol",
          strength: "500 mg",
        },
        strength: "500 mg",
      },
      language: "fr",
      t: tFr,
    });
    expect(header).toContain("Paracétamol");
    expect(header).toContain("PO");
    expect(header).not.toContain(ORDER_ITEM_ID);
  });

  it("falls back to generic medication order label when identity is unavailable", () => {
    const header = resolveMedicationOrderGovernanceClinicalHeader({
      orderItem: {
        catalogItemType: "MEDICATION",
      },
      language: "en",
      t: tEn,
    });
    expect(header).toBe("Medication order");
    expect(header).not.toContain(ORDER_ITEM_ID);
  });

  it("never surfaces orderItem.id when manualLabel is absent", () => {
    const header = resolveMedicationOrderGovernanceClinicalHeader({
      orderItem: {
        catalogItemType: "MEDICATION",
        manualLabel: null,
      },
      language: "en",
      t: tEn,
    });
    expect(isClinicianFacingUuid(header)).toBe(false);
  });

  it("supports STAT and CONTINUOUS frequency display", () => {
    const stat = resolveMedicationOrderGovernanceClinicalHeader({
      orderItem: {
        catalogItemType: "MEDICATION",
        frequencyCode: "STAT",
        catalogMedication: {
          displayNameEn: "Epinephrine",
          displayNameFr: "Épinéphrine",
          genericName: "Epinephrine",
        },
      },
      language: "en",
      t: tEn,
    });
    expect(stat).toContain("STAT");

    const continuous = resolveMedicationOrderGovernanceClinicalHeader({
      orderItem: {
        catalogItemType: "MEDICATION",
        frequencyCode: "CONTINUOUS",
        route: "IV",
        catalogMedication: {
          displayNameEn: "Normal Saline",
          displayNameFr: "NaCl 0,9 %",
          genericName: "Sodium Chloride",
        },
      },
      language: "en",
      t: tEn,
    });
    expect(continuous.toLowerCase()).toContain("continuous");
  });
});
