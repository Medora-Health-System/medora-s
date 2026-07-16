/**
 * Structured ocular exam documentation foundation. Mirrors the pattern used by
 * `glasgowComaScaleFoundation.ts`: pure documentation helpers that never infer a diagnosis,
 * severity, or disposition from an isolated exam value. Visual acuity, IOP, fluorescein/Seidel
 * findings, and slit-lamp notes are captured for the record only — the treating clinician makes
 * every clinical judgment.
 */
import { isIopContraindicatedByRedFlags, type EyeEmergencyRedFlagInput } from "./eyeEmergencyRedFlagEngine";

export const OCULAR_EXAM_FOUNDATION_STATUS = "STRUCTURED_FOUNDATION_READY" as const;

export const VISUAL_ACUITY_EYE_VALUES = ["OD", "OS", "OU"] as const;
export type VisualAcuityEye = (typeof VISUAL_ACUITY_EYE_VALUES)[number];

export const SEIDEL_SIGN_VALUES = ["POSITIVE", "NEGATIVE", "NOT_ASSESSED"] as const;
export type SeidelSign = (typeof SEIDEL_SIGN_VALUES)[number];

export const FLUORESCEIN_UPTAKE_VALUES = ["PRESENT", "ABSENT", "NOT_ASSESSED"] as const;
export type FluoresceinUptake = (typeof FLUORESCEIN_UPTAKE_VALUES)[number];

export type VisualAcuityMeasurement = {
  eye: VisualAcuityEye;
  /** Free-text documentation only, e.g. "20/40", "20/200", "counts fingers at 2 feet", "light perception". */
  value: string;
  /** Documents whether correction (glasses/pinhole) was used; never inferred. */
  withCorrection?: boolean;
};

/** Formats a single acuity measurement for the chart; does not validate or interpret the value. */
export function formatVisualAcuity(measurement: VisualAcuityMeasurement): string {
  const suffix = measurement.withCorrection ? " (with correction)" : "";
  return `${measurement.eye}: ${measurement.value}${suffix}`;
}

/**
 * Joins OD/OS/OU measurements into one chart-ready line. Never claims a diagnosis or
 * vision-threatening status from acuity alone — reduced acuity has many benign and emergent
 * causes that only the treating clinician can adjudicate.
 */
export function formatVisualAcuitySummary(measurements: readonly VisualAcuityMeasurement[]): string {
  return measurements.map(formatVisualAcuity).join("; ");
}

export type IntraocularPressureMeasurement = {
  eye: VisualAcuityEye;
  mmHg: number;
  method?: string;
};

/**
 * Safety gate mirroring `isIopContraindicatedByRedFlags`. Any documented finding consistent
 * with an open globe means IOP measurement must not be performed or recorded as attempted.
 */
export function isIopMeasurementContraindicated(flags: EyeEmergencyRedFlagInput): boolean {
  return isIopContraindicatedByRedFlags(flags);
}

/**
 * Builds the IOP documentation line. When contraindicated, this always returns the safety
 * note and ignores any supplied measurement — a caller cannot accidentally chart an IOP value
 * for a suspected open globe.
 */
export function formatIntraocularPressureForDocumentation(
  flags: EyeEmergencyRedFlagInput,
  measurements: readonly IntraocularPressureMeasurement[] = [],
): string {
  if (isIopMeasurementContraindicated(flags)) {
    return "IOP measurement deferred — open globe suspected; IOP measurement is contraindicated.";
  }
  if (measurements.length === 0) {
    return "IOP not documented.";
  }
  return measurements
    .map((measurement) => `${measurement.eye}: ${measurement.mmHg} mmHg${measurement.method ? ` (${measurement.method})` : ""}`)
    .join("; ");
}

export type FluoresceinExamFinding = {
  uptake: FluoresceinUptake;
  seidel: SeidelSign;
  /** Free-text location/pattern documentation, e.g. "linear uptake, central cornea". */
  pattern?: string;
};

/** Chart-ready fluorescein/Seidel line. Documentation only — never claims globe status. */
export function formatFluoresceinExam(finding: FluoresceinExamFinding): string {
  const parts = [`Fluorescein uptake: ${finding.uptake.toLowerCase().replace("_", " ")}`, `Seidel sign: ${finding.seidel.toLowerCase().replace("_", " ")}`];
  if (finding.pattern) parts.push(`Pattern: ${finding.pattern}`);
  return parts.join("; ");
}

export type SlitLampExamFinding = {
  /** Free-text documentation of anterior segment findings; not a diagnosis. */
  findings: string;
};

export function formatSlitLampExam(finding: SlitLampExamFinding): string {
  return `Slit-lamp exam: ${finding.findings}`;
}

/**
 * Combines the structured foundation pieces into a single documentation block. Every field is
 * optional and free-text-driven; nothing here derives a diagnosis or disposition from the
 * combination of findings.
 */
export function formatOcularExamDocumentationBlock(input: {
  visualAcuity?: readonly VisualAcuityMeasurement[];
  intraocularPressureFlags?: EyeEmergencyRedFlagInput;
  intraocularPressureMeasurements?: readonly IntraocularPressureMeasurement[];
  fluorescein?: FluoresceinExamFinding;
  slitLamp?: SlitLampExamFinding;
}): string {
  const lines: string[] = [];
  if (input.visualAcuity?.length) lines.push(`Visual acuity — ${formatVisualAcuitySummary(input.visualAcuity)}`);
  if (input.intraocularPressureFlags) {
    lines.push(
      `IOP — ${formatIntraocularPressureForDocumentation(input.intraocularPressureFlags, input.intraocularPressureMeasurements ?? [])}`,
    );
  }
  if (input.fluorescein) lines.push(formatFluoresceinExam(input.fluorescein));
  if (input.slitLamp) lines.push(formatSlitLampExam(input.slitLamp));
  return lines.join("\n");
}
