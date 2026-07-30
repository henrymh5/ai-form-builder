import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createUserClient } from "@/lib/db/user-client";

/**
 * The authenticated Supabase user for the current request, or `null`.
 *
 * `supabase.auth.getUser()` is a network round-trip to the Auth server (it validates the
 * token rather than decoding it locally), and it used to run once per repository that
 * needed the user id — several times per page render. React's `cache()` scopes the result
 * to a single request, so concurrent callers share one call while different requests
 * (and different users) never share state.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
