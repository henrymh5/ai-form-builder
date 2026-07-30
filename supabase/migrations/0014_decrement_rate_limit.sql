-- Releases a rate-limit unit reserved by increment_rate_limit.
--
-- Quotas are consumed before the expensive call they guard, so that concurrent
-- requests cannot both pass the check. When the guarded call then fails for reasons
-- outside the user's control (upstream outage, invalid model output), the reservation
-- has to be released again — otherwise a provider incident would permanently consume
-- a user's monthly allowance.
--
-- `greatest(..., 0)` keeps the counter from going negative if a refund is ever issued
-- more than once for the same attempt.
create function public.decrement_rate_limit(
  p_key text,
  p_window_start timestamptz
)
returns int
language sql
security definer
set search_path = public
as $$
  update public.rate_limits
  set count = greatest(count - 1, 0)
  where key = p_key and window_start = p_window_start
  returning count;
$$;

-- Same exposure as increment_rate_limit (0011): Postgres grants EXECUTE to PUBLIC at
-- creation time, so revoke that and hand it to the service role only.
revoke execute on function public.decrement_rate_limit(text, timestamptz) from public;
grant execute on function public.decrement_rate_limit(text, timestamptz) to service_role;
