"use client";
import { Page } from "@/features/platform/PlatformUi";
import { OperationalProjection } from "@/features/platform/OperationalProjection";
import { useI18n } from "@/i18n/I18nProvider";

export default function Backup() {
  const { t } = useI18n();
  return (
    <Page area="system" title={t("system.backupTitle")} subtitle={t("system.backupSubtitle")}>
      <OperationalProjection kind="backup" title={t("projection.backupTitle")} path="/platform/operations/backup-readiness" />
    </Page>
  );
}
