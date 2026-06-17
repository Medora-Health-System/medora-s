import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildMarShiftTimelineItemHoverTitle } from "@/features/mar/marShiftTimelineDisplay";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

function readPanelSrc(): string {
  return readFileSync(
    join(process.cwd(), "src/components/mar/MedicationTimingOverrideJustificationPanel.tsx"),
    "utf8"
  );
}

function baseItem(
  administrationVariance: NonNullable<MarShiftTimelineCellItem["administrationVariance"]>
): MarShiftTimelineCellItem {
  return {
    type: "MEDICATION",
    orderItemId: "oi-1",
    medicationDoseInstanceId: "dose-1",
    medicationLabel: "Rocephin",
    primaryText: "Rocephin",
    secondaryText: "IV",
    tertiaryText: null,
    doseStatus: "COMPLETED",
    readOnly: true,
    route: "IV",
    scheduledAt: administrationVariance.scheduledAt ?? "2026-06-03T23:00:00.000Z",
    dueWindowStartAt: "2026-06-03T22:30:00.000Z",
    dueWindowEndAt: "2026-06-04T00:00:00.000Z",
    clinicalAction: "ADMINISTER",
    hover: { title: "Rocephin", due: null, dose: null, route: null, witness: null, status: null },
    actions: [],
    administrationVariance,
  } as unknown as MarShiftTimelineCellItem;
}

describe("marAdministrationVarianceDrawer", () => {
  it("panel renders early/late/on-time reconstruction fields", () => {
    const src = readPanelSrc();
    expect(src).toContain('data-testid="mar-variance-reason"');
    expect(src).toContain('data-testid="mar-variance-reason-detail"');
    expect(src).toContain('data-testid="mar-variance-performer"');
    expect(src).toContain('data-testid="mar-variance-performed-at"');
    expect(src).toContain('data-testid="mar-variance-severity"');
    expect(src).toContain('data-testid="mar-variance-high-risk"');
    expect(src).toContain('data-testid="mar-timing-override-review-recommended"');
    expect(src).toContain("marTimingOverride.panel.administeredBy");
    expect(src).toContain("marAdministrationVariance.classification.");
  });

  it("includes variance reason in timeline hover tooltip", () => {
    const title = buildMarShiftTimelineItemHoverTitle(
      baseItem({
        hasVariance: true,
        classification: "EARLY_ADMINISTRATION",
        badgeLabel: "EARLY",
        scheduledAt: "2026-06-03T23:00:00.000Z",
        administeredAt: "2026-06-03T21:00:00.000Z",
        effectiveScheduledAt: "2026-06-03T23:00:00.000Z",
        actualAdministrationAt: "2026-06-03T21:00:00.000Z",
        varianceMinutes: -120,
        severity: "HIGH",
        reviewRecommended: true,
        reasonCode: "CLINICAL_CONDITION",
        reasonDetail: "Patient deteriorating",
        performedByDisplay: "Jane Smith RN",
        performedAt: "2026-06-03T21:00:00.000Z",
      })
    );
    expect(title).toContain("Variance: -120 min");
    expect(title).toContain("Reason: Clinical condition");
    expect(title).toContain("Detail: Patient deteriorating");
    expect(title).toContain("Administered by: Jane Smith RN");
    expect(title).toContain("Risk: HIGH");
    expect(title).toContain("Review recommended");
  });

  it("shows late variance performer and reason in tooltip", () => {
    const title = buildMarShiftTimelineItemHoverTitle(
      baseItem({
        hasVariance: true,
        classification: "LATE_ADMINISTRATION",
        badgeLabel: "LATE",
        scheduledAt: "2026-06-03T10:00:00.000Z",
        administeredAt: "2026-06-03T12:45:00.000Z",
        effectiveScheduledAt: "2026-06-03T10:00:00.000Z",
        actualAdministrationAt: "2026-06-03T12:45:00.000Z",
        varianceMinutes: 165,
        severity: "HIGH",
        reviewRecommended: true,
        reasonCode: "PATIENT_OFF_UNIT",
        reasonDetail: null,
        performedByDisplay: "Elizabeth Posada RN",
        performedAt: "2026-06-03T12:45:00.000Z",
      })
    );
    expect(title).toContain("Reason: Patient off unit");
    expect(title).toContain("Administered by: Elizabeth Posada RN");
  });
});
