/**
 * MEDUI.INP.2D — Inpatient Review Orders enterprise convergence (web gates).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  INPATIENT_REVIEW_ORDER_CLINICAL_GROUPS,
  INPATIENT_REVIEW_ORDER_STATUS_BUCKETS,
  inpatientReviewOrdersReuseEnterpriseEngine,
} from "@medora/shared";

const root = join(__dirname);
const webSrc = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const readSrc = (rel: string) => readFileSync(join(webSrc, rel), "utf8");

function deepKeys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return prefix ? [prefix] : [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) return deepKeys(v, path);
    return [path];
  });
}

describe("MEDUI.INP.2D inpatient Review Orders", () => {
  it("reuses enterprise order GET/actions and does not invent an inpatient order engine", () => {
    expect(inpatientReviewOrdersReuseEnterpriseEngine()).toBe(true);
    const workspace = read("InpatientWorkspacePanel.tsx");
    expect(workspace).toContain("EmergencyErOrdersPanel");
    expect(workspace).toContain("inpatientFacilityMedicationOrderMode()");
    expect(workspace).not.toContain('medicationOrderMode="DEFAULT"');
    expect(workspace).not.toContain("InpatientReviewOrdersPanel");
    expect(workspace).not.toMatch(/POST\s*[`'"]\/inpatient.*orders/);
    const restored = readSrc("features/emergency/EmergencyErOrdersPanel.tsx");
    expect(restored).toContain("mutateOrderItemLifecycleAction");
    expect(restored).toContain("CreateOrderModal");
    expect(restored).not.toContain("prisma.");
    expect(restored).not.toContain("medication-administrations");
    const retained = read("InpatientReviewOrdersPanel.tsx");
    expect(retained).toContain("fetchOrdersForEncounter");
    expect(retained).toContain("projectInpatientReviewOrders");
    expect(retained).toContain("inpatientFacilityMedicationOrderMode()");
  });

  it("keeps MAR as the medication administration authority", () => {
    const restored = readSrc("features/emergency/EmergencyErOrdersPanel.tsx");
    expect(restored).not.toContain("medication-administrations");
    const retained = read("InpatientReviewOrdersPanel.tsx");
    expect(retained).toContain('onNavigateSection?.("medications")');
    expect(retained).toContain("inpatientReviewOrdersInp2d.openMar");
    expect(retained).toContain("inpatientReviewOrdersInp2d.marBoundary");
    expect(retained).not.toContain("medication-administrations");
    const workspace = read("InpatientWorkspacePanel.tsx");
    expect(workspace).toContain("MedicationAdministrationTab");
    expect(workspace).toContain('case "medications"');
  });

  it("retains INP.2D projection buckets as unmounted helpers, not the primary Orders UI", () => {
    const panel = read("InpatientReviewOrdersPanel.tsx");
    expect(panel).toContain("INPATIENT_REVIEW_ORDER_STATUS_BUCKETS");
    expect(panel).toContain("INPATIENT_REVIEW_ORDER_CLINICAL_GROUPS");
    expect(panel).toContain("inpatientReviewOrdersInp2d.buckets.");
    expect(panel).toContain("inpatientReviewOrdersInp2d.groups.");
    for (const bucket of INPATIENT_REVIEW_ORDER_STATUS_BUCKETS) {
      expect(en.inpatientReviewOrdersInp2d.buckets[bucket].length).toBeGreaterThan(0);
      expect(fr.inpatientReviewOrdersInp2d.buckets[bucket].length).toBeGreaterThan(0);
    }
    for (const group of INPATIENT_REVIEW_ORDER_CLINICAL_GROUPS) {
      expect(en.inpatientReviewOrdersInp2d.groups[group].length).toBeGreaterThan(0);
      expect(fr.inpatientReviewOrdersInp2d.groups[group].length).toBeGreaterThan(0);
    }
    expect(panel).toContain("NEEDS_ACTION");
    expect(panel).toContain("CHANGED");
  });

  it("mirrors EN/FR keys for the Review Orders feature section", () => {
    expect(deepKeys(en.inpatientReviewOrdersInp2d).sort()).toEqual(
      deepKeys(fr.inpatientReviewOrdersInp2d).sort()
    );
    expect(en.inpatientReviewOrdersInp2d.title).toBe("Review Orders");
    expect(fr.inpatientReviewOrdersInp2d.title).toBe("Revoir les ordonnances");
    expect(en.inpatientReviewOrdersInp2d.acknowledge).toBeTruthy();
    expect(fr.inpatientReviewOrdersInp2d.acknowledge).toBe("Accuser réception");
  });

  it("does not regress ED or Observation order cockpits", () => {
    const observation = readSrc("features/observation-workspace/ObservationWorkspacePanel.tsx");
    expect(observation).toContain("EmergencyErOrdersPanel");
    expect(observation).not.toContain("InpatientReviewOrdersPanel");
    const edActive = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
    expect(edActive).toContain("EmergencyErOrdersPanel");
    const erPanel = readSrc("features/emergency/EmergencyErOrdersPanel.tsx");
    expect(erPanel).toContain("mutateOrderItemLifecycleAction");
  });

  it("does not reopen Nursing Admission or Nursing Assessment domains", () => {
    const workspace = read("InpatientWorkspacePanel.tsx");
    expect(workspace).toContain("InpatientAdmissionClinicalShell");
    expect(workspace).toContain("InpatientNursingAssessmentSection");
    const admission = read("InpatientAdmissionClinicalShell.tsx");
    expect(admission).toContain("NursingAdmissionStructuredSectionForm");
    const assessment = read("InpatientNursingAssessmentSection.tsx");
    expect(assessment.length).toBeGreaterThan(20);
  });

  it("does not grant RN provider prescribing chrome", () => {
    const workspace = read("InpatientWorkspacePanel.tsx");
    expect(workspace).toMatch(/roles\.includes\("PROVIDER"\) \|\| roles\.includes\("ADMIN"\)/);
    const restored = readSrc("features/emergency/EmergencyErOrdersPanel.tsx");
    expect(restored).toContain("canUseRnOrderAuthority");
    expect(restored).toContain("effectiveCanPrescribe");
    expect(restored).toContain("ProviderMedicationOrderGovernanceSection");
    expect(restored).toContain("auditMedicationOrderGovernancePermissions");
    const panel = read("InpatientReviewOrdersPanel.tsx");
    expect(panel).toContain("canUseRnOrderAuthority");
    expect(panel).toContain("effectiveCanPrescribe");
    expect(panel).toContain("canHoldDiscontinue");
    expect(panel).toContain("ProviderMedicationOrderGovernanceSection");
    expect(panel).toContain("actorUserId");
    expect(panel).toContain("inpatient-review-order-cancel");
    expect(panel).toMatch(/actions\.canCancel \? \(/);
    expect(panel).toMatch(/actions\.canHoldDiscontinue && found/);
    expect(en.inpatientReviewOrdersInp2d.cancel).toBe("Cancel");
    expect(fr.inpatientReviewOrdersInp2d.cancel).toBe("Annuler");
    expect(en.inpatientReviewOrdersInp2d.buckets.DUE).toBe("Due now");
    expect(fr.inpatientReviewOrdersInp2d.buckets.DUE).toBe("À faire");
    expect(en.inpatientReviewOrdersInp2d.buckets.OVERDUE).toBe("Overdue");
    expect(fr.inpatientReviewOrdersInp2d.buckets.OVERDUE).toBe("En retard");
    expect(en.inpatientReviewOrdersInp2d.buckets.SCHEDULED).toBe("Scheduled");
    expect(fr.inpatientReviewOrdersInp2d.buckets.SCHEDULED).toBe("Planifiées");
    expect(en.inpatientReviewOrdersInp2d.buckets.HELD).toBe("Held");
    expect(fr.inpatientReviewOrdersInp2d.buckets.HELD).toBe("Suspendues");
    expect(en.inpatientReviewOrdersInp2d.buckets.DISCONTINUED).toBe("Discontinued / cancelled");
    expect(fr.inpatientReviewOrdersInp2d.buckets.DISCONTINUED).toBe("Arrêtées / annulées");
    expect(en.inpatientReviewOrdersInp2d.buckets.COMPLETED).toBe("Completed");
    expect(fr.inpatientReviewOrdersInp2d.buckets.COMPLETED).toBe("Terminées");
  });
});
