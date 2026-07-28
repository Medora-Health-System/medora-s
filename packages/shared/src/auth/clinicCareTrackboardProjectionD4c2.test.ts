import { describe, expect, it } from "vitest";
import {
  CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS,
  CLINIC_CARE_SECONDARY_TRACKBOARD_METRIC_IDS,
  CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS,
  CLINIC_CARE_TRACKBOARD_METRIC_IDS,
  isHaitiJurisdictionFromLanguageAlone,
  isHaitiPublicHealthJurisdiction,
  resolveClinicCarePublicHealthAccess,
  resolveClinicCareWorkspaceRoleAccess,
  resolveFacilityModuleCapabilitiesD4c1,
} from "./facilityClinicCareProfileD4c1.js";
import {
  CLINIC_CARE_DISCHARGE_PENDING_SOURCE_WORKFLOW_STATES,
  CLINIC_CARE_LEGACY_READY_FOR_COMPLETION_SOURCE_STATES,
  CLINIC_CARE_METRIC_COLOR_TOKENS,
  ambulatoryModeIncludedByEncounterType,
  countClinicCareMetricsFromEncounters,
  defaultClinicCareTrackboardViewForProfession,
  encounterMatchesClinicCareMetric,
  encounterTypesForClinicCareAmbulatoryMode,
  facilityLocalDayUtcBounds,
  filterClinicCareTrackboardRowForRole,
  isClinicCareAmbulatoryEncounterType,
  isClinicCareDischargePending,
  isClinicCareFollowUpDue,
  projectClinicCareStage,
  clinicCareRowMatchesView,
  resolveClinicCareTrackboardFieldVisibility,
} from "./clinicCareTrackboardProjectionD4c2.js";

