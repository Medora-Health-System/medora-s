import { describe, expect, it } from "vitest";
import type { EdAllEncountersArchiveRow } from "@/features/emergency/edAllEncountersArchive";
import {
  ED_ALL_ENCOUNTERS_BILLING_CODING_FILTERS,
  filterAllEncountersByBillingCodingStatus,
  isArchiveRowBillingReviewNeeded,
  isArchiveRowCodingReviewNeeded,
  isArchiveRowReadyForBilling,
} from "@/features/emergency/edAllEncountersBillingCodingFilters";

function baseRow(overrides: Partial<EdAllEncountersArchiveRow> = {}): EdAllEncountersArchiveRow {
  return {
    id: "enc-1",
    patientName: "Marie Joseph",
    mrn: "MRN-100",
    gender: "F",
    age: 36,
    dob: "1990-01-01",
    chiefComplaint: "Chest pain",
    visitDate: "2026-06-01T10:00:00.000Z",
    los: "04h 30m",
    status: "certified_closed",
    facilityName: "Clinique Medora",
    billingStatusLabel: "ready_for_billing",
    billingReady: true,
    codingReady: true,
    billingFinalizationStatus: "READY",
    billingReadinessSnapshot: { isReady: true },
    phone: "555-0100",
    chartHref: "/app/emergency/chart/enc-1",
    demoHref: "/app/patients/pat-1/profile",
    certifiedClosed: true,
    allEncountersEligible: true,
    updatedAt: "2026-06-01T14:30:00.000Z",
    ...overrides,
  };
}

describe("edAllEncountersBillingCodingFilters (MEDUI.ED.LIFECYCLE.7A)", () => {
  it("exposes all quick filter options", () => {
    expect(ED_ALL_ENCOUNTERS_BILLING_CODING_FILTERS).toEqual([
      "ALL",
      "READY_FOR_BILLING",
      "BILLING_REVIEW_NEEDED",
      "CODING_REVIEW_NEEDED",
    ]);
  });

  it("Ready For Billing filter matches billingReady and codingReady rows", () => {
    const rows = [
      baseRow(),
      baseRow({ id: "enc-2", billingReady: false, codingReady: false, billingStatusLabel: "billing_not_ready" }),
    ];
    const filtered = filterAllEncountersByBillingCodingStatus(rows, "READY_FOR_BILLING");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("enc-1");
    expect(isArchiveRowReadyForBilling(rows[0]!)).toBe(true);
  });

  it("Billing Review Needed filter matches billing-not-ready rows", () => {
    const rows = [
      baseRow(),
      baseRow({
        id: "enc-2",
        billingReady: false,
        codingReady: true,
        billingStatusLabel: "billing_not_ready",
        billingReadinessSnapshot: { isReady: false },
      }),
    ];
    const filtered = filterAllEncountersByBillingCodingStatus(rows, "BILLING_REVIEW_NEEDED");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("enc-2");
    expect(isArchiveRowBillingReviewNeeded(rows[1]!)).toBe(true);
  });

  it("Coding Review Needed filter matches coding-not-ready rows", () => {
    const rows = [
      baseRow(),
      baseRow({
        id: "enc-3",
        billingReady: false,
        codingReady: false,
        billingStatusLabel: "coding_review_needed",
      }),
    ];
    const filtered = filterAllEncountersByBillingCodingStatus(rows, "CODING_REVIEW_NEEDED");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("enc-3");
    expect(isArchiveRowCodingReviewNeeded(rows[1]!)).toBe(true);
  });

  it("All filter returns every loaded row", () => {
    const rows = [
      baseRow(),
      baseRow({ id: "enc-2", billingStatusLabel: "not_reviewed", billingReadinessSnapshot: null }),
      baseRow({ id: "enc-3", billingStatusLabel: "coding_review_needed", codingReady: false }),
    ];
    expect(filterAllEncountersByBillingCodingStatus(rows, "ALL")).toHaveLength(3);
  });
});
