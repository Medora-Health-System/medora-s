"use client";
import { Page } from "@/features/platform/PlatformUi";
import { OperationalProjection } from "@/features/platform/OperationalProjection";
import { useI18n } from "@/i18n/I18nProvider";

export default function GoLive() {
  const { t } = useI18n();
  return (
    <Page area="system" title={t("system.goLiveTitle")} subtitle={t("system.goLiveSubtitle")}>
      <OperationalProjection kind="go-live" title={t("projection.goLiveTitle")} path="/platform/operations/go-live" />
    </Page>
  );
}
