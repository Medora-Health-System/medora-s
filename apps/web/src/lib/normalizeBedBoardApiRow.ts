import { enrichComposedBedBoardRow, type ComposedBedBoardRow } from "@medora/shared";
import type { FacilityBedBoardBedRow } from "@/lib/bedBoardApi";

/** Normalize PATCH/GET bed row to the web bed-board row shape (storageKey, displayKey, unit). */
export function normalizeBedBoardApiRow(
  row: ComposedBedBoardRow | FacilityBedBoardBedRow
): FacilityBedBoardBedRow {
  const enriched = enrichComposedBedBoardRow(row as ComposedBedBoardRow);
  return {
    bedKey: enriched.bedKey,
    display: enriched.display,
    storageKey: enriched.storageKey,
    displayKey: enriched.displayKey,
    room: enriched.room,
    unitCode: enriched.unitCode,
    unit: enriched.unit,
    status: enriched.status,
    statusSource: enriched.statusSource,
    occupantEncounterId: enriched.occupantEncounterId,
    occupantPatientName: enriched.occupantPatientName,
    patientDisplay: enriched.patientDisplay ?? enriched.occupantPatientName,
    occupantMrn: enriched.occupantMrn,
    reasonCode: enriched.reasonCode,
    reasonText: enriched.reasonText,
    updatedAt: enriched.updatedAt,
  };
}
