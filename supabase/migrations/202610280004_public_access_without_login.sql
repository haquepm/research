alter table public.research_projects alter column owner_id drop not null;
alter table public.response_import_batches alter column created_by drop not null;
alter table public.audit_events alter column actor_id drop not null;

drop policy if exists "owners read research projects" on public.research_projects;
drop policy if exists "owners create research projects" on public.research_projects;
drop policy if exists "owners read import batches" on public.response_import_batches;
drop policy if exists "owners create import batches" on public.response_import_batches;
drop policy if exists "owners update import batches" on public.response_import_batches;
drop policy if exists "owners read participant responses" on public.participant_responses;
drop policy if exists "owners create participant responses" on public.participant_responses;
drop policy if exists "owners read audit events" on public.audit_events;
drop policy if exists "owners append audit events" on public.audit_events;

create policy "public can read research projects" on public.research_projects for select to anon using (true);
create policy "public can create research projects" on public.research_projects for insert to anon with check (owner_id is null);
create policy "public can read import batches" on public.response_import_batches for select to anon using (true);
create policy "public can create import batches" on public.response_import_batches for insert to anon with check (created_by is null);
create policy "public can update import batches" on public.response_import_batches for update to anon using (true) with check (created_by is null);
create policy "public can read participant responses" on public.participant_responses for select to anon using (true);
create policy "public can create participant responses" on public.participant_responses for insert to anon with check (true);
create policy "public can read audit events" on public.audit_events for select to anon using (true);
create policy "public can append audit events" on public.audit_events for insert to anon with check (actor_id is null);

grant select, insert on public.research_projects to anon;
grant select, insert, update on public.response_import_batches to anon;
grant select, insert on public.participant_responses to anon;
grant select, insert on public.audit_events to anon;