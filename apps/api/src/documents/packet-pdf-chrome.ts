/**
 * MEDUI.ES.1J.B — SAFE PDF packet chrome (EN / FR / ES, zero cross-language fallback).
 *
 * Legal section bodies, attestations, signer names, and facility legalNotice stay source.
 * Filename `_Registration_Package_` remains ASCII identity (not chrome).
 */
import {
  resolveInternalProductUiLanguageOrDefault,
  type ProductUiLanguage,
} from "@medora/shared";

export type PacketPdfChrome = {
  registrationPackage: string;
  unknownPatient: string;
  patientInformation: string;
  insuranceInformation: string;
  name: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  memberId: string;
  group: string;
  documentMetadata: string;
  packetType: string;
  packetVersion: string;
  locale: string;
  generated: string;
  sourceHash: string;
  signatures: string;
  refused: string;
  patientOrRepresentative: string;
  relationship: string;
  signed: string;
  staffWitness: string;
  staffSigned: string;
  defaultFooter: string;
  packetSuffix: string;
};

const PACKET_PDF_CHROME: Record<ProductUiLanguage, PacketPdfChrome> = {
  en: {
    registrationPackage: "Registration Package",
    unknownPatient: "Unknown",
    patientInformation: "Patient Information",
    insuranceInformation: "Insurance Information",
    name: "Name:",
    dateOfBirth: "Date of Birth:",
    phone: "Phone:",
    email: "Email:",
    address: "Address:",
    memberId: "ID:",
    group: "Group:",
    documentMetadata: "Document metadata",
    packetType: "Packet type:",
    packetVersion: "Packet version:",
    locale: "Locale:",
    generated: "Generated:",
    sourceHash: "Source hash:",
    signatures: "Signatures",
    refused: "REFUSED:",
    patientOrRepresentative: "Patient/Representative:",
    relationship: "Relationship:",
    signed: "Signed:",
    staffWitness: "Staff Witness:",
    staffSigned: "Staff Signed:",
    defaultFooter: "This document was electronically generated and signed via Medora EMR.",
    packetSuffix: "Packet",
  },
  fr: {
    registrationPackage: "Paquet d'inscription",
    unknownPatient: "Inconnu",
    patientInformation: "Informations du patient",
    insuranceInformation: "Informations d'assurance",
    name: "Nom :",
    dateOfBirth: "Date de naissance :",
    phone: "Téléphone :",
    email: "E-mail :",
    address: "Adresse :",
    memberId: "ID :",
    group: "Groupe :",
    documentMetadata: "Métadonnées du document",
    packetType: "Type de dossier :",
    packetVersion: "Version du dossier :",
    locale: "Langue :",
    generated: "Généré :",
    sourceHash: "Empreinte source :",
    signatures: "Signatures",
    refused: "REFUS :",
    patientOrRepresentative: "Patient/Représentant :",
    relationship: "Lien :",
    signed: "Signé :",
    staffWitness: "Témoin du personnel :",
    staffSigned: "Personnel signé :",
    defaultFooter: "Ce document a été généré et signé électroniquement via Medora EMR.",
    packetSuffix: "Dossier",
  },
  es: {
    registrationPackage: "Paquete de inscripción",
    unknownPatient: "Desconocido",
    patientInformation: "Información del paciente",
    insuranceInformation: "Información del seguro",
    name: "Nombre:",
    dateOfBirth: "Fecha de nacimiento:",
    phone: "Teléfono:",
    email: "Correo:",
    address: "Dirección:",
    memberId: "ID:",
    group: "Grupo:",
    documentMetadata: "Metadatos del documento",
    packetType: "Tipo de paquete:",
    packetVersion: "Versión del paquete:",
    locale: "Idioma:",
    generated: "Generado:",
    sourceHash: "Hash de origen:",
    signatures: "Firmas",
    refused: "RECHAZO:",
    patientOrRepresentative: "Paciente/Representante:",
    relationship: "Relación:",
    signed: "Firmado:",
    staffWitness: "Testigo del personal:",
    staffSigned: "Personal firmó:",
    defaultFooter: "Este documento fue generado y firmado electrónicamente mediante Medora EMR.",
    packetSuffix: "Paquete",
  },
};

const PACKET_SUBTYPE_CHROME: Record<ProductUiLanguage, Record<string, string>> = {
  en: {
    FREESTANDING_ER: "Freestanding Emergency Room Packet",
    URGENT_CARE: "Urgent Care Packet",
    CLINIC: "Clinic Packet",
    HOSPITAL: "Hospital Packet",
  },
  fr: {
    FREESTANDING_ER: "Dossier de salle d'urgence autonome",
    URGENT_CARE: "Dossier de soins urgents",
    CLINIC: "Dossier de clinique",
    HOSPITAL: "Dossier hospitalier",
  },
  es: {
    FREESTANDING_ER: "Paquete de sala de urgencias independiente",
    URGENT_CARE: "Paquete de atención de urgencia",
    CLINIC: "Paquete de clínica",
    HOSPITAL: "Paquete hospitalario",
  },
};

export const MEDUI_ES_1JB_PACKET_PDF_CHROME_KEYS = Object.keys(PACKET_PDF_CHROME.en).length;

export function packetPdfChrome(locale: string | null | undefined): PacketPdfChrome {
  return PACKET_PDF_CHROME[resolveInternalProductUiLanguageOrDefault(locale)];
}

export function packetPdfSubtypeLabel(packetType: string, locale: string | null | undefined): string {
  const lang = resolveInternalProductUiLanguageOrDefault(locale);
  const chrome = PACKET_PDF_CHROME[lang];
  return PACKET_SUBTYPE_CHROME[lang][packetType] || `${packetType} ${chrome.packetSuffix}`;
}
