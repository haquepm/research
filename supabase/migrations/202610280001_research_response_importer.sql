create extension if not exists pgcrypto;

create table public.research_projects (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 questionnaire_title text,
 owner_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table public.response_import_batches (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.research_projects(id) on delete cascade,
 source_filename text not null,
 source_sheet text,
 source_sha256 text not null,
 row_count integer not null check (row_count >= 0),
 status text not null default 'imported' check (status in ('imported','failed')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(project_id, source_sha256)
);
create table public.participant_responses (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.research_projects(id) on delete cascade,
 batch_id uuid not null references public.response_import_batches(id) on delete cascade,
 respondent_code text not null,
 source_row_number integer not null check (source_row_number > 0),
 participant_completed_at timestamptz,
 migrated_at timestamptz not null default now(),
 answers jsonb not null default '{}'::jsonb,
 validation_status text not null default 'valid' check (validation_status in ('valid','needs_review')),
 created_at timestamptz not null default now(),
 unique(batch_id, source_row_number)
);
create table public.audit_events (
 id bigint generated always as identity primary key,
 project_id uuid not null references public.research_projects(id) on delete cascade,
 batch_id uuid references public.response_import_batches(id) on delete set null,
 actor_id uuid not null references auth.users(id),
 event_type text not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.research_projects enable row level security;
alter table public.response_import_batches enable row level security;
alter table public.participant_responses enable row level security;
alter table public.audit_events enable row level security;

create policy "owners read research projects" on public.research_projects for select to authenticated using (owner_id=(select auth.uid()));
create policy "owners create research projects" on public.research_projects for insert to authenticated with check (owner_id=(select auth.uid()));
create policy "owners read import batches" on public.response_import_batches for select to authenticated using (exists(select 1 from public.research_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy "owners create import batches" on public.response_import_batches for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.research_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy "owners read participant responses" on public.participant_responses for select to authenticated using (exists(select 1 from public.research_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy "owners create participant responses" on public.participant_responses for insert to authenticated with check (exists(select 1 from public.research_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy "owners read audit events" on public.audit_events for select to authenticated using (exists(select 1 from public.research_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
create policy "owners append audit events" on public.audit_events for insert to authenticated with check (actor_id=(select auth.uid()) and exists(select 1 from public.research_projects p where p.id=project_id and p.owner_id=(select auth.uid())));

grant select,insert on public.research_projects to authenticated;
grant select,insert on public.response_import_batches to authenticated;
grant select,insert on public.participant_responses to authenticated;
grant select,insert on public.audit_events to authenticated;