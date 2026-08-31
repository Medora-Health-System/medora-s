import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webSrcRoot, relativePath), "utf8");
}

describe("ED admission decision stale-client contract", () => {
  const panel = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
  const workspace = readSrc("features/emergency/EmergencyActiveWorkspaceView.tsx");
  const en = readSrc("i18n/messages/en.ts");
  const fr = readSrc("i18n/messages/fr.ts");

  it("17-20. successful save/sign hydrates canonical version from the server response", () => {
    expect(panel).toContain("parseEncounterVersionFromAdmissionDecisionResponse");
    expect(panel).toContain("mergeAdmissionDecisionExpectedVersion");
    expect(panel).toContain("admissionDecisionExpectedVersion");
    expect(panel).toContain("expectedVersion: admissionDecisionExpectedVersion");
    expect(panel).not.toMatch(/expectedVersion:\s*\n\s*typeof encounter\.version/);
    expect(panel).toContain("invalidateGetRequestDedupeForPath");
  });

  it("invalidates encounter GET cache after a successful decision write and on workspace reload", () => {
    expect(panel).toContain("invalidateGetRequestDedupeForPath");
    expect(workspace).toContain("invalidateGetRequestDedupeForPath(`/encounters/${encounterId}`");
    expect(workspace).toContain("preferNewerEncounterVersion");
  });

  it("21. genuine 409 shows clinician-safe conflict UI with Refresh decision", () => {
    expect(panel).toContain("isAdmissionDecisionStaleErrorCode");
    expect(panel).toContain("emergencyDisposition.errors.ADMISSION_DECISION_STALE");
    expect(panel).toContain("emergency-disposition-refresh-decision");
    expect(panel).toContain("handleRefreshDecision");
    expect(panel).toContain('t("emergencyDisposition.refreshDecision")');
    expect(en).toContain("The disposition was updated elsewhere. Refresh the latest decision before continuing.");
    expect(fr).toContain("La disposition a été mise à jour ailleurs. Actualisez la décision avant de continuer.");
    expect(en).toContain('refreshDecision: "Refresh decision"');
    expect(fr).toContain('refreshDecision: "Actualiser la décision"');
  });

  it("22. genuine 409 never automatically retries signature", () => {
    const catchStart = panel.indexOf("} catch (e) {");
    const catchEnd = panel.indexOf("} finally {", catchStart);
    const catchBlock = panel.slice(catchStart, catchEnd);
    expect(catchBlock).toContain("ADMISSION_DECISION_STALE");
    expect(catchBlock).not.toMatch(/handleSave\(/);
    expect(catchBlock).not.toMatch(/apiFetch\(/);
    const refreshFn = panel.slice(
      panel.indexOf("const handleRefreshDecision"),
      panel.indexOf("const handleCancelAdmissionConfirm")
    );
    expect(refreshFn).not.toMatch(/handleSave\(/);
    expect(refreshFn).not.toMatch(/mode === "SIGN"/);
  });

  it("23. Refresh decision hydrates latest canonical decision without signing", () => {
    expect(panel).toContain("await onSaved()");
    const refreshFn = panel.slice(
      panel.indexOf("const handleRefreshDecision"),
      panel.indexOf("const handleCancelAdmissionConfirm")
    );
    expect(refreshFn).toContain("invalidateGetRequestDedupeForPath");
    expect(refreshFn).toContain("await onSaved()");
    expect(refreshFn).not.toContain("/admission/decision");
  });

  it("24. Admission/Observation switching does not reset the concurrency token", () => {
    const start = panel.indexOf("const applyOutcomeFromUi = useCallback");
    const end = panel.indexOf("const setOutcomeFromUi");
    const applyOutcome = panel.slice(start, end);
    expect(applyOutcome.length).toBeGreaterThan(40);
    expect(applyOutcome).not.toContain("setAdmissionDecisionExpectedVersion");
    expect(applyOutcome).not.toContain("encounter.version");
    const switchStart = panel.indexOf("const setOutcomeFromUi");
    const switchEnd = panel.indexOf("const [layoutMode");
    const switchFn = panel.slice(switchStart, switchEnd);
    expect(switchFn).not.toContain("setAdmissionDecisionExpectedVersion");
  });

  it("25-26. generic errors still use existing handling; no revision/debug values shown", () => {
    expect(panel).toContain("normalizeUserFacingError");
    expect(panel).toContain("isDirectAdmissionErrorCode");
    expect(en).not.toMatch(/ADMISSION_DECISION_STALE:[\s\S]{0,200}\bCAS\b/);
    expect(fr).not.toMatch(/ADMISSION_DECISION_STALE:[\s\S]{0,200}\bCAS\b/);
    expect(en).toContain("The disposition was updated elsewhere");
    expect(en).not.toMatch(/ADMISSION_DECISION_STALE: ".*version/i);
    expect(en).not.toContain("optimistic concurrency");
    expect(fr).not.toContain("optimistic concurrency");
  });
});
