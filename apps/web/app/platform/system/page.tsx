"use client";
import Link from "next/link";
import { Page } from "@/features/platform/PlatformUi";
import { useI18n } from "@/i18n/I18nProvider";

export default function System() {
  const { t } = useI18n();
  return (
    <Page area="system" title={t("system.title")} subtitle={t("system.subtitle")}>
      <div className="module-grid">
        <Link className="module-card" href="/platform/system/health">
          <h2>{t("system.healthTitle")}</h2>
          <p>{t("system.healthDesc")}</p>
        </Link>
        <Link className="module-card" href="/platform/system/backup">
          <h2>{t("system.backupTitle")}</h2>
          <p>{t("system.backupDesc")}</p>
        </Link>
        <Link className="module-card" href="/platform/system/go-live">
          <h2>{t("system.goLiveTitle")}</h2>
          <p>{t("system.goLiveDesc")}</p>
        </Link>
      </div>
    </Page>
  );
}
