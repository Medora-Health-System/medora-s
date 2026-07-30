"use client";

import { useEffect, useState } from "react";
import {
  FacilityOperationalIdentityFields,
  emptyFacilityOperationalIdentityForm,
  facilityOperationalIdentityFormFromCareProfile,
  facilityOperationalIdentityFormToDto,
  type FacilityOperationalIdentityFormState,
} from "@/components/admin/FacilityOperationalIdentityFields";
import {
  fetchAdminFacilities,
  patchAdminFacilityServiceConfig,
} from "@/lib/adminUsersApi";
import { validateFacilityOperationalIdentityOnboarding } from "@medora/shared";
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

export function FacilityOperationalIdentityModal({
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
  const [form, setForm] = useState<FacilityOperationalIdentityFormState>(
    emptyFacilityOperationalIdentityForm({ printDisplayName: facilityDisplayName })
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchAdminFacilities(headerFacilityId)
      .then((rows) => {
        if (cancelled) return;
        const row = rows.find((r) => r.id === targetFacilityId);
        setForm(
          facilityOperationalIdentityFormFromCareProfile({
            facilityName: row?.name ?? facilityDisplayName,
            careProfileJson: row?.facilityCareProfileJson,
          })
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          onError(
            normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
              t("facilityIdentityD4c7i.errIncomplete")
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [headerFacilityId, targetFacilityId, facilityDisplayName, language, onError, t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dto = facilityOperationalIdentityFormToDto(form);
    const gate = validateFacilityOperationalIdentityOnboarding({
      facilityName: facilityDisplayName,
      printDisplayName: dto.printDisplayName,
      ...dto.operationalAddress,
    });
    if (!gate.ok) {
      if (gate.code.includes("EMAIL")) onError(t("facilityIdentityD4c7i.errEmail"));
      else if (gate.code.includes("WEBSITE")) onError(t("facilityIdentityD4c7i.errWebsite"));
      else onError(t("facilityIdentityD4c7i.errIncomplete"));
      return;
    }
    setSubmitting(true);
    try {
      await patchAdminFacilityServiceConfig(headerFacilityId, targetFacilityId, {
        printDisplayName: dto.printDisplayName ?? null,
        legalName: dto.legalName ?? null,
        operationalAddress: dto.operationalAddress,
        country: dto.country ?? null,
      });
      await onSuccess();
    } catch (err: unknown) {
      onError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("facilityIdentityD4c7i.errIncomplete")
      );
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
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="facility-operational-identity-title"
        data-testid="facility-operational-identity-modal"
      >
        <h2 id="facility-operational-identity-title" style={{ marginTop: 0 }}>
          {t("facilityIdentityD4c7i.editTitle")}
        </h2>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 0 }}>{facilityDisplayName}</p>
        {loading ? (
          <p>{t("common.saving")}</p>
        ) : (
          <form onSubmit={(e) => void submit(e)}>
            <FacilityOperationalIdentityFields value={form} onChange={setForm} disabled={submitting} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={onClose} disabled={submitting} style={{ padding: "8px 14px" }}>
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "8px 14px",
                  background: "#0d9488",
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
