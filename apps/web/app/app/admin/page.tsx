"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchAdminFacilities,
  setAdminFacilityActive,
  setAdminFacilityLanguage,
  type AdminFacilityRow,
} from "@/lib/adminUsersApi";
import { FacilityBillingIdentityModal } from "@/components/admin/FacilityBillingIdentityModal";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import {
  FACILITY_DEFAULT_LANGUAGE,
  isPubliclySelectableProductUiLanguage,
  productUiLanguageSelectOptions,
} from "@/i18n/config";

const FACILITY_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function switchSessionToFacility(facilityId: string) {
  document.cookie = `medora_facility_id=${facilityId}; path=/; max-age=${FACILITY_COOKIE_MAX_AGE}`;
  window.location.reload();
}

export default function AdminPage() {
  const { t, language } = useI18n();
  const { ready, canCreateFacilities, facilityId, refreshFromMe, isPlatformOperator } = useFacilityAndRoles();
  const [facilities, setFacilities] = useState<AdminFacilityRow[] | null>(null);
  const [facilitiesError, setFacilitiesError] = useState<string | null>(null);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [facilityToggleId, setFacilityToggleId] = useState<string | null>(null);
  const [languageSavingId, setLanguageSavingId] = useState<string | null>(null);
  const [billingFacility, setBillingFacility] = useState<AdminFacilityRow | null>(null);

  const loadFacilities = useCallback(async () => {
    setFacilitiesLoading(true);
    setFacilitiesError(null);
    try {
      const rows = await fetchAdminFacilities(facilityId || undefined, {
        includeInactive: true,
      });
      setFacilities(rows);
    } catch (e: unknown) {
      setFacilities(null);
      const raw = e instanceof Error ? e.message : "";
      setFacilitiesError(
        normalizeUserFacingError(raw, language) || t("adminHub.errorLoadFacilities")
      );
    } finally {
      setFacilitiesLoading(false);
    }
  }, [facilityId, language, t]);

  const handleFacilityActiveChange = useCallback(
    async (row: AdminFacilityRow, isActive: boolean) => {
      if (!facilityId) {
        setFacilitiesError(t("adminHub.errorSelectFacility"));
        return;
      }
      setFacilityToggleId(row.id);
      setFacilitiesError(null);
      try {
        await setAdminFacilityActive(facilityId, row.id, isActive);
        await loadFacilities();
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "";
        setFacilitiesError(
          normalizeUserFacingError(raw, language) || t("adminHub.errorUpdateFacility")
        );
      } finally {
        setFacilityToggleId(null);
      }
    },
    [facilityId, loadFacilities, language, t]
  );

  useEffect(() => {
    if (!ready || !canCreateFacilities) return;
    void loadFacilities();
  }, [ready, canCreateFacilities, loadFacilities]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>{t("adminHub.title")}</h1>
      <p style={{ color: "#555", marginBottom: 20 }}>{t("adminHub.intro")}</p>
      <h2 style={{ fontSize: 16, margin: "0 0 12px 0", color: "#334155" }}>{t("adminHub.sectionFacility")}</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", display: "flex", flexWrap: "wrap", gap: 12 }}>
        <li>
          <Link
            href="/app/admin/users"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#1a1a1a",
              color: "white",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.usersAndAccess")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/audit"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.auditLogLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/reports"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.opsReportsLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/go-live"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.goLiveLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/enterprise-workflow"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.enterpriseWorkflowLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/enterprise-clinical-rules"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.enterpriseClinicalRulesLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/revenue-cycle"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.revenueCycleLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/revenue-cycle/claims"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.revenueClaimSubmissionLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/revenue-cycle/payments"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.revenuePaymentLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/billing-governance"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.billingGovernanceLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/medical-exam-analytics"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.medicalExamAnalyticsLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/order-set-analytics"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.orderSetAnalyticsLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/medication-master"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.medicationMasterLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/medication-governance"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.medicationGovernanceLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/medication-governance/rxnorm-review"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.rxNormReviewLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/medication-inventory-staging"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.medicationInventoryStagingLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/catalog-import"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.catalogImportLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/high-risk-medication-review"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.highRiskMedicationReviewLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/er-procedure-catalog-import"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.erProcedureCatalogLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/roi"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("adminHub.roiWorkflowLink")}
          </Link>
        </li>
        <li>
          <Link
            href="/app/admin/mfa"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#fff",
              color: "#1a1a1a",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t("auth.mfa.adminResetTitle")}
          </Link>
        </li>
      </ul>
      {isPlatformOperator ? (
        <>
          <h2 style={{ fontSize: 16, margin: "0 0 12px 0", color: "#334155" }}>{t("adminHub.sectionPlatform")}</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", display: "flex", flexWrap: "wrap", gap: 12 }}>
            <li>
              <Link
                href="/app/admin/exports"
                style={{
                  display: "inline-block",
                  padding: "12px 20px",
                  backgroundColor: "#fff",
                  color: "#1a1a1a",
                  border: "1px solid #1a1a1a",
                  borderRadius: 4,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {t("adminHub.exportMonitoringLink")}
              </Link>
            </li>
            <li>
              <Link
                href="/app/admin/roi-monitoring"
                style={{
                  display: "inline-block",
                  padding: "12px 20px",
                  backgroundColor: "#fff",
                  color: "#1a1a1a",
                  border: "1px solid #1a1a1a",
                  borderRadius: 4,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {t("adminHub.roiMonitoringLink")}
              </Link>
            </li>
            <li>
              <Link
                href="/app/admin/backup-readiness"
                style={{
                  display: "inline-block",
                  padding: "12px 20px",
                  backgroundColor: "#fff",
                  color: "#1a1a1a",
                  border: "1px solid #1a1a1a",
                  borderRadius: 4,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {t("adminHub.backupReadinessLink")}
              </Link>
            </li>
            <li>
              <Link
                href="/app/admin/system-health"
                style={{
                  display: "inline-block",
                  padding: "12px 20px",
                  backgroundColor: "#fff",
                  color: "#1a1a1a",
                  border: "1px solid #1a1a1a",
                  borderRadius: 4,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {t("adminHub.systemHealthLink")}
              </Link>
            </li>
            <li>
              <Link
                href="/app/admin/compliance"
                style={{
                  display: "inline-block",
                  padding: "12px 20px",
                  backgroundColor: "#fff",
                  color: "#1a1a1a",
                  border: "1px solid #1a1a1a",
                  borderRadius: 4,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {t("adminHub.complianceLink")}
              </Link>
            </li>
            <li>
              <Link
                href="/app/admin/catalog-audit"
                style={{
                  display: "inline-block",
                  padding: "12px 20px",
                  backgroundColor: "#fff",
                  color: "#1a1a1a",
                  border: "1px solid #1a1a1a",
                  borderRadius: 4,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {t("adminHub.catalogAuditLink")}
              </Link>
            </li>
          </ul>
        </>
      ) : null}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: 12 }}>
        {ready && canCreateFacilities ? (
          <li>
            <Link
              href="/app/admin/mspp-access"
              style={{
                display: "inline-block",
                padding: "12px 20px",
                backgroundColor: "#fff",
                color: "#1a1a1a",
                border: "1px solid #1a1a1a",
                borderRadius: 4,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              {t("nav.adminMsppAccess")}
            </Link>
          </li>
        ) : null}
      </ul>

      {ready && canCreateFacilities ? (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>{t("adminHub.facilities")}</h2>
          {facilitiesLoading ? (
            <p style={{ color: "#555", fontSize: 14 }}>{t("adminHub.loading")}</p>
          ) : facilitiesError ? (
            <p style={{ color: "#b71c1c", fontSize: 14 }}>{facilitiesError}</p>
          ) : facilities && facilities.length === 0 ? (
            <p style={{ color: "#555", fontSize: 14 }}>{t("adminHub.emptyFacilities")}</p>
          ) : facilities && facilities.length > 0 ? (
            <div style={{ overflowX: "auto", border: "1px solid #e0e0e0", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e0e0e0", background: "#fafafa" }}>
                    <th style={{ textAlign: "left", padding: 10 }}>{t("adminHub.colName")}</th>
                    <th style={{ textAlign: "left", padding: 10 }}>{t("adminHub.colState")}</th>
                    <th style={{ textAlign: "left", padding: 10 }}>{t("adminHub.colId")}</th>
                    <th style={{ textAlign: "right", padding: 10 }}>{t("adminHub.colBillingIdentity")}</th>
                    <th style={{ textAlign: "right", padding: 10 }}>{t("adminHub.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {facilities.map((f) => {
                    const rowActive = f.isActive !== false;
                    const busy = facilityToggleId === f.id;
                    return (
                      <tr key={f.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: 10 }}>
                          <div>{f.name}</div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            <span style={{ fontSize: 12, color: "#666" }}>{t("adminHub.languageLabel")}</span>
                            <select
                              value={f.defaultLanguage ?? FACILITY_DEFAULT_LANGUAGE}
                              disabled={!facilityId || languageSavingId === f.id}
                              onChange={async (e) => {
                                const newLang = e.target.value;
                                if (!facilityId || !isPubliclySelectableProductUiLanguage(newLang)) return;
                                setLanguageSavingId(f.id);
                                try {
                                  await setAdminFacilityLanguage(facilityId, f.id, newLang);
                                  await loadFacilities();
                                  try {
                                    await refreshFromMe();
                                  } catch {
                                    /* shell : événement ci-dessous */
                                  }
                                  window.dispatchEvent(new Event("medora:session-refresh"));
                                } catch {
                                  alert(t("adminHub.alertLanguageFailed"));
                                } finally {
                                  setLanguageSavingId(null);
                                }
                              }}
                              style={{ padding: 4, borderRadius: 4 }}
                            >
                              {productUiLanguageSelectOptions().map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td style={{ padding: 10 }}>
                          {rowActive ? t("adminHub.statusActive") : t("adminHub.statusInactive")}
                        </td>
                        <td style={{ padding: 10, fontFamily: "monospace", fontSize: 13 }}>{f.id}</td>
                        <td style={{ padding: 10, textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            disabled={!facilityId}
                            onClick={() => setBillingFacility(f)}
                            style={{
                              padding: "6px 12px",
                              fontSize: 13,
                              cursor: facilityId ? "pointer" : "not-allowed",
                              border: "1px solid #1565c0",
                              borderRadius: 4,
                              background: "#fff",
                              color: "#1565c0",
                              fontWeight: 600,
                              marginRight: 8,
                            }}
                          >
                            {t("adminHub.facilityBillingButton")}
                          </button>
                        </td>
                        <td style={{ padding: 10, textAlign: "right", whiteSpace: "nowrap" }}>
                          {rowActive ? (
                            <>
                              <button
                                type="button"
                                disabled={busy || !facilityId}
                                onClick={() => void handleFacilityActiveChange(f, false)}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: 13,
                                  cursor: busy || !facilityId ? "not-allowed" : "pointer",
                                  border: "1px solid #b71c1c",
                                  borderRadius: 4,
                                  background: "#fff",
                                  color: "#b71c1c",
                                  fontWeight: 600,
                                  marginRight: 8,
                                }}
                              >
                                {t("common.deactivate")}
                              </button>
                              <button
                                type="button"
                                onClick={() => switchSessionToFacility(f.id)}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: 13,
                                  cursor: "pointer",
                                  border: "1px solid #1a1a1a",
                                  borderRadius: 4,
                                  background: "#fff",
                                  fontWeight: 600,
                                }}
                              >
                                {t("adminHub.useThisFacility")}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={busy || !facilityId}
                              onClick={() => void handleFacilityActiveChange(f, true)}
                              style={{
                                padding: "6px 12px",
                                fontSize: 13,
                                cursor: busy || !facilityId ? "not-allowed" : "pointer",
                                border: "1px solid #1a1a1a",
                                borderRadius: 4,
                                background: "#fff",
                                fontWeight: 600,
                              }}
                            >
                              {t("adminHub.reactivate")}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      {billingFacility && facilityId ? (
        <FacilityBillingIdentityModal
          headerFacilityId={billingFacility.id}
          targetFacilityId={billingFacility.id}
          facilityDisplayName={billingFacility.name}
          onClose={() => setBillingFacility(null)}
          onSuccess={async () => {
            setBillingFacility(null);
            await loadFacilities();
          }}
          onError={(m) => setFacilitiesError(m)}
        />
      ) : null}
    </div>
  );
}
