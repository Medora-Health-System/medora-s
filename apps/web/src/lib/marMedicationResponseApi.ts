import { apiFetch } from "@/lib/apiClient";
import type { MarMedicationResponseDocumentDto } from "@medora/shared";

export async function documentMarMedicationResponse(input: {
  encounterId: string;
  administrationId: string;
  payload: MarMedicationResponseDocumentDto;
}): Promise<{ id: string; notes: string | null; responseCode: string }> {
  return apiFetch(
    `/encounters/${input.encounterId}/medication-administrations/${input.administrationId}/response`,
    {
      method: "POST",
      body: JSON.stringify(input.payload),
    }
  );
}
