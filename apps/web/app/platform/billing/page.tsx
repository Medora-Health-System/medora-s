"use client";
import { Page } from "@/features/platform/PlatformUi";
import { BillingOperations } from "@/features/platform/BillingOperations";
import { useI18n } from "@/i18n/I18nProvider";

export default function Billing() {
  const { t } = useI18n();
  return (
    <Page area="billing" title={t("billing.title")} subtitle={t("billing.subtitle")}>
      <BillingOperations />
    </Page>
  );
}
