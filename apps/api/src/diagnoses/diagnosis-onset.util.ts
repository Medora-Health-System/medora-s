import { BadRequestException } from "@nestjs/common";
import { DiagnosisOnsetPrecision } from "@prisma/client";

export type ResolvedDiagnosisOnset = {
  onsetDate: Date | null;
  onsetPrecision: DiagnosisOnsetPrecision;
};

/** Reject unreasonable future clinical onset (allow 2h clock skew). */
export function assertDiagnosisOnsetNotUnreasonablyFuture(
  onsetDate: Date | null | undefined,
  now = new Date()
): void {
  if (!onsetDate) return;
  const max = now.getTime() + 2 * 60 * 60 * 1000;
  if (onsetDate.getTime() > max) {
    throw new BadRequestException("Clinical onset cannot be in the future.");
  }
}

/**
 * Normalize create/update onset fields.
 * - UNKNOWN → null date + UNKNOWN precision
 * - DATE → calendar day at UTC noon (avoids TZ day-shift) + DATE precision
 * - DATETIME → full instant + DATETIME precision
 */
export function resolveDiagnosisOnsetInput(input: {
  onsetDate?: Date | null;
  onsetPrecision?: DiagnosisOnsetPrecision | null;
  now?: Date;
}): ResolvedDiagnosisOnset {
  const now = input.now ?? new Date();
  const precision = input.onsetPrecision ?? null;
  const raw = input.onsetDate;

  if (precision === DiagnosisOnsetPrecision.UNKNOWN || (precision == null && (raw == null || Number.isNaN(raw.getTime())))) {
    return { onsetDate: null, onsetPrecision: DiagnosisOnsetPrecision.UNKNOWN };
  }

  if (precision === DiagnosisOnsetPrecision.DATE) {
    if (!raw || Number.isNaN(raw.getTime())) {
      throw new BadRequestException("Clinical onset date is required for date-only precision.");
    }
    const onsetDate = new Date(
      Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate(), 12, 0, 0, 0)
    );
    assertDiagnosisOnsetNotUnreasonablyFuture(onsetDate, now);
    return { onsetDate, onsetPrecision: DiagnosisOnsetPrecision.DATE };
  }

  if (precision === DiagnosisOnsetPrecision.DATETIME || (precision == null && raw != null)) {
    if (!raw || Number.isNaN(raw.getTime())) {
      throw new BadRequestException("Clinical onset date/time is required.");
    }
    assertDiagnosisOnsetNotUnreasonablyFuture(raw, now);
    return { onsetDate: raw, onsetPrecision: DiagnosisOnsetPrecision.DATETIME };
  }

  return { onsetDate: null, onsetPrecision: DiagnosisOnsetPrecision.UNKNOWN };
}
