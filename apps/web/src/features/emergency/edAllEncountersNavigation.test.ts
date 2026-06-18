import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isEdLifecyclePlaceholderView } from "@/features/emergency/edEncounterLifecycleNavigation";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("edAllEncountersNavigation (MEDUI.ED.LIFECYCLE.7)", () => {
  it("All Encounters tab is no longer a placeholder", () => {
    expect(isEdLifecyclePlaceholderView("allEncounters")).toBe(false);
  });

  it("wires archive workspace without altering trackboard fetch", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("EdAllEncountersArchiveWorkspace");
    expect(trackboard).toContain('boardViewMode === "allEncounters"');
    expect(trackboard).toContain("fetchOpenEncounters");
    const loadBlock = trackboard.slice(
      trackboard.indexOf("const loadEncounters"),
      trackboard.indexOf("const claimSelf")
    );
    expect(loadBlock).not.toContain("allEncounters");
  });

  it("does not alter My Patients filtering", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("resolveMyActivePatientsEncounters");
    const myPatientsBlock = trackboard.slice(
      trackboard.indexOf("const myPatientsBase"),
      trackboard.indexOf("const incompleteChartsBase")
    );
    expect(myPatientsBlock).not.toContain("allEncounters");
    expect(myPatientsBlock).not.toContain("EdAllEncountersArchive");
  });

  it("does not alter My Incomplete Charts filtering", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("resolveMyIncompleteChartsEncounters");
    const incompleteBlock = trackboard.slice(
      trackboard.indexOf("const incompleteChartsBase"),
      trackboard.indexOf("const encounterListRows")
    );
    expect(incompleteBlock).not.toContain("allEncounters");
    expect(incompleteBlock).not.toContain("EdAllEncountersArchive");
  });

  it("archive fetch is read-only GET", () => {
    const archive = readSrc("features/emergency/edAllEncountersArchive.ts");
    expect(archive).toContain("/emergency/encounters/archive");
    expect(archive).not.toContain("method: \"POST\"");
    expect(archive).not.toContain("method: \"PATCH\"");
    expect(archive).not.toContain("method: \"DELETE\"");
    expect(archive).not.toContain("finalize");
    expect(archive).not.toContain("submitClaim");
  });

  it("silent refresh uses archive refresh nonce", () => {
    const trackboard = readSrc("features/emergency/EmergencyTrackboardView.tsx");
    expect(trackboard).toContain("archiveRefreshNonce");
    const workspace = readSrc("features/emergency/EdAllEncountersArchiveWorkspace.tsx");
    expect(workspace).toContain("shouldReplaceArchiveRows");
    expect(workspace).toContain("refreshNonce");
  });

  it("silent refresh preserves billing/coding filter state", () => {
    const workspace = readSrc("features/emergency/EdAllEncountersArchiveWorkspace.tsx");
    expect(workspace).toContain("billingCodingFilter");
    expect(workspace).toContain("setBillingCodingFilter");
    expect(workspace).toContain("filterAllEncountersByBillingCodingStatus");
    expect(workspace).not.toContain("setBillingCodingFilter(\"ALL\")");
  });

  it("billing/coding quick filters are client-side only", () => {
    const workspace = readSrc("features/emergency/EdAllEncountersArchiveWorkspace.tsx");
    expect(workspace).toContain("ed-all-encounters-billing-coding-filters");
    const archive = readSrc("features/emergency/edAllEncountersArchive.ts");
    expect(archive).not.toContain("billingCodingFilter");
  });

  it("archive eligibility uses closed + signed only", () => {
    const archive = readSrc("features/emergency/edAllEncountersArchive.ts");
    expect(archive).toContain("isEncounterEligibleForAllEncounters");
    expect(archive).toContain('status !== "CLOSED"');
    expect(archive).toContain("isEdProviderDocumentationSigned");
    expect(archive).not.toMatch(/allEncountersEligible\) return null/);
  });
});
