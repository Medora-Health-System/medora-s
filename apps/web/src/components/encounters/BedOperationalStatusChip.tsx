"use client";

import React from "react";
import { MedoraCardBadge } from "@/components/medora-card/MedoraCardBadge";
import type { BedOperationalStatus } from "@medora/shared";
import {
  bedStatusBadgeSoft,
  formatEdBedStatusChipLabel,
  formatHospitalBedStatusLabel,
  shouldShowEdBedStatusChip,
  shouldShowHospitalBedStatusChip,
} from "@/lib/bedStatusDisplay";
import { useI18n } from "@/lib/i18n";

export function EdBedStatusChip({
  status,
  compact,
}: {
  status: BedOperationalStatus | null | undefined;
  compact?: boolean;
}) {
  const { t, language } = useI18n();
  if (!shouldShowEdBedStatusChip(status) || !status) return null;
  return (
    <MedoraCardBadge compact={compact} soft={bedStatusBadgeSoft(status)}>
      {formatEdBedStatusChipLabel(status, language, t)}
    </MedoraCardBadge>
  );
}

export function HospitalBedStatusChip({
  status,
  compact,
}: {
  status: BedOperationalStatus | null | undefined;
  compact?: boolean;
}) {
  const { t, language } = useI18n();
  if (!shouldShowHospitalBedStatusChip(status) || !status) return null;
  return (
    <MedoraCardBadge compact={compact} soft={bedStatusBadgeSoft(status)}>
      {formatHospitalBedStatusLabel(status, language, t)}
    </MedoraCardBadge>
  );
}
