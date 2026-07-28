/**
 * MEDUI.D4C.5B.1 — Clinic follow-up projection accuracy tests (A–J).
 */
import { describe, expect, it } from "vitest";
import {
  clinicCareFollowUpDrillDownHref,
  countClinicFollowUpsForPeriod,
  followUpsListDrillDownHref,
  projectClinicFollowUpStatus,
  resolveClinicFollowUpPeriod,
  resolveFollowUpFacilityScope,
} from "./clinicFollowUpProjectionD4c5b1.js";
import {
  facilityLocalDayUtcBounds,
  isClinicCareFollowUpDue,
} from "./clinicCareTrackboardProjectionD4c2.js";

const FAC = "fac-clinic";
const NOW = new Date("2026-07-27T15:00:00.000Z"); // Monday afternoon UTC
const TZ = "America/Port-au-Prince";

describe("MEDUI.D4C.5B.1 clinicFollowUpProjection", () => {
  const today = facilityLocalDayUtcBounds(NOW, TZ);
  const week = resolveClinicFollowUpPeriod(NOW, TZ, "WEEK");
  const month = resolveClinicFollowUpPeriod(NOW, TZ, "MONTH");

  it("A. WEEK forward period includes mid-week scheduled OPEN follow-up", () => {
    // due 3 days from today start → inside forward WEEK, outside TODAY
    const dueMidWeek = new Date(today.startUtc.getTime() + 3 * 86_400_000 + 12 * 3_600_000);
    const p = projectClinicFollowUpStatus({
      authenticatedFacilityId: FAC,
      record: {
        facilityId: FAC,
        status: "OPEN",
        dueDate: dueMidWeek,
        linkedEncounterType: "OUTPATIENT",
      },
      periodEndExclusiveUtc: week.endExclusiveUtc,
      todayStartUtc: today.startUtc,
      todayEndExclusiveUtc: today.endExclusiveUtc,
    });
    expect(p.countsTowardActionablePeriodKpi).toBe(true);
    expect(p.presentationStatus).toBe("SCHEDULED");
    expect(
      isClinicCareFollowUpDue({
        authenticatedFacilityId: FAC,
        followUpFacilityId: FAC,
        status: "OPEN",
        dueDate: dueMidWeek,
        dayEndExclusiveUtc: today.endExclusiveUtc,
      })
    ).toBe(false);
  });

  it("B. TODAY actionable matches trackboard isClinicCareFollowUpDue (incl. overdue)", () => {
    const dueToday = new Date(today.startUtc.getTime() + 3_600_000);
    const overdue = new Date(today.startUtc.getTime() - 86_400_000);
    const tomorrow = today.endExclusiveUtc;

    for (const due of [dueToday, overdue]) {
      const p = projectClinicFollowUpStatus({
        authenticatedFacilityId: FAC,
        record: { facilityId: FAC, status: "OPEN", dueDate: due },
        periodEndExclusiveUtc: today.endExclusiveUtc,
        todayStartUtc: today.startUtc,
        todayEndExclusiveUtc: today.endExclusiveUtc,
      });
      const track = isClinicCareFollowUpDue({
        authenticatedFacilityId: FAC,
        followUpFacilityId: FAC,
        status: "OPEN",
        dueDate: due,
        dayEndExclusiveUtc: today.endExclusiveUtc,
      });
      expect(p.countsTowardActionablePeriodKpi).toBe(track);
      expect(track).toBe(true);
    }

    const future = projectClinicFollowUpStatus({
      authenticatedFacilityId: FAC,
      record: { facilityId: FAC, status: "OPEN", dueDate: tomorrow },
      periodEndExclusiveUtc: today.endExclusiveUtc,
      todayStartUtc: today.startUtc,
      todayEndExclusiveUtc: today.endExclusiveUtc,
    });
    expect(future.countsTowardActionablePeriodKpi).toBe(false);
    expect(
      isClinicCareFollowUpDue({
        authenticatedFacilityId: FAC,
        followUpFacilityId: FAC,
        status: "OPEN",
        dueDate: tomorrow,
        dayEndExclusiveUtc: today.endExclusiveUtc,
      })
    ).toBe(false);
  });

  it("C. facility scope via FollowUp.facilityId or encounter.facilityId; cross-facility excluded", () => {
    expect(
      resolveFollowUpFacilityScope({
        authenticatedFacilityId: FAC,
        followUpFacilityId: FAC,
      })
    ).toBe(true);
    expect(
      resolveFollowUpFacilityScope({
        authenticatedFacilityId: FAC,
        followUpFacilityId: "other",
        encounterFacilityId: FAC,
      })
    ).toBe(true);
    expect(
      resolveFollowUpFacilityScope({
        authenticatedFacilityId: FAC,
        followUpFacilityId: "other",
        appointmentFacilityId: FAC,
      })
    ).toBe(true);
    expect(
      resolveFollowUpFacilityScope({
        authenticatedFacilityId: FAC,
        followUpFacilityId: "other",
      })
    ).toBe(false);

    const cross = projectClinicFollowUpStatus({
      authenticatedFacilityId: FAC,
      record: {
        facilityId: "other",
        status: "OPEN",
        dueDate: today.startUtc,
      },
      periodEndExclusiveUtc: week.endExclusiveUtc,
      todayStartUtc: today.startUtc,
      todayEndExclusiveUtc: today.endExclusiveUtc,
    });
    expect(cross.countsTowardActionablePeriodKpi).toBe(false);
    expect(cross.presentationStatus).toBe("EXCLUDED");
  });

  it("D. COMPLETED and CANCELLED never count as actionable", () => {
    for (const status of ["COMPLETED", "CANCELLED"] as const) {
      const p = projectClinicFollowUpStatus({
        authenticatedFacilityId: FAC,
        record: {
          facilityId: FAC,
          status,
          dueDate: new Date(today.startUtc.getTime() + 2 * 86_400_000),
        },
        periodEndExclusiveUtc: week.endExclusiveUtc,
        todayStartUtc: today.startUtc,
        todayEndExclusiveUtc: today.endExclusiveUtc,
      });
      expect(p.countsTowardActionablePeriodKpi).toBe(false);
      expect(p.presentationStatus).toBe(status);
    }
  });

  it("E. non-ambulatory linked encounter excluded; unlinked allowed", () => {
    const due = new Date(today.startUtc.getTime() + 86_400_000);
    const ed = projectClinicFollowUpStatus({
      authenticatedFacilityId: FAC,
      record: {
        facilityId: FAC,
        status: "OPEN",
        dueDate: due,
        linkedEncounterType: "EMERGENCY",
      },
      periodEndExclusiveUtc: week.endExclusiveUtc,
      todayStartUtc: today.startUtc,
      todayEndExclusiveUtc: today.endExclusiveUtc,
    });
    expect(ed.countsTowardActionablePeriodKpi).toBe(false);
    expect(ed.presentationStatus).toBe("EXCLUDED");

    const unlinked = projectClinicFollowUpStatus({
      authenticatedFacilityId: FAC,
      record: { facilityId: FAC, status: "OPEN", dueDate: due },
      periodEndExclusiveUtc: week.endExclusiveUtc,
      todayStartUtc: today.startUtc,
      todayEndExclusiveUtc: today.endExclusiveUtc,
    });
    expect(unlinked.countsTowardActionablePeriodKpi).toBe(true);
  });

  it("F. closed-encounter link still counts (encounter status unused)", () => {
    const due = new Date(today.startUtc.getTime() + 2 * 86_400_000);
    const p = projectClinicFollowUpStatus({
      authenticatedFacilityId: FAC,
      record: {
        facilityId: FAC,
        status: "OPEN",
        dueDate: due,
        linkedEncounterType: "OUTPATIENT",
        encounterFacilityId: FAC,
      },
      periodEndExclusiveUtc: week.endExclusiveUtc,
      todayStartUtc: today.startUtc,
      todayEndExclusiveUtc: today.endExclusiveUtc,
    });
    expect(p.countsTowardActionablePeriodKpi).toBe(true);
  });

  it("G. resolveClinicFollowUpPeriod uses forward half-open windows + facility TZ", () => {
    expect(week.dayCount).toBe(7);
    expect(month.dayCount).toBe(30);
    expect(week.startUtc.getTime()).toBe(today.startUtc.getTime());
    expect(week.endExclusiveUtc.getTime()).toBeGreaterThan(today.endExclusiveUtc.getTime());
    expect(week.dateFromKey).toBe(today.localDateKey);
    // last included day is start + 6 days
    expect(week.dateToKey).not.toBe(week.dateFromKey);
  });

  it("H. countClinicFollowUpsForPeriod aggregates without fabricating zeros from gaps", () => {
    const records = [
      {
        facilityId: FAC,
        status: "OPEN",
        dueDate: new Date(today.startUtc.getTime() - 86_400_000),
      },
      {
        facilityId: FAC,
        status: "OPEN",
        dueDate: new Date(today.startUtc.getTime() + 3_600_000),
      },
      {
        facilityId: FAC,
        status: "OPEN",
        dueDate: new Date(today.startUtc.getTime() + 4 * 86_400_000),
      },
      {
        facilityId: FAC,
        status: "COMPLETED",
        dueDate: new Date(today.startUtc.getTime() + 86_400_000),
      },
      {
        facilityId: "other",
        status: "OPEN",
        dueDate: new Date(today.startUtc.getTime() + 86_400_000),
      },
    ];
    const counts = countClinicFollowUpsForPeriod({
      authenticatedFacilityId: FAC,
      records,
      periodEndExclusiveUtc: week.endExclusiveUtc,
      todayStartUtc: today.startUtc,
      todayEndExclusiveUtc: today.endExclusiveUtc,
    });
    expect(counts.actionable).toBe(3);
    expect(counts.overdue).toBe(1);
    expect(counts.dueToday).toBe(1);
    expect(counts.scheduledInPeriod).toBe(1);
    expect(counts.completed).toBe(1);
    expect(counts.excluded).toBe(1);
  });

  it("I. drill-down hrefs carry period + date + actionable status filters", () => {
    const href = clinicCareFollowUpDrillDownHref({
      period: "WEEK",
      dateFromKey: week.dateFromKey,
      dateToKey: week.dateToKey,
      endExclusiveIso: week.endExclusiveUtc.toISOString(),
    });
    expect(href).toContain("/app/clinic-care/follow-up?");
    expect(href).toContain("period=WEEK");
    expect(href).toContain("status=OPEN");
    expect(href).toContain("actionable=1");
    expect(href).toContain(`dateFrom=${week.dateFromKey}`);
    expect(href).toContain(`dateTo=${week.dateToKey}`);
    expect(href).toContain("endExclusive=");

    const list = followUpsListDrillDownHref({
      period: "TODAY",
      dateFromKey: today.localDateKey,
      dateToKey: today.localDateKey,
      endExclusiveIso: today.endExclusiveUtc.toISOString(),
    });
    expect(list.startsWith("/app/follow-ups?")).toBe(true);
  });

  it("J. MONTH includes day+10 scheduled; TODAY excludes it", () => {
    const due = new Date(today.startUtc.getTime() + 10 * 86_400_000);
    const forMonth = projectClinicFollowUpStatus({
      authenticatedFacilityId: FAC,
      record: { facilityId: FAC, status: "OPEN", dueDate: due },
      periodEndExclusiveUtc: month.endExclusiveUtc,
      todayStartUtc: today.startUtc,
      todayEndExclusiveUtc: today.endExclusiveUtc,
    });
    const forToday = projectClinicFollowUpStatus({
      authenticatedFacilityId: FAC,
      record: { facilityId: FAC, status: "OPEN", dueDate: due },
      periodEndExclusiveUtc: today.endExclusiveUtc,
      todayStartUtc: today.startUtc,
      todayEndExclusiveUtc: today.endExclusiveUtc,
    });
    expect(forMonth.countsTowardActionablePeriodKpi).toBe(true);
    expect(forToday.countsTowardActionablePeriodKpi).toBe(false);
  });
});
