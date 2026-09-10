"use client";
import Link from "next/link";
import { Page, Badge } from "@/features/platform/PlatformUi";
import { usePlatform } from "@/features/platform/PlatformContext";
import { can, visibleAreas, type PlatformArea } from "@/features/platform/access";
import { useI18n } from "@/i18n/I18nProvider";
import type { MessageKey } from "@/i18n/messages";

const areaKeys: Record<PlatformArea, MessageKey> = {
  facilities: "area.facilities",
  staff: "area.staff",
  security: "area.security",
  compliance: "area.compliance",
  billing: "area.billing",
  catalog: "area.catalog",
  system: "area.system",
};

export default function Home() {
  const { context } = usePlatform();
  const { t } = useI18n();
  const persona = context?.staff?.persona?.replaceAll("_", " ") || t("platform.principal");
  return (
    <Page title={t("home.title")} subtitle={t("home.subtitle")}>
      <section className="hero-panel">
        <div>
          <Badge value={t("platform.authorityVerified")} />
          <h2>{t("home.greeting")}</h2>
          <p>
            {t("home.presentationFor")} <b>{persona}</b>
            {t("home.presentationApi")}
          </p>
        </div>
        <div className="authority-summary">
          <small>{t("home.accessibleDomains")}</small>
          <strong>{visibleAreas(context).length}</strong>
          <span>{t("home.ofAreas")}</span>
        </div>
      </section>
      <div className="section-title">
        <div>
          <span className="eyebrow">{t("home.operationalDomains")}</span>
          <h2>{t("home.workspaceTitle")}</h2>
        </div>
      </div>
      <div className="domain-grid">
        {visibleAreas(context).map((area, i) => (
          <Link href={`/platform/${area}`} className="domain-card" key={area}>
            <span className="domain-index">0{i + 1}</span>
            <h3>{t(areaKeys[area])}</h3>
            <p>{t("home.domainIntro")}</p>
            <b>{t("home.openWorkspace")}</b>
          </Link>
        ))}
      </div>
      <div className="two-col">
        <section className="platform-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{t("home.shortcuts")}</span>
              <h2>{t("home.quickActions")}</h2>
            </div>
          </div>
          <div className="quick-actions">
            {can(context, "FACILITY_CREATE") && (
              <Link href="/platform/facilities">
                {t("home.createFacility")} <span>→</span>
              </Link>
            )}
            {can(context, "STAFF_PROVISION") && (
              <Link href="/platform/security#requests">
                {t("home.requestProvisioning")} <span>→</span>
              </Link>
            )}
            {can(context, "PRIVILEGED_ACTION_APPROVE") && (
              <Link href="/platform/security#requests">
                {t("home.reviewPrivileged")} <span>→</span>
              </Link>
            )}
            {(can(context, "SECURITY_AUDIT_VIEW") || can(context, "COMPLIANCE_AUDIT_VIEW")) && (
              <Link href="/platform/security#audit">
                {t("home.openAudit")} <span>→</span>
              </Link>
            )}
            {can(context, "SYSTEM_HEALTH_VIEW") && (
              <Link href="/platform/system">
                {t("home.viewHealth")} <span>→</span>
              </Link>
            )}
          </div>
        </section>
        <section className="platform-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{t("home.attention")}</span>
              <h2>{t("home.signals")}</h2>
            </div>
          </div>
          <p className="notice">{t("home.noAggregate")}</p>
        </section>
      </div>
    </Page>
  );
}
