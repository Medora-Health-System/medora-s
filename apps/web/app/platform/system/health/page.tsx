"use client";
import { Page } from "@/features/platform/PlatformUi";
import { OperationalProjection } from "@/features/platform/OperationalProjection";
import { useI18n } from "@/i18n/I18nProvider";

export default function Health() {
  const { t } = useI18n();
  return (
    <Page area="system" title={t("system.healthTitle")} subtitle={t("system.healthSubtitle")}>
      <OperationalProjection kind="health" title={t("projection.healthTitle")} path="/platform/operations/system-health" />
    </Page>
  );
}
