"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CLINICAL_DOCUMENTATION_CATEGORY_META,
  EDOC_BASIC_STRUCTURED_CARD_ID,
  EDOC5_INTAKE_OUTPUT_CARD_IDS,
  calculateIntakeOutputTotals,
  canWitnessClinicalDocumentationEntry,
  clinicalDocumentationPendingWitness,
  type ClinicalDocumentationCard,
  type ClinicalDocumentationCategory,
  listClinicalDocumentationCardsByCategory,
  listClinicalDocumentationCardsForCareSetting,
  requiresImmediateWitnessCaptureForPayload,
  searchClinicalDocumentationCards,
  selectClinicalDocumentationPayloadSummary,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  createClinicalDocumentationEntry,
  createClinicalDocumentationEntryWithWitness,
  fetchClinicalDocumentationEntries,
  witnessClinicalDocumentationEntry,
  type ClinicalDocumentationEntryRow,
} from "@/lib/clinicalDocumentationApi";
import {
  ClinicalDocumentationObservationForm,
  isEdoc3ObservationFormCard,
} from "./ClinicalDocumentationObservationForm";
import {
  ClinicalDocumentationStrokeForm,
  isEdoc4StrokeFormCard,
} from "./ClinicalDocumentationStrokeForm";
import {
  ClinicalDocumentationIntakeOutputForm,
  isEdoc5IntakeOutputFormCard,
} from "./ClinicalDocumentationIntakeOutputForm";
import {
  ClinicalDocumentationRestraintForm,
  isEdoc6RestraintFormCard,
} from "./ClinicalDocumentationRestraintForm";
import {
  ClinicalDocumentationBloodProductForm,
  isEdoc7BloodProductFormCard,
} from "./ClinicalDocumentationBloodProductForm";
import {
  ClinicalDocumentationHighAlertInfusionForm,
  isEdoc8HighAlertInfusionFormCard,
} from "./ClinicalDocumentationHighAlertInfusionForm";
import {
  ClinicalDocumentationBelongingsValuablesForm,
  isEdoc9BelongingsValuablesFormCard,
} from "./ClinicalDocumentationBelongingsValuablesForm";
import {
  ClinicalDocumentationProceduralSedationForm,
  isEdoc10ProceduralSedationFormCard,
} from "./ClinicalDocumentationProceduralSedationForm";
import {
  ClinicalDocumentationStrokeNeuroReassessmentForm,
  isEdoc11StrokeNeuroReassessmentFormCard,
} from "./ClinicalDocumentationStrokeNeuroReassessmentForm";
import {
  ClinicalDocumentationRespiratoryForm,
  isEdoc12RespiratoryDocumentationFormCard,
} from "./ClinicalDocumentationRespiratoryForm";
import {
  ClinicalDocumentationPainForm,
  isEdoc13PainDocumentationFormCard,
} from "./ClinicalDocumentationPainForm";
import {
  ClinicalDocumentationNeurologicalForm,
  isEdoc14NeurologicalDocumentationFormCard,
} from "./ClinicalDocumentationNeurologicalForm";
import {
  ClinicalDocumentationFallRiskForm,
  isEdoc14FallRiskSafetyDocumentationFormCard,
} from "./ClinicalDocumentationFallRiskForm";
import {
  ClinicalDocumentationCardiacMonitoringForm,
  isEdoc15CardiacMonitoringDocumentationFormCard,
} from "./ClinicalDocumentationCardiacMonitoringForm";
import {
  ClinicalDocumentationBehavioralHealthForm,
  isEdoc16BehavioralHealthDocumentationFormCard,
} from "./ClinicalDocumentationBehavioralHealthForm";
import {
  ClinicalDocumentationDeviceMonitoringForm,
  isEdoc17DeviceMonitoringDocumentationFormCard,
} from "./ClinicalDocumentationDeviceMonitoringForm";
import {
  ClinicalDocumentationSepsisMonitoringForm,
  isEdoc18SepsisMonitoringDocumentationFormCard,
} from "./ClinicalDocumentationSepsisMonitoringForm";
import {
  ClinicalDocumentationNursingAdmissionCarePlanForm,
  isEdoc19NursingAdmissionCarePlanDocumentationFormCard,
} from "./ClinicalDocumentationNursingAdmissionCarePlanForm";
import { ClinicalDocumentationWitnessSearchModal } from "./ClinicalDocumentationWitnessSearchModal";

