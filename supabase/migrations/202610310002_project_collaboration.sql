create table public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  organization_id uuid not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  foreign key (project_id, organization_id) references public.projects(id, organization_id) on delete cascade
);
create index project_comments_project_created_idx on public.project_comments(project_id, created_at);

alter table public.project_comments enable row level security;
create policy project_comments_visible on public.project_comments for select to authenticated
using (
  public.has_org_role(organization_id, array['owner','admin','manager','viewer']::public.member_role[])
  or exists (select 1 from public.project_members pm where pm.project_id = project_comments.project_id and pm.organization_id = project_comments.organization_id and pm.user_id = (select auth.uid()))
);
create policy project_comments_member_insert on public.project_comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (
    public.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])
    or exists (select 1 from public.project_members pm where pm.project_id = project_comments.project_id and pm.organization_id = project_comments.organization_id and pm.user_id = (select auth.uid()))
  )
);
grant select, insert on public.project_comments to authenticated;
