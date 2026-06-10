"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import type { MedicationPassQueueItem } from "@/lib/medicationPassQueueApi";
import type { MedicationPassQueueBucket } from "@medora/shared";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import {
  formatMedicationPassQueueDoseLabel,
  groupMedicationPassQueueItemsByBucket,
  medicationPassQueueBucketAccentColor,
  medicationPassQueueTooltipLines,
  MEDICATION_PASS_QUEUE_BUCKET_DISPLAY_ORDER,
} from "@/features/mar/medicationPassQueueMarIntegration";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCardInner,
  MedoraCardMetaLines,
  MedoraCardTitle,
} from "@/components/medora-card";
import { CLINICAL_MIN_TOUCH_TARGET_PX } from "@/lib/clinicalViewport";

function interpolateMessage(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), value),
    template
  );
}

export type MedicationPassQueuePanelProps = {
  enabled: boolean;
  items: MedicationPassQueueItem[];
  onSelectItem: (item: MedicationPassQueueItem) => void;
  actionsDisabled?: boolean;
  compact?: boolean;
};

function bucketLabelKey(bucket: MedicationPassQueueBucket): string {
  return `marPassQueue.bucket.${bucket}`;
}

export function MedicationPassQueuePanel({
  enabled,
  items,
  onSelectItem,
  actionsDisabled = false,
  compact = false,
}: MedicationPassQueuePanelProps) {
  const { t, language } = useI18n();

  if (!enabled) return null;

  const grouped = groupMedicationPassQueueItemsByBucket(items);
  const visibleBuckets = MEDICATION_PASS_QUEUE_BUCKET_DISPLAY_ORDER.filter(
    (bucket) => (grouped.get(bucket)?.length ?? 0) > 0
  );

  if (visibleBuckets.length === 0) {
    return (
      <p style={{ margin: compact ? "0 0 8px 0" : "0 0 12px 0", fontSize: 13, color: "#616161" }}>
        {t("marPassQueue.empty")}
      </p>
    );
  }

  return (
    <section
      data-testid="medication-pass-queue-panel"
      style={{ marginBottom: compact ? 10 : 14 }}
      aria-label={t("marPassQueue.title")}
    >
      <h3 style={{ margin: compact ? "0 0 6px 0" : "0 0 8px 0", fontSize: compact ? 15 : 16 }}>
        {t("marPassQueue.title")}
      </h3>

      {visibleBuckets.map((bucket) => {
        const bucketItems = grouped.get(bucket) ?? [];
        const isUpcoming = bucket === "UPCOMING";
        return (
          <div key={bucket} data-testid={`pass-queue-bucket-${bucket}`} style={{ marginBottom: compact ? 8 : 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
                opacity: isUpcoming ? 0.85 : 1,
              }}
            >
              <MedoraCardBadge
                soft={{
                  bg: `${medicationPassQueueBucketAccentColor(bucket)}18`,
                  text: medicationPassQueueBucketAccentColor(bucket),
                  border: `${medicationPassQueueBucketAccentColor(bucket)}55`,
                }}
                compact={compact}
              >
                {t(bucketLabelKey(bucket))}
              </MedoraCardBadge>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                {interpolateMessage(t("marPassQueue.bucketCount"), {
                  count: String(bucketItems.length),
                })}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: compact ? 6 : 8 }}>
              {bucketItems.map((item) => {
                const doseLabel = formatMedicationPassQueueDoseLabel(item.doseSnapshot);
                const patientName = [item.patientFirstName, item.patientLastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim();
                const location = [item.roomLabel, item.bedLabel].filter(Boolean).join(" · ");
                const tooltip = medicationPassQueueTooltipLines(item).join("\n");

                return (
                  <MedoraCard
                    key={item.medicationDoseInstanceId}
                    leftAccentColor={medicationPassQueueBucketAccentColor(bucket)}
                    className="medication-pass-queue-item"
                  >
                    <button
                      type="button"
                      data-testid={`pass-queue-item-${item.medicationDoseInstanceId}`}
                      data-queue-bucket={item.queueBucket}
                      title={tooltip}
                      disabled={actionsDisabled}
                      onClick={() => onSelectItem(item)}
                      style={{
                        display: "block",
                        width: "100%",
                        margin: 0,
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: actionsDisabled ? "not-allowed" : "pointer",
                        opacity: actionsDisabled ? 0.65 : 1,
                        minHeight: CLINICAL_MIN_TOUCH_TARGET_PX,
                      }}
                    >
                      <MedoraCardInner>
                        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                          <MedoraCardTitle
                            title={item.medicationLabel ?? t("marPassQueue.unknownMedication")}
                          />
                          <MedoraCardMetaLines>
                            {[
                              patientName || null,
                              location || null,
                              doseLabel
                                ? interpolateMessage(t("marPassQueue.doseLine"), { dose: doseLabel })
                                : null,
                              item.route
                                ? interpolateMessage(t("marPassQueue.routeLine"), { route: item.route })
                                : null,
                              interpolateMessage(t("marPassQueue.scheduledLine"), {
                                at: formatEncounterChromeDateTime(item.scheduledAt, language),
                              }),
                              interpolateMessage(t("marPassQueue.windowLine"), {
                                start: formatEncounterChromeDateTime(item.dueWindowStartAt, language),
                                end: formatEncounterChromeDateTime(item.dueWindowEndAt, language),
                              }),
                            ]
                              .filter(Boolean)
                              .map((line) => (
                                <span
                                  key={line}
                                  style={{ fontSize: compact ? 12 : 13, color: "#475569", lineHeight: 1.35 }}
                                >
                                  {line}
                                </span>
                              ))}
                          </MedoraCardMetaLines>
                          {item.highAlertSummary?.isHighAlert || item.highAlertSummary?.isControlled ? (
                            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {item.highAlertSummary.isHighAlert ? (
                                <MedoraCardBadge compact preset="neutral">
                                  {t("marPassQueue.highAlertBadge")}
                                </MedoraCardBadge>
                              ) : null}
                              {item.highAlertSummary.isControlled ? (
                                <MedoraCardBadge compact preset="neutral">
                                  {t("marPassQueue.controlledBadge")}
                                </MedoraCardBadge>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </MedoraCardInner>
                    </button>
                  </MedoraCard>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
