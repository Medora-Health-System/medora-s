"use client";

import React from "react";
import type { ClinicalUserRoleOption } from "@/components/clinical/ClinicalUserRoleAutocomplete";
import { SecondClinicianVerificationModal } from "@/components/clinical/SecondClinicianVerificationModal";
import { useI18n } from "@/lib/i18n";

export type ClinicalDocumentationWitnessModalMode = "existing-entry" | "pre-save";

export function ClinicalDocumentationWitnessSearchModal({
  facilityId,
  currentUserId,
  authorDisplayName,
  cardTitle,
  mode = "existing-entry",
  open,
  saving,
  onClose,
  onFinalize,
}: {
  facilityId: string;
  currentUserId: string | undefined;
  authorDisplayName: string;
  cardTitle: string;
  mode?: ClinicalDocumentationWitnessModalMode;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onFinalize: (witnessUserId: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const isPreSave = mode === "pre-save";

  const title = isPreSave
    ? t("clinicalDocumentation.witnessModal.immediateTitle")
    : t("clinicalDocumentation.witnessModal.title");

  const subtitle = isPreSave
    ? t("clinicalDocumentation.witnessModal.immediateSubtitle")
    : t("clinicalDocumentation.witnessModal.subtitle")
        .replace("{card}", cardTitle)
        .replace("{author}", authorDisplayName);

  const confirmLabel = isPreSave
    ? t("clinicalDocumentation.witnessModal.immediateConfirm")
    : t("clinicalDocumentation.witnessModal.finalize");

  return (
    <SecondClinicianVerificationModal
      facilityId={facilityId}
      currentUserId={currentUserId}
      title={title}
      subtitle={subtitle}
      roleFilter="RN"
      mode={isPreSave ? "require-second-clinician" : "require-self"}
      open={open}
      saving={saving}
      confirmLabel={confirmLabel}
      testId="clinical-documentation-witness-search-modal"
      onCancel={onClose}
      onConfirm={async (userId: string, _user: ClinicalUserRoleOption) => {
        await onFinalize(userId);
      }}
    />
  );
}
