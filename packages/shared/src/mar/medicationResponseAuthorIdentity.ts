/** MEDUI.MAR.MEDICATION_RESPONSE_RECORD_INTEGRITY_FINAL_FIX.1 */

import { derivePersonInitials } from "./medicationResponseDocumentedByDisplay.js";
import type { ParsedMarMedicationResponse } from "./marMedicationResponseGovernance.js";
import type { ParsedRespiratoryMedicationResponse } from "./respiratoryMedicationResponseGovernance.js";

export type MedicationResponseAuthorUserRecord = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

export type MedicationResponseAuthorIdentity = {
  documentedByUserId: string;
  documentedByName: string | null;
  documentedByDisplayName: string | null;
  documentedByInitials: string | null;
};

function normalizeNamePart(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function resolveDisplayNameFromUser(user: MedicationResponseAuthorUserRecord): string | null {
  const fullName = [normalizeNamePart(user.firstName), normalizeNamePart(user.lastName)]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fullName) return fullName;

  const email = normalizeNamePart(user.email);
  if (!email) return null;
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) return null;
  return localPart.replace(/[._-]+/g, " ").trim() || localPart;
}

/** Resolve initials from structured name parts (ignores credential suffixes on last name). */
function resolveInitialsFromNameParts(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string | null {
  const first = normalizeNamePart(firstName);
  const last = normalizeNamePart(lastName);
  if (first && last) {
    const firstInitial = first.replace(/[^A-Za-zÀ-ÿ]/g, "").charAt(0);
    const lastInitial = last.replace(/[^A-Za-zÀ-ÿ]/g, "").charAt(0);
    if (firstInitial && lastInitial) return `${firstInitial}${lastInitial}`.toUpperCase();
  }
  if (first) {
    const initial = first.replace(/[^A-Za-zÀ-ÿ]/g, "").charAt(0);
    return initial ? initial.toUpperCase() : null;
  }
  return null;
}

/** Resolve authenticated MAR response author identity for persistence. */
export function resolveMedicationResponseAuthorIdentity(
  user: MedicationResponseAuthorUserRecord
): MedicationResponseAuthorIdentity {
  const documentedByDisplayName = resolveDisplayNameFromUser(user);
  const initialsFromParts = resolveInitialsFromNameParts(user.firstName, user.lastName);
  return {
    documentedByUserId: user.id,
    documentedByName: documentedByDisplayName,
    documentedByDisplayName,
    documentedByInitials: initialsFromParts ?? derivePersonInitials(documentedByDisplayName),
  };
}

export function enrichParsedMarMedicationResponseAuthor(
  response: ParsedMarMedicationResponse,
  usersById: ReadonlyMap<string, MedicationResponseAuthorUserRecord>
): ParsedMarMedicationResponse {
  if (
    response.documentedByInitials?.trim() ||
    response.documentedByDisplayName?.trim() ||
    response.documentedByName?.trim() ||
    response.documentedBy?.trim()
  ) {
    return response;
  }

  const userId = response.documentedByUserId?.trim();
  if (!userId) return response;

  const user = usersById.get(userId);
  if (!user) return response;

  const identity = resolveMedicationResponseAuthorIdentity(user);
  return {
    ...response,
    documentedBy: identity.documentedByName,
    documentedByDisplayName: identity.documentedByDisplayName,
    documentedByInitials: identity.documentedByInitials,
  };
}

export function enrichParsedMarMedicationResponsesAuthor(
  responses: ParsedMarMedicationResponse[],
  usersById: ReadonlyMap<string, MedicationResponseAuthorUserRecord>
): ParsedMarMedicationResponse[] {
  if (responses.length === 0 || usersById.size === 0) return responses;
  return responses.map((response) => enrichParsedMarMedicationResponseAuthor(response, usersById));
}

export function enrichParsedRespiratoryMedicationResponseAuthor(
  response: ParsedRespiratoryMedicationResponse,
  usersById: ReadonlyMap<string, MedicationResponseAuthorUserRecord>
): ParsedRespiratoryMedicationResponse {
  const enriched = enrichParsedMarMedicationResponseAuthor(
    response as ParsedMarMedicationResponse,
    usersById
  );
  return enriched as ParsedRespiratoryMedicationResponse;
}

export function enrichParsedRespiratoryMedicationResponsesAuthor(
  responses: ParsedRespiratoryMedicationResponse[],
  usersById: ReadonlyMap<string, MedicationResponseAuthorUserRecord>
): ParsedRespiratoryMedicationResponse[] {
  if (responses.length === 0 || usersById.size === 0) return responses;
  return responses.map((response) => enrichParsedRespiratoryMedicationResponseAuthor(response, usersById));
}

export function collectMedicationResponseAuthorUserIds(
  responses: ReadonlyArray<Pick<ParsedMarMedicationResponse, "documentedByUserId">>
): string[] {
  const ids = new Set<string>();
  for (const response of responses) {
    const userId = response.documentedByUserId?.trim();
    if (userId) ids.add(userId);
  }
  return [...ids];
}
