"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/toaster";

/** Shows a one-time success toast after the /auth/confirm callback, then strips the query param. */
export function EmailConfirmedToast() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("confirmed") !== "1") return;
    toast("E-Mail-Adresse bestätigt — willkommen!");
    const params = new URLSearchParams(searchParams);
    params.delete("confirmed");
    router.replace(params.size > 0 ? `/dashboard?${params.toString()}` : "/dashboard");
    // Runs once per mount when the param is present; router/searchParams
    // identity churn on every render would otherwise re-fire the toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
