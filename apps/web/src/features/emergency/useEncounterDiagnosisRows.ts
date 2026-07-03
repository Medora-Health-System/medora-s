"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  parseEncounterDiagnosisApiItems,
  type EncounterDiagnosisApiRow,
} from "./encounterClinicalRecordAdapter";

/**
 * Loads saved encounter diagnoses from the same patient diagnoses list used by the Diagnostics tab.
 */
export function useEncounterDiagnosisRows(input: {
  encounterId: string;
  patientId: string | null | undefined;
  facilityId: string;
  refreshKey?: string | number;
}): EncounterDiagnosisApiRow[] {
  const [rows, setRows] = useState<EncounterDiagnosisApiRow[]>([]);

  useEffect(() => {
    if (!input.patientId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch(`/patients/${input.patientId}/diagnoses?limit=200`, {
          facilityId: input.facilityId,
        });
        if (cancelled) return;
        setRows(parseEncounterDiagnosisApiItems(data, input.encounterId));
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [input.encounterId, input.patientId, input.facilityId, input.refreshKey]);

  return rows;
}
