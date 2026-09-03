import { hiddenSpanishPlaceholder } from "@medora/shared";

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
