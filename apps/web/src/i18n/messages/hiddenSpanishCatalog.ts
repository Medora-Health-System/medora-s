import { hiddenSpanishPlaceholder, isHiddenSpanishPlaceholder } from "@medora/shared";

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
 * After governed Spanish overlays, remaining UNLOCALIZED_ES leaves are source-language
 * or legally frozen content. Copy the English source string so the UI never renders
 * sentinel syntax. This is provenance display — not a missing-chrome English fallback.
 */
export function applyEnglishSourceForRemainingSentinels<T>(
  esTree: T,
  enSource: unknown
): { tree: T; copied: number } {
  let copied = 0;
  function walk(esNode: unknown, enNode: unknown): void {
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
        const ev = esObj[key];
        const nv = enObj[key];
        if (typeof ev === "string" && isHiddenSpanishPlaceholder(ev) && typeof nv === "string") {
          esObj[key] = nv;
          copied += 1;
        } else {
          walk(ev, nv);
        }
      }
      return;
    }
    if (Array.isArray(esNode) && Array.isArray(enNode)) {
      esNode.forEach((item, index) => walk(item, enNode[index]));
    }
  }
  walk(esTree, enSource);
  return { tree: esTree, copied };
}
