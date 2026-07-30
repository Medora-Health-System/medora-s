"use client";

/**
 * Shared printable Rx layout for provider and pharmacy.
 * Uses stable catalog fields (displayNameFr, strength, etc.).
 * MEDUI.D4C.7H — facility identity header + ready print execution (no noopener blank window).
 */

import type { SupportedLanguage } from "@/i18n/config";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";
import { formatOrderAuthorityLines, type OrderAuthority } from "@/lib/orderAuthority";
import { formatOrderAttributionLines, type OrderAttributionDisplay, type OrderLastActionDisplay } from "@/lib/orderAttribution";
import { highRiskMedicationWarning } from "@/lib/highRiskMedication";
import { printDateLocale, printT } from "@/lib/printI18n";
import {
  D4C7H_RX_PRINT_ERROR_CODES,
  D4C7H_RX_PRINT_MESSAGE_KEYS,
  evaluateRxPrintFacilityIdentity,
  formatRxPrintFacilityAddressLines,
  isRxPrintHtmlDocumentReady,
  projectFacilityPrintIdentity,
  type D4c7hRxPrintErrorCode,
  type RxPrintFacilityIdentityInput,
} from "@medora/shared";

export type RxOrderItem = {
  catalogItemId?: string;
  /** Manual entry (off-catalog). */
  manualLabel?: string | null;
  strength?: string | null;
  route?: string | null;
  notes?: string | null;
  quantity?: number | null;
  refillCount?: number | null;
  catalogMedication?: {
    code?: string | null;
    displayNameFr?: string | null;
    name?: string;
    strength?: string | null;
    dosageForm?: string | null;
    route?: string | null;
  } | null;
};

export type RxOrder = {
  createdAt: string;
  status?: string | null;
  prescriberName?: string | null;
  prescriberLicense?: string | null;
  prescriberContact?: string | null;
  authority?: OrderAuthority | null;
  createdByDisplay?: OrderAttributionDisplay | null;
  lastActionDisplay?: OrderLastActionDisplay | null;
  items: RxOrderItem[];
};

export type RxPatient = {
  firstName?: string | null;
  lastName?: string | null;
  mrn?: string | null;
};

export type RxPrintFacilityIdentity = RxPrintFacilityIdentityInput;

export type PrintRxResult =
  | { ok: true }
  | { ok: false; code: D4c7hRxPrintErrorCode; messageKey: string };

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function medicationLabel(item: RxOrderItem, language: SupportedLanguage): string {
  const manual = item.manualLabel?.trim();
  if (manual) {
    const strength = item.strength?.trim();
    return strength ? `${manual} ${strength}`.trim() : manual;
  }
  const cat = item.catalogMedication;
  if (cat) {
    const name =
      language === "en"
        ? catalogMedicationNameForLocale(cat, language) || cat.code?.trim() || ""
        : catalogMedicationNameForLocale(cat, language) || cat.displayNameFr?.trim() || cat.name?.trim() || "";
    const strength = item.strength ?? cat.strength;
    return strength ? `${name} ${strength}`.trim() : name;
  }
  return printT(language, "printOutput.rx.medicationFallback");
}

function medicationRoute(item: RxOrderItem): string {
  return item.route?.trim() || item.catalogMedication?.route?.trim() || "—";
}

/** Build printable facility identity from session facility + care profile (never hard-code). */
export function buildRxPrintFacilityIdentity(input: {
  facilityName?: string | null;
  careProfileJson?: unknown;
  billingAddress?: Parameters<typeof projectFacilityPrintIdentity>[0]["billingAddress"];
}): RxPrintFacilityIdentity {
  const projected = projectFacilityPrintIdentity({
    facilityName: input.facilityName,
    careProfileJson: input.careProfileJson,
    billingAddress: input.billingAddress,
  });
  return {
    name: projected.displayName,
    line1: projected.address.line1,
    line2: projected.address.line2,
    city: projected.address.city,
    stateProvince: projected.address.stateProvince,
    postalCode: projected.address.postalCode,
    country: projected.address.country,
    phone: projected.address.phone,
    fax: projected.address.fax,
  };
}

function renderFacilityHeaderHtml(
  facilityIdentity: RxPrintFacilityIdentity | undefined,
  language: SupportedLanguage
): string {
  if (!facilityIdentity) return "";
  const name = facilityIdentity.name?.trim();
  if (!name) return "";
  const addressLines = formatRxPrintFacilityAddressLines(facilityIdentity);
  const phone = facilityIdentity.phone?.trim();
  const fax = facilityIdentity.fax?.trim();
  const phoneLabel = printT(language, "printOutput.rx.phone");
  const faxLabel = printT(language, "printOutput.rx.fax");
  const parts: string[] = [
    `<div class="facility-name">${esc(name)}</div>`,
    ...addressLines.map((line) => `<div class="facility-line">${esc(line)}</div>`),
  ];
  if (phone) {
    parts.push(`<div class="facility-line">${esc(phoneLabel)}: ${esc(phone)}</div>`);
  }
  if (fax) {
    parts.push(`<div class="facility-line">${esc(faxLabel)}: ${esc(fax)}</div>`);
  }
  return `<header class="facility-header">${parts.join("")}</header>`;
}

