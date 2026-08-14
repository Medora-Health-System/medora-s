import { describe, expect, it } from "vitest";
import {
  D4C8A_CERTIFICATION_ID,
  EncounterDisplayMode,
  enterpriseEncounterRecordPath,
  isEnterpriseEncounterClosed,
  lifecycleTransitionLabelKey,
  projectEnterpriseEncounterListLifecycle,
  resolveEnterpriseEncounterDisplayMode,
  shouldShowEnterpriseReopenAction,
} from "./enterpriseClosedEncounterViewerD4c8a.js";

describe("MEDUI.D4C.8A enterprise closed encounter projections", () => {
  it("exports certification id", () => {
    expect(D4C8A_CERTIFICATION_ID).toBe("MEDUI.D4C.8A");
  });

  it("CLOSED projects locked; OPEN does not", () => {
    expect(isEnterpriseEncounterClosed("CLOSED")).toBe(true);
    expect(isEnterpriseEncounterClosed("OPEN")).toBe(false);
    expect(isEnterpriseEncounterClosed("CANCELLED")).toBe(false);
    expect(resolveEnterpriseEncounterDisplayMode("CLOSED")).toBe(
      EncounterDisplayMode.CLOSED_READ_ONLY
    );
    expect(resolveEnterpriseEncounterDisplayMode("OPEN")).toBe(EncounterDisplayMode.ACTIVE);
  });

  it("SIGNED documentation does not equal CLOSED encounter", () => {
    const openSigned = projectEnterpriseEncounterListLifecycle({
      id: "e1",
      status: "OPEN",
      providerDocumentationStatus: "SIGNED",
      closedAt: null,
    });
    expect(openSigned.isClosed).toBe(false);
    expect(openSigned.displayMode).toBe(EncounterDisplayMode.ACTIVE);
    expect(openSigned.href).toBe("/app/encounters/e1");
  });

  it("dischargedAt does not imply CLOSED", () => {
    expect(
      projectEnterpriseEncounterListLifecycle({
        id: "e2",
        status: "OPEN",
        dischargedAt: "2026-08-14T12:00:00.000Z",
      }).isClosed
    ).toBe(false);
  });

  it("CLOSED and OPEN both route to encounterId", () => {
    expect(enterpriseEncounterRecordPath("enc-9")).toBe("/app/encounters/enc-9");
    expect(enterpriseEncounterRecordPath("enc-9", { viewRecord: true })).toBe(
      "/app/encounters/enc-9?view=record"
    );
    expect(projectEnterpriseEncounterListLifecycle({ id: "c1", status: "CLOSED" }).href).toBe(
      "/app/encounters/c1"
    );
  });

  it("reopen permission uses D4C.7K authority", () => {
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["ADMIN"] })).toBe(true);
    expect(
      shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["MEDORA_SUPER_ADMIN"] })
    ).toBe(true);
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["PROVIDER"] })).toBe(
      false
    );
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["RN"] })).toBe(false);
    expect(shouldShowEnterpriseReopenAction({ status: "OPEN", roleCodes: ["ADMIN"] })).toBe(false);
  });

  it("maps lifecycle transition types to i18n keys without raw enums", () => {
    expect(lifecycleTransitionLabelKey("ENCOUNTER_CLOSED")).toBe(
      "enterpriseClosedEncounterD4c8a.lifecycle.closed"
    );
    expect(lifecycleTransitionLabelKey("ENCOUNTER_REOPENED")).toBe(
      "enterpriseClosedEncounterD4c8a.lifecycle.reopened"
    );
    expect(lifecycleTransitionLabelKey("ENCOUNTER_CLOSED_AGAIN")).toBe(
      "enterpriseClosedEncounterD4c8a.lifecycle.closedAgain"
    );
  });
});
