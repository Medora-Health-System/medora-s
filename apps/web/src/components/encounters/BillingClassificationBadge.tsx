"use client";

import { BILLING_CLASSIFICATION_BADGE_SOFT, type BillingClassification } from "@medora/shared";
import { MedoraCardBadge } from "@/components/medora-card/MedoraCardBadge";
import { tBillingClassification } from "@/lib/encounterChromeI18n";

type Props = {
  classification: string | null | undefined;
  t: (key: string) => string;
  title?: string;
};

export function BillingClassificationBadge({ classification, t, title }: Props) {
  const key = (classification ?? "").trim() as BillingClassification;
  if (!key || !(key in BILLING_CLASSIFICATION_BADGE_SOFT)) {
    return null;
  }
  const label = tBillingClassification(t, key);
  const soft = BILLING_CLASSIFICATION_BADGE_SOFT[key];
  const aria = title ?? label;
  return (
    <span title={aria} aria-label={aria}>
      <MedoraCardBadge soft={soft}>{label}</MedoraCardBadge>
    </span>
  );
}
