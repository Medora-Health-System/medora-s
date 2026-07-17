/**
 * Phase 17 (Commit 1) — reproductive / GU documentation foundation. Mirrors
 * `toxicExposureFoundation.ts` (Phase 16): detects reproductive/GU vocabulary in free text
 * so a chart note can echo terminology back. Never invents gravidity, parity, EGA, Rh status,
 * or fetal heart rate, and never establishes a diagnosis or disposition.
 */

export type PregnancyTestStatus = "positive" | "negative" | "unknown" | "unspecified";

export type GestationalAgeSource =
  | "lmp"
  | "ultrasound"
  | "clinical_estimate"
  | "unknown"
  | "unspecified";

export type ReproductiveGuFindings = {
  pregnancyPossibility: boolean;
  pregnancyTestStatus: PregnancyTestStatus;
  lmpReported: boolean;
  gravidityReported: boolean;
  parityReported: boolean;
  estimatedGestationalAgeReported: boolean;
  gestationalAgeSourceReported: GestationalAgeSource;
  fetalHeartRateReported: boolean;
  fetalMovementReported: boolean;
  rhStatusReported: boolean;
  postpartumIntervalReported: boolean;
  iudPresenceReported: boolean;
  contraceptionReported: boolean;
  menstrualPatternReported: boolean;
  urinarySymptomsReported: boolean;
  genitalSymptomsReported: boolean;
};

const normalize = (value = "") =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const PREGNANCY_TEST_PATTERNS: Array<{ value: PregnancyTestStatus; pattern: RegExp }> = [
  { value: "positive", pattern: /\b(pregnancy test positive|upt positive|beta.?hcg positive|positive pregnancy test)\b/ },
  { value: "negative", pattern: /\b(pregnancy test negative|upt negative|beta.?hcg negative|negative pregnancy test)\b/ },
  { value: "unknown", pattern: /\b(pregnancy test unknown|upt not done|pregnancy status unknown)\b/ },
];

const GESTATIONAL_AGE_SOURCE_PATTERNS: Array<{ value: GestationalAgeSource; pattern: RegExp }> = [
  { value: "lmp", pattern: /\b(lmp|last menstrual period|by dates|menstrual dating)\b/ },
  { value: "ultrasound", pattern: /\b(ultrasound dating|sonographic dating|by ultrasound|us dating)\b/ },
  { value: "clinical_estimate", pattern: /\b(clinical estimate|fundal height|estimated gestational age)\b/ },
  { value: "unknown", pattern: /\b(gestational age unknown|dating unknown|ega unknown)\b/ },
];

/**
 * Documentation advisory only. Detects reproductive/GU vocabulary already present in free
 * text. Never invents gravidity, parity, EGA, Rh status, or FHR when not documented.
 */
export function parseReproductiveGuFromText(text = ""): ReproductiveGuFindings {
  const normalized = normalize(text);

  const pregnancyPossibility =
    /\b(pregnan(t|cy)|possible pregnancy|pregnancy of unknown location|pregnant)\b/.test(normalized) ||
    PREGNANCY_TEST_PATTERNS.some((entry) => entry.value === "positive" && entry.pattern.test(normalized));

  const estimatedGestationalAgeReported =
    /\b(\d{1,2}\s*(weeks?|wks?)\s*(gestation|pregnant|ega)|gestational age|ega\b|\d{1,2}\s*w\b)/.test(
      normalized
    ) && !/\b(gestational age unknown|ega unknown|dating unknown)\b/.test(normalized);

  return {
    pregnancyPossibility,
    pregnancyTestStatus:
      PREGNANCY_TEST_PATTERNS.find((entry) => entry.pattern.test(normalized))?.value ?? "unspecified",
    lmpReported: /\b(lmp|last menstrual period|last period)\b/.test(normalized),
    gravidityReported:
      /\b(gravida|g\d+p\d+|g\d+\s*p\d+)\b/.test(normalized) &&
      !/\b(gravidity unknown|gravida unknown)\b/.test(normalized),
    parityReported:
      /\b(parity|para|p\d+|g\d+p\d+)\b/.test(normalized) &&
      !/\b(parity unknown|para unknown)\b/.test(normalized),
    estimatedGestationalAgeReported,
    gestationalAgeSourceReported:
      GESTATIONAL_AGE_SOURCE_PATTERNS.find((entry) => entry.pattern.test(normalized))?.value ?? "unspecified",
    fetalHeartRateReported:
      /\b(fetal heart rate|fhr|fetal heart tones|fht)\b/.test(normalized) &&
      !/\b(fhr not obtained|fetal heart rate not documented|fhr unknown)\b/.test(normalized),
    fetalMovementReported: /\b(fetal movement|decreased fetal movement|dfm|quickening)\b/.test(normalized),
    rhStatusReported:
      /\b(rh (positive|negative|status)|rhesus|anti.?d status)\b/.test(normalized) &&
      !/\b(rh unknown|rhesus unknown)\b/.test(normalized),
    postpartumIntervalReported:
      /\b(postpartum|days since delivery|weeks since delivery|post.?partum day|ppd)\b/.test(normalized),
    iudPresenceReported: /\b(iud|intrauterine device|mirena|copper iud)\b/.test(normalized),
    contraceptionReported: /\b(contraception|birth control|ocp|depo|implant|condom use)\b/.test(normalized),
    menstrualPatternReported:
      /\b(menses|menstrual|period|amenorrhea|irregular menses|last menstrual)\b/.test(normalized),
    urinarySymptomsReported:
      /\b(dysuria|hematuria|frequency|urgency|flank pain|retention|oliguria|anuria|foley)\b/.test(normalized),
    genitalSymptomsReported:
      /\b(vaginal (bleeding|discharge|pain)|pelvic pain|scrotal pain|testicular pain|penile pain|priapism)\b/.test(
        normalized
      ),
  };
}

/** True when EGA appears documented without an attributable source — do not invent dating. */
export function isGestationalAgeInvented(findings: ReproductiveGuFindings): boolean {
  return (
    findings.estimatedGestationalAgeReported &&
    findings.gestationalAgeSourceReported === "unspecified" &&
    !findings.lmpReported
  );
}

/** True when documented text includes an explicit gestational-age source. */
export function hasGestationalAgeSource(findings: ReproductiveGuFindings): boolean {
  return findings.gestationalAgeSourceReported !== "unspecified" || findings.lmpReported;
}
