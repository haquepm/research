# Research Response Importer

Private application for validating and preserving genuine participant questionnaire records.

## Research integrity boundary
This application imports historical participant records into its own auditable research dataset. It does not re-submit historical responses into Google Forms or randomize delays to make migrated records appear to be fresh participant submissions. Use the Google Form for genuine live participant responses; use this application for a traceable historical-data import.

## Stack
- Next.js 15 / React 19 / TypeScript
- Supabase Auth + Postgres + Row Level Security
- XLSX parsing in the browser
- Vercel deployment from GitHub

## Supabase
The initial schema is in `supabase/migrations/202610280001_research_response_importer.sql` and the batch-status follow-up migration is in `supabase/migrations/202610280002_research_import_batch_status.sql`. Both have been applied to the dedicated PHD Supabase project.

The app uses the publishable key in the browser. Never expose a service-role/secret key with a NEXT_PUBLIC_ prefix.

## Environment variables
Set in Vercel Project Settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (accepts the current Supabase publishable key)

Use `.env.example` for local setup.

## Local development
```bash
npm install
npm run dev
```

## First login
Create or invite the owner account in Supabase Dashboard → Authentication → Users. Public sign-up is intentionally not provided.

## Import behavior
- Reads the first worksheet locally in the browser.
- Preserves each source row as JSON answers.
- Uses workbook SHA-256 to block re-import of the same file.
- Records source filename, sheet, row number, operator, and migration timestamp.
- Stores participant completion time separately (left blank unless separately mapped).
- Does not write to the linked Google Forms response sheet or submit into Google Forms.

## Privacy
Research responses can contain sensitive personal data. Limit workspace access, use pseudonymous participant IDs where possible, and define a retention policy. Do not put participant response contents into application logs.