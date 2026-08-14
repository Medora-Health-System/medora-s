"use client";

/**
 * MEDUI.D4C.9 — Existing-facility service lines & Dental specialties editor.
 * Reuses FacilityTypeServiceLineFields + PATCH /admin/facilities/:id/service-config.
 * Enterprise hardening: OCC (expectedUpdatedAt), disable preflight ack, readiness projection.
 */

import { useEffect, useMemo, useState } from "react";
import {
  FACILITY_CONFIGURATION_CONFLICT,
  parseStoredFacilityServiceLines,
  projectEnterpriseFacilityCapabilities,
  resolveDentalSpecialtiesFromCareProfile,
  type MedoraFacilityType,
  type MedoraServiceLine,
} from "@medora/shared";
import {
  FacilityTypeServiceLineFields,
  emptyFacilityTypeServiceLineForm,
  facilityTypeServiceLineFormToDto,
  type FacilityTypeServiceLineFormState,
} from "@/components/admin/FacilityTypeServiceLineFields";
import { fetchAdminFacilities, patchAdminFacilityServiceConfig } from "@/lib/adminUsersApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";

type Props = {
  headerFacilityId: string;
  targetFacilityId: string;
  facilityDisplayName: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onError: (message: string) => void;
};

type FacilityConfigRow = {
  id: string;
  facilityType?: string;
  serviceLines?: string[];
  facilityCareProfileJson?: unknown;
  configurationUpdatedAt?: string | null;
  enterpriseCapabilities?: ReturnType<typeof projectEnterpriseFacilityCapabilities>;
};

function hydrateFromRow(row: FacilityConfigRow): FacilityTypeServiceLineFormState {
  const facilityType = (row.facilityType ?? "CLINIC") as MedoraFacilityType;
  const serviceLines = (row.serviceLines?.length
    ? row.serviceLines
    : parseStoredFacilityServiceLines(null)) as MedoraServiceLine[];
  return {
    facilityType,
    serviceLines: serviceLines.length
      ? (serviceLines as MedoraServiceLine[])
      : emptyFacilityTypeServiceLineForm().serviceLines,
    serviceLinesTouched: true,
    dentalSpecialties: resolveDentalSpecialtiesFromCareProfile(row.facilityCareProfileJson),
  };
}

function readinessLabel(
  t: (key: string) => string,
  readiness: string | undefined
): string {
  switch (readiness) {
    case "ENABLED_READY":
      return t("facilityServiceConfigD4c9.readinessReady");
    case "ENABLED_ATTENTION":
      return t("facilityServiceConfigD4c9.readinessAttention");
    case "DISABLED":
      return t("facilityServiceConfigD4c9.readinessDisabled");
    default:
      return "";
  }
}

