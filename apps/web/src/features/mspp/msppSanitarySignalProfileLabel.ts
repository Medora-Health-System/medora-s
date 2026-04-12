/**
 * French label for disease-aware threshold profile (optional subtitle next to signal level).
 */
export function msppSanitaryThresholdProfileSubtitle(
  t: (key: string) => string,
  thresholdProfileUsed: string | undefined
): string | null {
  if (!thresholdProfileUsed || thresholdProfileUsed === "DEFAULT") return null;
  const key = `msppSanitarySignals.profile.${thresholdProfileUsed}`;
  const out = t(key);
  return out === key ? null : out;
}
