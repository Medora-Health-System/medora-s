"use client";
import Link from "next/link";
import { Page } from "@/features/platform/PlatformUi";
import { OperationalProjection } from "@/features/platform/OperationalProjection";
import { RoiAggregate } from "@/features/platform/RoiAggregate";
import { useI18n } from "@/i18n/I18nProvider";

export default function Compliance() {
  const { t } = useI18n();
  return (
    <Page area="compliance" title={t("compliance.title")} subtitle={t("compliance.subtitle")}>
      <Link className="button" href="/platform/security#audit">
        {t("compliance.enterpriseAudit")}
      </Link>
      <OperationalProjection kind="compliance" title={t("projection.complianceTitle")} path="/platform/operations/compliance" />
      <OperationalProjection kind="exports" title={t("projection.exportsTitle")} path="/platform/operations/exports" />
      <RoiAggregate />
    </Page>
  );
}
