/**
 * MEDUI.INP.2A — Inpatient workspace chrome + Overview convergence gates.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  INPATIENT_CLINICAL_PRIMARY_NAV_SECTIONS,
  INPATIENT_NURSING_STICKY_NAV_SECTIONS,
  INPATIENT_PROVIDER_STICKY_NAV_SECTIONS,
  INPATIENT_SHARED_CHART_NAV_SECTIONS,
  resolveInpatientWorkspaceSection,
  parseInpatientWorkspaceSection,
} from "./inpatientWorkspaceSections";
import { projectInpatientOverview } from "./projectInpatientOverview";
import { nursingPrimaryNav, providerPrimaryNav, projectInpatientReviewOrders } from "@medora/shared";

const root = join(__dirname);
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const PRIMARY_IDS = [
  "overview",
  "summary",
  "admission",
  "nursing",
  "orders",
  "medications",
  "results",
  "carePlan",
  "dischargePlanning",
] as const;

describe("MEDUI.INP.2A navigation convergence", () => {
  it("1 nursing sticky contains exactly the nine primary modules including Summary", () => {
    expect(INPATIENT_NURSING_STICKY_NAV_SECTIONS.map((s) => s.id)).toEqual([...PRIMARY_IDS]);
    expect(nursingPrimaryNav()).toEqual([...PRIMARY_IDS]);
  });

  it("2 provider sticky includes Summary + Provider Documentation hub; Timeline remains off sticky", () => {
    const ids = INPATIENT_PROVIDER_STICKY_NAV_SECTIONS.map((s) => s.id);
    expect(ids).toContain("summary");
    expect(ids).toContain("overview");
    expect(ids).toContain("providerDocumentation");
    expect(ids.indexOf("providerDocumentation")).toBe(ids.indexOf("summary") + 1);
    expect(ids).not.toContain("timeline");
    expect(ids).not.toContain("historyPhysical");
    expect(ids.filter((id) => PRIMARY_IDS.includes(id as (typeof PRIMARY_IDS)[number]))).toEqual([
      ...PRIMARY_IDS,
    ]);
  });

  it("3 shared chart sticky matches the nine modules", () => {
    expect(INPATIENT_SHARED_CHART_NAV_SECTIONS.map((s) => s.id)).toEqual([...PRIMARY_IDS]);
  });

  it("4 Notes is not a primary sticky tab", () => {
    expect(INPATIENT_CLINICAL_PRIMARY_NAV_SECTIONS.map((s) => s.id)).not.toContain("notes");
    expect(parseInpatientWorkspaceSection("notes")).toBe("notes");
  });

  it("5 timeline still redirects to overview; summary is a first-class sticky section", () => {
    expect(resolveInpatientWorkspaceSection("timeline")).toBe("overview");
    expect(resolveInpatientWorkspaceSection("summary")).toBe("summary");
    expect(parseInpatientWorkspaceSection("timeline")).toBe("timeline");
    expect(parseInpatientWorkspaceSection("summary")).toBe("summary");
    const view = read("InpatientActiveWorkspaceView.tsx");
    expect(view).toContain("resolveInpatientWorkspaceSection");
    expect(view).toContain('rawLower === "timeline"');
    expect(view).not.toContain('rawLower === "timeline" || rawLower === "summary"');
  });
});

describe("MEDUI.INP.2A authority + overview projections", () => {
  it("6 provider can view Admission/Assessment without nursing write", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain('readOnly={!(roles.includes("RN") || roles.includes("ADMIN"))}');
    expect(panel).toContain(
      'writersEnabled && (roles.includes("RN") || roles.includes("ADMIN"))',
    );
    const shell = read("InpatientAdmissionClinicalShell.tsx");
    expect(shell).toContain("readOnly = false");
    expect(shell).toContain("const writeBlocked = readOnly || signed");
  });

  it("7 Overview remains read-only", () => {
    const overview = read("InpatientOverviewView.tsx");
    expect(overview).toContain('data-readonly="true"');
    expect(overview).not.toMatch(/apiFetch\(.*POST/i);
    expect(overview).not.toContain("saveProvider");
    expect(overview).not.toContain("patchNursing");
  });

  it("8 Overview deep links route to authoritative modules", () => {
    const overview = read("InpatientOverviewView.tsx");
    for (const section of [
      "orders",
      "medications",
      "results",
      "carePlan",
      "dischargePlanning",
      "admission",
      "nursing",
    ]) {
      expect(overview).toContain(`onNavigateSection?.("${section}")`);
    }
  });

  it("9–13 Overview renders Orders/MAR/Results/Care Plan/Discharge projections", () => {
    const projected = projectInpatientOverview({
      role: "PROVIDER",
      emptyClinicianLabel: "Not assigned",
      alerts: [],
      synthesis: {
        orders: {
          active: [{ orderItemId: "o1", label: "CBC", status: "ACTIVE", orderType: "LAB" }],
          newOrUnacknowledged: [{ orderItemId: "o2", label: "CXR", status: "NEW" }],
          pendingActions: [{ orderItemId: "o3", label: "Ack order", status: "PENDING" }],
        },
        medications: {
          groups: {
            DUE: [
              {
                drug: "Heparin",
                dose: "5000 U",
                route: "SC",
                frequency: "Q12H",
                held: false,
              },
            ],
          },
        },
        laboratories: {
          critical: [{ label: "K+", current: "6.1", critical: true }],
          abnormal: [{ label: "Na", current: "128", critical: false }],
          pending: [{ label: "Troponin", current: null, critical: false }],
        },
        dischargeReadiness: {
          medicalReady: false,
          workflowState: "PLANNING",
          estimatedDischargeDate: null,
          barriers: [{ key: "med_recon", label: "Med recon incomplete", resolved: false }],
        },
        events: [
          {
            eventId: "e1",
            type: "CRITICAL_RESULT",
            severity: "CRITICAL",
            summary: "Critical K+",
            status: "NEW",
            occurredAt: "2026-08-16T12:00:00.000Z",
          },
        ],
      },
      carePlanPlans: [
        {
          planId: "cp1",
          title: "Mobility",
          status: "ACTIVE",
          goalSummary: "Ambulate BID",
          concern: null,
        },
      ],
      authProjection: null,
      canProviderWrite: true,
    });
    expect(projected.orders.active[0]?.label).toBe("CBC");
    expect(projected.orders.newOrUnacknowledged[0]?.label).toBe("CXR");
    expect(projected.orders.reviewOrders).toBeNull();
    expect(projected.medications.lines.some((m) => m.drug === "Heparin")).toBe(true);
    expect(projected.results.critical[0]?.label).toBe("K+");
    expect(projected.carePlan.plans[0]?.title).toBe("Mobility");
    expect(projected.discharge.barriers[0]?.key).toBe("med_recon");
    expect(projected.recentEvents.items[0]?.summary).toBe("Critical K+");

    const overview = read("InpatientOverviewView.tsx");
    expect(overview).toContain('testId="overview-orders"');
    expect(overview).toContain('testId="overview-mar"');
    expect(overview).toContain('testId="overview-results"');
    expect(overview).toContain('testId="overview-care-plan"');
    expect(overview).toContain('testId="overview-discharge"');
    expect(overview).toContain("openOrders");
    expect(overview).toContain("openMar");
    expect(overview).toContain("openResults");
    expect(overview).toContain("openCarePlan");
    expect(overview).toContain("openDischarge");
    expect(overview).toContain("overview-review-orders-counts");
  });

  it("INP.2D Overview/rail consumes the same Review Orders projection", () => {
    const reviewOrdersProjection = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      nowIso: "2026-08-18T15:00:00.000Z",
      orders: [
        {
          id: "ord-care",
          type: "CARE",
          status: "PLACED",
          priority: "STAT",
          items: [
            {
              id: "item-care",
              catalogItemType: "CARE",
              status: "PLACED",
              enterpriseProcedureId: "glucose_check",
              due: true,
            },
          ],
        },
        {
          id: "ord-hold",
          type: "MEDICATION",
          status: "ACKNOWLEDGED",
          items: [
            {
              id: "item-hold",
              catalogItemType: "MEDICATION",
              status: "ACKNOWLEDGED",
              medicationLifecycleStatus: "ON_HOLD",
              medicationFulfillmentIntent: "ADMINISTER_CHART",
            },
          ],
        },
      ],
    });
    const projected = projectInpatientOverview({
      role: "PROVIDER",
      emptyClinicianLabel: "Not assigned",
      alerts: [],
      synthesis: null,
      authProjection: null,
      canProviderWrite: true,
      reviewOrdersProjection,
    });
    expect(projected.orders.reviewOrders).toEqual({
      newUnreviewed: 1,
      statUrgent: 1,
      dueNursingActionable: 1,
      overdueNursingActionable: 0,
      held: 1,
    });
    const provider = read("InpatientProviderWorkspacePanel.tsx");
    expect(provider).toContain("fetchOrdersForEncounter");
    expect(provider).toContain("projectInpatientReviewOrders");
    expect(provider).toContain("reviewOrdersProjection");
    expect(provider).not.toContain("prisma.");
  });

  it("14 Significant events appear without deleting event infrastructure", () => {
    const panel = read("InpatientProviderWorkspacePanel.tsx");
    expect(panel).toContain("EnterpriseEncounterCommandTimeline");
    expect(panel).toContain("EnterpriseHospitalTimelinePanel");
    const overview = read("InpatientOverviewView.tsx");
    expect(overview).toContain('testId="overview-events"');
  });

  it("15 Right-side panel does not create persistence", () => {
    const rail = read("InpatientClinicalContextRail.tsx");
    expect(rail).toContain('data-persistence="none"');
    expect(rail).toContain("inpatient-rail-review-orders-counts");
    expect(rail).not.toContain("apiFetch");
    expect(rail).not.toContain("method:");
    expect(rail).not.toContain("POST");
    expect(rail).not.toContain("PATCH");
    const overview = read("InpatientOverviewView.tsx");
    expect(overview).toContain("InpatientClinicalContextRail");
  });

  it("16 EN/FR render without canonical-code leakage for INP.2A keys", () => {
    expect(Object.keys(en.inpatientOverviewInp2a)).toEqual(Object.keys(fr.inpatientOverviewInp2a));
    expect(Object.keys(en.inpatientOverviewInp2a.rail)).toEqual(
      Object.keys(fr.inpatientOverviewInp2a.rail),
    );
    expect(en.inpatientOverviewInp2a.orders.openOrders).toBe("Open Orders");
    expect(fr.inpatientOverviewInp2a.orders.openOrders).toMatch(/ordonnance/i);
    expect(en.inpatientOverviewInp2a.rail.reviewOrdersNew).toBe("New / unreviewed orders");
    expect(fr.inpatientOverviewInp2a.rail.reviewOrdersNew).toBe("Nouvelles / non revues");
    expect(fr.inpatientOverviewInp2a.rail.title).not.toMatch(/INP\.2A|D4A|D4B/i);
    expect(en.inpatientOverviewD4a34.clinicalState.verifyInNursing).not.toMatch(/legacy|stub/i);
  });

  it("17–18 ED and Observation navigation remain unchanged (no inpatient sticky coupling)", () => {
    const sections = read("inpatientWorkspaceSections.ts");
    expect(sections).not.toContain("EmergencyTrackboard");
    expect(sections).not.toMatch(/observationPrimaryNav|OBSERVATION_STICKY/);
    const edNav = readFileSync(
      join(root, "../emergency/EmergencyNursingReassessmentPanel.tsx"),
      "utf8",
    );
    expect(edNav).not.toContain("INPATIENT_CLINICAL_PRIMARY_NAV_SECTIONS");
    expect(providerPrimaryNav()).toContain("historyPhysical");
  });
});

describe("MEDUI.INP.2F medical-record Summary + vitals", () => {
  it("Summary mounts read-only projection and Print Entire Chart", () => {
    const panel = read("InpatientWorkspacePanel.tsx");
    expect(panel).toContain("InpatientEncounterMedicalRecordSummaryView");
    const summary = read("InpatientEncounterMedicalRecordSummaryView.tsx");
    expect(summary).toContain('data-readonly="true"');
    expect(summary).toContain("printEncounterChartLivePreview");
    expect(summary).toContain("legalMedicalRecord: true");
    expect(summary).toContain("EmergencyResultsPanel");
    expect(summary).toContain("canAcknowledgeResults={false}");
    expect(summary).not.toMatch(/\bsummaryJson\b/);
    expect(summary).toContain("buildRxPrintFacilityIdentity");
    expect(summary).not.toMatch(/Clinique Bon Samaritain|Wayne Urgent Care/i);
  });

  it("header vital pairs project BP/height/weight from bootstrap fields", async () => {
    const { buildInpatientHeaderVitalPairs } = await import("./inpatientHeaderVitalsPairs");
    const pairs = buildInpatientHeaderVitalPairs(
      {
        availability: "AVAILABLE",
        systolic: 126,
        diastolic: 78,
        heartRate: 88,
        spo2: 97,
        temperatureC: 37.1,
        respiratoryRate: 16,
        heightCm: 170,
        weightKg: 84.37,
      },
      "en",
      "—"
    );
    expect(pairs.find((p) => p.label === "BP")?.value).toBe("126/78 mmHg");
    expect(pairs.find((p) => p.label === "Weight")?.value).toMatch(/84/);
    expect(pairs.find((p) => p.label === "Height")?.value).toMatch(/170|ft/);
  });

  it("EN/FR Summary i18n keys stay mirrored", () => {
    expect(Object.keys(en.inpatientMedicalRecordSummaryInp2f)).toEqual(
      Object.keys(fr.inpatientMedicalRecordSummaryInp2f)
    );
    expect(Object.keys(en.inpatientMedicalRecordSummaryInp2f.sections)).toEqual(
      Object.keys(fr.inpatientMedicalRecordSummaryInp2f.sections)
    );
  });

  it("print live preview supports legal medical-record letterhead", () => {
    const preview = readFileSync(
      join(root, "../../components/encounters/EncounterChartLivePreview.ts"),
      "utf8"
    );
    expect(preview).toContain("facility-letterhead");
    expect(preview).toContain("legalMedicalRecord");
    expect(preview).toContain("printedFooter");
  });
});
