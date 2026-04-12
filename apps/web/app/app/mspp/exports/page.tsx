"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchMsppAlertEscalations,
  fetchMsppCommuneSanitarySignals,
  fetchMsppSanitarySignals,
  fetchMsppValidationAnalytics,
  type MsppAlertEscalationsResponse,
  type MsppCommuneSanitarySignalsResponse,
  type MsppSanitarySignalsResponse,
  type MsppValidationAnalyticsResponse,
} from "@/lib/msppApi";
import { downloadUtf8Csv, exportDateStamp } from "@/features/mspp/msppExportDownload";
import {
  buildCommuneSignalsCsv,
  buildEscalationsCsv,
  buildSanitarySignalsCsv,
  buildValidationDepartmentsCsv,
  buildValidationSummaryCsv,
} from "@/features/mspp/msppExportsBuild";
import {
  MSPP_BTN_APPROVE,
  MSPP_BTN_ROW,
  MSPP_ERROR_CALLOUT,
  MSPP_NAV_LINK,
  MSPP_NAV_ROW,
  MSPP_PAGE_SHELL,
  MSPP_PAGE_SUBTITLE,
  MSPP_PAGE_TITLE,
  MSPP_PRINT_BUTTON,
  MSPP_SECTION_CARD,
  MSPP_SECTION_SUBTITLE,
  MSPP_SECTION_TITLE,
} from "@/features/mspp/msppUiChrome";

