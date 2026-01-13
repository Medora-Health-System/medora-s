import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function HomePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken");

  // Redirect to /app if authenticated, otherwise to /login
  if (accessToken) {
    redirect("/app");
  } else {
    redirect("/login");
  }
}

