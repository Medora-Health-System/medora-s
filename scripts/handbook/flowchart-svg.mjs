/**
 * Simple horizontal flowchart SVG renderer for Medora handbook diagrams.
 * French labels only — no PHI.
 */

const BOX_W = 150;
const BOX_H = 44;
const GAP = 36;
const PAD = 24;
const FONT = "system-ui, Segoe UI, sans-serif";

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLabel(text, maxChars = 18) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

export function renderFlowchartSvg({ title, steps, id }) {
  const count = steps.length;
  const width = PAD * 2 + count * BOX_W + (count - 1) * GAP;
  const height = 140;
  const yBox = 56;
  let body = "";

  body += `<rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" stroke="#e2e8f0"/>`;
  body += `<text x="${PAD}" y="28" font-family="${FONT}" font-size="14" font-weight="700" fill="#0f172a">${escapeXml(title)}</text>`;
  body += `<text x="${width - PAD}" y="28" font-family="${FONT}" font-size="10" fill="#64748b" text-anchor="end">${escapeXml(id ?? "")}</text>`;

  steps.forEach((step, i) => {
    const x = PAD + i * (BOX_W + GAP);
    body += `<rect x="${x}" y="${yBox}" width="${BOX_W}" height="${BOX_H}" rx="8" fill="#ffffff" stroke="#334155" stroke-width="1.5"/>`;
    const lines = wrapLabel(step);
    lines.forEach((line, li) => {
      body += `<text x="${x + BOX_W / 2}" y="${yBox + 18 + li * 14}" font-family="${FONT}" font-size="11" fill="#0f172a" text-anchor="middle">${escapeXml(line)}</text>`;
    });
    if (i < count - 1) {
      const ax = x + BOX_W;
      const ay = yBox + BOX_H / 2;
      body += `<line x1="${ax}" y1="${ay}" x2="${ax + GAP}" y2="${ay}" stroke="#64748b" stroke-width="1.5"/>`;
      body += `<polygon points="${ax + GAP},${ay} ${ax + GAP - 8},${ay - 4} ${ax + GAP - 8},${ay + 4}" fill="#64748b"/>`;
    }
  });

  body += `<text x="${PAD}" y="${height - 8}" font-family="${FONT}" font-size="9" fill="#94a3b8">Medora-S — diagramme opérationnel (sans PHI)</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">\n${body}\n</svg>\n`;
}
