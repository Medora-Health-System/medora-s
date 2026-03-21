"use client";

/**
 * Shared printable Rx layout in French for provider and pharmacy.
 * Uses stable catalog fields (displayNameFr, strength, etc.) — no live label dependency.
 */

export type RxOrderItem = {
  catalogItemId?: string;
  /** Saisie manuelle (hors catalogue). */
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

function medicationLabel(item: RxOrderItem): string {
  const manual = item.manualLabel?.trim();
  if (manual) {
    const strength = item.strength?.trim();
    return strength ? `${manual} ${strength}`.trim() : manual;
  }
  const cat = item.catalogMedication;
  if (cat?.displayNameFr || cat?.name) {
    const name = cat.displayNameFr ?? cat.name ?? "";
    const strength = item.strength ?? cat.strength;
    return strength ? `${name} ${strength}`.trim() : name;
  }
  return "Médicament (libellé non renseigné)";
}

export function getRxPrintHtml(params: {
  order: RxOrder;
  patient: RxPatient;
  facilityName?: string;
}): string {
  const { order, patient, facilityName } = params;
  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "—";
  const dateStr = new Date(order.createdAt).toLocaleString("fr-FR");
  const printDateStr = new Date().toLocaleString("fr-FR");

  const rows = order.items
    .map(
      (it) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${medicationLabel(it)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${it.strength ?? it.catalogMedication?.strength ?? "—"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${it.notes ?? "—"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${it.quantity ?? "—"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${it.refillCount ?? 0}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Ordonnance</title>
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
  <h2>Ordonnance</h2>
  <div class="meta">
    <p><strong>Patient :</strong> ${patientName}${patient.mrn ? ` — NIR : ${patient.mrn}` : ""}</p>
    <p><strong>Date de prescription :</strong> ${dateStr}</p>
    ${order.prescriberName ? `<p><strong>Prescripteur :</strong> ${order.prescriberName}</p>` : ""}
    ${order.prescriberLicense ? `<p><strong>N° licence / RPPS :</strong> ${order.prescriberLicense}</p>` : ""}
    ${order.prescriberContact ? `<p><strong>Contact :</strong> ${order.prescriberContact}</p>` : ""}
    ${facilityName ? `<p><strong>Établissement :</strong> ${facilityName}</p>` : ""}
  </div>
  <table>
    <thead>
      <tr>
        <th>Médicament</th>
        <th>Dosage</th>
        <th>Posologie</th>
        <th>Quantité</th>
        <th>Renouvellements</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">Medora-S — Ordonnance imprimée le ${printDateStr}</p>
</body>
</html>`;
}

export function printRx(params: { order: RxOrder; patient: RxPatient; facilityName?: string }): void {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(getRxPrintHtml(params));
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}
