"use client";

/**
 * INP.PROV.1A — Provider Documentation hub.
 * Reuses EnterpriseProviderClinicalWorkspaceD4b8 + InpatientProviderWorkspacePanel.
 * Does not create a second documentation engine. Procedure notes remain deferred (D4B.8).
 */

import { useMemo, useState, type CSSProperties } from "react";
import {
  buildInpatientDocumentationCompletenessAlerts,
  canAuthorInpatientProviderDocumentation,
  parseInpatientProviderDocumentationSubtab,
  type InpatientProviderDocumentationSubtab,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { EnterpriseProviderClinicalWorkspaceD4b8 } from "@/features/clinical-documentation/EnterpriseProviderClinicalWorkspaceD4b8";
import { InpatientProviderWorkspacePanel } from "./InpatientProviderWorkspacePanel";
import { InpatientClinicalOpsPanel } from "./InpatientClinicalOpsPanel";
import type { InpatientWorkspaceEncounterLite } from "./InpatientWorkspacePanel";
import type { VitalsHistoryEntry } from "@/lib/encounterClinicalSafetyUi";

const SUBTABS: Array<{ id: InpatientProviderDocumentationSubtab; labelKey: string }> = [
  { id: "historyPhysical", labelKey: "inpatientProviderDocumentationInpProv1a.subtabs.historyPhysical" },
  { id: "progressNotes", labelKey: "inpatientProviderDocumentationInpProv1a.subtabs.progressNotes" },
  { id: "problemsPlan", labelKey: "inpatientProviderDocumentationInpProv1a.subtabs.problemsPlan" },
  { id: "consults", labelKey: "inpatientProviderDocumentationInpProv1a.subtabs.consults" },
];

type Props = {
  encounterId: string;
  facilityId: string;
  encounter: InpatientWorkspaceEncounterLite | null;
  roles: string[];
  isLocked: boolean;
  writersEnabled: boolean;
  initialSubtab?: string | null;
  admissionDiagnosis?: string | null;
  room?: string | null;
  latestVitalsEntry?: VitalsHistoryEntry | null;
  onNavigateSection?: (section: "historyPhysical" | "progressNotes" | "problemsPlan" | "consults") => void;
};

export function InpatientProviderDocumentationBoard({
  encounterId,
  facilityId,
  encounter,
  roles,
  isLocked,
  writersEnabled,
  initialSubtab,
  admissionDiagnosis,
  room,
  latestVitalsEntry,
  onNavigateSection,
}: Props) {
  const { t } = useI18n();
  const canAuthor = canAuthorInpatientProviderDocumentation(roles) && writersEnabled;
  const [subtab, setSubtab] = useState<InpatientProviderDocumentationSubtab>(() =>
    parseInpatientProviderDocumentationSubtab(initialSubtab)
  );
  const [carryForwardPendingReview, setCarryForwardPendingReview] = useState(false);
  const [carryForwardText, setCarryForwardText] = useState("");
  const [carryForwardReviewed, setCarryForwardReviewed] = useState(false);

  const alerts = useMemo(
    () =>
      buildInpatientDocumentationCompletenessAlerts({
        careSetting: "INPATIENT",
        admissionRationaleText: null,
        problemsWithoutPlanCount: 0,
        carryForwardPendingReview: carryForwardPendingReview && !carryForwardReviewed,
        hasUnsignedProviderDraft:
          (encounter?.providerDocumentationStatus ?? "").trim().toUpperCase() === "DRAFT",
      }),
    [carryForwardPendingReview, carryForwardReviewed, encounter?.providerDocumentationStatus]
  );

  const vitalsLine = latestVitalsEntry
    ? `${latestVitalsEntry.recordedAt} · ${JSON.stringify(latestVitalsEntry.vitals).slice(0, 120)}`
    : null;

  const selectSubtab = (id: InpatientProviderDocumentationSubtab) => {
    setSubtab(id);
    onNavigateSection?.(id);
  };

  return (
    <div data-testid="inp-prov-1a-provider-documentation-board" style={{ display: "grid", gap: 12 }}>
      <header style={{ ...MEDORA_CARD_SHELL, padding: "10px 12px" }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
          {t("inpatientProviderDocumentationInpProv1a.title")}
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
          {t("inpatientProviderDocumentationInpProv1a.subtitle")}
        </p>
        {!canAuthor ? (
          <p
            role="status"
            data-testid="inp-prov-1a-view-only"
            style={{ margin: "8px 0 0", fontSize: 12, color: "#92400e", fontWeight: 600 }}
          >
            {t("inpatientProviderDocumentationInpProv1a.viewOnlyBanner")}
          </p>
        ) : null}
      </header>

      <div
        role="tablist"
        aria-label={t("inpatientProviderDocumentationInpProv1a.subtabsLabel")}
        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
        data-testid="inp-prov-1a-subtabs"
      >
        {SUBTABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subtab === tab.id}
            data-testid={`inp-prov-1a-subtab-${tab.id}`}
            onClick={() => selectSubtab(tab.id)}
            style={{
              padding: "4px 10px",
              borderRadius: 9999,
              border: subtab === tab.id ? "1px solid #2563eb" : "1px solid #cbd5e1",
              background: subtab === tab.id ? "#eff6ff" : "#fff",
              color: subtab === tab.id ? "#1e40af" : "#334155",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {alerts.length > 0 ? (
        <aside
          data-testid="inp-prov-1a-completeness"
          style={{ ...MEDORA_CARD_SHELL, padding: "8px 10px", borderColor: "#fde68a" }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
            {t("inpatientProviderDocumentationInpProv1a.completenessTitle")}
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#334155" }}>
            {alerts.map((a) => (
              <li key={a.code} data-alert-code={a.code}>
                {a.messageEn}
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      {subtab === "progressNotes" ? (
        <section
          data-testid="inp-prov-1a-objective-context"
          style={{ ...MEDORA_CARD_SHELL, padding: "8px 10px" }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>
            {t("inpatientProviderDocumentationInpProv1a.objectiveContextTitle")}
          </div>
          <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
            {[
              room ? `${t("inpatientProviderDocumentationInpProv1a.room")}: ${room}` : null,
              admissionDiagnosis
                ? `${t("inpatientProviderDocumentationInpProv1a.admissionDx")}: ${admissionDiagnosis}`
                : null,
              vitalsLine
                ? `${t("inpatientProviderDocumentationInpProv1a.latestVitals")}: ${vitalsLine}`
                : t("inpatientProviderDocumentationInpProv1a.noVitals"),
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#64748b" }}>
            {t("inpatientProviderDocumentationInpProv1a.objectiveContextHint")}
          </p>
          {canAuthor ? (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12 }}>
                {t("inpatientProviderDocumentationInpProv1a.carryForwardLabel")}
                <textarea
                  value={carryForwardText}
                  onChange={(e) => {
                    setCarryForwardText(e.target.value);
                    setCarryForwardPendingReview(Boolean(e.target.value.trim()));
                    setCarryForwardReviewed(false);
                  }}
                  rows={3}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  data-dictation-ready="true"
                  id="inp-prov-1a-carry-forward"
                />
              </label>
              {carryForwardPendingReview ? (
                <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={carryForwardReviewed}
                    onChange={(e) => setCarryForwardReviewed(e.target.checked)}
                    data-testid="inp-prov-1a-carry-forward-reviewed"
                  />
                  {t("inpatientProviderDocumentationInpProv1a.carryForwardReview")}
                </label>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {subtab === "historyPhysical" || subtab === "progressNotes" ? (
        <EnterpriseProviderClinicalWorkspaceD4b8
          encounterId={encounterId}
          patientId={encounter?.patient?.id ?? "unknown-patient"}
          facilityId={facilityId}
          careSetting="INPATIENT"
          roleCodes={roles}
          isLocked={isLocked || !canAuthor}
          initialSection={subtab}
        />
      ) : null}

      {subtab === "consults" ? (
        <div data-testid="inp-prov-1a-consults-live">
          <InpatientClinicalOpsPanel encounterId={encounterId} mode="consults" />
        </div>
      ) : (
        <InpatientProviderWorkspacePanel
          mode={subtab}
          encounterId={encounterId}
          facilityId={facilityId}
          patientId={encounter?.patient?.id}
          canProviderWrite={canAuthor}
          canDocumentDiagnoses={canAuthor}
          isLocked={isLocked || !canAuthor}
          onNavigateSection={(s) => {
            if (s === "historyPhysical" || s === "progressNotes" || s === "problemsPlan") {
              selectSubtab(s);
            }
          }}
        />
      )}

      {subtab === "historyPhysical" ? (
        <p style={hintStyle}>{t("inpatientProviderDocumentationInpProv1a.medicalNecessityHint")}</p>
      ) : null}
    </div>
  );
}

const hintStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "#64748b",
};
