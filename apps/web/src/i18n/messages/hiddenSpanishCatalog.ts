import { hiddenSpanishPlaceholder, isHiddenSpanishPlaceholder } from "@medora/shared";
import { isFrozenLegalSourcePath, isSourceLanguageContentPath } from "./publicCatalogParity";

/**
 * MEDUI.ES.1C — hidden Spanish catalog builder.
 * Every leaf is an explicit UNLOCALIZED_ES::<key> placeholder.
 * Do not copy English or French strings. Do not invent clinical Spanish.
 */

export function createHiddenSpanishCatalog<T>(source: T, prefix = ""): T {
  if (typeof source === "string") {
    return hiddenSpanishPlaceholder(prefix || "root") as T;
  }
  if (Array.isArray(source)) {
    return source.map((item, index) =>
      createHiddenSpanishCatalog(item, prefix ? `${prefix}.${index}` : String(index))
    ) as T;
  }
  if (source !== null && typeof source === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${key}` : key;
      out[key] = createHiddenSpanishCatalog(value, next);
    }
    return out as T;
  }
  return source;
}

/**
 * After governed Spanish overlays, remaining UNLOCALIZED_ES leaves may only receive
 * English source text when the path is explicitly governed as:
 *   - legally frozen content (packet/EMTALA bodies, attestations), or
 *   - approved source-language content (clinical templates, complaint intel, etc.).
 *
 * Any other remaining sentinel is left untouched so parity/audit tests can fail
 * loudly instead of masking an unclassified English fallback.
 */
export function applyEnglishSourceForRemainingSentinels<T>(
  esTree: T,
  enSource: unknown
): { tree: T; copied: number } {
  let copied = 0;
  function walk(esNode: unknown, enNode: unknown, path: string): void {
    if (
      esNode !== null &&
      typeof esNode === "object" &&
      !Array.isArray(esNode) &&
      enNode !== null &&
      typeof enNode === "object" &&
      !Array.isArray(enNode)
    ) {
      const esObj = esNode as Record<string, unknown>;
      const enObj = enNode as Record<string, unknown>;
      for (const key of Object.keys(esObj)) {
        const next = path ? `${path}.${key}` : key;
        const ev = esObj[key];
        const nv = enObj[key];
        if (typeof ev === "string" && isHiddenSpanishPlaceholder(ev) && typeof nv === "string") {
          if (isFrozenLegalSourcePath(next) || isSourceLanguageContentPath(next)) {
            esObj[key] = nv;
            copied += 1;
          }
        } else {
          walk(ev, nv, next);
        }
      }
      return;
    }
    if (Array.isArray(esNode) && Array.isArray(enNode)) {
      esNode.forEach((item, index) =>
        walk(item, enNode[index], path ? `${path}.${index}` : String(index))
      );
    }
  }
  walk(esTree, enSource, "");
  return { tree: esTree, copied };
}
