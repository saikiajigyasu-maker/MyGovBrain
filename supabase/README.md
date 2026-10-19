# Database foundation

## Migration order and prerequisites

1. `20261011153000_create_profiles.sql` — existing profile table, owner-read RLS, and Auth profile trigger. Already applied to the linked project.
2. `20261019130000_mygovbrain_foundation.sql` — additive MyGovBrain tables, RLS policies, role helpers, audit triggers, and the private document bucket. Requires Supabase Auth and Storage schemas.

The second migration creates a default `citizen` role for existing and newly created Auth users. It does not grant administrator or super-administrator access. The first super-administrator must be assigned through a separately reviewed, privileged provisioning procedure after the migration is applied. Do not put privileged credentials in the application or browser.

## Safety and rollback

The migration has not been applied to production. It does not drop or truncate existing application objects. It replaces the existing `public.handle_new_user()` trigger function to add a citizen role while preserving profile creation, and inserts missing citizen role rows for existing Auth users.

Do not roll back by dropping the created tables or bucket after users have stored data. Doing so would permanently remove roles, personal records, audit history, or documents. A rollback must first disable affected application routes, export/back up affected data, and be approved; retain additive schema until a data-preserving rollback plan is agreed.

Before applying to any database, test in a disposable/local Supabase project, review the generated migration plan, confirm the expected role bootstrap and Auth callback allowlist, and take a verified backup. The local Supabase CLI currently requires Docker or Podman, which was unavailable during this stage.

## Access model

- Anonymous reads are granted only for published services/translations, approved public sources, verified centers, and published jobs, scholarships, and schemes.
- Citizen-owned tables are scoped to `auth.uid()`.
- CSC operators use active center memberships and explicit application/lead assignments; they do not receive blanket access to citizen records.
- Catalog and center review writes require administrator/super-administrator roles. Role assignment is restricted to the audited `set_user_role` function and super-administrators.
- Audit logs are append-only to application roles and readable only by super-administrators.
- The `private-user-documents` bucket is private, limited to 10 MiB, and accepts PDF, JPEG, and PNG. Object paths must be `<authenticated-user-uuid>/<random-uuid>.<allowed-extension>`.
- No anonymous or authenticated policy exposes analytics-event reads.

Policy and migration behavior must be verified with the local Supabase database before production approval. The app-level foundation includes unit tests for authorization decisions, but those tests do not replace database RLS integration tests.