export default function MsppExportsPage() {
  const { t } = useI18n();
  const { ready, msppRoles } = useFacilityAndRoles();
  const canMspp = msppRoles.length > 0;

  const [escalations, setEscalations] = useState<MsppAlertEscalationsResponse | null>(null);
  const [signals, setSignals] = useState<MsppSanitarySignalsResponse | null>(null);
  const [commune, setCommune] = useState<MsppCommuneSanitarySignalsResponse | null>(null);
  const [validation, setValidation] = useState<MsppValidationAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uiGeneratedAt] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!canMspp) return;
    setLoading(true);
    setError(null);
    try {
      const [e, s, c, v] = await Promise.all([
        fetchMsppAlertEscalations(),
        fetchMsppSanitarySignals(),
        fetchMsppCommuneSanitarySignals(),
        fetchMsppValidationAnalytics(),
      ]);
      setEscalations(e);
      setSignals(s);
      setCommune(c);
      setValidation(v);
    } catch {
      setError(t("msppExportsPage.loadError"));
      setEscalations(null);
      setSignals(null);
      setCommune(null);
      setValidation(null);
    } finally {
      setLoading(false);
    }
  }, [canMspp, t]);

  useEffect(() => {
    if (ready && canMspp) void load();
    else if (ready && !canMspp) setLoading(false);
  }, [ready, canMspp, load]);

  const stamp = exportDateStamp();
  const noteDateLine = t("msppExportsPage.noteGenerated").replace(
    "{date}",
    uiGeneratedAt.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
  );

  const dlEscalations = () => {
    if (!escalations) return;
    downloadUtf8Csv(`mspp-alertes-prioritaires-${stamp}.csv`, buildEscalationsCsv(escalations, t));
  };
  const dlSignals = () => {
    if (!signals) return;
    downloadUtf8Csv(`mspp-signaux-sanitaires-${stamp}.csv`, buildSanitarySignalsCsv(signals, t));
  };
  const dlCommune = () => {
    if (!commune) return;
    downloadUtf8Csv(`mspp-surveillance-communale-${stamp}.csv`, buildCommuneSignalsCsv(commune, t));
  };
  const dlValSummary = () => {
    if (!validation) return;
    downloadUtf8Csv(`mspp-analyse-validations-synthese-${stamp}.csv`, buildValidationSummaryCsv(validation, t));
  };
  const dlValDepts = () => {
    if (!validation) return;
    downloadUtf8Csv(`mspp-analyse-validations-departements-${stamp}.csv`, buildValidationDepartmentsCsv(validation, t));
  };

  if (!ready) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <p style={{ color: "#64748b", marginTop: 0 }}>{t("msppExportsPage.loading")}</p>
      </div>
    );
  }
  if (!canMspp) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <h1 style={MSPP_PAGE_TITLE}>{t("msppExportsPage.pageTitle")}</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>{t("msppExportsPage.accessDenied")}</p>
      </div>
    );
  }

  return (
    <div style={MSPP_PAGE_SHELL}>
      <h1 style={MSPP_PAGE_TITLE}>{t("msppExportsPage.pageTitle")}</h1>
      <p style={MSPP_PAGE_SUBTITLE}>{t("msppExportsPage.subtitle")}</p>

      <div style={MSPP_NAV_ROW}>
        <Link href="/app/mspp/dashboard" style={MSPP_NAV_LINK}>
          {t("msppBulletinPage.navDashboard")}
        </Link>
        <Link href="/app/mspp/bulletin" style={MSPP_NAV_LINK}>
          {t("nav.msppBulletin")}
        </Link>
      </div>

      {error ? (
        <div style={MSPP_ERROR_CALLOUT} role="alert">
          <p style={{ color: "#991b1b", margin: 0, fontWeight: 600 }}>{error}</p>
        </div>
      ) : null}

      <div style={MSPP_SECTION_CARD}>
        <h2 style={MSPP_SECTION_TITLE}>{t("msppExportsPage.sectionBulletinTitle")}</h2>
        <p style={MSPP_SECTION_SUBTITLE}>{t("msppExportsPage.sectionBulletinIntro")}</p>
        <div style={MSPP_BTN_ROW}>
          <Link href="/app/mspp/bulletin" style={{ ...MSPP_PRINT_BUTTON, display: "inline-block", textDecoration: "none" }}>
            {t("msppExportsPage.openBulletin")}
          </Link>
        </div>
        <p style={{ ...MSPP_SECTION_SUBTITLE, marginBottom: 0, fontSize: 13 }}>{t("msppExportsPage.printPdfHint")}</p>
      </div>

      <div style={MSPP_SECTION_CARD}>
        <h2 style={MSPP_SECTION_TITLE}>{t("msppExportsPage.sectionCsvTitle")}</h2>
        <p style={MSPP_SECTION_SUBTITLE}>{t("msppExportsPage.sectionCsvIntro")}</p>
        {loading ? (
          <p style={{ color: "#64748b", margin: 0 }}>{t("msppExportsPage.loading")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            <button type="button" style={MSPP_BTN_APPROVE} disabled={!escalations} onClick={dlEscalations}>
              {t("msppExportsPage.btnEscalations")}
            </button>
            <button type="button" style={MSPP_BTN_APPROVE} disabled={!signals} onClick={dlSignals}>
              {t("msppExportsPage.btnSignals")}
            </button>
            <button type="button" style={MSPP_BTN_APPROVE} disabled={!commune} onClick={dlCommune}>
              {t("msppExportsPage.btnCommune")}
            </button>
            <button type="button" style={MSPP_BTN_APPROVE} disabled={!validation} onClick={dlValSummary}>
              {t("msppExportsPage.btnValidationSummary")}
            </button>
            <button type="button" style={MSPP_BTN_APPROVE} disabled={!validation} onClick={dlValDepts}>
              {t("msppExportsPage.btnValidationDepts")}
            </button>
          </div>
        )}
      </div>

      <div style={{ ...MSPP_SECTION_CARD, marginBottom: 0 }}>
        <h2 style={MSPP_SECTION_TITLE}>{t("msppExportsPage.sectionNotesTitle")}</h2>
        <p style={{ ...MSPP_SECTION_SUBTITLE, marginBottom: 8 }}>{noteDateLine}</p>
        <p style={{ ...MSPP_SECTION_SUBTITLE, marginBottom: 8 }}>{t("msppExportsPage.noteMethod")}</p>
        <p style={{ ...MSPP_SECTION_SUBTITLE, marginBottom: 0 }}>{t("msppExportsPage.notePdf")}</p>
      </div>
    </div>
  );
}