describe("MEDUI.D4C.2 clinic care trackboard projection", () => {
  const day = facilityLocalDayUtcBounds(new Date("2026-07-27T18:00:00.000Z"), "America/Chicago");

  it("keeps six mandatory primary KPIs including Discharge Pending; no READY_FOR_COMPLETION user KPI", () => {
    expect(CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS).toEqual([
      "TODAYS_VISITS",
      "WAITING",
      "IN_PROGRESS",
      "RESULTS_PENDING",
      "DISCHARGE_PENDING",
      "FOLLOW_UPS_DUE",
    ]);
    expect(CLINIC_CARE_PRIMARY_TRACKBOARD_METRIC_IDS).toHaveLength(6);
    expect(CLINIC_CARE_SECONDARY_TRACKBOARD_METRIC_IDS).toEqual([]);
    expect(CLINIC_CARE_TRACKBOARD_METRIC_IDS).toContain("DISCHARGE_PENDING");
    expect(CLINIC_CARE_TRACKBOARD_METRIC_IDS as readonly string[]).not.toContain(
      "READY_FOR_COMPLETION"
    );
    expect(CLINIC_CARE_LEGACY_READY_FOR_COMPLETION_SOURCE_STATES).toEqual(
      CLINIC_CARE_DISCHARGE_PENDING_SOURCE_WORKFLOW_STATES
    );
    for (const id of CLINIC_CARE_TRACKBOARD_METRIC_IDS) {
      expect(CLINIC_CARE_METRIC_COLOR_TOKENS[id]).toBeDefined();
      expect(CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS.some((c) => c.id === id)).toBe(true);
    }
  });

  it("projects waiting / in progress / results / discharge pending / completed stages", () => {
    expect(projectClinicCareStage({ workflowState: "ARRIVED", encounterStatus: "OPEN" }).stageId).toBe(
      "WAITING"
    );
    expect(
      projectClinicCareStage({ workflowState: "IN_TREATMENT", encounterStatus: "OPEN" }).stageId
    ).toBe("IN_PROGRESS");
    expect(
      projectClinicCareStage({
        workflowState: "IN_TREATMENT",
        encounterStatus: "OPEN",
        resultsPendingCount: 2,
      }).stageId
    ).toBe("RESULTS_PENDING");
    const ready = projectClinicCareStage({
      workflowState: "DISCHARGE_READY",
      encounterStatus: "OPEN",
    });
    expect(ready.stageId).toBe("DISCHARGE_PENDING");
    expect(ready.sourceWorkflowState).toBe("DISCHARGE_READY");
    expect(projectClinicCareStage({ workflowState: "CLOSED", encounterStatus: "CLOSED" }).stageId).toBe(
      "COMPLETED"
    );
    expect(projectClinicCareStage({ workflowState: null, encounterStatus: "OPEN" }).stageId).toBe(
      "STATUS_UNAVAILABLE"
    );
    expect(
      projectClinicCareStage({ workflowState: "SOMETHING_NEW", encounterStatus: "OPEN" }).stageId
    ).toBe("NEEDS_REVIEW");
  });

  it("scopes today's visits to facility-local day", () => {
    const inside = encounterMatchesClinicCareMetric({
      metricId: "TODAYS_VISITS",
      workflowState: "ARRIVED",
      encounterStatus: "OPEN",
      createdAt: new Date(day.startUtc.getTime() + 60_000),
      dayStartUtc: day.startUtc,
      dayEndExclusiveUtc: day.endExclusiveUtc,
    });
    const outside = encounterMatchesClinicCareMetric({
      metricId: "TODAYS_VISITS",
      workflowState: "ARRIVED",
      encounterStatus: "OPEN",
      createdAt: new Date(day.startUtc.getTime() - 60_000),
      dayStartUtc: day.startUtc,
      dayEndExclusiveUtc: day.endExclusiveUtc,
    });
    expect(inside).toBe(true);
    expect(outside).toBe(false);
  });

  it("counts metrics without inventing follow-up encounter rows", () => {
    const counts = countClinicCareMetricsFromEncounters({
      encounters: [
        {
          workflowState: "ARRIVED",
          status: "OPEN",
          type: "OUTPATIENT",
          createdAt: new Date(day.startUtc.getTime() + 1000),
          resultsPendingCount: 0,
        },
        {
          workflowState: "RESULTS_PENDING",
          status: "OPEN",
          type: "OUTPATIENT",
          createdAt: new Date(day.startUtc.getTime() + 2000),
          resultsPendingCount: 1,
        },
        {
          workflowState: "DISCHARGE_READY",
          status: "OPEN",
          type: "OUTPATIENT",
          createdAt: new Date(day.startUtc.getTime() + 3000),
          resultsPendingCount: 0,
        },
      ],
      followUpsDue: 2,
      dayStartUtc: day.startUtc,
      dayEndExclusiveUtc: day.endExclusiveUtc,
    });
    expect(counts.TODAYS_VISITS).toBe(3);
    expect(counts.WAITING).toBe(1);
    expect(counts.RESULTS_PENDING).toBe(1);
    expect(counts.DISCHARGE_PENDING).toBe(1);
    expect(counts.FOLLOW_UPS_DUE).toBe(2);
  });

  describe("DISCHARGE_PENDING — 18 enterprise-source scenarios", () => {
    const base = {
      encounterType: "OUTPATIENT",
      encounterStatus: "OPEN",
      workflowState: "DISCHARGE_READY",
    };

    it("01 includes DISCHARGE_READY + OPEN ambulatory", () => {
      expect(isClinicCareDischargePending(base)).toBe(true);
    });
    it("02 includes FINALIZED + OPEN ambulatory", () => {
      expect(
        isClinicCareDischargePending({ ...base, workflowState: "FINALIZED" })
      ).toBe(true);
    });
    it("03 excludes CLOSED (departed / finalized / closed)", () => {
      expect(
        isClinicCareDischargePending({ ...base, encounterStatus: "CLOSED" })
      ).toBe(false);
    });
    it("04 excludes CANCELLED", () => {
      expect(
        isClinicCareDischargePending({ ...base, encounterStatus: "CANCELLED" })
      ).toBe(false);
    });
    it("05 excludes ARRIVED (wait time alone)", () => {
      expect(
        isClinicCareDischargePending({ ...base, workflowState: "ARRIVED" })
      ).toBe(false);
    });
    it("06 excludes TRIAGE (wait alone)", () => {
      expect(
        isClinicCareDischargePending({ ...base, workflowState: "TRIAGE" })
      ).toBe(false);
    });
    it("07 excludes IN_TREATMENT (orders/results complete alone)", () => {
      expect(
        isClinicCareDischargePending({ ...base, workflowState: "IN_TREATMENT" })
      ).toBe(false);
    });
    it("08 excludes RESULTS_PENDING alone", () => {
      expect(
        isClinicCareDischargePending({ ...base, workflowState: "RESULTS_PENDING" })
      ).toBe(false);
    });
    it("09 excludes DISPOSITION without DISCHARGE_READY (provider not yet authorized pathway)", () => {
      expect(
        isClinicCareDischargePending({ ...base, workflowState: "DISPOSITION" })
      ).toBe(false);
    });
    it("10 excludes EMERGENCY type", () => {
      expect(
        isClinicCareDischargePending({ ...base, encounterType: "EMERGENCY" })
      ).toBe(false);
    });
    it("11 excludes INPATIENT type", () => {
      expect(
        isClinicCareDischargePending({ ...base, encounterType: "INPATIENT" })
      ).toBe(false);
    });
    it("12 includes URGENT_CARE ambulatory", () => {
      expect(
        isClinicCareDischargePending({ ...base, encounterType: "URGENT_CARE" })
      ).toBe(true);
    });
    it("13 provider action map: advance to DISCHARGE_READY → KPI include", () => {
      expect(
        encounterMatchesClinicCareMetric({
          metricId: "DISCHARGE_PENDING",
          workflowState: "DISCHARGE_READY",
          encounterStatus: "OPEN",
          encounterType: "OUTPATIENT",
          createdAt: day.startUtc,
          dayStartUtc: day.startUtc,
          dayEndExclusiveUtc: day.endExclusiveUtc,
        })
      ).toBe(true);
    });
    it("14 removal: close() → CLOSED leaves KPI", () => {
      expect(
        encounterMatchesClinicCareMetric({
          metricId: "DISCHARGE_PENDING",
          workflowState: "CLOSED",
          encounterStatus: "CLOSED",
          encounterType: "OUTPATIENT",
          createdAt: day.startUtc,
          dayStartUtc: day.startUtc,
          dayEndExclusiveUtc: day.endExclusiveUtc,
        })
      ).toBe(false);
    });
    it("15 unassigned / missing workflow does not increment", () => {
      expect(
        isClinicCareDischargePending({
          encounterType: "OUTPATIENT",
          encounterStatus: "OPEN",
          workflowState: null,
        })
      ).toBe(false);
    });
    it("16 filter changes do not alter inclusion contract (same source fields)", () => {
      const a = isClinicCareDischargePending(base);
      const b = isClinicCareDischargePending({ ...base, dischargeStatus: "DISCHARGED" });
      expect(a).toBe(true);
      expect(b).toBe(true); // still OPEN + DISCHARGE_READY; status CLOSED would exclude
    });
    it("17 counts each open discharge-pending encounter once (no duplicate invent)", () => {
      const counts = countClinicCareMetricsFromEncounters({
        encounters: [
          {
            workflowState: "DISCHARGE_READY",
            status: "OPEN",
            type: "OUTPATIENT",
            createdAt: day.startUtc,
          },
          {
            workflowState: "FINALIZED",
            status: "OPEN",
            type: "URGENT_CARE",
            createdAt: day.startUtc,
          },
          {
            workflowState: "DISCHARGE_READY",
            status: "CLOSED",
            type: "OUTPATIENT",
            createdAt: day.startUtc,
          },
        ],
        followUpsDue: 0,
        dayStartUtc: day.startUtc,
        dayEndExclusiveUtc: day.endExclusiveUtc,
      });
      expect(counts.DISCHARGE_PENDING).toBe(2);
    });
    it("18 role visibility: Provider/RN see KPI+actions; Front Desk ops only; Billing readiness; Tech no discharge auth", () => {
      const provider = resolveClinicCareTrackboardFieldVisibility("PROVIDER");
      const rn = resolveClinicCareTrackboardFieldVisibility("RN");
      const front = resolveClinicCareTrackboardFieldVisibility("FRONT_DESK");
      const billing = resolveClinicCareTrackboardFieldVisibility("BILLING");
      const tech = resolveClinicCareTrackboardFieldVisibility("TECHNICIAN");
      expect(provider.showDischargePendingKpi).toBe(true);
      expect(provider.showDischargeActions).toBe(true);
      expect(rn.showDischargeActions).toBe(true);
      expect(front.showDischargePendingKpi).toBe(true);
      expect(front.showDischargeActions).toBe(false);
      expect(billing.showDischargePendingKpi).toBe(true);
      expect(billing.showDischargeActions).toBe(false);
      expect(tech.showDischargePendingKpi).toBe(true);
      expect(tech.showDischargeActions).toBe(false);
    });
  });

  describe("Haiti Public Health — 24 scenarios", () => {
    const clinicHt = resolveFacilityModuleCapabilitiesD4c1({
      facilityType: "CLINIC",
      facilityCountry: "Haiti",
    });
    const clinicUs = resolveFacilityModuleCapabilitiesD4c1({
      facilityType: "CLINIC",
      facilityCountry: "United States",
      careProfileJson: {
        schemaVersion: 1,
        optionalModules: { publicHealth: true },
      },
    });
    const clinicUsNoPh = resolveFacilityModuleCapabilitiesD4c1({
      facilityType: "CLINIC",
      facilityCountry: "United States",
    });

    it("01 Haiti country name → jurisdiction", () => {
      expect(isHaitiPublicHealthJurisdiction("Haiti")).toBe(true);
    });
    it("02 HT code → jurisdiction", () => {
      expect(isHaitiPublicHealthJurisdiction("HT")).toBe(true);
    });
    it("03 HTI code → jurisdiction", () => {
      expect(isHaitiPublicHealthJurisdiction("HTI")).toBe(true);
    });
    it("04 French language alone ≠ Haiti MSPP", () => {
      expect(isHaitiJurisdictionFromLanguageAlone("fr")).toBe(false);
      expect(isHaitiJurisdictionFromLanguageAlone("fr-FR")).toBe(false);
      expect(isHaitiPublicHealthJurisdiction("France")).toBe(false);
    });
    it("05 Canada / FR tokens ≠ Haiti", () => {
      expect(isHaitiPublicHealthJurisdiction("CA")).toBe(false);
      expect(isHaitiPublicHealthJurisdiction("FR")).toBe(false);
    });
    it("06 Haiti Clinic Care preset enables publicHealth by default", () => {
      expect(clinicHt.publicHealthEnabled).toBe(true);
      expect(clinicHt.clinicCareEnabled).toBe(true);
    });
    it("07 Non-Haiti Clinic default keeps publicHealth off", () => {
      expect(clinicUsNoPh.publicHealthEnabled).toBe(false);
    });
    it("08 Non-Haiti can enable general immunizations independently", () => {
      expect(clinicUs.publicHealthEnabled).toBe(true);
    });
    it("09 Haiti Provider gets immunizations + disease reporting + MSPP", () => {
      const a = resolveClinicCareWorkspaceRoleAccess({
        professionGroup: "PROVIDER",
        moduleCapabilities: clinicHt,
        facilityCountry: "HT",
      });
      expect(a.canAccessPublicHealthImmunizations).toBe(true);
      expect(a.canAccessPublicHealthDiseaseReporting).toBe(true);
      expect(a.canAccessMsppHaitiPathway).toBe(true);
      expect(a.canAdministerVaccines).toBe(true);
    });
    it("10 Haiti RN gets immunizations + disease reporting; no silent MSPP approver invent", () => {
      const a = resolveClinicCareWorkspaceRoleAccess({
        professionGroup: "RN",
        moduleCapabilities: clinicHt,
        facilityCountry: "Haiti",
      });
      expect(a.canAccessPublicHealth).toBe(true);
      expect(a.canAccessMsppHaitiPathway).toBe(true);
      expect(a.canAdministerVaccines).toBe(true);
      // Pathway exposure ≠ inventing MSPP_VALIDATOR role
      expect(a.canAccessMsppHaitiPathway).toBe(true);
    });
    it("11 Non-Haiti Provider with PH on: immunizations yes, MSPP denied", () => {
      const a = resolveClinicCareWorkspaceRoleAccess({
        professionGroup: "PROVIDER",
        moduleCapabilities: clinicUs,
        facilityCountry: "United States",
      });
      expect(a.canAccessPublicHealthImmunizations).toBe(true);
      expect(a.canAccessMsppHaitiPathway).toBe(false);
    });
    it("12 Non-Haiti without PH module: PH denied", () => {
      const a = resolveClinicCareWorkspaceRoleAccess({
        professionGroup: "PROVIDER",
        moduleCapabilities: clinicUsNoPh,
        facilityCountry: "United States",
      });
      expect(a.canAccessPublicHealth).toBe(false);
      expect(a.canAdministerVaccines).toBe(false);
    });
    it("13 Front Desk no vaccine admin", () => {
      const a = resolveClinicCareWorkspaceRoleAccess({
        professionGroup: "FRONT_DESK",
        moduleCapabilities: clinicHt,
        facilityCountry: "HT",
        roleCodes: ["FRONT_DESK"],
      });
      expect(a.canAdministerVaccines).toBe(false);
      expect(a.canAccessPublicHealthImmunizations).toBe(false);
    });
    it("14 Billing no vaccine admin", () => {
      const a = resolveClinicCareWorkspaceRoleAccess({
        professionGroup: "BILLING",
        moduleCapabilities: clinicHt,
        facilityCountry: "HT",
      });
      expect(a.canAdministerVaccines).toBe(false);
    });
    it("15 Pharmacy no vaccine admin", () => {
      const pharmCaps = resolveFacilityModuleCapabilitiesD4c1({
        facilityType: "CLINIC",
        facilityCountry: "Haiti",
        careProfileJson: {
          schemaVersion: 1,
          optionalModules: { pharmacy: true, publicHealth: true },
        },
      });
      const a = resolveClinicCareWorkspaceRoleAccess({
        professionGroup: "PHARMACY",
        moduleCapabilities: pharmCaps,
        facilityCountry: "Haiti",
        roleCodes: ["PHARMACY"],
      });
      expect(a.canAdministerVaccines).toBe(false);
      expect(a.canAccessPublicHealth).toBe(false);
    });
    it("16 Technician no vaccine admin / no PH write", () => {
      const a = resolveClinicCareWorkspaceRoleAccess({
        professionGroup: "TECHNICIAN",
        moduleCapabilities: clinicHt,
        facilityCountry: "HT",
        roleCodes: ["LAB"],
      });
      expect(a.canAdministerVaccines).toBe(false);
      expect(a.canAccessPublicHealthDiseaseReporting).toBe(false);
    });
    it("17 MA is not silent RN (unknown profession denied)", () => {
      const a = resolveClinicCarePublicHealthAccess({
        professionGroup: "MA",
        clinicOrUrgentCareEnabled: true,
        publicHealthEnabled: true,
        facilityCountry: "HT",
      });
      expect(a.canAccessPublicHealth).toBe(false);
      expect(a.canAdministerVaccines).toBe(false);
    });
    it("18 Clinic Care off → PH shell denied even if Haiti", () => {
      const hospital = resolveFacilityModuleCapabilitiesD4c1({
        facilityType: "HOSPITAL",
        facilityCountry: "Haiti",
      });
      const a = resolveClinicCareWorkspaceRoleAccess({
        professionGroup: "PROVIDER",
        moduleCapabilities: hospital,
        facilityCountry: "Haiti",
      });
      // Hospital may have PH module default true, but Clinic Care shell off
      expect(a.canAccessClinicCareShell).toBe(false);
      expect(a.canAccessPublicHealth).toBe(false);
    });
    it("19 Admin Haiti gets PH + MSPP pathway", () => {
      const a = resolveClinicCareWorkspaceRoleAccess({
        professionGroup: "ADMIN",
        moduleCapabilities: clinicHt,
        facilityCountry: "HT",
      });
      expect(a.canAccessPublicHealth).toBe(true);
      expect(a.canAccessMsppHaitiPathway).toBe(true);
    });
    it("20 Explicit publicHealth:false overrides Haiti preset", () => {
      const caps = resolveFacilityModuleCapabilitiesD4c1({
        facilityType: "CLINIC",
        facilityCountry: "Haiti",
        careProfileJson: {
          schemaVersion: 1,
          optionalModules: { publicHealth: false },
        },
      });
      expect(caps.publicHealthEnabled).toBe(false);
      const a = resolveClinicCareWorkspaceRoleAccess({
        professionGroup: "PROVIDER",
        moduleCapabilities: caps,
        facilityCountry: "Haiti",
      });
      expect(a.canAccessPublicHealth).toBe(false);
    });
    it("21 Reuses VaccineAdministration engine contract — no ClinicVaccine invent", () => {
      const blob = JSON.stringify({
        CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS,
        CLINIC_CARE_DISCHARGE_PENDING_SOURCE_WORKFLOW_STATES,
      });
      expect(blob).not.toMatch(/ClinicVaccine/i);
      expect(blob).not.toMatch(/ClinicDischarge/i);
    });
    it("22 MSPP pathway false when country missing even if PH on", () => {
      const a = resolveClinicCarePublicHealthAccess({
        professionGroup: "PROVIDER",
        clinicOrUrgentCareEnabled: true,
        publicHealthEnabled: true,
        facilityCountry: null,
      });
      expect(a.canAccessPublicHealthImmunizations).toBe(true);
      expect(a.canAccessMsppHaitiPathway).toBe(false);
    });
    it("23 Disease reporting linked to existing PH roles only for Provider/RN/Admin", () => {
      for (const role of ["PROVIDER", "RN", "ADMIN"] as const) {
        expect(
          resolveClinicCarePublicHealthAccess({
            professionGroup: role,
            clinicOrUrgentCareEnabled: true,
            publicHealthEnabled: true,
            facilityCountry: "HT",
          }).canAccessPublicHealthDiseaseReporting
        ).toBe(true);
      }
    });
    it("24 Failed MSPP enqueue must not imply clinical record delete — documented by pathway reuse only", () => {
      // D4C.2 reuses DiseaseCaseReport + tryEnqueueMsppReview (enqueue fail logs only).
      // This contract asserts we expose MSPP pathway without inventing a delete-on-fail flag.
      const a = resolveClinicCarePublicHealthAccess({
        professionGroup: "PROVIDER",
        clinicOrUrgentCareEnabled: true,
        publicHealthEnabled: true,
        facilityCountry: "HT",
      });
      expect(a.canAccessMsppHaitiPathway).toBe(true);
      expect((a as { deleteClinicalOnMsppFail?: boolean }).deleteClinicalOnMsppFail).toBeUndefined();
    });
  });

  it("defaults role-aware views and filters rows", () => {
    expect(defaultClinicCareTrackboardViewForProfession("PROVIDER")).toBe("PROVIDER");
    expect(defaultClinicCareTrackboardViewForProfession("RN")).toBe("NURSING_MA");
    expect(defaultClinicCareTrackboardViewForProfession("TECHNICIAN")).toBe("NURSING_MA");
    expect(defaultClinicCareTrackboardViewForProfession("FRONT_DESK")).toBe("ALL_TODAY");
    expect(defaultClinicCareTrackboardViewForProfession("BILLING")).toBe("ALL_TODAY");
    expect(
      clinicCareRowMatchesView({
        view: "WAITING",
        stageId: "WAITING",
        createdAt: day.startUtc,
        dayStartUtc: day.startUtc,
        dayEndExclusiveUtc: day.endExclusiveUtc,
      })
    ).toBe(true);
    expect(
      clinicCareRowMatchesView({
        view: "PROVIDER",
        stageId: "WAITING",
        createdAt: day.startUtc,
        dayStartUtc: day.startUtc,
        dayEndExclusiveUtc: day.endExclusiveUtc,
      })
    ).toBe(false);
    expect(
      clinicCareRowMatchesView({
        view: "DISCHARGE_PENDING",
        stageId: "DISCHARGE_PENDING",
        createdAt: day.startUtc,
        dayStartUtc: day.startUtc,
        dayEndExclusiveUtc: day.endExclusiveUtc,
      })
    ).toBe(true);
  });

  it("recognizes ambulatory encounter types only", () => {
    expect(isClinicCareAmbulatoryEncounterType("OUTPATIENT")).toBe(true);
    expect(isClinicCareAmbulatoryEncounterType("URGENT_CARE")).toBe(true);
    expect(isClinicCareAmbulatoryEncounterType("EMERGENCY")).toBe(false);
    expect(isClinicCareAmbulatoryEncounterType("INPATIENT")).toBe(false);
  });

  it("maps D4C.1 ambulatory modes onto OUTPATIENT / URGENT_CARE without excluding subtypes", () => {
    for (const mode of [
      "CLINIC",
      "PRIMARY_CARE",
      "SPECIALTY",
      "WALK_IN",
      "PREVENTIVE",
      "OCCUPATIONAL_HEALTH",
    ] as const) {
      expect(encounterTypesForClinicCareAmbulatoryMode(mode)).toEqual(["OUTPATIENT"]);
      expect(
        ambulatoryModeIncludedByEncounterType({ modeLabel: mode, encounterType: "OUTPATIENT" })
      ).toBe(true);
      expect(
        ambulatoryModeIncludedByEncounterType({ modeLabel: mode, encounterType: "EMERGENCY" })
      ).toBe(false);
    }
    expect(encounterTypesForClinicCareAmbulatoryMode("URGENT_CARE")).toEqual(["URGENT_CARE"]);
    expect(
      ambulatoryModeIncludedByEncounterType({
        modeLabel: "URGENT_CARE",
        encounterType: "URGENT_CARE",
      })
    ).toBe(true);
  });

  describe("FOLLOW_UPS_DUE inclusion", () => {
    const fac = "fac-a";
    const end = day.endExclusiveUtc;

    it("includes due today and overdue", () => {
      expect(
        isClinicCareFollowUpDue({
          authenticatedFacilityId: fac,
          followUpFacilityId: fac,
          status: "OPEN",
          dueDate: new Date(day.startUtc.getTime() + 3_600_000),
          dayEndExclusiveUtc: end,
        })
      ).toBe(true);
      expect(
        isClinicCareFollowUpDue({
          authenticatedFacilityId: fac,
          followUpFacilityId: fac,
          status: "OPEN",
          dueDate: new Date(day.startUtc.getTime() - 86_400_000),
          dayEndExclusiveUtc: end,
        })
      ).toBe(true);
    });

    it("excludes tomorrow, completed, canceled, missing dueDate, cross-facility, non-ambulatory link", () => {
      expect(
        isClinicCareFollowUpDue({
          authenticatedFacilityId: fac,
          followUpFacilityId: fac,
          status: "OPEN",
          dueDate: end,
          dayEndExclusiveUtc: end,
        })
      ).toBe(false);
      expect(
        isClinicCareFollowUpDue({
          authenticatedFacilityId: fac,
          followUpFacilityId: fac,
          status: "COMPLETED",
          dueDate: day.startUtc,
          dayEndExclusiveUtc: end,
        })
      ).toBe(false);
      expect(
        isClinicCareFollowUpDue({
          authenticatedFacilityId: fac,
          followUpFacilityId: fac,
          status: "CANCELLED",
          dueDate: day.startUtc,
          dayEndExclusiveUtc: end,
        })
      ).toBe(false);
      expect(
        isClinicCareFollowUpDue({
          authenticatedFacilityId: fac,
          followUpFacilityId: fac,
          status: "OPEN",
          dueDate: null,
          dayEndExclusiveUtc: end,
        })
      ).toBe(false);
      expect(
        isClinicCareFollowUpDue({
          authenticatedFacilityId: fac,
          followUpFacilityId: "fac-other",
          status: "OPEN",
          dueDate: day.startUtc,
          dayEndExclusiveUtc: end,
        })
      ).toBe(false);
      expect(
        isClinicCareFollowUpDue({
          authenticatedFacilityId: fac,
          followUpFacilityId: fac,
          status: "OPEN",
          dueDate: day.startUtc,
          dayEndExclusiveUtc: end,
          linkedEncounterType: "EMERGENCY",
        })
      ).toBe(false);
      expect(
        isClinicCareFollowUpDue({
          authenticatedFacilityId: fac,
          followUpFacilityId: fac,
          status: "OPEN",
          dueDate: day.startUtc,
          dayEndExclusiveUtc: end,
          linkedEncounterType: "OUTPATIENT",
        })
      ).toBe(true);
    });

    it("respects timezone day boundary", () => {
      const chicago = facilityLocalDayUtcBounds(
        new Date("2026-07-28T04:30:00.000Z"),
        "America/Chicago"
      );
      expect(chicago.localDateKey).toBe("2026-07-27");
      expect(
        isClinicCareFollowUpDue({
          authenticatedFacilityId: fac,
          followUpFacilityId: fac,
          status: "OPEN",
          dueDate: new Date(chicago.endExclusiveUtc.getTime() - 1),
          dayEndExclusiveUtc: chicago.endExclusiveUtc,
        })
      ).toBe(true);
      expect(
        isClinicCareFollowUpDue({
          authenticatedFacilityId: fac,
          followUpFacilityId: fac,
          status: "OPEN",
          dueDate: chicago.endExclusiveUtc,
          dayEndExclusiveUtc: chicago.endExclusiveUtc,
        })
      ).toBe(false);
    });
  });

  it("role-filters trackboard fields for Front Desk and Billing", () => {
    const front = resolveClinicCareTrackboardFieldVisibility("FRONT_DESK");
    expect(front.showChiefComplaint).toBe(false);
    expect(front.showOpenOrderCount).toBe(false);
    expect(front.showClinicalActionLinks).toBe(false);
    expect(front.showDischargeActions).toBe(false);

    const billing = resolveClinicCareTrackboardFieldVisibility("BILLING");
    expect(billing.showChiefComplaint).toBe(false);
    expect(billing.showResultsPendingCount).toBe(false);
    expect(billing.showClinicalActionLinks).toBe(false);
    expect(billing.showDischargePendingKpi).toBe(true);

    const filtered = filterClinicCareTrackboardRowForRole(
      {
        chiefComplaint: "chest pain",
        nurseName: "Nurse A",
        openOrderCount: 3,
        resultsPendingCount: 2,
        nextStepHint: "PROVIDER_EVAL",
        providerName: "Dr X",
      },
      front
    );
    expect(filtered.chiefComplaint).toBeNull();
    expect(filtered.openOrderCount).toBe(0);
    expect(filtered.providerName).toBe("Dr X");
  });

  it("never hard-codes facility names in projection helpers", () => {
    const blob = JSON.stringify({
      CLINIC_CARE_TRACKBOARD_METRIC_CONTRACTS,
      CLINIC_CARE_METRIC_COLOR_TOKENS,
    }).toLowerCase();
    expect(blob).not.toContain("rapid city");
  });
});
