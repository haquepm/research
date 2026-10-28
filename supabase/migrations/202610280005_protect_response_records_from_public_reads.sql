drop policy if exists "public can read participant responses" on public.participant_responses;
drop policy if exists "public can read audit events" on public.audit_events;
revoke select on public.participant_responses from anon;
revoke select on public.audit_events from anon;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
