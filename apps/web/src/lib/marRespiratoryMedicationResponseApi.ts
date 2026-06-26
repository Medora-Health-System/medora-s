import { apiFetch } from "@/lib/apiClient";
import type { RespiratoryMedicationResponseDocumentDto } from "@medora/shared";

export async function documentMarRespiratoryMedicationResponse(input: {
  encounterId: string;
  administrationId: string;
  payload: RespiratoryMedicationResponseDocumentDto;
}): Promise<{ id: string; notes: string | null; responseCode: string }> {
  return apiFetch(
    `/encounters/${input.encounterId}/medication-administrations/${input.administrationId}/respiratory-response`,
    {
      method: "POST",
      body: JSON.stringify(input.payload),
    }
  );
}
