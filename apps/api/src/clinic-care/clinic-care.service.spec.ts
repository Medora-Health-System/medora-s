import {
  CLINIC_CARE_ROW_LIMIT,
  clinicCareAmbulatoryTypesForQuery,
  ClinicCareService,
} from "./clinic-care.service";
import {
  countClinicCareMetricsFromEncounters,
  facilityLocalDayUtcBounds,
  isClinicCareFollowUpDue,
  projectClinicCareStage,
  resolveClinicCareTrackboardFieldVisibility,
  resolveClinicCareWorkspaceRoleAccess,
  resolveFacilityModuleCapabilitiesD4c1,
} from "@medora/shared";

function clinicAccess(profession: "PROVIDER" | "RN" | "TECHNICIAN" | "FRONT_DESK" | "BILLING" | "PHARMACY") {
  const caps = resolveFacilityModuleCapabilitiesD4c1({
    facilityType: "CLINIC",
    careProfileJson:
      profession === "PHARMACY"
        ? { schemaVersion: 1, optionalModules: { pharmacy: true } }
        : null,
  });
  return resolveClinicCareWorkspaceRoleAccess({
    professionGroup: profession,
    moduleCapabilities: caps,
    roleCodes: [profession === "TECHNICIAN" ? "PATIENT_CARE_TECH" : profession],
  });
}