export function FacilityServiceConfigModal({
  headerFacilityId,
  targetFacilityId,
  facilityDisplayName,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FacilityTypeServiceLineFormState>(emptyFacilityTypeServiceLineForm);
  const [initialLines, setInitialLines] = useState<string[]>([]);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);
  const [acknowledgeDisable, setAcknowledgeDisable] = useState(false);
  const [preflightHint, setPreflightHint] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<ReturnType<
    typeof projectEnterpriseFacilityCapabilities
  > | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchAdminFacilities(headerFacilityId)
      .then((rows) => {
        if (cancelled) return;
        const row = rows.find((r) => r.id === targetFacilityId) as FacilityConfigRow | undefined;
        if (!row) {
          onError(t("facilityServiceConfigD4c9.errNotFound"));
          return;
        }
        const next = hydrateFromRow(row);
        setForm(next);
        setInitialLines(next.serviceLines);
        setExpectedUpdatedAt(row.configurationUpdatedAt ?? null);
        setAcknowledgeDisable(false);
        setPreflightHint(null);
        setCapabilities(
          row.enterpriseCapabilities ??
            projectEnterpriseFacilityCapabilities({
              facilityId: row.id,
              facilityType: row.facilityType,
              serviceLinesJson: row.serviceLines,
              careProfileJson: row.facilityCareProfileJson,
              updatedAt: row.configurationUpdatedAt,
            })
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          onError(
            normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
              t("facilityServiceConfigD4c9.errLoad")
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [headerFacilityId, targetFacilityId, language, onError, t]);

  const removedLines = useMemo(
    () => initialLines.filter((line) => !form.serviceLines.includes(line as MedoraServiceLine)),
    [initialLines, form.serviceLines]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dto = facilityTypeServiceLineFormToDto(form);
    if (dto.serviceLines.length === 0) {
      onError(t("facilityServiceConfigD4c9.errNoLines"));
      return;
    }
    if (dto.serviceLines.includes("DENTAL") && dto.dentalSpecialties.length === 0) {
      onError(t("facilityServiceConfigD4c9.errDentalSpecialty"));
      return;
    }
    if (removedLines.length > 0 && !acknowledgeDisable) {
      onError(t("facilityServiceConfigD4c9.errAckRequired"));
      return;
    }
    setSubmitting(true);
    setPreflightHint(null);
    try {
      await patchAdminFacilityServiceConfig(headerFacilityId, targetFacilityId, {
        facilityType: dto.facilityType,
        serviceLines: dto.serviceLines,
        dentalSpecialties: dto.dentalSpecialties,
        expectedUpdatedAt: expectedUpdatedAt ?? undefined,
        acknowledgeServiceLineDisable: removedLines.length > 0 ? true : undefined,
      });
      await onSuccess();
    } catch (err: unknown) {
      const body =
        err && typeof err === "object" && "body" in err
          ? (err as { body?: { code?: string; preflight?: unknown[]; message?: string } }).body
          : undefined;
      const code =
        (err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code ?? "")
          : "") || body?.code;
      if (code === FACILITY_CONFIGURATION_CONFLICT) {
        onError(t("facilityServiceConfigD4c9.errConflict"));
      } else if (code === "FACILITY_SERVICE_LINE_DISABLE_ACK_REQUIRED") {
        setAcknowledgeDisable(false);
        setPreflightHint(t("facilityServiceConfigD4c9.preflightWarning"));
        onError(t("facilityServiceConfigD4c9.errAckRequired"));
      } else {
        onError(
          normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
            t("facilityServiceConfigD4c9.errSave")
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
        padding: 16,
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={{
          background: "white",
          borderRadius: 8,
          padding: 24,
          maxWidth: 560,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="facility-service-config-title"
        data-testid="facility-service-config-modal"
      >
        <h2 id="facility-service-config-title" style={{ marginTop: 0 }}>
          {t("facilityServiceConfigD4c9.editTitle")}
        </h2>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 0 }}>{facilityDisplayName}</p>
        <p style={{ fontSize: 13, color: "#475569" }}>{t("facilityServiceConfigD4c9.intro")}</p>
        {loading ? (
          <p>{t("common.saving")}</p>
        ) : (
          <form onSubmit={(e) => void submit(e)}>
            <FacilityTypeServiceLineFields value={form} onChange={setForm} />
            {capabilities ? (
              <div
                data-testid="facility-config-readiness"
                style={{
                  marginTop: 12,
                  padding: 10,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#334155",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {t("facilityServiceConfigD4c9.readinessTitle")}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {capabilities.serviceLines.map((line) => (
                    <li key={line}>
                      {line}:{" "}
                      {readinessLabel(t, capabilities.serviceLineReadiness[line])}
                    </li>
                  ))}
                  <li>
                    {t("facilityServiceConfigD4c9.billingWorkflowLabel")}:{" "}
                    {capabilities.billingWorkflow.source === "EXPLICIT"
                      ? t("facilityServiceConfigD4c9.sourceExplicit")
                      : capabilities.billingWorkflow.source === "INFERRED_FROM_EXISTING_PROFILE"
                        ? t("facilityServiceConfigD4c9.sourceInferred")
                        : t("facilityServiceConfigD4c9.sourceUnresolved")}{" "}
                    (
                    {capabilities.billingWorkflow.effectiveMode ??
                      t("facilityServiceConfigD4c9.unresolvedWorkflow")}
                    )
                  </li>
                </ul>
              </div>
            ) : null}
            {removedLines.length > 0 ? (
              <div
                role="status"
                data-testid="facility-service-config-disable-warning"
                style={{
                  marginTop: 12,
                  padding: 10,
                  background: "#fff7ed",
                  border: "1px solid #fdba74",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#9a3412",
                }}
              >
                <p style={{ margin: 0 }}>{t("facilityServiceConfigD4c9.disableWarning")}</p>
                {preflightHint ? <p style={{ margin: "8px 0 0" }}>{preflightHint}</p> : null}
                <label
                  style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 10 }}
                >
                  <input
                    type="checkbox"
                    checked={acknowledgeDisable}
                    onChange={(e) => setAcknowledgeDisable(e.target.checked)}
                    data-testid="facility-service-config-ack-disable"
                  />
                  <span>{t("facilityServiceConfigD4c9.ackDisable")}</span>
                </label>
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" onClick={onClose} disabled={submitting} style={{ padding: "8px 14px" }}>
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                data-testid="facility-service-config-save"
                style={{
                  padding: "8px 14px",
                  background: "#0f172a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 600,
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                {submitting ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
