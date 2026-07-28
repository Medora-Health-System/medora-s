"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { filterHaitiAmbulatoryClinicalDataCards } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { ClinicalDocumentationHub } from "@/features/clinical-documentation/ClinicalDocumentationHub";
import {
  fetchClinicalDocumentationEntries,
  type ClinicalDocumentationEntryRow,
} from "@/lib/clinicalDocumentationApi";
import {
  MedoraCard,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import { EmergencyClinicalDataSummary } from "./EmergencyClinicalDataSummary";
import { EmergencyClinicalDataRecentFeed } from "./EmergencyClinicalDataRecentFeed";
import { EmergencyClinicalDataDetailDrawer } from "./EmergencyClinicalDataDetailDrawer";

export type EmergencyClinicalDataPanelProps = {
  encounterId: string;
  facilityId: string;
  facilityTimeZone?: string | null;
  /** Hub care setting — CLINIC for ambulatory (default ED for emergency mounts). */
  careSetting?: "ED" | "OBSERVATION" | "INPATIENT" | "ICU" | "TELEMETRY" | "CLINIC" | "URGENT_CARE";
  /** When true, apply Haiti/ambulatory ED-only blocklist at registry query level. */
  filterDocumentCards?: boolean;
  /** When true, hide the catalog hub and show saved entries only (Summary-style). */
  hideCatalogCards?: boolean;
};

export function EmergencyClinicalDataPanel({
  encounterId,
  facilityId,
  facilityTimeZone,
  careSetting = "ED",
  filterDocumentCards = false,
  hideCatalogCards = false,
}: EmergencyClinicalDataPanelProps) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<ClinicalDocumentationEntryRow[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const res = await fetchClinicalDocumentationEntries(encounterId, facilityId);
      setEntries(res.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const detailEntry = useMemo(
    () => entries.find((entry) => entry.id === detailEntryId) ?? null,
    [entries, detailEntryId]
  );

  return (
    <div data-testid="emergency-clinical-data-panel">
      <MedoraCard leftAccentColor="#0284c7" variant="default">
        <MedoraCardInner>
          <MedoraCardTitle title={t("emergencyClinicalData.title")} />

          {loadingEntries ? (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
          ) : (
            <>
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                    .clinical-data-header-grid {
                      display: grid;
                      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                      gap: 16px;
                      margin-top: 8px;
                      align-items: stretch;
                    }
                    .clinical-data-header-grid > * {
                      min-width: 0;
                      height: 100%;
                    }
                    @media (max-width: 767.98px) {
                      .clinical-data-header-grid {
                        grid-template-columns: minmax(0, 1fr);
                      }
                    }
                  `,
                }}
              />
              <div
                className="clinical-data-header-grid"
                data-testid="clinical-data-header-grid"
              >
                <EmergencyClinicalDataSummary entries={entries} facilityTimeZone={facilityTimeZone} />
                <EmergencyClinicalDataRecentFeed
                  entries={entries}
                  facilityTimeZone={facilityTimeZone}
                  onSelectEntry={setDetailEntryId}
                />
              </div>
            </>
          )}

          {!hideCatalogCards ? (
          <div style={{ marginTop: 12 }}>
            <ClinicalDocumentationHub
              careSetting={careSetting}
              encounterId={encounterId}
              facilityId={facilityId}
              showHeader={false}
              showSavedEntries={false}
              externalEntries={entries}
              externalEntriesLoading={loadingEntries}
              skipEntriesFetch
              workspaceContext="clinicalData"
              onEntriesChanged={loadEntries}
              focusedCardId={focusedCardId}
              documentCardFilter={
                filterDocumentCards
                  ? (card) =>
                      filterHaitiAmbulatoryClinicalDataCards([
                        {
                          id: card.id,
                          typeId: card.id,
                          careSettings: card.careSettings,
                          category: card.category,
                          title: card.titleEn ?? card.titleFr ?? card.id,
                        },
                      ]).length > 0
                  : undefined
              }
            />
          </div>
          ) : null}
        </MedoraCardInner>
      </MedoraCard>

      <EmergencyClinicalDataDetailDrawer
        entry={detailEntry}
        open={detailEntryId != null}
        facilityTimeZone={facilityTimeZone}
        onClose={() => setDetailEntryId(null)}
        onOpenForm={(cardId) => {
          setDetailEntryId(null);
          setFocusedCardId(cardId);
        }}
      />
    </div>
  );
}
