/** Pure helpers for enterprise manifest seed engine (testable without Prisma). */

export function safeManifestMapLookup<T>(
  map: Record<string, T> | undefined | null,
  key: string
): T | undefined {
  if (!map || typeof map !== "object") return undefined;
  return map[key];
}

export function normalizeManifestAlias(alias: string): string {
  return alias.trim().toLowerCase();
}

export function mergeManifestSearchText(
  existing: string | null | undefined,
  tokens: string[],
  mode: "replace" | "additive"
): string {
  if (mode === "replace") {
    return tokens
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .join(" ");
  }
  const parts = (existing ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const seen = new Set(parts);
  for (const token of tokens) {
    const t = token.trim().toLowerCase();
    if (t.length < 2 || seen.has(t)) continue;
    seen.add(t);
    parts.push(t);
  }
  return parts.join(" ");
}

export function resolveEnterpriseSeedCatalogIsActive(
  catalogCode: string,
  activeRegistry: ReadonlySet<string>,
  existingIsActive?: boolean | null
): boolean {
  if (activeRegistry.has(catalogCode.trim())) return true;
  return existingIsActive === true;
}
