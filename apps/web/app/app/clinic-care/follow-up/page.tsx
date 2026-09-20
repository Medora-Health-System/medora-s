import { redirect } from "next/navigation";

/** Retired Clinic Care follow-up UI now opens the Appointments calendar. */
export default function ClinicCareFollowUpPage() {
  redirect("/app/appointments");
}