const chipBase: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 500,
  borderRadius: 9999,
  border: "1px solid #e2e8f0",
  background: "#fff",
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const cardShell: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#fff",
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
};

type BasicItem = { key: string; value: string };

type ImmediateWitnessDraft = {
  card: ClinicalDocumentationCard;
  payload: Record<string, unknown>;
};

function cardTitle(card: ClinicalDocumentationCard, locale: "en" | "fr"): string {
  return locale === "fr" ? card.titleFr : card.titleEn;
}

function cardDescription(card: ClinicalDocumentationCard, locale: "en" | "fr"): string {
  return locale === "fr" ? card.descriptionFr : card.descriptionEn;
}

function entryDisplayTitle(entry: ClinicalDocumentationEntryRow, locale: "en" | "fr"): string {
  return locale === "fr" ? entry.cardTitleFr : entry.cardTitleEn;
}

export function ClinicalDocumentationHub({
  careSetting = "ED",
  encounterId,
  facilityId,
  onClose,
}: {
  careSetting?: "ED" | "OBSERVATION" | "INPATIENT" | "ICU" | "TELEMETRY" | "CLINIC" | "URGENT_CARE";
  encounterId?: string;
  facilityId?: string;
  onClose?: () => void;
}) {
  const { t, language } = useI18n();
  const { userId, roles } = useFacilityAndRoles();
  const locale = language === "en" ? "en" : "fr";
  const [selectedCategory, setSelectedCategory] = useState<ClinicalDocumentationCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<ClinicalDocumentationEntryRow[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [basicItems, setBasicItems] = useState<BasicItem[]>([{ key: "", value: "" }]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [witnessModalEntry, setWitnessModalEntry] = useState<ClinicalDocumentationEntryRow | null>(
    null
  );
  const [immediateWitnessDraft, setImmediateWitnessDraft] = useState<ImmediateWitnessDraft | null>(
    null
  );

  const canPersist = Boolean(encounterId && facilityId);

  const loadEntries = useCallback(async () => {
    if (!encounterId || !facilityId) return;
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

  const scopedCards = useMemo(() => {
    const base = listClinicalDocumentationCardsForCareSetting(careSetting);
    const searched =
      search.trim().length > 0
        ? searchClinicalDocumentationCards(search, locale).filter((c) =>
            c.careSettings.includes(careSetting)
          )
        : base;
    if (selectedCategory === "ALL") return searched;
    return searched.filter((c) => c.category === selectedCategory);
  }, [careSetting, locale, search, selectedCategory]);

  const intakeOutputTotals = useMemo(() => {
    const ioEntries = entries
      .filter(
        (e) =>
          !e.voidedAt &&
          (EDOC5_INTAKE_OUTPUT_CARD_IDS as readonly string[]).includes(e.cardId)
      )
      .map((e) => ({
        cardId: e.cardId,
        payload: (e.payloadJson ?? {}) as Record<string, unknown>,
      }));
    return calculateIntakeOutputTotals(ioEntries);
  }, [entries]);

  const showIntakeOutputTotals =
    intakeOutputTotals.totalIntakeMl > 0 ||
    intakeOutputTotals.totalOutputMl > 0 ||
    selectedCategory === "INTAKE_OUTPUT";

  const categoryMeta = (id: ClinicalDocumentationCategory) =>
    CLINICAL_DOCUMENTATION_CATEGORY_META.find((m) => m.id === id);

  const openLabel = (card: ClinicalDocumentationCard) => {
    if (card.implementationStatus === "AVAILABLE") return t("clinicalDocumentation.actionOpen");
    if (card.implementationStatus === "FOUNDATION_ONLY") {
      return t("clinicalDocumentation.actionFoundation");
    }
    return t("clinicalDocumentation.actionComingSoon");
  };

  const formatWhen = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(locale === "fr" ? "fr-FR" : "en-US", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const saveMessageForEntry = (entry: { requiresWitnessSignature: boolean; witnessStatus: string }) => {
    if (entry.requiresWitnessSignature && entry.witnessStatus === "PENDING_WITNESS") {
      return t("clinicalDocumentation.savePendingWitness");
    }
    return t("clinicalDocumentation.saveOk");
  };

  const finalizeWitness = async (entryId: string) => {
    if (!encounterId || !facilityId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await witnessClinicalDocumentationEntry(encounterId, entryId, facilityId);
      setSaveMessage(t("clinicalDocumentation.witnessOk"));
      setWitnessModalEntry(null);
      await loadEntries();
    } catch {
      setSaveMessage(t("clinicalDocumentation.witnessFailed"));
    } finally {
      setSaving(false);
    }
  };

  const openWitnessModal = (entry: ClinicalDocumentationEntryRow) => {
    setImmediateWitnessDraft(null);
    setWitnessModalEntry(entry);
  };

  const cancelImmediateWitnessDraft = () => {
    setImmediateWitnessDraft(null);
    setSaveMessage(t("clinicalDocumentation.witnessModal.cancelWithoutSave"));
  };

  const finalizeImmediateWitness = async (witnessUserId: string) => {
    if (!immediateWitnessDraft || !encounterId || !facilityId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await createClinicalDocumentationEntryWithWitness(encounterId, facilityId, {
        category: immediateWitnessDraft.card.category,
        cardId: immediateWitnessDraft.card.id,
        payloadJson: immediateWitnessDraft.payload,
        witnessUserId,
      });
      setSaveMessage(t("clinicalDocumentation.saveOk"));
      setImmediateWitnessDraft(null);
      setExpandedCardId(null);
      await loadEntries();
    } catch {
      setSaveMessage(t("clinicalDocumentation.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const submitClinicalDocumentation = async (
    card: ClinicalDocumentationCard,
    payload: Record<string, unknown>
  ): Promise<void> => {
    if (requiresImmediateWitnessCaptureForPayload(card.id, payload)) {
      setSaveMessage(null);
      setWitnessModalEntry(null);
      setImmediateWitnessDraft({ card, payload });
      return;
    }
    await saveObservationEntry(card, payload);
  };

  const saveObservationEntry = async (card: ClinicalDocumentationCard, payload: Record<string, unknown>) => {
    if (!encounterId || !facilityId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const saved = await createClinicalDocumentationEntry(encounterId, facilityId, {
        category: card.category,
        cardId: card.id,
        payloadJson: payload,
      });
      setSaveMessage(saveMessageForEntry(saved));
      setExpandedCardId(null);
      await loadEntries();
    } catch {
      setSaveMessage(t("clinicalDocumentation.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const saveBasicStructured = async (card: ClinicalDocumentationCard) => {
    if (!encounterId || !facilityId) return;
    const items = basicItems
      .map((row) => ({ key: row.key.trim(), value: row.value.trim() }))
      .filter((row) => row.key && row.value);
    if (items.length === 0) {
      setSaveMessage(t("clinicalDocumentation.saveValidationEmpty"));
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      const saved = await createClinicalDocumentationEntry(encounterId, facilityId, {
        category: card.category,
        cardId: card.id,
        payloadJson: { items },
      });
      setSaveMessage(saveMessageForEntry(saved));
      setExpandedCardId(null);
      setBasicItems([{ key: "", value: "" }]);
      await loadEntries();
    } catch {
      setSaveMessage(t("clinicalDocumentation.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-testid="clinical-documentation-hub"
      style={{
        marginTop: 12,
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        background: "#f8fafc",
        padding: 14,
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
            {t("clinicalDocumentation.hubTitle")}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
            {t("clinicalDocumentation.hubSubtitle")}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {t("clinicalDocumentation.closeHub")}
          </button>
        ) : null}
      </div>

      {canPersist ? (
        <section
          data-testid="clinical-documentation-saved-entries"
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            background: "#fff",
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
            {t("clinicalDocumentation.savedEntriesTitle")}
          </p>
          {loadingEntries ? (
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("common.loading")}</p>
          ) : entries.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              {t("clinicalDocumentation.savedEntriesEmpty")}
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {entries.map((entry) => {
                const pendingWitness = clinicalDocumentationPendingWitness(entry);
                const showWitness =
                  canPersist &&
                  canWitnessClinicalDocumentationEntry(entry, userId || undefined, roles);
                return (
                  <li
                    key={entry.id}
                    data-testid="clinical-documentation-saved-entry"
                    data-witness-status={entry.witnessStatus}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #f1f5f9",
                      background: "#f8fafc",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {entryDisplayTitle(entry, locale)}
                      {entry.voidedAt ? ` — ${t("clinicalDocumentation.entryVoided")}` : ""}
                      {pendingWitness ? (
                        <span
                          data-testid="clinical-documentation-pending-witness-badge"
                          style={{
                            marginLeft: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: 9999,
                            background: "#fef9c3",
                            color: "#a16207",
                          }}
                        >
                          {t("clinicalDocumentation.badgePendingWitness")}
                        </span>
                      ) : null}
                      {entry.witnessedAt ? (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: 9999,
                            background: "#dcfce7",
                            color: "#15803d",
                          }}
                        >
                          {t("clinicalDocumentation.badgeWitnessed")}
                        </span>
                      ) : null}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>
                      {t("clinicalDocumentation.entryMeta")
                        .replace("{author}", entry.authorDisplayName)
                        .replace("{role}", entry.authorRoleTitle)
                        .replace("{when}", formatWhen(entry.createdAt))}
                    </p>
                    {entry.witnessedAt && entry.witnessDisplayName ? (
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>
                        {t("clinicalDocumentation.witnessLine")
                          .replace("{name}", entry.witnessDisplayName)
                          .replace("{role}", entry.witnessRoleTitle ?? "—")
                          .replace("{when}", formatWhen(entry.witnessedAt))}
                      </p>
                    ) : null}
                    {selectClinicalDocumentationPayloadSummary(entry, locale).length > 0 ? (
                      <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 12, color: "#334155" }}>
                        {selectClinicalDocumentationPayloadSummary(entry, locale).map((line) => (
                          <li key={`${entry.id}-${line.key}`}>
                            <strong>{line.key}</strong>: {line.value}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {showWitness ? (
                      <button
                        type="button"
                        data-testid="clinical-documentation-witness-button"
                        disabled={saving}
                        onClick={() => openWitnessModal(entry)}
                        style={{
                          marginTop: 6,
                          padding: "5px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          cursor: saving ? "not-allowed" : "pointer",
                        }}
                      >
                        {t("clinicalDocumentation.witnessAction")}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("clinicalDocumentation.searchPlaceholder")}
        aria-label={t("clinicalDocumentation.searchAria")}
        data-testid="clinical-documentation-search"
        style={{
          width: "100%",
          boxSizing: "border-box",
          marginBottom: 10,
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          fontSize: 14,
        }}
      />

      <div
        role="tablist"
        aria-label={t("clinicalDocumentation.categoriesAria")}
        data-testid="clinical-documentation-categories"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 4,
          marginBottom: 12,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "ALL"}
          data-testid="clinical-documentation-category-all"
          onClick={() => setSelectedCategory("ALL")}
          style={{
            ...chipBase,
            fontWeight: selectedCategory === "ALL" ? 600 : 500,
            background: selectedCategory === "ALL" ? "#e2e8f0" : "#fff",
          }}
        >
          {t("clinicalDocumentation.categoryAll")}
        </button>
        {CLINICAL_DOCUMENTATION_CATEGORY_META.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`clinical-documentation-category-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                ...chipBase,
                fontWeight: active ? 600 : 500,
                background: active ? "#e2e8f0" : "#fff",
              }}
            >
              {locale === "fr" ? cat.titleFr : cat.titleEn}
            </button>
          );
        })}
      </div>

      {selectedCategory !== "ALL" ? (
        <p
          data-testid="clinical-documentation-category-description"
          style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}
        >
          {locale === "fr"
            ? categoryMeta(selectedCategory)?.descriptionFr
            : categoryMeta(selectedCategory)?.descriptionEn}
        </p>
      ) : null}

      {saveMessage ? (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>{saveMessage}</p>
      ) : null}

      {showIntakeOutputTotals ? (
        <div
          data-testid="clinical-documentation-io-mini-totals"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 10,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#fff",
            fontSize: 12,
            color: "#334155",
          }}
        >
          <span>
            {t("clinicalDocumentation.forms.intakeOutput.miniTotalIntake")}:{" "}
            <strong>{intakeOutputTotals.totalIntakeMl} mL</strong>
          </span>
          <span>
            {t("clinicalDocumentation.forms.intakeOutput.miniTotalOutput")}:{" "}
            <strong>{intakeOutputTotals.totalOutputMl} mL</strong>
          </span>
          <span>
            {t("clinicalDocumentation.forms.intakeOutput.miniNetBalance")}:{" "}
            <strong>
              {intakeOutputTotals.netBalanceMl >= 0 ? "+" : ""}
              {intakeOutputTotals.netBalanceMl} mL
            </strong>
          </span>
        </div>
      ) : null}

      {scopedCards.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("clinicalDocumentation.noCards")}</p>
      ) : (
        <div
          data-testid="clinical-documentation-cards-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
            maxHeight: "min(52vh, 520px)",
            overflowY: "auto",
            minWidth: 0,
          }}
        >
          {scopedCards.map((c) => (
            <article
              key={c.id}
              data-testid="clinical-documentation-card"
              data-card-id={c.id}
              data-category={c.category}
              style={cardShell}
            >
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.35 }}>
                {cardTitle(c, locale)}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 9999,
                    background: "#f1f5f9",
                    color: "#475569",
                  }}
                >
                  {t(`clinicalDocumentation.role.${c.primaryRole}`)}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 9999,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                  }}
                >
                  {careSetting}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 9999,
                    background:
                      c.implementationStatus === "AVAILABLE" ? "#dcfce7" : "#fef9c3",
                    color: c.implementationStatus === "AVAILABLE" ? "#15803d" : "#a16207",
                  }}
                >
                  {t(`clinicalDocumentation.implementationStatus.${c.implementationStatus}`)}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                {cardDescription(c, locale)}
              </p>
              <button
                type="button"
                disabled={c.implementationStatus !== "AVAILABLE" || !canPersist}
                onClick={() => {
                  if (c.implementationStatus !== "AVAILABLE" || !canPersist) return;
                  setExpandedCardId((prev) => (prev === c.id ? null : c.id));
                  setSaveMessage(null);
                }}
                style={{
                  alignSelf: "flex-start",
                  marginTop: 2,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background:
                    c.implementationStatus === "AVAILABLE" && canPersist ? "#0f172a" : "#f1f5f9",
                  color:
                    c.implementationStatus === "AVAILABLE" && canPersist ? "#fff" : "#94a3b8",
                  cursor:
                    c.implementationStatus === "AVAILABLE" && canPersist ? "pointer" : "not-allowed",
                }}
              >
                {openLabel(c)}
              </button>

              {expandedCardId === c.id && isEdoc3ObservationFormCard(c.id) ? (
                <ClinicalDocumentationObservationForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc4StrokeFormCard(c.id) ? (
                <ClinicalDocumentationStrokeForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc11StrokeNeuroReassessmentFormCard(c.id) ? (
                <ClinicalDocumentationStrokeNeuroReassessmentForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc12RespiratoryDocumentationFormCard(c.id) ? (
                <ClinicalDocumentationRespiratoryForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc13PainDocumentationFormCard(c.id) ? (
                <ClinicalDocumentationPainForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc14NeurologicalDocumentationFormCard(c.id) ? (
                <ClinicalDocumentationNeurologicalForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc14FallRiskSafetyDocumentationFormCard(c.id) ? (
                <ClinicalDocumentationFallRiskForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc15CardiacMonitoringDocumentationFormCard(c.id) ? (
                <ClinicalDocumentationCardiacMonitoringForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc16BehavioralHealthDocumentationFormCard(c.id) ? (
                <ClinicalDocumentationBehavioralHealthForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc17DeviceMonitoringDocumentationFormCard(c.id) ? (
                <ClinicalDocumentationDeviceMonitoringForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc18SepsisMonitoringDocumentationFormCard(c.id) ? (
                <ClinicalDocumentationSepsisMonitoringForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc19NursingAdmissionCarePlanDocumentationFormCard(c.id) ? (
                <ClinicalDocumentationNursingAdmissionCarePlanForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc5IntakeOutputFormCard(c.id) ? (
                <ClinicalDocumentationIntakeOutputForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc6RestraintFormCard(c.id) ? (
                <ClinicalDocumentationRestraintForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc7BloodProductFormCard(c.id) ? (
                <ClinicalDocumentationBloodProductForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc8HighAlertInfusionFormCard(c.id) ? (
                <ClinicalDocumentationHighAlertInfusionForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc9BelongingsValuablesFormCard(c.id) ? (
                <ClinicalDocumentationBelongingsValuablesForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && isEdoc10ProceduralSedationFormCard(c.id) ? (
                <ClinicalDocumentationProceduralSedationForm
                  cardId={c.id}
                  saving={saving}
                  onSubmit={(payload) => submitClinicalDocumentation(c, payload)}
                />
              ) : null}

              {expandedCardId === c.id && c.id === EDOC_BASIC_STRUCTURED_CARD_ID ? (
                <div
                  data-testid="clinical-documentation-basic-form"
                  style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {basicItems.map((row, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <input
                        type="text"
                        value={row.key}
                        placeholder={t("clinicalDocumentation.fieldKey")}
                        onChange={(e) => {
                          const next = [...basicItems];
                          next[idx] = { ...next[idx], key: e.target.value };
                          setBasicItems(next);
                        }}
                        style={{
                          flex: "1 1 80px",
                          minWidth: 80,
                          padding: "6px 8px",
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      />
                      <input
                        type="text"
                        value={row.value}
                        placeholder={t("clinicalDocumentation.fieldValue")}
                        onChange={(e) => {
                          const next = [...basicItems];
                          next[idx] = { ...next[idx], value: e.target.value };
                          setBasicItems(next);
                        }}
                        style={{
                          flex: "2 1 120px",
                          minWidth: 120,
                          padding: "6px 8px",
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      />
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setBasicItems((prev) => [...prev, { key: "", value: "" }])}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {t("clinicalDocumentation.addRow")}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveBasicStructured(c)}
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 8,
                        border: "none",
                        background: "#0f172a",
                        color: "#fff",
                        cursor: saving ? "wait" : "pointer",
                      }}
                    >
                      {saving ? t("clinicalDocumentation.saving") : t("clinicalDocumentation.saveEntry")}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {selectedCategory !== "ALL" ? (
        <p style={{ margin: "10px 0 0", fontSize: 11, color: "#94a3b8" }}>
          {t("clinicalDocumentation.categoryCardCount").replace(
            "{count}",
            String(listClinicalDocumentationCardsByCategory(selectedCategory).length)
          )}
        </p>
      ) : null}

      {(witnessModalEntry || immediateWitnessDraft) && facilityId ? (
        <ClinicalDocumentationWitnessSearchModal
          facilityId={facilityId}
          currentUserId={userId}
          authorDisplayName={
            witnessModalEntry?.authorDisplayName ?? t("clinicalDocumentation.witnessModal.currentAuthor")
          }
          cardTitle={
            immediateWitnessDraft
              ? cardTitle(immediateWitnessDraft.card, locale)
              : entryDisplayTitle(witnessModalEntry!, locale)
          }
          mode={immediateWitnessDraft ? "pre-save" : "existing-entry"}
          open
          saving={saving}
          onClose={() => {
            if (immediateWitnessDraft) {
              cancelImmediateWitnessDraft();
              return;
            }
            setWitnessModalEntry(null);
          }}
          onFinalize={async (witnessUserId) => {
            if (immediateWitnessDraft) {
              await finalizeImmediateWitness(witnessUserId);
              return;
            }
            if (witnessModalEntry) {
              await finalizeWitness(witnessModalEntry.id);
            }
          }}
        />
      ) : null}
    </div>
  );
}
