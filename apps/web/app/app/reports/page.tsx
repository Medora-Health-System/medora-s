"use client";

import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import type { EdReportSlug } from "@/lib/reportsApi";

const HUB_LINKS: { slug: EdReportSlug; titleKey: string; descKey: string }[] = [
  { slug: "door-to-door", titleKey: "reportsOps.cardDoorDoorTitle", descKey: "reportsOps.cardDoorDoorDesc" },
  { slug: "door-to-provider", titleKey: "reportsOps.cardDoorProvTitle", descKey: "reportsOps.cardDoorProvDesc" },
  { slug: "door-to-ekg", titleKey: "reportsOps.cardDoorEkgTitle", descKey: "reportsOps.cardDoorEkgDesc" },
  {
    slug: "medication-administration",
    titleKey: "reportsOps.cardMedMarTitle",
    descKey: "reportsOps.cardMedMarDesc",
  },
];

export default function ReportsHubPage() {
  const { t } = useI18n();
  const { ready, roles } = useFacilityAndRoles();
  const isAdmin = roles.includes("ADMIN");

  if (!ready) {
    return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 24, maxWidth: 640 }}>
        <p>{t("reportsOps.accessDenied")}</p>
        <Link href="/app">{t("reportsOps.backApp")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
          {t("reportsOps.backAdmin")}
        </Link>
      </p>
      <h1 style={{ marginTop: 8 }}>{t("reportsOps.title")}</h1>
      <p style={{ color: "#555", maxWidth: 720 }}>{t("reportsOps.hubIntro")}</p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {HUB_LINKS.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/app/reports/${item.slug}`}
              style={{
                display: "block",
                padding: "14px 16px",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                background: "#fff",
                textDecoration: "none",
                color: "#0f172a",
                fontWeight: 700,
              }}
            >
              {t(item.titleKey)}
            </Link>
            <p style={{ margin: "6px 0 0 4px", fontSize: 13, color: "#64748b" }}>{t(item.descKey)}</p>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 20, padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>{t("reportsOps.cardAuditTitle")}</div>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b" }}>{t("reportsOps.cardAuditDesc")}</p>
        <Link
          href="/app/admin/audit"
          style={{
            display: "inline-block",
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #1a1a1a",
            color: "#1a1a1a",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {t("reportsOps.openAudit")}
        </Link>
      </div>
    </div>
  );
}
