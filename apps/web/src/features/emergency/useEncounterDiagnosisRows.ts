"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import {
  parseEncounterDiagnosisApiItems,
  type EncounterDiagnosisApiRow,
} from "./encounterClinicalRecordAdapter";
import { icd10ListLocaleQuery } from "@/components/diagnosis/icd10LivePresentation";

/**
 * Loads saved encounter diagnoses from the same patient diagnoses list used by the Diagnostics tab.
 * Pass the active Medora product UI locale for live presentation. Omit locale for unlocalized code-only.
 */
export function useEncounterDiagnosisRows(input: {
  encounterId: string;
  patientId: string | null | undefined;
  facilityId: string;
  refreshKey?: string | number;
  locale?: string | null;
}): EncounterDiagnosisApiRow[] {
  const [rows, setRows] = useState<EncounterDiagnosisApiRow[]>([]);
  const localeQuery = icd10ListLocaleQuery(input.locale);

  useEffect(() => {
    if (!input.patientId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch(
          `/patients/${input.patientId}/diagnoses?status=ACTIVE&limit=200${localeQuery}`,
          {
            facilityId: input.facilityId,
          }
        );
        if (cancelled) return;
        setRows(
          parseEncounterDiagnosisApiItems(data, input.encounterId).filter(
            (row) => !row.status || row.status === "ACTIVE"
          )
        );
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [input.encounterId, input.patientId, input.facilityId, input.refreshKey, localeQuery]);

  return rows;
}
