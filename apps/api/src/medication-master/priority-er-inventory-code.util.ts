/** Deterministic canonical codes from exact inventory source (no translation). */

function slugPart(text: string, maxLen: number): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLen);
}

export function buildPriorityErCanonicalCodes(params: {
  sourceRowId: string;
  sourceNameExact: string;
  sourceStrengthExact: string;
  sourceRouteExact: string;
}): { conceptCode: string; productCode: string; packageCode: string } {
  const rowKey = slugPart(params.sourceRowId.replace(/[^A-Za-z0-9]+/g, "_"), 16);
  const nameKey = slugPart(params.sourceNameExact, 20);
  const doseKey = slugPart(params.sourceStrengthExact, 12);
  const formKey = slugPart(params.sourceRouteExact, 10);
  const base = `PRI_ER_${nameKey}_${doseKey}_${formKey}_${rowKey}`.replace(/_+/g, "_").slice(0, 56);
  return {
    conceptCode: base,
    productCode: `${base}_PRD`.slice(0, 64),
    packageCode: `${base}_PKG`.slice(0, 64),
  };
}
