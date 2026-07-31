import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/db/repositories/profile";

/** Signed-in visitors have no use for the registration form — send them to the dashboard. */
export default async function RegisterLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return children;
}
