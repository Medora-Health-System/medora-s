import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateMedicationAdministrationEffectiveTime } from "@medora/shared";
import { extractMarSaveErrorMessage } from "./marSaveErrorMessage";

const webRoot = join(import.meta.dirname, "../..");

describe("marTimingReasonErrorRemoval (MEDUI.ED.UI.I18N_CLEANUP.1)", () => {
  const marTab = readFileSync(
    join(webRoot, "components/encounters/MedicationAdministrationTab.tsx"),
    "utf8"
  );
  const apiService = readFileSync(
    join(webRoot, "../../api/src/medication-administration/medication-administration.service.ts"),
    "utf8"
  );

  it("shared effective time validation does not return REASON_REQUIRED", () => {
    const result = validateMedicationAdministrationEffectiveTime({
      effectiveAdministeredTime: new Date("2026-06-03T13:00:00.000Z"),
      now: new Date("2026-06-03T18:00:00.000Z"),
      encounterAnchorAt: new Date("2026-06-03T08:00:00.000Z"),
      originalAdministeredAt: new Date("2026-06-03T18:00:00.000Z"),
      systemDocumentedAt: new Date("2026-06-03T18:00:00.000Z"),
      orderCreatedAt: new Date("2026-06-03T10:00:00.000Z"),
      orderItemCreatedAt: new Date("2026-06-03T10:05:00.000Z"),
      orderCancelledAt: null,
      adjustmentVersion: 0,
      reason: "",
      controlledMedication: true,
      marActionAdministered: true,
    });
    expect(result.ok).toBe(true);
  });

  it("API uses structured effective time error codes", () => {
    expect(apiService).toContain("MAR_EFFECTIVE_TIME_FUTURE");
    expect(apiService).not.toContain("Un motif est requis pour cet ajustement d'heure.");
  });

  it("modal clears submit error when opening administer modal", () => {
    expect(marTab).toContain("setModalSubmitError(null)");
  });

  it("English timing French error does not surface in save message", () => {
    const err = Object.assign(new Error("Un motif est requis pour cet ajustement d'heure."), {
      body: {
        statusCode: 400,
        message: "Un motif est requis pour cet ajustement d'heure.",
        code: "MAR_EFFECTIVE_TIME_REASON_REQUIRED",
      },
    });
    const msg = extractMarSaveErrorMessage(err, "en", "Save failed", (k) =>
      k === "marTab.adminTime.apiErrors.MAR_EFFECTIVE_TIME_REASON_REQUIRED"
        ? "A reason is required for this time adjustment."
        : k
    );
    expect(msg).not.toContain("Un motif");
  });
});
