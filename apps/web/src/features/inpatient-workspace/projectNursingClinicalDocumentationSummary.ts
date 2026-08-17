/**
 * MEDUI.INP.2C.1 — Projection-only Clinical Documentation lines for Nursing Summary / Overview.
 * Reuses EDOC entries + IV access. Does not persist copies into nursing assessment.
 */
import {
  EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS,
  projectIntakeOutputSynthesis,
} from "@medora/shared";

export type ClinicalDocProjectionEntry = {
  cardId: string;
  createdAt: string;
  voidedAt?: string | null;
  payloadJson?: unknown;
  cardTitleEn?: string;
  cardTitleFr?: string;
};

export type IvActiveProjectionRow = {
  site: string;
  gauge: string;
};

const DEVICE_CARD_IDS = new Set<string>(EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS);

const DEVICE_LABEL_EN: Record<string, string> = {
  peripheral_iv_assessment: "Peripheral IV",
  central_line_assessment: "Central line",
  picc_midline_assessment: "PICC / midline",
  foley_catheter_monitoring: "Foley catheter",
  external_urinary_device_monitoring: "External urinary device",
  ng_og_tube_monitoring: "NG / OG tube",
  chest_tube_monitoring: "Chest tube",
  surgical_drain_monitoring: "Surgical drain",
  endotracheal_tube_monitoring: "Endotracheal tube",
  tracheostomy_monitoring: "Tracheostomy",
};

const DEVICE_LABEL_FR: Record<string, string> = {
  peripheral_iv_assessment: "Voie périphérique",
  central_line_assessment: "Voie centrale",
  picc_midline_assessment: "PICC / midline",
  foley_catheter_monitoring: "Sonde de Foley",
  external_urinary_device_monitoring: "Dispositif urinaire externe",
  ng_og_tube_monitoring: "Sonde NG / OG",
  chest_tube_monitoring: "Drain thoracique",
  surgical_drain_monitoring: "Drain chirurgical",
  endotracheal_tube_monitoring: "Tube endotrachéal",
  tracheostomy_monitoring: "Trachéotomie",
};

const OXYGEN_CARD_HINT = /oxygen|resp_oxygen|o2_/i;

export function projectClinicalDocumentationSummaryLines(input: {
  entries: readonly ClinicalDocProjectionEntry[];
  ivActive?: readonly IvActiveProjectionRow[];
  french?: boolean;
}): string[] {
  const french = Boolean(input.french);
  const lines: string[] = [];
  const io = projectIntakeOutputSynthesis({
    entries: input.entries.map((e) => ({
      cardId: e.cardId,
      createdAt: e.createdAt,
      voidedAt: e.voidedAt,
      payloadJson: e.payloadJson,
    })),
  });
  if (io.documentationPresent) {
    const parts: string[] = [];
    if (io.intake24hMl != null) {
      parts.push(french ? `Entrées 24 h ${io.intake24hMl} ml` : `Intake 24h ${io.intake24hMl} ml`);
    }
    if (io.output24hMl != null) {
      parts.push(french ? `Sorties 24 h ${io.output24hMl} ml` : `Output 24h ${io.output24hMl} ml`);
    }
    if (io.balance24hMl != null) {
      parts.push(french ? `Bilan ${io.balance24hMl} ml` : `Balance ${io.balance24hMl} ml`);
    }
    if (io.urineOutputMl != null) {
      parts.push(french ? `Urine ${io.urineOutputMl} ml` : `Urine ${io.urineOutputMl} ml`);
    }
    if (parts.length) {
      lines.push(`${french ? "Entrées et sorties" : "Intake & Output"}: ${parts.join(" · ")}`);
    }
  }

  const deviceLabels = new Set<string>();
  for (const iv of input.ivActive ?? []) {
    const site = iv.site?.trim() || (french ? "site non précisé" : "site unspecified");
    const gauge = iv.gauge?.trim();
    deviceLabels.add(
      french
        ? `IV ${site}${gauge ? ` · ${gauge}` : ""}`
        : `IV ${site}${gauge ? ` · ${gauge}` : ""}`,
    );
  }
  const latestByCard = new Map<string, ClinicalDocProjectionEntry>();
  for (const entry of input.entries) {
    if (entry.voidedAt) continue;
    if (!DEVICE_CARD_IDS.has(entry.cardId)) continue;
    const prev = latestByCard.get(entry.cardId);
    if (!prev || Date.parse(entry.createdAt) >= Date.parse(prev.createdAt)) {
      latestByCard.set(entry.cardId, entry);
    }
  }
  for (const [cardId, entry] of latestByCard) {
    const title =
      (french ? entry.cardTitleFr : entry.cardTitleEn)?.trim() ||
      (french ? DEVICE_LABEL_FR[cardId] : DEVICE_LABEL_EN[cardId]) ||
      cardId.replaceAll("_", " ");
    deviceLabels.add(title);
  }
  if (deviceLabels.size > 0) {
    lines.push(
      `${french ? "Voies / drains / dispositifs" : "Lines / Drains / Devices"}: ${[...deviceLabels]
        .slice(0, 6)
        .join(" · ")}`,
    );
  }

  const oxygen = input.entries
    .filter((e) => !e.voidedAt && OXYGEN_CARD_HINT.test(e.cardId))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (oxygen) {
    const title =
      (french ? oxygen.cardTitleFr : oxygen.cardTitleEn)?.trim() ||
      (french ? "Oxygénothérapie" : "Oxygen therapy");
    lines.push(`${french ? "Oxygène / respiratoire (documentation)" : "Oxygen / respiratory (documentation)"}: ${title}`);
  }

  return lines;
}

export function projectDevicesOverviewFromAuthorities(input: {
  entries: readonly ClinicalDocProjectionEntry[];
  ivActive?: readonly IvActiveProjectionRow[];
  french?: boolean;
}): { availability: "READY" | "EMPTY"; lines: string[] } {
  const projected = projectClinicalDocumentationSummaryLines(input).filter((line) =>
    /Lines \/ Drains \/ Devices|Voies \/ drains \/ dispositifs/i.test(line),
  );
  if (projected.length === 0 && (input.ivActive?.length ?? 0) === 0) {
    const anyDeviceDoc = input.entries.some((e) => !e.voidedAt && DEVICE_CARD_IDS.has(e.cardId));
    if (!anyDeviceDoc) return { availability: "EMPTY", lines: [] };
  }
  const lines =
    projected.length > 0
      ? projected.flatMap((line) => {
          const idx = line.indexOf(": ");
          return idx >= 0 ? line.slice(idx + 2).split(" · ") : [line];
        })
      : (input.ivActive ?? []).map((iv) => {
          const site = iv.site?.trim() || "IV";
          return iv.gauge?.trim() ? `IV ${site} · ${iv.gauge}` : `IV ${site}`;
        });
  return { availability: lines.length ? "READY" : "EMPTY", lines: lines.slice(0, 8) };
}
