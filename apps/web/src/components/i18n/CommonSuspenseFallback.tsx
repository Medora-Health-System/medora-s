"use client";

import { useI18n } from "@/lib/i18n";

type Props = {
  /** When true, wraps text in a padded div (matches legacy Suspense fallbacks). */
  padded?: boolean;
};

export function CommonSuspenseFallback({ padded }: Props) {
  const { t } = useI18n();
  const text = t("common.loading");
  if (padded) {
    return <div style={{ padding: 24 }}>{text}</div>;
  }
  return <p>{text}</p>;
}
