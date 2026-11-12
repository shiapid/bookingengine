create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index tenant_members_user_id_idx on public.tenant_members (user_id);

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;

revoke all on public.tenants, public.tenant_members from public, anon, authenticated;
grant select on public.tenants, public.tenant_members to authenticated;

create policy "Users read their own memberships"
on public.tenant_members for select to authenticated
using (user_id = (select auth.uid()));

create policy "Members read their tenants"
on public.tenants for select to authenticated
using (id in (
  select membership.tenant_id
  from public.tenant_members as membership
  where membership.user_id = (select auth.uid())
));

insert into storage.buckets (id, name, public)
values ('tenant-files', 'tenant-files', false);

-- The first path segment is the tenant UUID: <tenant_id>/<file>.
create policy "Members read their tenant files"
on storage.objects for select to authenticated
using (
  bucket_id = 'tenant-files'
  and (storage.foldername(name))[1] in (
    select membership.tenant_id::text
    from public.tenant_members as membership
    where membership.user_id = (select auth.uid())
  )
);

create policy "Admins manage their tenant files"
on storage.objects for all to authenticated
using (
  bucket_id = 'tenant-files'
  and (storage.foldername(name))[1] in (
    select membership.tenant_id::text
    from public.tenant_members as membership
    where membership.user_id = (select auth.uid())
      and membership.role = 'admin'
  )
)
with check (
  bucket_id = 'tenant-files'
  and (storage.foldername(name))[1] in (
    select membership.tenant_id::text
    from public.tenant_members as membership
    where membership.user_id = (select auth.uid())
      and membership.role = 'admin'
  )
);
