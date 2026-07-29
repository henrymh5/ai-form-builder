import { redirect } from "next/navigation";

/** Redirects to the dashboard, which is the form list for now (Phase 4 splits this out). */
export default function FormsPage() {
  redirect("/dashboard");
}
