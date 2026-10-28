alter table public.response_import_batches drop constraint if exists response_import_batches_status_check;
alter table public.response_import_batches add constraint response_import_batches_status_check check (status in ('draft','imported','failed'));
create policy "owners update import batches" on public.response_import_batches for update to authenticated
using (exists(select 1 from public.research_projects p where p.id=project_id and p.owner_id=(select auth.uid())))
with check (exists(select 1 from public.research_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
grant update on public.response_import_batches to authenticated;