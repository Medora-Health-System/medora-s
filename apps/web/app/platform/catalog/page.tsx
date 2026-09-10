"use client";
import Link from "next/link";
import { Page } from "@/features/platform/PlatformUi";
import { OperationalProjection } from "@/features/platform/OperationalProjection";
import { useI18n } from "@/i18n/I18nProvider";

export default function Catalog() {
  const { t } = useI18n();
  return (
    <Page area="catalog" title={t("catalog.title")} subtitle={t("catalog.subtitle")}>
      <OperationalProjection kind="catalog" title={t("projection.catalogTitle")} path="/platform/operations/catalog-audit" />
      <section className="platform-panel">
        <h2>{t("catalog.enginesTitle")}</h2>
        <p className="notice">{t("catalog.enginesNotice")}</p>
        <div className="module-grid">
          <Link className="module-card" href="/app/admin/medication-master">
            <h2>{t("catalog.medMaster")}</h2>
            <p>{t("catalog.medMasterDesc")}</p>
          </Link>
          <Link className="module-card" href="/app/admin/medication-governance">
            <h2>{t("catalog.medGov")}</h2>
            <p>{t("catalog.medGovDesc")}</p>
          </Link>
          <Link className="module-card" href="/app/admin/catalog-import">
            <h2>{t("catalog.import")}</h2>
            <p>{t("catalog.importDesc")}</p>
          </Link>
          <Link className="module-card" href="/app/admin/er-procedure-catalog-import">
            <h2>{t("catalog.procImport")}</h2>
            <p>{t("catalog.procImportDesc")}</p>
          </Link>
          <Link className="module-card" href="/app/admin/enterprise-clinical-rules">
            <h2>{t("catalog.rules")}</h2>
            <p>{t("catalog.rulesDesc")}</p>
          </Link>
          <Link className="module-card" href="/app/admin/order-set-analytics">
            <h2>{t("catalog.orderSet")}</h2>
            <p>{t("catalog.analyticsDesc")}</p>
          </Link>
          <Link className="module-card" href="/app/admin/medical-exam-analytics">
            <h2>{t("catalog.examAnalytics")}</h2>
            <p>{t("catalog.analyticsDesc")}</p>
          </Link>
        </div>
      </section>
    </Page>
  );
}
