import { type SupportedLanguage } from "@/i18n/config";
import {
  formatHeightDualLine,
  formatTemperatureDualLine,
  formatWeightDualLine,
} from "@/lib/patientVitals";
import { erTriageT } from "@/features/emergency/erTriageI18nLookup";

const TRIAGE_VITAL_STRIP_KEYS = [
  "ta",
  "hr",
  "rr",
  "temp",
  "spo2",
  "weight",
  "height",
  "perMin",
  "degC",
  "pct",
  "kg",
  "cm",
] as const;

function triageVitalStripForLocale(language: string) {
  const strip: Record<(typeof TRIAGE_VITAL_STRIP_KEYS)[number], string> = {
    ta: "",
    hr: "",
    rr: "",
    temp: "",
    spo2: "",
    weight: "",
    height: "",
    perMin: "",
    degC: "",
    pct: "",
    kg: "",
    cm: "",
  };
  for (const key of TRIAGE_VITAL_STRIP_KEYS) {
    strip[key] = erTriageT(language, `erTriage.preview.vitalStrip.${key}`);
  }
  return strip;
}

type LatestVitals = {
  availability: "AVAILABLE" | "NO_DATA_DOCUMENTED" | "SOURCE_UNAVAILABLE";
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  spo2: number | null;
  temperatureC: number | null;
  respiratoryRate: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  painScore?: number | null;
};

/**
 * Build ED-style vital strip pairs from bootstrap latestVitals (no fabricated values).
 */
export function buildInpatientHeaderVitalPairs(
  vitals: LatestVitals | null | undefined,
  language: SupportedLanguage,
  emptyLabel: string
): { label: string; value: string }[] {
  const vs = triageVitalStripForLocale(language);
  const dash = emptyLabel;
  if (!vitals || vitals.availability !== "AVAILABLE") {
    return [
      { label: vs.ta, value: dash },
      { label: vs.hr, value: dash },
      { label: vs.rr, value: dash },
      { label: vs.temp, value: dash },
      { label: vs.spo2, value: dash },
      { label: vs.weight, value: dash },
      { label: vs.height, value: dash },
    ];
  }
  const bp =
    vitals.systolic != null && vitals.diastolic != null
      ? `${vitals.systolic}/${vitals.diastolic} mmHg`
      : dash;
  const perMin = (n: number | null) =>
    n != null ? vs.perMin.replace("{n}", String(n)) : dash;
  const pct = (n: number | null) => (n != null ? vs.pct.replace("{n}", String(n)) : dash);
  return [
    { label: vs.ta, value: bp },
    { label: vs.hr, value: perMin(vitals.heartRate) },
    { label: vs.rr, value: perMin(vitals.respiratoryRate) },
    {
      label: vs.temp,
      value:
        vitals.temperatureC != null
          ? formatTemperatureDualLine(vitals.temperatureC, language)
          : dash,
    },
    { label: vs.spo2, value: pct(vitals.spo2) },
    {
      label: vs.weight,
      value:
        vitals.weightKg != null ? formatWeightDualLine(vitals.weightKg, language) : dash,
    },
    {
      label: vs.height,
      value:
        vitals.heightCm != null ? formatHeightDualLine(vitals.heightCm, language) : dash,
    },
  ];
}

export function initialsFromDisplayName(name: string | null | undefined): string {
  const display = (name ?? "").trim();
  if (!display) return "—";
  const parts = display.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]!.toUpperCase()}${parts[parts.length - 1]![0]!.toUpperCase()}`;
  }
  const only = parts[0]!;
  return only.length >= 2 ? only.slice(0, 2).toUpperCase() : only[0]!.toUpperCase();
}
