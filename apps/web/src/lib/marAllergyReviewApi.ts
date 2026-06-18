import { apiFetch } from "@/lib/apiClient";

export async function dismissMarAllergyReviewRecommendation(input: {
  encounterId: string;
  administrationId: string;
  candidateId: string;
}): Promise<{
  id: string;
  notes: string | null;
  candidateId: string;
  dismissedAt?: string;
  alreadyDismissed?: boolean;
}> {
  return apiFetch(
    `/encounters/${input.encounterId}/medication-administrations/${input.administrationId}/allergy-review/dismiss`,
    {
      method: "POST",
      body: JSON.stringify({ candidateId: input.candidateId }),
    }
  );
}
