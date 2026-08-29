"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { HospitalCensusPatientRow } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  formatInpatientDischargeAwarenessBadgeLabel,
} from "./inpatientDischargeAwarenessUi";
import { inpatientDischargeWorkspaceHref } from "./inpatientDischargeAwarenessUi";
import {
  inpatientDischargeOrderNotifyKey,
  markInpatientDischargeOrderNotified,
  nextUnackedInpatientDischargeOrder,
} from "./inpatientDischargeOrderNotify";

type Props = {
  rows: HospitalCensusPatientRow[];
  currentUserId: string | null | undefined;
  roles: string[];
};

/**
 * INP.DIS.1H — one-at-a-time operational popup for new provider discharge orders.
 * Deduped via sessionStorage (no durable ED ack engine to reuse).
 */
export function InpatientDischargeOrderNotifyBanner({ rows, currentUserId, roles }: Props) {
  const { t } = useI18n();
  const [active, setActive] = useState<HospitalCensusPatientRow | null>(null);

  useEffect(() => {
    const next = nextUnackedInpatientDischargeOrder(rows, {
      currentUserId,
      roles,
    }) as HospitalCensusPatientRow | null;
    setActive(next);
  }, [rows, currentUserId, roles]);

  if (!active?.dischargeAwareness?.providerFinalized) return null;

  const awareness = active.dischargeAwareness;
  const key = inpatientDischargeOrderNotifyKey(
    active.encounterId,
    awareness.providerFinalizedAt
  );
  const isTransfer = awareness.tone === "transfer";
  const title = isTransfer
    ? t("inpatientDischargeAwarenessInpDis1h.popupTitleTransfer")
    : t("inpatientDischargeAwarenessInpDis1h.popupTitleOrder");
  const disposition = formatInpatientDischargeAwarenessBadgeLabel(awareness, t);
  const when =
    awareness.providerFinalizedAt &&
    !Number.isNaN(new Date(awareness.providerFinalizedAt).getTime())
      ? new Date(awareness.providerFinalizedAt).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })
      : null;
  const href = inpatientDischargeWorkspaceHref(active.encounterId, roles);

  const dismiss = () => {
    markInpatientDischargeOrderNotified(key);
    setActive(null);
  };

  return (
    <div
      role="dialog"
      aria-label={title}
      data-testid="inp-dis-1h-discharge-order-popup"
      style={shellStyle}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.04, color: "#166534" }}>
        {title.toUpperCase()}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
        {active.patientName}
        {active.unitRoomBed ? ` · ${active.unitRoomBed}` : ""}
      </div>
      <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
        {t("inpatientDischargeAwarenessInpDis1h.popupProviderFinalized")}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: "#14532d" }}>
        {isTransfer && awareness.destinationName
          ? `${t("inpatientDischargeAwarenessInpDis1h.popupTransferTo")}: ${awareness.destinationName}`
          : disposition}
      </div>
      {(active.attendingName || when) && (
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
          {[active.attendingName, when].filter(Boolean).join(" · ")}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Link href={href} onClick={dismiss} style={primaryBtn}>
          {t("inpatientDischargeAwarenessInpDis1h.openDischarge")}
        </Link>
        <button type="button" onClick={dismiss} style={neutralBtn}>
          {t("inpatientDischargeAwarenessInpDis1h.dismiss")}
        </button>
      </div>
    </div>
  );
}

const shellStyle: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  position: "fixed",
  right: 16,
  bottom: 16,
  zIndex: 60,
  width: "min(340px, calc(100vw - 32px))",
  padding: 14,
  borderColor: "#86efac",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
};

const primaryBtn: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #16a34a",
  background: "#166534",
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  textDecoration: "none",
};

const neutralBtn: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};
