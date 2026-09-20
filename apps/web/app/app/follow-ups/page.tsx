import { redirect } from "next/navigation";

/** Legacy URL forwards to the new Appointments interface; no old follow-up UI is mounted. */
export default function FollowUpsPage() {
  redirect("/app/appointments");
}
