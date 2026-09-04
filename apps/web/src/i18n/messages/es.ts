import { applyApprovedSpanishTerminology, isHiddenSpanishPlaceholder } from "@medora/shared";
import { createHiddenSpanishCatalog } from "./hiddenSpanishCatalog";
import en from "./en";
import { MEDUI_ES_1E_OVERLAY } from "./meduiEs1eCorePlatformOverlay";
import { MEDUI_ES_1F_OVERLAY } from "./meduiEs1fEmergencyDepartmentOverlay";
import { MEDUI_ES_1G_OVERLAY } from "./meduiEs1gHospitalInpatientObservationOverlay";

/**
 * MEDUI.ES.1D+1E+1F+1G Spanish product UI catalog.
 *
 * Pipeline:
 *  1. createHiddenSpanishCatalog(en) → all leaves become UNLOCALIZED_ES::<path>
 *  2. applyApprovedSpanishTerminology  → 1D canon overlays (35 APPROVED terms)
 *  3. applyGovernedSpanishOverlay(1E) → core platform / auth / registration / chart
 *  4. applyGovernedSpanishOverlay(1F) → Emergency Department chrome
 *  5. applyGovernedSpanishOverlay(1G) → Hospital / Inpatient / Observation chrome
 *
 * Not user-selectable. Remaining keys stay UNLOCALIZED_ES::<path>.
 * Only remaining placeholders are replaced; later phases never overwrite 1D/1E/1F.
 */

export function applyGovernedSpanishOverlay<T>(
  tree: T,
  overlay: Record<string, string>
): { tree: T; replaced: number } {
  let replaced = 0;
  for (const [path, value] of Object.entries(overlay)) {
    const parts = path.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur == null || typeof cur !== "object") {
        cur = null;
        break;
      }
      cur = cur[parts[i]!];
    }
    if (cur == null || typeof cur !== "object") continue;
    const leafKey = parts[parts.length - 1]!;
    const current = cur[leafKey];
    if (typeof current !== "string") continue;
    if (!isHiddenSpanishPlaceholder(current)) continue;
    cur[leafKey] = value;
    replaced += 1;
  }
  return { tree, replaced };
}

const hidden = createHiddenSpanishCatalog(en);
const { tree: afterCanon } = applyApprovedSpanishTerminology(hidden);
const { tree: after1e } = applyGovernedSpanishOverlay(afterCanon, MEDUI_ES_1E_OVERLAY);
const { tree: after1f } = applyGovernedSpanishOverlay(after1e, MEDUI_ES_1F_OVERLAY);
const { tree: esMessages } = applyGovernedSpanishOverlay(after1f, MEDUI_ES_1G_OVERLAY);

export default esMessages;
