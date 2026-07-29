import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/repositories/profile";

/**
 * Sends already-authenticated visitors straight to the dashboard.
 *
 * Lives in a layout because the login page itself is a client component and cannot await the
 * session. Deliberately not applied to the whole `(auth)` group: a signed-in user may still
 * want `/reset-password` to change their password.
 */
export default async function LoginLayout({ children }: LayoutProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return children;
}
