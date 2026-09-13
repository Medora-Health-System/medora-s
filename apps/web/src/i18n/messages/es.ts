import { applyApprovedSpanishTerminology, isHiddenSpanishPlaceholder } from "@medora/shared";
import {
  applyEnglishSourceForRemainingSentinels,
  createHiddenSpanishCatalog,
} from "./hiddenSpanishCatalog";
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
import { MEDUI_TRILANG_2_OVERLAY } from "./meduiTrilang2ClinicalWorkspaceOverlay";
import { MEDUI_PUBLIC_CATALOG_COMPLETE_OVERLAY } from "./meduiPublicCatalogCompleteOverlay";
import { MEDUI_AI_PHASE_1G_SPANISH_PROVIDER_DOCUMENTATION_OVERLAY } from "./meduiAiPhase1gSpanishProviderDocumentationOverlay";

/**
 * MEDUI public Spanish product UI catalog.
 *
 * Pipeline:
 *  1. createHiddenSpanishCatalog(en) → all leaves become UNLOCALIZED_ES::<path>
 *  2. applyApprovedSpanishTerminology  → 1D canon overlays (46 APPROVED uiMessageKeys)
 *  3–13. governed Spanish overlays (1E through TRILANG.2)
 * 14. applyGovernedSpanishOverlay(PUBLIC_CATALOG_COMPLETE) → remaining public chrome
 * 15. applyGovernedSpanishOverlay(AI_PHASE_1G_PROVIDER_DOCUMENTATION) → provider documentation clinical content
 * 16. applyEnglishSourceForRemainingSentinels → frozen/legal or still-untranslated source leaves keep source provenance
 *
 * Español is publicly selectable. Public chrome and approved provider-documentation content must be Spanish.
 * Remaining source-language clinical packs are tracked explicitly rather than exposing sentinel syntax.
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
const { tree: afterTrilang1 } = applyGovernedSpanishOverlay(after1k1, MEDUI_TRILANG_1_CLINICAL_CHROME_OVERLAY);
const { tree: afterTrilang2 } = applyGovernedSpanishOverlay(afterTrilang1, MEDUI_TRILANG_2_OVERLAY);
const { tree: afterPublicComplete } = applyGovernedSpanishOverlay(
  afterTrilang2,
  MEDUI_PUBLIC_CATALOG_COMPLETE_OVERLAY
);
const { tree: afterProviderDocumentation } = applyGovernedSpanishOverlay(
  afterPublicComplete,
  MEDUI_AI_PHASE_1G_SPANISH_PROVIDER_DOCUMENTATION_OVERLAY
);
const { tree: esMessages } = applyEnglishSourceForRemainingSentinels(afterProviderDocumentation, en);

export default esMessages;
