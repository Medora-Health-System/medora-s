import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendMedicationDoseInstanceIdToMarCreateBody,
  groupMedicationPassQueueItemsByBucket,
} from "./medicationPassQueueMarIntegration";
import type { MedicationPassQueueItem } from "@/lib/medicationPassQueueApi";

const webSrcRoot = join(import.meta.dirname, "..", "..");

function sampleItem(
  overrides: Partial<MedicationPassQueueItem> & Pick<MedicationPassQueueItem, "queueBucket">
): MedicationPassQueueItem {
  return {
    medicationDoseInstanceId: "dose-1",
    orderItemId: "oi-1",
    orderId: "ord-1",
    encounterId: "enc-1",
    patientId: "pat-1",
    patientFirstName: "Jean",
    patientLastName: "Dupont",
    patientMrn: "MRN-1",
    roomLabel: "12",
    bedLabel: null,
    medicationLabel: "Acétaminophène",
    scheduledAt: "2026-06-10T10:00:00.000Z",
    dueWindowStartAt: "2026-06-10T09:00:00.000Z",
    dueWindowEndAt: "2026-06-10T11:00:00.000Z",
    doseStatus: "DUE",
    route: "PO",
    doseSnapshot: null,
    highAlertSummary: null,
    responseDueAt: null,
    nurseAssignedUserId: "nurse-1",
    ...overrides,
  };
}

describe("medicationPassQueueMarIntegration (M1.8B.7I.5)", () => {
  it("appendMedicationDoseInstanceIdToMarCreateBody adds id when present", () => {
    const body = appendMedicationDoseInstanceIdToMarCreateBody(
      { orderItemId: "oi-1", marAction: "administered" },
      "dose-abc"
    );
    expect(body.medicationDoseInstanceId).toBe("dose-abc");
    expect(body.orderItemId).toBe("oi-1");
  });

  it("direct MAR body omits medicationDoseInstanceId", () => {
    const body = appendMedicationDoseInstanceIdToMarCreateBody(
      { orderItemId: "oi-1", marAction: "administered" },
      null
    );
    expect(body.medicationDoseInstanceId).toBeUndefined();
  });

  it("groups items by queue bucket", () => {
    const grouped = groupMedicationPassQueueItemsByBucket([
      sampleItem({ medicationDoseInstanceId: "d1", queueBucket: "DUE" }),
      sampleItem({ medicationDoseInstanceId: "d2", queueBucket: "OVERDUE" }),
      sampleItem({ medicationDoseInstanceId: "d3", queueBucket: "UPCOMING", doseStatus: "PLANNED" }),
    ]);
    expect(grouped.get("DUE")).toHaveLength(1);
    expect(grouped.get("OVERDUE")).toHaveLength(1);
    expect(grouped.get("UPCOMING")).toHaveLength(1);
    expect(grouped.get("HELD")).toHaveLength(0);
  });

  describe("MAR tab wiring (source contract)", () => {
    const marTab = readFileSync(
      join(webSrcRoot, "components/encounters/MedicationAdministrationTab.tsx"),
      "utf8"
    );
    const passQueuePanel = readFileSync(
      join(webSrcRoot, "components/encounters/MedicationPassQueuePanel.tsx"),
      "utf8"
    );
    const passQueueApi = readFileSync(join(webSrcRoot, "lib/medicationPassQueueApi.ts"), "utf8");

    it("pass queue disabled keeps existing MAR table (panel hidden when enabled=false)", () => {
      expect(passQueuePanel).toContain("if (!enabled) return null");
      expect(marTab).toContain("<MedicationPassQueuePanel");
      expect(marTab).toContain("enabled={passQueue.enabled}");
      expect(marTab).toContain('{t("marTab.title")}');
    });

    it("loads pass queue from facility endpoint with encounter scope", () => {
      expect(passQueueApi).toContain("/medication-pass-queue");
      expect(marTab).toContain("fetchMedicationPassQueue");
      expect(marTab).toContain("includeUpcoming: true");
    });

    it("clicking pass queue item opens MAR modal workflow", () => {
      expect(marTab).toContain("openModalFromPassQueueItem");
      expect(marTab).toContain("openModal(row, { medicationDoseInstanceId:");
      expect(passQueuePanel).toContain("onSelectItem(item)");
    });

    it("MAR create payload includes medicationDoseInstanceId for pass queue selections", () => {
      expect(marTab).toContain("appendMedicationDoseInstanceIdToMarCreateBody");
      expect(marTab).toContain("modalItem.medicationDoseInstanceId");
    });

    it("renders DUE and OVERDUE bucket sections", () => {
      expect(passQueuePanel).toContain("data-testid={`pass-queue-bucket-${bucket}`}");
      expect(passQueuePanel).toContain("MEDICATION_PASS_QUEUE_BUCKET_DISPLAY_ORDER");
      expect(passQueuePanel).toContain("data-queue-bucket={item.queueBucket}");
    });

    it("UPCOMING bucket is visually distinct via opacity", () => {
      expect(passQueuePanel).toContain('bucket === "UPCOMING"');
      expect(passQueuePanel).toContain("opacity: isUpcoming ? 0.85 : 1");
    });

    it("high-alert witness modal wiring unchanged", () => {
      expect(marTab).toContain("SecondClinicianVerificationModal");
      expect(marTab).toContain("setShowHighAlertVerifierModal(true)");
      expect(marTab).toContain("marHighAlertNeedsVerifierSelection");
    });

    it("IVPB start infusion workflow unchanged", () => {
      expect(marTab).toContain("startMedicationInfusion");
      expect(marTab).toContain("infusionStartWitnessModal");
      expect(marTab).toContain("errInfusionUseStartStop");
      expect(marTab).toContain("isInfusionLifecycleMed");
    });
  });
});
