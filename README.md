# Softcore development setup

Softcore is a Next.js App Router application using Supabase Auth and Postgres for accounts.

## Requirements

- Node.js 20.19+ (Node.js 22 LTS recommended)
- npm 10+

## Start developing

```powershell
npm install
npm run dev
```

Copy `.env.example` to `.env.local`, then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the linked Supabase project. The anon/publishable key is intended for browser use; never put a service-role or secret key in a `NEXT_PUBLIC_` variable. Open `http://localhost:3000` and use `/account` to try signup and sign-in. Email confirmation is enabled in the linked project.

This project is linked to the Supabase project named Softcore. The initial profile schema migration has been applied to the linked database. To apply later migrations, run `npm run db:push`; preview pending migrations with `npm run db:push -- --dry-run`. The migration creates a `public.profiles` table with row-level security and a trigger that creates profiles for existing and new Supabase Auth users.

In Supabase Dashboard, set Authentication → URL Configuration → Site URL to the deployed app URL. Add local development URLs (`http://localhost:3000` and `http://127.0.0.1:3000`) to the redirect allow list. Start local Supabase services with Docker Desktop installed and running, then run `npx supabase start`; otherwise use the linked cloud project for database development.

## Checks and build

```powershell
npm run build
```

Run the production server with `npm run start`.

The previous SQLite account database contains no user records, so there are no existing accounts to import. New accounts are stored in Supabase Auth; profile names are mirrored to Postgres by the migration trigger.