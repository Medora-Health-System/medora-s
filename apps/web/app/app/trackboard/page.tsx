import { redirect } from "next/navigation";

/** Retired legacy board: preserve bookmarked URL without rendering old UI. */
export default function RetiredTrackboardPage() {
  redirect("/app/emergency/trackboard");
}
