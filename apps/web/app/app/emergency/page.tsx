import { redirect } from "next/navigation";

/** Default Emergency entry redirects to the ER trackboard. */
export default function EmergencyIndexPage() {
  redirect("/app/emergency/trackboard");
}
