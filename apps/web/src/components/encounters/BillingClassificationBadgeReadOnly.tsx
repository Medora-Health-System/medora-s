"use client";

import { BillingClassificationBadge } from "@/components/encounters/BillingClassificationBadge";
import { useI18n } from "@/lib/i18n";

type Props = {
  classification: string | null | undefined;
  title?: string;
};

/** Read-only billing classification badge for lists, registration, and chart summary. */
export function BillingClassificationBadgeReadOnly({ classification, title }: Props) {
  const { t } = useI18n();
  return <BillingClassificationBadge classification={classification} t={t} title={title} />;
}
