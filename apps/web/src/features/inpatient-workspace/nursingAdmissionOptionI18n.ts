/**
 * MEDUI.INP.2B.2 — Resolve nursing admission option labels via i18n.
 * Persistence uses stable codes only; never store translated strings.
 */

export function resolveNursingAdmissionOptionLabel(
  t: (key: string) => string,
  code: string
): string {
  const key = `hospitalAdmissionD4a25.options.${code}`;
  const label = t(key);
  return label !== key ? label : code;
}

export function resolveNursingAdmissionFieldLabel(
  t: (key: string) => string,
  fieldKey: string
): string {
  const key = `hospitalAdmissionD4a25.fields.${fieldKey}`;
  const label = t(key);
  if (label === key) {
    return t("hospitalAdmissionD4a25.fieldConfigurationError");
  }
  return label;
}
