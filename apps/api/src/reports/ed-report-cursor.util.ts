import { BadRequestException } from "@nestjs/common";

export function encodeReportCursor(isoDate: string, id: string): string {
  return Buffer.from(`${isoDate}\t${id}`, "utf8").toString("base64url");
}

export function decodeReportCursor(raw: string | undefined): { isoDate: string; id: string } | null {
  if (!raw?.trim()) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(raw.trim(), "base64url").toString("utf8");
  } catch {
    throw new BadRequestException("Curseur de pagination invalide.");
  }
  const tab = decoded.indexOf("\t");
  if (tab < 0) throw new BadRequestException("Curseur de pagination invalide.");
  const isoDate = decoded.slice(0, tab);
  const id = decoded.slice(tab + 1);
  if (!id || !isoDate) throw new BadRequestException("Curseur de pagination invalide.");
  return { isoDate, id };
}