export function getRxPrintHtml(params: {
  order: RxOrder;
  patient: RxPatient;
  /** @deprecated Prefer `facilityIdentity` — retained for callers that only have a name. */
  facilityName?: string;
  facilityIdentity?: RxPrintFacilityIdentity;
  language: SupportedLanguage;
}): string {
  const { order, patient, language } = params;
  const facilityIdentity: RxPrintFacilityIdentity | undefined =
    params.facilityIdentity ??
    (params.facilityName?.trim()
      ? { name: params.facilityName.trim() }
      : undefined);
  const loc = printDateLocale(language);
  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "—";
  const dateStr = new Date(order.createdAt).toLocaleString(loc);
  const printDateStr = new Date().toLocaleString(loc);
  const htmlLang = language === "en" ? "en" : "fr";
  const authorityLines = formatOrderAuthorityLines(order, (key) => printT(language, key));
  const authorityHtml = authorityLines.map((line) => esc(line)).join(" · ");
  const attributionHtml = formatOrderAttributionLines(order, (key) => printT(language, key), language)
    .map((line) => esc(line))
    .join("<br/>");

  const statusRaw = order.status?.trim().toUpperCase() ?? "";
  const cancelledWatermark =
    statusRaw === "CANCELLED" || statusRaw === "DISCONTINUED"
      ? `<div class="status-watermark">${esc(printT(language, "printOutput.rx.cancelledWatermark"))}</div>`
      : "";

  const rows = order.items
    .map((it) => {
      const label = medicationLabel(it, language);
      const highRiskWarning = highRiskMedicationWarning({ ...it, label }, (key) => printT(language, key));
      return `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(label)}${
            highRiskWarning
              ? `<div style="font-size: 11px; color: #b45309; margin-top: 4px; font-weight: 600;">${esc(highRiskWarning)}</div>`
              : ""
          }</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(String(it.strength ?? it.catalogMedication?.strength ?? "—"))}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(medicationRoute(it))}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(String(it.notes ?? "—"))}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(String(it.quantity ?? "—"))}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(String(it.refillCount ?? 0))}</td>
        </tr>`;
    })
    .join("");

  const pt = printT(language, "printOutput.rx.patient");
  const nir = printT(language, "printOutput.rx.nirPrefix");
  const prescDate = printT(language, "printOutput.rx.prescribedDate");
  const prescriber = printT(language, "printOutput.rx.prescriber");
  const license = printT(language, "printOutput.rx.license");
  const contact = printT(language, "printOutput.rx.contact");
  const facility = printT(language, "printOutput.rx.facility");
  const colMed = printT(language, "printOutput.rx.colMedication");
  const colStr = printT(language, "printOutput.rx.colStrength");
  const colRoute = printT(language, "printOutput.rx.colRoute");
  const colDir = printT(language, "printOutput.rx.colDirections");
  const colQty = printT(language, "printOutput.rx.colQuantity");
  const colRef = printT(language, "printOutput.rx.colRefills");
  const footer = esc(printT(language, "printOutput.rx.footerPrinted").replace("{date}", printDateStr));
  const facilityHeader = renderFacilityHeaderHtml(facilityIdentity, language);
  const facilityMeta =
    facilityIdentity?.name?.trim() && !facilityHeader
      ? `<p><strong>${esc(facility)} :</strong> ${esc(facilityIdentity.name.trim())}</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="utf-8">
  <title>${esc(printT(language, "printOutput.rx.htmlTitle"))}</title>
  <style>
    @page { margin: 12mm; }
    * { box-sizing: border-box; }
    html, body { background: #fff; color: #000; }
    body { font-family: system-ui, sans-serif; padding: 24px; max-width: 720px; margin: 0 auto; font-size: 14px; }
    h2 { margin: 0 0 16px 0; font-size: 18px; color: #000; }
    .facility-header { margin: 0 0 20px 0; padding-bottom: 12px; border-bottom: 1px solid #ccc; line-height: 1.4; color: #000; }
    .facility-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    .facility-line { font-size: 13px; color: #222; }
    .meta { color: #222; margin-bottom: 24px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; color: #000; }
    th { font-weight: 600; background: #f9f9f9; }
    .footer { margin-top: 24px; font-size: 12px; color: #444; }
    .status-watermark {
      margin: 0 0 12px 0; padding: 8px 10px; border: 2px solid #b91c1c; color: #b91c1c;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; text-align: center;
    }
    @media print {
      body { padding: 0; max-width: none; }
      .facility-header, table, .meta, h2 { visibility: visible !important; display: block; }
      table { display: table !important; }
      thead { display: table-header-group !important; }
      tr { display: table-row !important; }
      th, td { display: table-cell !important; }
    }
  </style>
</head>
<body>
  ${facilityHeader}
  ${cancelledWatermark}
  <h2>${esc(printT(language, "printOutput.rx.documentH2"))}</h2>
  <div class="meta">
    <p><strong>${esc(pt)} :</strong> ${esc(patientName)}${patient.mrn ? ` — ${esc(nir)} : ${esc(patient.mrn)}` : ""}</p>
    <p><strong>${esc(prescDate)} :</strong> ${esc(dateStr)}</p>
    <p style="color:#333;">${authorityHtml}</p>
    ${attributionHtml ? `<p style="color:#333;">${attributionHtml}</p>` : ""}
    ${order.prescriberName ? `<p><strong>${esc(prescriber)} :</strong> ${esc(order.prescriberName)}</p>` : ""}
    ${order.prescriberLicense ? `<p><strong>${esc(license)} :</strong> ${esc(order.prescriberLicense)}</p>` : ""}
    ${order.prescriberContact ? `<p><strong>${esc(contact)} :</strong> ${esc(order.prescriberContact)}</p>` : ""}
    ${facilityMeta}
  </div>
  <table>
    <thead>
      <tr>
        <th>${esc(colMed)}</th>
        <th>${esc(colStr)}</th>
        <th>${esc(colRoute)}</th>
        <th>${esc(colDir)}</th>
        <th>${esc(colQty)}</th>
        <th>${esc(colRef)}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">${footer}</p>
</body>
</html>`;
}

