-- Depends on 20261011153000_create_profiles.sql and Supabase Auth/Storage schemas.
-- Additive migration only. Rollback must be planned separately: dropping these objects
-- would permanently remove user-generated data and role/audit history.

create table public.languages (
    code text primary key check (code ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
    name text not null check (length(trim(name)) between 1 and 100),
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table public.states (
    id uuid primary key default gen_random_uuid(),
    code text not null unique check (code ~ '^IN-[A-Z]{2}$'),
    name text not null check (length(trim(name)) between 1 and 100),
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table public.districts (
    id uuid primary key default gen_random_uuid(),
    state_id uuid not null references public.states(id) on delete restrict,
    code text not null,
    name text not null check (length(trim(name)) between 1 and 100),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (state_id, code),
    unique (state_id, name)
);

create table public.departments (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name text not null check (length(trim(name)) between 1 and 200),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.service_categories (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name text not null check (length(trim(name)) between 1 and 120),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.services (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    category_id uuid references public.service_categories(id) on delete restrict,
    department_id uuid references public.departments(id) on delete set null,
    state_id uuid references public.states(id) on delete restrict,
    status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
    published_at timestamptz,
    verified_at timestamptz,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (status <> 'published' or published_at is not null)
);

create table public.service_translations (
    id uuid primary key default gen_random_uuid(),
    service_id uuid not null references public.services(id) on delete cascade,
    language_code text not null references public.languages(code) on delete restrict,
    title text not null check (length(trim(title)) between 1 and 240),
    summary text not null default '',
    instructions text not null default '',
    status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (service_id, language_code),
    check (status <> 'published' or published_at is not null)
);

create table public.document_types (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name text not null check (length(trim(name)) between 1 and 160),
    created_at timestamptz not null default now()
);

create table public.official_sources (
    id uuid primary key default gen_random_uuid(),
    service_id uuid references public.services(id) on delete cascade,
    title text not null check (length(trim(title)) between 1 and 240),
    url text not null check (url ~ '^https://'),
    source_type text not null default 'official' check (source_type in ('official', 'government', 'verified_partner')),
    verification_status text not null default 'pending' check (verification_status in ('pending', 'approved', 'rejected', 'expired')),
    is_public boolean not null default false,
    verified_at timestamptz,
    verified_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (not is_public or (verification_status = 'approved' and verified_at is not null))
);

create table public.service_documents (
    id uuid primary key default gen_random_uuid(),
    service_id uuid not null references public.services(id) on delete cascade,
    document_type_id uuid not null references public.document_types(id) on delete restrict,
    is_required boolean not null default true,
    notes text not null default '',
    source_id uuid references public.official_sources(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (service_id, document_type_id)
);

create table public.eligibility_questions (
    id uuid primary key default gen_random_uuid(),
    service_id uuid not null references public.services(id) on delete cascade,
    language_code text not null references public.languages(code) on delete restrict,
    question_key text not null check (question_key ~ '^[a-z][a-z0-9_]{0,63}$'),
    prompt text not null check (length(trim(prompt)) between 1 and 500),
    answer_type text not null check (answer_type in ('boolean', 'single_choice', 'number', 'text', 'date')),
    display_order integer not null default 0 check (display_order >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (service_id, language_code, question_key)
);

create table public.eligibility_options (
    id uuid primary key default gen_random_uuid(),
    question_id uuid not null references public.eligibility_questions(id) on delete cascade,
    option_key text not null check (option_key ~ '^[a-zA-Z0-9_-]{1,80}$'),
    label text not null check (length(trim(label)) between 1 and 240),
    display_order integer not null default 0 check (display_order >= 0),
    created_at timestamptz not null default now(),
    unique (question_id, option_key),
    unique (question_id, display_order)
);

create table public.eligibility_rules (
    id uuid primary key default gen_random_uuid(),
    service_id uuid not null references public.services(id) on delete cascade,
    question_id uuid references public.eligibility_questions(id) on delete cascade,
    applicable_state_id uuid references public.states(id) on delete restrict,
    source_id uuid references public.official_sources(id) on delete set null,
    rule_type text not null check (rule_type in ('required', 'include', 'exclude', 'range', 'all', 'any')),
    accepted_values jsonb not null default '[]'::jsonb check (jsonb_typeof(accepted_values) in ('array', 'object', 'number', 'string', 'boolean')),
    evaluation_behavior text not null check (evaluation_behavior in ('equals', 'one_of', 'greater_than', 'less_than', 'between', 'all', 'any')),
    explanation text not null check (length(trim(explanation)) between 1 and 2000),
    verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'disputed', 'expired')),
    verified_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (verification_status <> 'verified' or verified_at is not null)
);

create table public.user_role_assignments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('citizen', 'csc_operator', 'administrator', 'super_administrator')),
    assigned_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (user_id, role)
);

create table public.centers (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(trim(name)) between 1 and 200),
    state_id uuid not null references public.states(id) on delete restrict,
    district_id uuid not null references public.districts(id) on delete restrict,
    address text not null,
    public_contact text,
    verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected', 'suspended')),
    verified_at timestamptz,
    verified_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (verification_status <> 'verified' or verified_at is not null)
);

create table public.center_memberships (
    id uuid primary key default gen_random_uuid(),
    center_id uuid not null references public.centers(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    membership_role text not null default 'operator' check (membership_role in ('operator', 'manager')),
    active boolean not null default true,
    assigned_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (center_id, user_id)
);

create table public.center_services (
    center_id uuid not null references public.centers(id) on delete cascade,
    service_id uuid not null references public.services(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (center_id, service_id)
);

create table public.center_submissions (
    id uuid primary key default gen_random_uuid(),
    center_id uuid not null references public.centers(id) on delete cascade,
    submitted_by uuid not null references auth.users(id) on delete restrict,
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'pending' check (status in ('pending', 'in_review', 'approved', 'rejected')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.center_reviews (
    id uuid primary key default gen_random_uuid(),
    center_id uuid not null references public.centers(id) on delete cascade,
    submission_id uuid references public.center_submissions(id) on delete set null,
    reviewed_by uuid not null references auth.users(id) on delete restrict,
    decision text not null check (decision in ('approved', 'rejected', 'needs_changes')),
    notes text not null default '',
    created_at timestamptz not null default now()
);

create table public.center_contact_events (
    id uuid primary key default gen_random_uuid(),
    center_id uuid not null references public.centers(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    event_type text not null check (event_type in ('view', 'contact_click', 'directions_click')),
    created_at timestamptz not null default now()
);

create table public.saved_services (
    user_id uuid not null references auth.users(id) on delete cascade,
    service_id uuid not null references public.services(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, service_id)
);

create table public.eligibility_cases (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references auth.users(id) on delete cascade,
    service_id uuid not null references public.services(id) on delete restrict,
    answers jsonb not null default '{}'::jsonb,
    result text not null default 'incomplete' check (result in ('eligible', 'ineligible', 'uncertain', 'incomplete')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.checklists (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references auth.users(id) on delete cascade,
    service_id uuid references public.services(id) on delete set null,
    title text not null check (length(trim(title)) between 1 and 240),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.checklist_items (
    id uuid primary key default gen_random_uuid(),
    checklist_id uuid not null references public.checklists(id) on delete cascade,
    label text not null check (length(trim(label)) between 1 and 500),
    is_complete boolean not null default false,
    display_order integer not null default 0 check (display_order >= 0),
    created_at timestamptz not null default now(),
    unique (checklist_id, display_order)
);

create table public.applications (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references auth.users(id) on delete cascade,
    service_id uuid not null references public.services(id) on delete restrict,
    center_id uuid references public.centers(id) on delete set null,
    reference_label text not null default '',
    status text not null default 'preparing' check (status in ('preparing', 'submitted', 'in_review', 'action_required', 'approved', 'rejected', 'withdrawn')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.application_assignments (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references public.applications(id) on delete cascade,
    center_id uuid not null references public.centers(id) on delete cascade,
    assigned_user_id uuid references auth.users(id) on delete set null,
    assigned_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (application_id, center_id)
);

create table public.application_status_history (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references public.applications(id) on delete cascade,
    changed_by uuid references auth.users(id) on delete set null,
    old_status text check (old_status is null or old_status in ('preparing', 'submitted', 'in_review', 'action_required', 'approved', 'rejected', 'withdrawn')),
    new_status text not null check (new_status in ('preparing', 'submitted', 'in_review', 'action_required', 'approved', 'rejected', 'withdrawn')),
    note text not null default '',
    created_at timestamptz not null default now()
);

create table public.assistance_requests (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references auth.users(id) on delete cascade,
    service_id uuid not null references public.services(id) on delete restrict,
    center_id uuid references public.centers(id) on delete set null,
    message text not null default '',
    status text not null default 'open' check (status in ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.user_documents (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references auth.users(id) on delete cascade,
    storage_path text not null unique,
    display_name text not null check (length(trim(display_name)) between 1 and 160),
    mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
    size_bytes bigint not null check (size_bytes between 1 and 10485760),
    created_at timestamptz not null default now(),
    check (storage_path ~ ('^' || owner_user_id::text || '/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.](pdf|jpg|jpeg|png)$'))
);

create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null check (length(trim(title)) between 1 and 240),
    body text not null default '',
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create table public.notification_preferences (
    user_id uuid primary key references auth.users(id) on delete cascade,
    email_enabled boolean not null default true,
    sms_enabled boolean not null default false,
    updated_at timestamptz not null default now()
);

create table public.schemes (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    state_id uuid references public.states(id) on delete restrict,
    department_id uuid references public.departments(id) on delete set null,
    status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
    published_at timestamptz,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (status <> 'published' or published_at is not null)
);

create table public.jobs (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    state_id uuid references public.states(id) on delete restrict,
    department_id uuid references public.departments(id) on delete set null,
    official_source_id uuid references public.official_sources(id) on delete restrict,
    status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
    published_at timestamptz,
    closes_at timestamptz,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (status <> 'published' or published_at is not null)
);

create table public.scholarships (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    state_id uuid references public.states(id) on delete restrict,
    department_id uuid references public.departments(id) on delete set null,
    official_source_id uuid references public.official_sources(id) on delete restrict,
    status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
    published_at timestamptz,
    closes_at timestamptz,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (status <> 'published' or published_at is not null)
);

create table public.saved_opportunities (
    user_id uuid not null references auth.users(id) on delete cascade,
    opportunity_type text not null check (opportunity_type in ('job', 'scholarship', 'scheme')),
    opportunity_id uuid not null,
    created_at timestamptz not null default now(),
    primary key (user_id, opportunity_type, opportunity_id)
);

create table public.service_leads (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid not null references auth.users(id) on delete cascade,
    service_id uuid not null references public.services(id) on delete restrict,
    center_id uuid not null references public.centers(id) on delete restrict,
    status text not null default 'new' check (status in ('new', 'contacted', 'accepted', 'declined', 'closed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.lead_assignments (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references public.service_leads(id) on delete cascade,
    center_id uuid not null references public.centers(id) on delete cascade,
    assigned_user_id uuid references auth.users(id) on delete set null,
    assigned_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    unique (lead_id, center_id)
);

create table public.lead_notes (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references public.service_leads(id) on delete cascade,
    author_user_id uuid not null references auth.users(id) on delete restrict,
    note text not null check (length(trim(note)) between 1 and 4000),
    created_at timestamptz not null default now()
);

create table public.lead_status_history (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null references public.service_leads(id) on delete cascade,
    changed_by uuid references auth.users(id) on delete set null,
    old_status text check (old_status is null or old_status in ('new', 'contacted', 'accepted', 'declined', 'closed')),
    new_status text not null check (new_status in ('new', 'contacted', 'accepted', 'declined', 'closed')),
    created_at timestamptz not null default now()
);

create table public.admin_audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_user_id uuid references auth.users(id) on delete set null,
    action text not null check (length(trim(action)) between 1 and 120),
    target_type text not null check (length(trim(target_type)) between 1 and 120),
    target_id text,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table public.approved_analytics_events (
    id uuid primary key default gen_random_uuid(),
    event_name text not null check (event_name in ('catalog_search', 'service_view', 'source_open', 'center_contact')),
    state_code text check (state_code is null or state_code ~ '^IN-[A-Z]{2}$'),
    created_at timestamptz not null default now()
);

create index districts_state_idx on public.districts(state_id);
create index services_public_idx on public.services(status, state_id, category_id) where status = 'published';
create index service_translations_public_idx on public.service_translations(service_id, language_code) where status = 'published';
create index official_sources_public_idx on public.official_sources(service_id) where is_public and verification_status = 'approved';
create index eligibility_rules_service_idx on public.eligibility_rules(service_id, applicable_state_id);
create index centers_verified_lookup_idx on public.centers(state_id, district_id) where verification_status = 'verified';
create index center_memberships_user_idx on public.center_memberships(user_id, center_id) where active;
create index saved_services_user_idx on public.saved_services(user_id, created_at desc);
create index eligibility_cases_owner_idx on public.eligibility_cases(owner_user_id, created_at desc);
create index checklists_owner_idx on public.checklists(owner_user_id, created_at desc);
create index applications_owner_idx on public.applications(owner_user_id, created_at desc);
create index application_assignments_user_idx on public.application_assignments(assigned_user_id, application_id);
create index assistance_requests_owner_idx on public.assistance_requests(owner_user_id, created_at desc);
create index user_documents_owner_idx on public.user_documents(owner_user_id, created_at desc);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index jobs_public_idx on public.jobs(status, state_id, closes_at) where status = 'published';
create index scholarships_public_idx on public.scholarships(status, state_id, closes_at) where status = 'published';
create index service_leads_owner_idx on public.service_leads(owner_user_id, created_at desc);
create index lead_assignments_user_idx on public.lead_assignments(assigned_user_id, lead_id);
create index admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);

create or replace function public.has_app_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.user_role_assignments ura
        where ura.user_id = (select auth.uid())
          and ura.role = required_role
    );
$$;

create or replace function public.is_active_center_member(target_center_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.center_memberships cm
        where cm.center_id = target_center_id
          and cm.user_id = (select auth.uid())
          and cm.active
    );
$$;

create or replace function public.is_assigned_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.application_assignments aa
        join public.center_memberships cm
          on cm.center_id = aa.center_id
         and cm.user_id = (select auth.uid())
         and cm.active
        where aa.application_id = target_application_id
          and (aa.assigned_user_id is null or aa.assigned_user_id = (select auth.uid()))
    );
$$;

create or replace function public.is_assigned_lead(target_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.lead_assignments la
        join public.center_memberships cm
          on cm.center_id = la.center_id
         and cm.user_id = (select auth.uid())
         and cm.active
        where la.lead_id = target_lead_id
          and (la.assigned_user_id is null or la.assigned_user_id = (select auth.uid()))
    );
$$;

revoke all on function public.has_app_role(text) from public, anon;
revoke all on function public.is_active_center_member(uuid) from public, anon;
revoke all on function public.is_assigned_application(uuid) from public, anon;
revoke all on function public.is_assigned_lead(uuid) from public, anon;
grant execute on function public.has_app_role(text) to authenticated;
grant execute on function public.is_active_center_member(uuid) to authenticated;
grant execute on function public.is_assigned_application(uuid) to authenticated;
grant execute on function public.is_assigned_lead(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
    on conflict (id) do nothing;

    insert into public.user_role_assignments (user_id, role)
    values (new.id, 'citizen')
    on conflict (user_id, role) do nothing;

    return new;
end;
$$;

create or replace function public.set_user_role(target_user uuid, target_role text, should_assign boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    actor_user uuid := (select auth.uid());
    active_super_administrators integer;
    changed_rows integer;
begin
    if actor_user is null or not public.has_app_role('super_administrator') then
        raise exception using errcode = '42501', message = 'Not authorized to manage roles';
    end if;
    if target_role not in ('citizen', 'csc_operator', 'administrator', 'super_administrator') then
        raise exception using errcode = '22023', message = 'Invalid role';
    end if;

    if target_role = 'super_administrator' then
        perform pg_advisory_xact_lock(571234, 99231);
        if not should_assign then
            select count(*) into active_super_administrators
            from public.user_role_assignments
            where role = 'super_administrator';
            if active_super_administrators <= 1 then
                raise exception using errcode = '23514', message = 'Cannot remove the last super administrator';
            end if;
        end if;
    end if;

    if should_assign then
        insert into public.user_role_assignments (user_id, role, assigned_by)
        values (target_user, target_role, actor_user)
        on conflict (user_id, role) do nothing;
        get diagnostics changed_rows = row_count;
    else
        delete from public.user_role_assignments
        where user_id = target_user and role = target_role;
        get diagnostics changed_rows = row_count;
    end if;

    if changed_rows > 0 then
        insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, details)
        values (
            actor_user,
            case when should_assign then 'role_assigned' else 'role_revoked' end,
            'user_role',
            target_user::text,
            jsonb_build_object('role', target_role)
        );
    end if;
end;
$$;

create or replace function public.record_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'INSERT' or old.status is distinct from new.status then
        insert into public.application_status_history (application_id, changed_by, old_status, new_status)
        values (new.id, (select auth.uid()), case when tg_op = 'INSERT' then null else old.status end, new.status);
        insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, details)
        values (
            (select auth.uid()),
            'application_status_changed',
            'application',
            new.id::text,
            jsonb_build_object('old_status', case when tg_op = 'INSERT' then null else old.status end, 'new_status', new.status)
        );
    end if;
    return new;
end;
$$;

create or replace function public.record_lead_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'INSERT' or old.status is distinct from new.status then
        insert into public.lead_status_history (lead_id, changed_by, old_status, new_status)
        values (new.id, (select auth.uid()), case when tg_op = 'INSERT' then null else old.status end, new.status);
        insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, details)
        values (
            (select auth.uid()),
            'lead_status_changed',
            'service_lead',
            new.id::text,
            jsonb_build_object('old_status', case when tg_op = 'INSERT' then null else old.status end, 'new_status', new.status)
        );
    end if;
    return new;
end;
$$;

create or replace function public.record_center_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, details)
    values (
        (select auth.uid()),
        'center_review_recorded',
        'center',
        new.center_id::text,
        jsonb_build_object('decision', new.decision, 'submission_id', new.submission_id)
    );
    return new;
end;
$$;

revoke all on function public.set_user_role(uuid, text, boolean) from public, anon;
revoke all on function public.record_application_status_change() from public, anon, authenticated;
revoke all on function public.record_lead_status_change() from public, anon, authenticated;
revoke all on function public.record_center_review() from public, anon, authenticated;
grant execute on function public.set_user_role(uuid, text, boolean) to authenticated;

create trigger application_status_audit
    after insert or update of status on public.applications
    for each row execute function public.record_application_status_change();
create trigger lead_status_audit
    after insert or update of status on public.service_leads
    for each row execute function public.record_lead_status_change();
create trigger center_review_audit
    after insert on public.center_reviews
    for each row execute function public.record_center_review();

insert into public.user_role_assignments (user_id, role)
select id, 'citizen'
from auth.users
on conflict (user_id, role) do nothing;

do $$
declare
    table_record record;
begin
    for table_record in
        select c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
    loop
        execute format('alter table public.%I enable row level security', table_record.relname);
    end loop;
end;
$$;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.languages, public.states, public.districts, public.departments,
    public.service_categories, public.services, public.service_translations,
    public.document_types, public.official_sources, public.service_documents,
    public.eligibility_questions, public.eligibility_options, public.eligibility_rules,
    public.user_role_assignments, public.centers, public.center_memberships,
    public.center_services, public.center_submissions, public.center_reviews,
    public.center_contact_events, public.saved_services, public.eligibility_cases,
    public.checklists, public.checklist_items, public.applications,
    public.application_assignments, public.application_status_history,
    public.assistance_requests, public.user_documents, public.notifications,
    public.notification_preferences, public.schemes, public.jobs, public.scholarships,
    public.saved_opportunities, public.service_leads, public.lead_assignments,
    public.lead_notes, public.lead_status_history, public.admin_audit_logs,
    public.approved_analytics_events to authenticated;

grant select on public.services, public.service_translations, public.official_sources,
    public.centers, public.jobs, public.scholarships, public.schemes to anon;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert, update, delete on public.services, public.service_translations,
    public.official_sources, public.departments, public.service_categories,
    public.service_documents, public.eligibility_questions, public.eligibility_options,
    public.eligibility_rules, public.document_types, public.jobs, public.scholarships,
    public.schemes to authenticated;
grant insert, update, delete on public.centers, public.center_memberships,
    public.center_services, public.center_submissions, public.center_reviews,
    public.application_assignments to authenticated;
grant insert, select, update, delete on public.saved_services, public.eligibility_cases,
    public.checklists, public.checklist_items, public.applications,
    public.assistance_requests, public.user_documents, public.notification_preferences,
    public.saved_opportunities to authenticated;
grant update on public.notifications to authenticated;
grant insert, select on public.center_contact_events to authenticated;
grant insert, select on public.lead_notes to authenticated;

create policy "Profiles are readable by their owner"
    on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Profiles are editable by their owner"
    on public.profiles for update to authenticated
    using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users can read their own role assignments"
    on public.user_role_assignments for select to authenticated using ((select auth.uid()) = user_id);

create policy "Published services are public"
    on public.services for select to anon, authenticated using (status = 'published');
create policy "Services are admin managed"
    on public.services for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Published translations are public"
    on public.service_translations for select to anon, authenticated using (status = 'published');
create policy "Translations are admin managed"
    on public.service_translations for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Approved public sources are readable"
    on public.official_sources for select to anon, authenticated
    using (is_public and verification_status = 'approved' and verified_at is not null);
create policy "Sources are admin managed"
    on public.official_sources for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Verified centers are public"
    on public.centers for select to anon, authenticated
    using (verification_status = 'verified' and verified_at is not null);
create policy "Centers are admin managed"
    on public.centers for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Published jobs are public"
    on public.jobs for select to anon, authenticated using (status = 'published');
create policy "Jobs are admin managed"
    on public.jobs for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Published scholarships are public"
    on public.scholarships for select to anon, authenticated using (status = 'published');
create policy "Scholarships are admin managed"
    on public.scholarships for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Published schemes are public"
    on public.schemes for select to anon, authenticated using (status = 'published');
create policy "Schemes are admin managed"
    on public.schemes for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));

create policy "Auxiliary catalog records are admin managed"
    on public.departments for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Service categories are admin managed"
    on public.service_categories for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Document types are admin managed"
    on public.document_types for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Service document requirements are admin managed"
    on public.service_documents for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Eligibility questions are admin managed"
    on public.eligibility_questions for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Eligibility options are admin managed"
    on public.eligibility_options for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Eligibility rules are admin managed"
    on public.eligibility_rules for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));

create policy "Admins manage center memberships"
    on public.center_memberships for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Admins manage center services"
    on public.center_services for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Center members can read their memberships"
    on public.center_memberships for select to authenticated
    using (user_id = (select auth.uid()) or public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Center members can read their center services"
    on public.center_services for select to authenticated
    using (public.is_active_center_member(center_id) or public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Center operators can submit for their center"
    on public.center_submissions for insert to authenticated
    with check (submitted_by = (select auth.uid()) and public.is_active_center_member(center_id));
create policy "Center operators and admins can read submissions"
    on public.center_submissions for select to authenticated
    using (public.is_active_center_member(center_id) or public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Admins can update center submissions"
    on public.center_submissions for update to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Admins can review center submissions"
    on public.center_reviews for insert to authenticated
    with check ((public.has_app_role('administrator') or public.has_app_role('super_administrator')) and reviewed_by = (select auth.uid()));
create policy "Admins can read center reviews"
    on public.center_reviews for select to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Center operators can record contact events"
    on public.center_contact_events for insert to authenticated
    with check (user_id = (select auth.uid()) and public.is_active_center_member(center_id));
create policy "Center operators and admins can read contact events"
    on public.center_contact_events for select to authenticated
    using (public.is_active_center_member(center_id) or public.has_app_role('administrator') or public.has_app_role('super_administrator'));

create policy "Users manage their saved services"
    on public.saved_services for all to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users manage their eligibility cases"
    on public.eligibility_cases for all to authenticated
    using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "Users manage their checklists"
    on public.checklists for all to authenticated
    using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "Users manage items in their checklists"
    on public.checklist_items for all to authenticated
    using (exists (select 1 from public.checklists c where c.id = checklist_id and c.owner_user_id = (select auth.uid())))
    with check (exists (select 1 from public.checklists c where c.id = checklist_id and c.owner_user_id = (select auth.uid())));
create policy "Users manage their applications"
    on public.applications for all to authenticated
    using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "Assigned center members can read applications"
    on public.applications for select to authenticated using (public.is_assigned_application(id));
create policy "Admins manage application assignments"
    on public.application_assignments for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Assigned operators can read their application assignments"
    on public.application_assignments for select to authenticated
    using (
        (assigned_user_id = (select auth.uid()) and public.is_active_center_member(center_id))
        or public.has_app_role('administrator')
        or public.has_app_role('super_administrator')
    );
create policy "Application owners and assigned operators can read status history"
    on public.application_status_history for select to authenticated
    using (
        exists (select 1 from public.applications a where a.id = application_id and a.owner_user_id = (select auth.uid()))
        or public.is_assigned_application(application_id)
        or public.has_app_role('administrator')
        or public.has_app_role('super_administrator')
    );
create policy "Users manage their assistance requests"
    on public.assistance_requests for all to authenticated
    using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "Assigned center members can read assistance requests"
    on public.assistance_requests for select to authenticated
    using (
        (center_id is not null and public.is_active_center_member(center_id))
        or public.has_app_role('administrator')
        or public.has_app_role('super_administrator')
    );
create policy "Users manage their document metadata"
    on public.user_documents for all to authenticated
    using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "Users read their notifications"
    on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "Users update their notifications"
    on public.notifications for update to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users manage their notification preferences"
    on public.notification_preferences for all to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users manage their saved opportunities"
    on public.saved_opportunities for all to authenticated
    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users manage their leads"
    on public.service_leads for all to authenticated
    using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "Assigned center members can read leads"
    on public.service_leads for select to authenticated using (public.is_assigned_lead(id));
create policy "Admins manage lead assignments"
    on public.lead_assignments for all to authenticated
    using (public.has_app_role('administrator') or public.has_app_role('super_administrator'))
    with check (public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Assigned operators can read their lead assignments"
    on public.lead_assignments for select to authenticated
    using (
        (assigned_user_id = (select auth.uid()) and public.is_active_center_member(center_id))
        or public.has_app_role('administrator')
        or public.has_app_role('super_administrator')
    );
create policy "Assigned operators can read lead notes"
    on public.lead_notes for select to authenticated
    using (public.is_assigned_lead(lead_id) or public.has_app_role('administrator') or public.has_app_role('super_administrator'));
create policy "Assigned operators can add lead notes"
    on public.lead_notes for insert to authenticated
    with check (author_user_id = (select auth.uid()) and public.is_assigned_lead(lead_id));
create policy "Owners and assigned operators can read lead status history"
    on public.lead_status_history for select to authenticated
    using (
        exists (select 1 from public.service_leads l where l.id = lead_id and l.owner_user_id = (select auth.uid()))
        or public.is_assigned_lead(lead_id)
        or public.has_app_role('administrator')
        or public.has_app_role('super_administrator')
    );
create policy "Only super administrators can read audit logs"
    on public.admin_audit_logs for select to authenticated using (public.has_app_role('super_administrator'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'private-user-documents',
    'private-user-documents',
    false,
    10485760,
    array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Owners read private documents"
    on storage.objects for select to authenticated
    using (
        bucket_id = 'private-user-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](pdf|jpg|jpeg|png)$'
    );
create policy "Owners upload private documents"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'private-user-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](pdf|jpg|jpeg|png)$'
    );
create policy "Owners delete private documents"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'private-user-documents'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](pdf|jpg|jpeg|png)$'
    );
