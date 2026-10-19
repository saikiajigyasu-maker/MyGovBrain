# MyGovBrain development setup

MyGovBrain is being developed in the existing Next.js App Router project using the existing Supabase Auth and Postgres project. Public information is intended to remain available without sign-in; personal records require an authenticated session.

## Requirements

- Node.js 20.19+ (Node.js 22 LTS recommended)
- npm 10+

## Start developing

```powershell
npm install
npm run dev
```

Copy `.env.example` to `.env.local`, then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the linked Supabase project. The anon/publishable key is intended for browser use; never put a service-role or secret key in a `NEXT_PUBLIC_` variable. Open `http://localhost:3000` and use `/auth` to request an email sign-in link. Email confirmation is enabled for local Supabase; production Auth settings have not been changed.

The initial profile schema migration has been applied to the linked Supabase database. The MyGovBrain foundation migration is prepared but has **not** been applied. Do not run `npm run db:push` against the linked project until the migration has been reviewed and explicit production approval is given. Migration prerequisites, role bootstrap, and rollback limitations are documented in [supabase/README.md](./supabase/README.md).

In Supabase Dashboard, set Authentication → URL Configuration → Site URL to the deployed app URL. Add local development URLs (`http://localhost:3000` and `http://127.0.0.1:3000`) to the redirect allow list. Start local Supabase services with Docker Desktop installed and running, then run `npx supabase start`; otherwise use the linked cloud project for database development.

## Checks

```powershell
npm test
npm run build
```

Run the production server with `npm run start`.

The previous SQLite account database contains no user records. Existing Supabase Auth users and profiles are preserved. New accounts receive the citizen role through the database Auth trigger. Administrator and super-administrator roles must be explicitly assigned by an authorized super administrator after the foundation migration is approved and applied.