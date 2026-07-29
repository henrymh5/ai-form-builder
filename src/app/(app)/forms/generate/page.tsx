import { redirect } from "next/navigation";
import { GenerateFormClient } from "@/features/form-builder/generate-form-client";
import { getCurrentUser } from "@/lib/db/repositories/profile";

/**
 * Waiting screen for AI form generation (plan §11). The user is sent here the moment they
 * submit the prompt, so the wait happens on a real page instead of inside a stuck dialog.
 */
export default async function GenerateFormPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <GenerateFormClient />;
}
