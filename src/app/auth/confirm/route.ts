import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createUserClient } from "@/lib/db/user-client";

/**
 * Email confirmation / magic-link / recovery callback. Supabase's auth
 * emails link here with `token_hash` + `type` (plan §16 Phase 3 signup
 * flow) instead of Supabase's own hosted verify endpoint, so a successful
 * confirmation lands the user straight in the app with a visible success
 * state instead of a bare Supabase page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (tokenHash && type) {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      const redirectTo = new URL(next, origin);
      redirectTo.searchParams.set("confirmed", "1");
      return NextResponse.redirect(redirectTo);
    }
  }

  const errorUrl = new URL("/login", origin);
  errorUrl.searchParams.set("error", "confirm_failed");
  return NextResponse.redirect(errorUrl);
}
