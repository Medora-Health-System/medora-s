"use client";

/**
 * Shared printable Rx layout for provider and pharmacy.
 * Uses stable catalog fields (displayNameFr, strength, etc.).
 */

import type { SupportedLanguage } from "@/i18n/config";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";
import { printDateLocale, printT } from "@/lib/printI18n";

export type RxOrderItem = {
  catalogItemId?: string;
  /** Manual entry (off-catalog). */
  manualLabel?: string | null;
  strength?: string | null;
  notes?: string | null;
  quantity?: number | null;
  refillCount?: number | null;
  catalogMedication?: {
    displayNameFr?: string | null;
    name?: string;
    strength?: string | null;
    dosageForm?: string | null;
    route?: string | null;
  } | null;
};

export type RxOrder = {
  createdAt: string;
  prescriberName?: string | null;
  prescriberLicense?: string | null;
  prescriberContact?: string | null;
  items: RxOrderItem[];
};

export type RxPatient = {
  firstName?: string | null;
  lastName?: string | null;
  mrn?: string | null;
};

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
  if (cat?.displayNameFr || cat?.name) {
    const name = catalogMedicationNameForLocale(cat, language) || cat.name || cat.displayNameFr || "";
    const strength = item.strength ?? cat.strength;
    return strength ? `${name} ${strength}`.trim() : name;
  }
  return printT(language, "printOutput.rx.medicationFallback");
}

export function getRxPrintHtml(params: {
  order: RxOrder;
  patient: RxPatient;
  facilityName?: string;
  language: SupportedLanguage;
}): string {
  const { order, patient, facilityName, language } = params;
  const loc = printDateLocale(language);
  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "—";
  const dateStr = new Date(order.createdAt).toLocaleString(loc);
  const printDateStr = new Date().toLocaleString(loc);
  const htmlLang = language === "en" ? "en" : "fr";

  const rows = order.items
    .map(
      (it) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(medicationLabel(it, language))}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(String(it.strength ?? it.catalogMedication?.strength ?? "—"))}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(String(it.notes ?? "—"))}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(String(it.quantity ?? "—"))}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${esc(String(it.refillCount ?? 0))}</td>
        </tr>`
    )
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
  const colDir = printT(language, "printOutput.rx.colDirections");
  const colQty = printT(language, "printOutput.rx.colQuantity");
  const colRef = printT(language, "printOutput.rx.colRefills");
  const footer = esc(printT(language, "printOutput.rx.footerPrinted").replace("{date}", printDateStr));

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="utf-8">
  <title>${esc(printT(language, "printOutput.rx.htmlTitle"))}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; font-size: 14px; }
    h2 { margin: 0 0 16px 0; font-size: 18px; }
    .meta { color: #444; margin-bottom: 24px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; }
    th { font-weight: 600; background: #f9f9f9; }
    .footer { margin-top: 24px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h2>${esc(printT(language, "printOutput.rx.documentH2"))}</h2>
  <div class="meta">
    <p><strong>${esc(pt)} :</strong> ${esc(patientName)}${patient.mrn ? ` — ${esc(nir)} : ${esc(patient.mrn)}` : ""}</p>
    <p><strong>${esc(prescDate)} :</strong> ${esc(dateStr)}</p>
    ${order.prescriberName ? `<p><strong>${esc(prescriber)} :</strong> ${esc(order.prescriberName)}</p>` : ""}
    ${order.prescriberLicense ? `<p><strong>${esc(license)} :</strong> ${esc(order.prescriberLicense)}</p>` : ""}
    ${order.prescriberContact ? `<p><strong>${esc(contact)} :</strong> ${esc(order.prescriberContact)}</p>` : ""}
    ${facilityName ? `<p><strong>${esc(facility)} :</strong> ${esc(facilityName)}</p>` : ""}
  </div>
  <table>
    <thead>
      <tr>
        <th>${esc(colMed)}</th>
        <th>${esc(colStr)}</th>
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

export function printRx(params: {
  order: RxOrder;
  patient: RxPatient;
  facilityName?: string;
  language: SupportedLanguage;
}): void {
  const win = window.open("", "_blank");
  if (!win) {
    alert(printT(params.language, "printOutput.common.popupBlocked"));
    return;
  }
  win.document.write(getRxPrintHtml(params));
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}
