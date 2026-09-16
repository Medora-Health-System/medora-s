import { attachmentsFromResultDataAll } from "@/lib/clinicalResultNormalize";
import type { DigitalCareResultDetail, DigitalCareWorkspaceBundle } from "@/lib/digitalCareStaffWorkspaceApi";
import { digitalCareFormatWhen, digitalCareSafeLabel } from "./digitalCareWorkspaceView";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function openDigitalCarePrintDocument(title: string, bodyHtml: string): void {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; color: #0f172a; padding: 24px; }
      h1 { font-size: 20px; margin: 0 0 8px; }
      table { border-collapse: collapse; width: 100%; margin-top: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 13px; }
      .muted { color: #64748b; font-size: 12px; }
    </style></head><body>${bodyHtml}</body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

export function digitalCareResultPrintHtml(
  identityName: string,
  mrn: string,
  result: DigitalCareResultDetail,
): string {
  const rows = (result.rows ?? [])
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.test)}</td><td>${escapeHtml(row.result)}${row.unit ? ` ${escapeHtml(row.unit)}` : ""}</td><td>${escapeHtml(row.reference ?? "")}</td><td>${escapeHtml(row.flag ?? "")}</td></tr>`,
    )
    .join("");
  const attachments = attachmentsFromResultDataAll(result.resultData)
    .map((row) => escapeHtml(row.fileName || row.mimeType || "attachment"))
    .join(", ");
  return `<h1>${escapeHtml(digitalCareSafeLabel(result.title))}</h1>
    <p class="muted">${escapeHtml(identityName)} · MRN ${escapeHtml(mrn)} · ${escapeHtml(digitalCareFormatWhen(result.verifiedAt))}</p>
    ${rows ? `<table><thead><tr><th>Test</th><th>Result</th><th>Reference</th><th>Flag</th></tr></thead><tbody>${rows}</tbody></table>` : `<pre>${escapeHtml(result.resultText ?? "")}</pre>`}
    ${result.imaging?.impression ? `<p><strong>Impression</strong><br>${escapeHtml(result.imaging.impression)}</p>` : ""}
    ${attachments ? `<p class="muted">${attachments}</p>` : ""}
    ${result.verifiedByName ? `<p class="muted">${escapeHtml(result.verifiedByName)}</p>` : ""}`;
}

export function digitalCareWorkspacePrintHtml(bundle: DigitalCareWorkspaceBundle, section: string): string {
  const name = digitalCareSafeLabel(bundle.identity.displayName);
  const mrn = digitalCareSafeLabel(bundle.identity.mrn);
  if (section === "discharge") {
    return `<h1>${name}</h1><p class="muted">MRN ${mrn}</p>
      <p>${escapeHtml(bundle.discharge.disposition ?? "")}</p>
      <p>${escapeHtml(bundle.discharge.instructions ?? "")}</p>
      <p>${escapeHtml(bundle.discharge.restrictions ?? "")}</p>
      <p>${escapeHtml(bundle.discharge.followUp ?? "")}</p>`;
  }
  if (section === "summary") {
    const items = bundle.timeline
      .map((row) => `<li><strong>${escapeHtml(digitalCareFormatWhen(row.at))}</strong> — ${escapeHtml(row.title)}${row.detail ? `: ${escapeHtml(row.detail)}` : ""}</li>`)
      .join("");
    return `<h1>${name}</h1><p class="muted">MRN ${mrn}</p><ul>${items}</ul>`;
  }
  const meds = bundle.medications.ordered
    .map((item) => `<li>${escapeHtml(item.name)} ${escapeHtml(item.strength ?? "")} ${escapeHtml(item.route ?? "")}</li>`)
    .join("");
  return `<h1>${name}</h1><p class="muted">MRN ${mrn}</p><ul>${meds}</ul>`;
}
