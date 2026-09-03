import { applyApprovedSpanishTerminology, isHiddenSpanishPlaceholder } from "@medora/shared";
import { createHiddenSpanishCatalog } from "./hiddenSpanishCatalog";
import en from "./en";
import { MEDUI_ES_1E_OVERLAY } from "./meduiEs1eCorePlatformOverlay";

/**
 * MEDUI.ES.1D+1E Spanish product UI catalog.
 *
 * Pipeline:
 *  1. createHiddenSpanishCatalog(en) → all leaves become UNLOCALIZED_ES::<path>
 *  2. applyApprovedSpanishTerminology  → 1D canon overlays (35 APPROVED terms)
 *  3. applyEs1eOverlay                → 1E core platform / auth / registration / chart
 *
 * Not user-selectable. Remaining keys stay UNLOCALIZED_ES::<path>.
 */

function applyEs1eOverlay<T>(tree: T, overlay: Record<string, string>): { tree: T; replaced: number } {
  let replaced = 0;
  for (const [path, value] of Object.entries(overlay)) {
    const parts = path.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur == null || typeof cur !== "object") { cur = null; break; }
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
const { tree: esMessages } = applyEs1eOverlay(afterCanon, MEDUI_ES_1E_OVERLAY);

export default esMessages;
