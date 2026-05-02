export type MedicationTimingSafetyLevel = "none" | "info" | "warning" | "critical";

export type MedicationTimingSafetyMessageKey = "none" | "info" | "warning" | "critical";

export type MedicationTimingSafetyResult = {
  level: MedicationTimingSafetyLevel;
  /** i18n leaf: `medicationTimingSafety.${messageKey}` (omit when `none`). */
  messageKey: MedicationTimingSafetyMessageKey;
  /** Whole minutes since last administered MAR outcome, or null if not applicable. */
  minutesSinceLast: number | null;
};

function parseTime(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Soft timing guard for MAR duplicate / too-early documentation (UI only).
 * Does not persist; callers pass a stable `medicationKey` for future grouping (e.g. orderItemId).
 */
export function evaluateMedicationTimingSafety(input: {
  lastAdministeredAt: Date | string | null | undefined;
  now: Date;
  medicationKey?: string | null;
}): MedicationTimingSafetyResult {
  void input.medicationKey;
  const lastMs = parseTime(input.lastAdministeredAt);
  if (lastMs == null) {
    return { level: "none", messageKey: "none", minutesSinceLast: null };
  }
  const diffMs = input.now.getTime() - lastMs;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 0) {
    return { level: "none", messageKey: "none", minutesSinceLast: null };
  }
  if (minutes < 5) {
    return { level: "critical", messageKey: "critical", minutesSinceLast: minutes };
  }
  if (minutes < 30) {
    return { level: "warning", messageKey: "warning", minutesSinceLast: minutes };
  }
  if (minutes < 120) {
    return { level: "info", messageKey: "info", minutesSinceLast: minutes };
  }
  return { level: "none", messageKey: "none", minutesSinceLast: null };
}