describe("MEDUI.D4C.2 ClinicCareService projection", () => {
  it("queries only ambulatory encounter types", () => {
    expect(clinicCareAmbulatoryTypesForQuery()).toEqual(["OUTPATIENT", "URGENT_CARE"]);
  });

  it("maps metric contracts without inventing unsupported stages", () => {
    const day = facilityLocalDayUtcBounds(new Date("2026-07-27T15:00:00.000Z"), "America/Chicago");
    const metrics = countClinicCareMetricsFromEncounters({
      encounters: [
        {
          workflowState: "TRIAGE",
          status: "OPEN",
          createdAt: new Date(day.startUtc.getTime() + 5_000),
          resultsPendingCount: 0,
        },
        {
          workflowState: "IN_TREATMENT",
          status: "OPEN",
          createdAt: new Date(day.startUtc.getTime() + 6_000),
          resultsPendingCount: 3,
        },
      ],
      followUpsDue: 1,
      dayStartUtc: day.startUtc,
      dayEndExclusiveUtc: day.endExclusiveUtc,
    });
    expect(metrics.WAITING).toBe(1);
    expect(metrics.RESULTS_PENDING).toBe(1);
    expect(metrics.FOLLOW_UPS_DUE).toBe(1);
    expect(projectClinicCareStage({ workflowState: "UNKNOWN_X", encounterStatus: "OPEN" }).stageId).toBe(
      "NEEDS_REVIEW"
    );
  });

  it("15. unknown workflow state safe fallback", () => {
    expect(projectClinicCareStage({ workflowState: "", encounterStatus: "OPEN" }).stageId).toBe(
      "STATUS_UNAVAILABLE"
    );
    expect(projectClinicCareStage({ workflowState: "WEIRD", encounterStatus: "OPEN" }).stageId).toBe(
      "NEEDS_REVIEW"
    );
  });

  it("12/13/14. projects role-filtered bounded rows with empty facility response", async () => {
    const day = facilityLocalDayUtcBounds(new Date("2026-07-27T18:00:00.000Z"), "America/Chicago");
    const prisma = {
      followUp: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      encounter: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const trackboard = {
      getOperationalAggregatesForEncounterIds: jest.fn().mockResolvedValue(new Map()),
    };
    const service = new ClinicCareService(prisma as never, trackboard as never);
    const access = clinicAccess("FRONT_DESK");
    const caps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" });

    const result = await service.getTrackboardProjection({
      facilityId: "fac-empty",
      facility: {
        name: "Empty Clinic",
        timezone: "America/Chicago",
        facilityType: "CLINIC",
        serviceLinesJson: ["CLINIC"],
        facilityCareProfileJson: null,
      },
      serviceLines: ["CLINIC"],
      access,
      professionGroup: "FRONT_DESK",
      moduleCapabilities: caps,
      now: new Date("2026-07-27T18:00:00.000Z"),
    });

    expect(result.rows).toEqual([]);
    expect(result.metrics.TODAYS_VISITS).toBe(0);
    expect(result.rowLimit).toBe(CLINIC_CARE_ROW_LIMIT);
    expect(result.truncated).toBe(false);
    expect(result.facilityId).toBe("fac-empty");
    expect(result.localDateKey).toBe(day.localDateKey);
    expect(result.fieldVisibility.showChiefComplaint).toBe(false);
    expect(prisma.encounter.findMany).toHaveBeenCalled();
    const openCall = prisma.encounter.findMany.mock.calls[0][0];
    expect(openCall.where.facilityId).toBe("fac-empty");
    expect(openCall.take).toBe(CLINIC_CARE_ROW_LIMIT);
    expect(openCall.where.type.in).toEqual(["OUTPATIENT", "URGENT_CARE"]);
  });

  it("8. excludes cross-facility encounters via facility-scoped query", async () => {
    const prisma = {
      followUp: { findMany: jest.fn().mockResolvedValue([]) },
      encounter: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "enc-1",
            facilityId: "fac-a",
            patientId: "p1",
            type: "OUTPATIENT",
            status: "OPEN",
            workflowState: "ARRIVED",
            createdAt: new Date("2026-07-27T15:00:00.000Z"),
            roomLabel: "R1",
            chiefComplaint: "secret clinical",
            patient: { firstName: "A", lastName: "B", mrn: "1" },
            physicianAssigned: null,
            nurseAssigned: null,
            triage: null,
          },
        ]),
      },
    };
    const trackboard = {
      getOperationalAggregatesForEncounterIds: jest.fn().mockResolvedValue(
        new Map([["enc-1", { openOrderCount: 2, resultsPendingCount: 1 }]])
      ),
    };
    const service = new ClinicCareService(prisma as never, trackboard as never);
    const access = clinicAccess("BILLING");
    const caps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" });
    const result = await service.getTrackboardProjection({
      facilityId: "fac-a",
      facility: {
        name: "Clinic A",
        timezone: "America/Chicago",
        facilityType: "CLINIC",
        serviceLinesJson: ["CLINIC"],
      },
      serviceLines: ["CLINIC"],
      access,
      professionGroup: "BILLING",
      moduleCapabilities: caps,
      now: new Date("2026-07-27T18:00:00.000Z"),
    });

    expect(prisma.encounter.findMany.mock.calls.every((c) => c[0].where.facilityId === "fac-a")).toBe(
      true
    );
    expect(trackboard.getOperationalAggregatesForEncounterIds).toHaveBeenCalledWith("fac-a", ["enc-1"]);
    // 12. Result payload excludes unnecessary sensitive fields for Billing
    expect(result.rows[0]!.chiefComplaint).toBeNull();
    expect(result.rows[0]!.openOrderCount).toBe(0);
    expect(result.rows[0]!.resultsPendingCount).toBe(0);
    expect(result.access.canIssueProviderOrders).toBe(false);
    expect(result.access.canAuthorProviderDocumentation).toBe(false);
  });

  it("hardens FOLLOW_UPS_DUE and strips Front Desk clinical fields", async () => {
    const day = facilityLocalDayUtcBounds(new Date("2026-07-27T18:00:00.000Z"), "America/Chicago");
    const prisma = {
      followUp: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "fu-today",
            facilityId: "fac-a",
            status: "OPEN",
            dueDate: new Date(day.startUtc.getTime() + 1000),
            encounterId: "enc-1",
            encounter: { type: "OUTPATIENT", facilityId: "fac-a" },
          },
          {
            id: "fu-tomorrow",
            facilityId: "fac-a",
            status: "OPEN",
            dueDate: day.endExclusiveUtc,
            encounterId: null,
            encounter: null,
          },
          {
            id: "fu-ed",
            facilityId: "fac-a",
            status: "OPEN",
            dueDate: day.startUtc,
            encounterId: "enc-ed",
            encounter: { type: "EMERGENCY", facilityId: "fac-a" },
          },
        ]),
      },
      encounter: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "enc-1",
            facilityId: "fac-a",
            patientId: "p1",
            type: "OUTPATIENT",
            status: "OPEN",
            workflowState: "DISCHARGE_READY",
            createdAt: new Date(day.startUtc.getTime() + 2000),
            roomLabel: "R2",
            chiefComplaint: "clinical reason",
            patient: { firstName: "Pat", lastName: "One", mrn: "MRN1" },
            physicianAssigned: { firstName: "Doc", lastName: "Tor" },
            nurseAssigned: { firstName: "Nur", lastName: "Se" },
            triage: { chiefComplaint: "triage cc" },
          },
        ]),
      },
    };
    const trackboard = {
      getOperationalAggregatesForEncounterIds: jest.fn().mockResolvedValue(new Map()),
    };
    const service = new ClinicCareService(prisma as never, trackboard as never);
    const result = await service.getTrackboardProjection({
      facilityId: "fac-a",
      facility: {
        name: "Clinic A",
        timezone: "America/Chicago",
        facilityType: "CLINIC",
        serviceLinesJson: ["CLINIC"],
      },
      serviceLines: ["CLINIC"],
      access: clinicAccess("FRONT_DESK"),
      professionGroup: "FRONT_DESK",
      moduleCapabilities: resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" }),
      now: new Date("2026-07-27T18:00:00.000Z"),
    });

    expect(result.metrics.FOLLOW_UPS_DUE).toBe(1);
    expect(result.metrics.DISCHARGE_PENDING).toBe(1);
    expect(result.rows[0]!.stageId).toBe("DISCHARGE_PENDING");
    expect(result.rows[0]!.chiefComplaint).toBeNull();
    expect(result.rows[0]!.nurseName).toBeNull();
    expect(result.fieldVisibility).toEqual(resolveClinicCareTrackboardFieldVisibility("FRONT_DESK"));
    expect(
      isClinicCareFollowUpDue({
        authenticatedFacilityId: "fac-a",
        followUpFacilityId: "fac-a",
        status: "OPEN",
        dueDate: day.endExclusiveUtc,
        dayEndExclusiveUtc: day.endExclusiveUtc,
      })
    ).toBe(false);
  });

  it("service class is constructible with injected deps (smoke)", () => {
    const service = new ClinicCareService({} as any, {} as any);
    expect(service).toBeInstanceOf(ClinicCareService);
  });

  it("D4C.5A dashboard omits provider productivity for non-ADMIN and returns five KPIs", async () => {
    const prisma = {
      followUp: { findMany: jest.fn().mockResolvedValue([]) },
      encounter: { findMany: jest.fn().mockResolvedValue([]) },
      appointment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const trackboard = {
      getOperationalAggregatesForEncounterIds: jest.fn().mockResolvedValue(new Map()),
    };
    const service = new ClinicCareService(prisma as never, trackboard as never);
    const access = clinicAccess("PROVIDER");
    const caps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" });

    const result = await service.getDashboardProjection({
      facilityId: "fac-dash",
      facility: {
        name: "Dash Clinic",
        timezone: "America/Port-au-Prince",
        facilityType: "CLINIC",
        serviceLinesJson: ["CLINIC"],
        facilityCareProfileJson: null,
      },
      serviceLines: ["CLINIC"],
      access,
      professionGroup: "PROVIDER",
      moduleCapabilities: caps,
      period: "WEEK",
      now: new Date("2026-07-27T18:00:00.000Z"),
    });

    expect(result.providerProductivity).toBeNull();
    expect(result.access.canViewProviderProductivity).toBe(false);
    expect(result.kpis).toHaveLength(5);
    expect(result.kpis.map((k) => k.id)).not.toContain("REVENUE_TODAY");
    expect(result.missedAppointments.statusSource).toBe("NO_SHOW");
    expect(result.period).toBe("WEEK");
    expect(prisma.appointment.findMany).toHaveBeenCalled();
  });

  it("D4C.5A dashboard includes provider productivity for ADMIN", async () => {
    const prisma = {
      followUp: { findMany: jest.fn().mockResolvedValue([]) },
      encounter: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "e1",
            status: "CLOSED",
            type: "OUTPATIENT",
            workflowState: "CLOSED",
            createdAt: new Date("2026-07-27T14:00:00.000Z"),
            dischargedAt: new Date("2026-07-27T15:00:00.000Z"),
            visitOrigin: "SCHEDULED",
            physicianAssignedUserId: "u1",
            physicianAssignedAt: new Date("2026-07-27T14:20:00.000Z"),
            physicianAssigned: { id: "u1", firstName: "Ada", lastName: "Lovelace" },
            appointment: {
              arrivedAt: new Date("2026-07-27T14:00:00.000Z"),
              checkedInAt: new Date("2026-07-27T14:05:00.000Z"),
              status: "CHECKED_IN",
            },
            intake: null,
            followUpDate: null,
          },
        ]),
      },
      appointment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ClinicCareService(prisma as never, {
      getOperationalAggregatesForEncounterIds: jest.fn(),
    } as never);
    const caps = resolveFacilityModuleCapabilitiesD4c1({ facilityType: "CLINIC" });
    const access = resolveClinicCareWorkspaceRoleAccess({
      professionGroup: "ADMIN",
      moduleCapabilities: caps,
      roleCodes: ["ADMIN"],
    });

    const result = await service.getDashboardProjection({
      facilityId: "fac-admin",
      facility: {
        name: "Admin Clinic",
        timezone: "UTC",
        facilityType: "CLINIC",
        serviceLinesJson: ["CLINIC"],
        facilityCareProfileJson: null,
      },
      serviceLines: ["CLINIC"],
      access,
      professionGroup: "ADMIN",
      moduleCapabilities: caps,
      period: "TODAY",
      now: new Date("2026-07-27T18:00:00.000Z"),
    });

    expect(result.access.canViewProviderProductivity).toBe(true);
    expect(result.providerProductivity).not.toBeNull();
    expect(result.providerProductivity?.[0]?.providerDisplayName).toContain("Ada");
  });
});
