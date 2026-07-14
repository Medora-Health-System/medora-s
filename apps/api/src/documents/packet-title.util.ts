/** Internal packet type → short subtype label (not the main document title). */
export const PACKET_SUBTYPE_LABELS: Record<string, string> = {
  FREESTANDING_ER: "Freestanding Emergency Room Packet",
  URGENT_CARE: "Urgent Care Packet",
  CLINIC: "Clinic Packet",
  HOSPITAL: "Hospital Packet",
};

export const REGISTRATION_PACKAGE_TITLE = "Registration Package";

export function packetSubtypeLabel(packetType: string): string {
  return PACKET_SUBTYPE_LABELS[packetType] || `${packetType} Packet`;
}

/** Safe filename segment from facility display name. */
export function slugifyFacilityForFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return cleaned || "Facility";
}

export function registrationPacketFileName(facilityName: string, dateStr: string): string {
  const day = (dateStr || new Date().toISOString()).slice(0, 10);
  return `${slugifyFacilityForFileName(facilityName)}_Registration_Package_${day}.pdf`;
}

export function registrationPacketDocumentTitle(facilityName: string, statusSuffix?: string): string {
  const base = `${facilityName.trim() || "Facility"} ${REGISTRATION_PACKAGE_TITLE}`;
  return statusSuffix ? `${base} — ${statusSuffix}` : base;
}

export function safeGeneratedAtDate(generatedAt?: string | null): string {
  if (typeof generatedAt === "string" && generatedAt.length >= 10) {
    return generatedAt.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function safeGeneratedAtIso(generatedAt?: string | null): string {
  if (typeof generatedAt === "string" && generatedAt.trim()) {
    return generatedAt.trim();
  }
  return new Date().toISOString();
}
