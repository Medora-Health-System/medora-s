import { applyApprovedSpanishTerminology, isHiddenSpanishPlaceholder } from "@medora/shared";
import { createHiddenSpanishCatalog } from "./hiddenSpanishCatalog";
import en from "./en";
import { MEDUI_ES_1E_OVERLAY } from "./meduiEs1eCorePlatformOverlay";
import { MEDUI_ES_1F_OVERLAY } from "./meduiEs1fEmergencyDepartmentOverlay";
import { MEDUI_ES_1G_OVERLAY } from "./meduiEs1gHospitalInpatientObservationOverlay";
import { MEDUI_ES_1H_OVERLAY } from "./meduiEs1hOrdersMarPharmacyDiagnosticsOverlay";
import { MEDUI_ES_1I_OVERLAY } from "./meduiEs1iClinicDentalBillingAncillaryOverlay";
import { MEDUI_ES_1JB_OVERLAY } from "./meduiEs1jSafeChromeOverlay";
import { MEDUI_ES_1K_OVERLAY } from "./meduiEs1kSafeChromeOverlay";
import { MEDUI_ES_1K_PUBLIC_CHROME_OVERLAY } from "./meduiEs1kPublicChromeOverlay";
import { MEDUI_ES_1K1_OVERLAY } from "./meduiEs1k1ReachabilityHotfixOverlay";
import { MEDUI_TRILANG_1_CLINICAL_CHROME_OVERLAY } from "./meduiTrilang1ClinicalChromeOverlay";

/**
 * MEDUI.ES.1D+1E+1F+1G+1H+1I+1J.B Spanish product UI catalog.
 *
 * Pipeline:
 *  1. createHiddenSpanishCatalog(en) → all leaves become UNLOCALIZED_ES::<path>
 *  2. applyApprovedSpanishTerminology  → 1D canon overlays (46 APPROVED uiMessageKeys)
 *  3. applyGovernedSpanishOverlay(1E) → core platform / auth / registration / chart
 *  4. applyGovernedSpanishOverlay(1F) → Emergency Department chrome
 *  5. applyGovernedSpanishOverlay(1G) → Hospital / Inpatient / Observation chrome
 *  6. applyGovernedSpanishOverlay(1H) → Orders / MAR / pharmacy / lab / imaging chrome
 *  7. applyGovernedSpanishOverlay(1I) → Clinic / Dental / Billing / revenue chrome
 *  8. applyGovernedSpanishOverlay(1J.B) → print / document / consent SAFE chrome
 *  9. applyGovernedSpanishOverlay(1K) → encounter close/discharge/admission modals + Rx print chrome
 * 10. applyGovernedSpanishOverlay(1K public chrome) → reachable clinical/encounter/ED/chart/care-plan UI chrome
 * 11. applyGovernedSpanishOverlay(1K.1) → admin hub / public-health / users / audit reachable chrome
 * 12. applyGovernedSpanishOverlay(TRILANG.1) → clinical safety, discharge chrome, specialty packs
 *
 * After MEDUI.ES.1K, Español is publicly selectable. Remaining keys stay UNLOCALIZED_ES::<path>.
 * Legal/source packet bodies and EMTALA print legal keys stay frozen.
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
const { tree: after1g } = applyGovernedSpanishOverlay(after1f, MEDUI_ES_1G_OVERLAY);
const { tree: after1h } = applyGovernedSpanishOverlay(after1g, MEDUI_ES_1H_OVERLAY);
const { tree: after1i } = applyGovernedSpanishOverlay(after1h, MEDUI_ES_1I_OVERLAY);
const { tree: after1jb } = applyGovernedSpanishOverlay(after1i, MEDUI_ES_1JB_OVERLAY);
const { tree: after1k } = applyGovernedSpanishOverlay(after1jb, MEDUI_ES_1K_OVERLAY);
const { tree: after1kPublic } = applyGovernedSpanishOverlay(after1k, MEDUI_ES_1K_PUBLIC_CHROME_OVERLAY);
const { tree: after1k1 } = applyGovernedSpanishOverlay(after1kPublic, MEDUI_ES_1K1_OVERLAY);
const { tree: esMessages } = applyGovernedSpanishOverlay(after1k1, MEDUI_TRILANG_1_CLINICAL_CHROME_OVERLAY);

export default esMessages;
