-- Run only against a disposable/local Supabase database after applying migrations.
-- Everything is inside a transaction and rolled back at the end.
begin;

insert into auth.users (
    id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
) values
    ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-citizen-a@example.invalid', '', '{}', '{}', now(), now()),
    ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rls-citizen-b@example.invalid', '', '{}', '{}', now(), now()),
    ('10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'rls-csc-a@example.invalid', '', '{}', '{}', now(), now()),
    ('10000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'rls-csc-b@example.invalid', '', '{}', '{}', now(), now()),
    ('10000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'rls-admin@example.invalid', '', '{}', '{}', now(), now()),
    ('10000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'rls-super-admin@example.invalid', '', '{}', '{}', now(), now());

insert into public.user_role_assignments (user_id, role)
values
    ('10000000-0000-4000-8000-000000000003', 'csc_operator'),
    ('10000000-0000-4000-8000-000000000004', 'csc_operator'),
    ('10000000-0000-4000-8000-000000000005', 'administrator'),
    ('10000000-0000-4000-8000-000000000006', 'super_administrator');

insert into public.states (id, code, name)
values ('20000000-0000-4000-8000-000000000001', 'IN-AS', 'Assam');

insert into public.districts (id, state_id, code, name)
values (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'RLS-TEST',
    'RLS Test District'
);

insert into public.centers (
    id, name, state_id, district_id, address, verification_status, verified_at
) values
    ('40000000-0000-4000-8000-000000000001', 'RLS Test Center A', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Test address A', 'verified', now()),
    ('40000000-0000-4000-8000-000000000002', 'RLS Test Center B', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Test address B', 'verified', now());

insert into public.center_memberships (center_id, user_id)
values
    ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003'),
    ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004');

insert into public.services (id, slug, status, published_at)
values
    ('50000000-0000-4000-8000-000000000001', 'rls-test-published', 'published', now()),
    ('50000000-0000-4000-8000-000000000002', 'rls-test-draft', 'draft', null);

insert into public.saved_services (user_id, service_id)
values ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001');

insert into public.applications (id, owner_user_id, service_id)
values
    ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001'),
    ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001');

insert into public.application_assignments (application_id, center_id, assigned_user_id)
values (
    '60000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003'
);

insert into storage.objects (bucket_id, name, owner, metadata)
values
    (
        'private-user-documents',
        '10000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000001.pdf',
        '10000000-0000-4000-8000-000000000001',
        '{"mimetype":"application/pdf","size":100}'::jsonb
    ),
    (
        'private-user-documents',
        '10000000-0000-4000-8000-000000000002/70000000-0000-4000-8000-000000000002.pdf',
        '10000000-0000-4000-8000-000000000002',
        '{"mimetype":"application/pdf","size":100}'::jsonb
    );

do $$
begin
    if not exists (
        select 1 from storage.buckets
        where id = 'private-user-documents'
          and not public
          and file_size_limit = 10485760
          and allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
    ) then
        raise exception 'private document bucket settings are incorrect';
    end if;
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Owners read private documents'
          and qual like '%auth.uid%'
    ) then
        raise exception 'private document owner read policy is missing';
    end if;
end;
$$;

set local role anon;
do $$
begin
    if (select count(*) from public.services where id = '50000000-0000-4000-8000-000000000001') <> 1 then
        raise exception 'anonymous user cannot read published services';
    end if;
    if (select count(*) from public.services where id = '50000000-0000-4000-8000-000000000002') <> 0 then
        raise exception 'anonymous user can read draft services';
    end if;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
do $$
declare
    denied boolean := false;
begin
    if (select count(*) from public.saved_services where user_id = '10000000-0000-4000-8000-000000000001') <> 1
       or (select count(*) from public.saved_services where user_id = '10000000-0000-4000-8000-000000000002') <> 0 then
        raise exception 'citizen saved-service ownership policy failed';
    end if;

    insert into public.saved_services (user_id, service_id)
    values ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001')
    on conflict do nothing;

    begin
        insert into public.saved_services (user_id, service_id)
        values ('10000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001');
    exception when insufficient_privilege then
        denied := true;
    end;
    if not denied then
        raise exception 'citizen inserted another user saved-service row';
    end if;

    update public.services
    set status = 'draft', published_at = null
    where id = '50000000-0000-4000-8000-000000000001';
    if not found then
        null;
    else
        raise exception 'citizen modified catalog content';
    end if;

    begin
        perform public.set_user_role(
            '10000000-0000-4000-8000-000000000002',
            'administrator',
            true
        );
        raise exception 'administrator assigned a role without super-administrator access';
    exception when insufficient_privilege then
        null;
    end;

    if (select count(*) from storage.objects where bucket_id = 'private-user-documents'
        and name like '10000000-0000-4000-8000-000000000001/%') <> 1
       or (select count(*) from storage.objects where bucket_id = 'private-user-documents'
        and name like '10000000-0000-4000-8000-000000000002/%') <> 0 then
        raise exception 'document owner read policy failed';
    end if;

    begin
        insert into storage.objects (bucket_id, name, owner, metadata)
        values (
            'private-user-documents',
            '10000000-0000-4000-8000-000000000002/70000000-0000-4000-8000-000000000003.pdf',
            '10000000-0000-4000-8000-000000000002',
            '{"mimetype":"application/pdf","size":100}'::jsonb
        );
        raise exception 'citizen uploaded into another user document path';
    exception when insufficient_privilege then
        null;
    end;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$
begin
    if (select count(*) from public.applications where id = '60000000-0000-4000-8000-000000000001') <> 0 then
        raise exception 'citizen read another user application';
    end if;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
do $$
begin
    if (select count(*) from public.applications where id = '60000000-0000-4000-8000-000000000001') <> 1
       or (select count(*) from public.applications where id = '60000000-0000-4000-8000-000000000002') <> 0 then
        raise exception 'center application assignment policy failed';
    end if;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
do $$
begin
    if (select count(*) from public.applications where id = '60000000-0000-4000-8000-000000000001') <> 0 then
        raise exception 'operator outside the assigned center read an application';
    end if;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
do $$
begin
    if not public.has_app_role('administrator') then
        raise exception 'assigned administrator role was not recognized';
    end if;

    update public.services
    set status = 'published', published_at = now()
    where id = '50000000-0000-4000-8000-000000000002';
    if not found then
        raise exception 'administrator catalog write was denied';
    end if;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
do $$
begin
    perform public.set_user_role('10000000-0000-4000-8000-000000000002', 'administrator', true);
    if (select count(*) from public.admin_audit_logs
        where actor_user_id = '10000000-0000-4000-8000-000000000006'
          and action = 'role_assigned'
          and target_id = '10000000-0000-4000-8000-000000000002') <> 1 then
        raise exception 'super-administrator role assignment was not audit logged';
    end if;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
do $$
begin
    if not public.has_app_role('administrator') then
        raise exception 'super-administrator role assignment did not take effect';
    end if;
end;
$$;

reset role;
rollback;
