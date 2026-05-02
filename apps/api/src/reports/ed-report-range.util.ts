import { BadRequestException } from "@nestjs/common";

/** ~2 years + buffer — long audit windows without unbounded scans in one JSON page. */
export const MAX_ED_REPORT_RANGE_DAYS = 800;

export const JSON_PAGE_DEFAULT_LIMIT = 100;
export const JSON_PAGE_MAX_LIMIT = 500;
export const CSV_BATCH_SIZE = 2000;

export function assertEdReportDateRange(from: Date, to: Date): void {
  if (from.getTime() > to.getTime()) {
    throw new BadRequestException("La plage de dates est invalide.");
  }
  const spanDays = (to.getTime() - from.getTime()) / 86400_000;
  if (spanDays > MAX_ED_REPORT_RANGE_DAYS) {
    throw new BadRequestException(
      `La plage ne peut pas dépasser ${MAX_ED_REPORT_RANGE_DAYS} jours (audit / performance).`
    );
  }
}
