function slugPart(text: string, maxLen: number): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLen);
}

export function buildControlledCatalogMedicationCodes(params: {
  rowKey: string;
  medication: string;
  dose: string;
  form: string;
}): { conceptCode: string; productCode: string; packageCode: string } {
  const rowKey = slugPart(params.rowKey.replace(/[^A-Za-z0-9]+/g, "_"), 16);
  const nameKey = slugPart(params.medication, 20);
  const doseKey = slugPart(params.dose, 12);
  const formKey = slugPart(params.form, 10);
  const base = `CTL_CAT_${nameKey}_${doseKey}_${formKey}_${rowKey}`.replace(/_+/g, "_").slice(0, 56);
  return {
    conceptCode: base,
    productCode: `${base}_PRD`.slice(0, 64),
    packageCode: `${base}_PKG`.slice(0, 64),
  };
}
