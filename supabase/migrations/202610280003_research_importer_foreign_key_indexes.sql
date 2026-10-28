create index if not exists idx_research_projects_owner_id on public.research_projects(owner_id);
create index if not exists idx_response_import_batches_created_by on public.response_import_batches(created_by);
create index if not exists idx_participant_responses_project_id on public.participant_responses(project_id);
create index if not exists idx_audit_events_project_id on public.audit_events(project_id);
create index if not exists idx_audit_events_batch_id on public.audit_events(batch_id);
create index if not exists idx_audit_events_actor_id on public.audit_events(actor_id);