function failPrint(code: D4c7hRxPrintErrorCode): PrintRxResult {
  return { ok: false, code, messageKey: D4C7H_RX_PRINT_MESSAGE_KEYS[code] };
}

function schedulePrintWhenReady(win: Window, onEmpty: () => void): void {
  const invoke = () => {
    try {
      const bodyText = win.document.body?.innerHTML?.trim() ?? "";
      if (!bodyText) {
        onEmpty();
        return;
      }
      win.focus();
      win.print();
      win.close();
    } catch {
      try {
        win.close();
      } catch {
        /* ignore */
      }
      onEmpty();
    }
  };

  const runAfterPaint = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(invoke);
    });
  };

  if (win.document.readyState === "complete") {
    runAfterPaint();
    return;
  }
  win.addEventListener("load", runAfterPaint, { once: true });
}

/**
 * Canonical outpatient Rx browser print.
 * Opens a real writable window (never `noopener`), validates HTML, prints after readiness.
 */
export function printRx(params: {
  order: RxOrder;
  patient: RxPatient;
  facilityName?: string;
  facilityIdentity?: RxPrintFacilityIdentity;
  language: SupportedLanguage;
  /** When false, missing facility name returns a typed error instead of opening print. Default true. */
  requireFacilityIdentity?: boolean;
}): PrintRxResult {
  if (!params.order.items || params.order.items.length === 0) {
    const result = failPrint(D4C7H_RX_PRINT_ERROR_CODES.RX_PRINT_NO_LINES);
    alert(printT(params.language, "printOutput.rx.emptyBlocked"));
    return result;
  }

  const facilityIdentity: RxPrintFacilityIdentity | undefined =
    params.facilityIdentity ??
    (params.facilityName?.trim()
      ? { name: params.facilityName.trim() }
      : undefined);

  if (params.requireFacilityIdentity !== false) {
    const facilityGate = evaluateRxPrintFacilityIdentity(facilityIdentity);
    if (!facilityGate.ok && facilityGate.code) {
      const result = failPrint(facilityGate.code);
      alert(printT(params.language, "printOutput.rx.facilityIdentityMissing"));
      return result;
    }
  }

  const html = getRxPrintHtml({
    order: params.order,
    patient: params.patient,
    facilityIdentity,
    facilityName: params.facilityName,
    language: params.language,
  });

  if (!isRxPrintHtmlDocumentReady(html)) {
    const result = failPrint(D4C7H_RX_PRINT_ERROR_CODES.RX_PRINT_DOCUMENT_EMPTY);
    alert(printT(params.language, "printOutput.rx.documentEmpty"));
    return result;
  }

  // Do not pass noopener/noreferrer — that yields a blank about:blank print target.
  const win = window.open("", "_blank");
  if (!win) {
    const result = failPrint(D4C7H_RX_PRINT_ERROR_CODES.RX_PRINT_WINDOW_BLOCKED);
    alert(printT(params.language, "printOutput.common.popupBlocked"));
    return result;
  }

  try {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch {
    try {
      win.close();
    } catch {
      /* ignore */
    }
    const result = failPrint(D4C7H_RX_PRINT_ERROR_CODES.RX_PRINT_RENDER_FAILED);
    alert(printT(params.language, "printOutput.rx.renderFailed"));
    return result;
  }

  let emptyHandled = false;
  schedulePrintWhenReady(win, () => {
    if (emptyHandled) return;
    emptyHandled = true;
    try {
      win.close();
    } catch {
      /* ignore */
    }
    alert(printT(params.language, "printOutput.rx.documentEmpty"));
  });

  return { ok: true };
}
