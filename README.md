# Research Response Importer

A research-data management application for validating and transparently importing participant-provided questionnaire records.

## Research integrity
This application does not bulk-submit historical records into Google Forms or disguise migration timestamps as participant completion times. It preserves source responses, validates mappings, and imports records into a controlled research dataset. Google Forms remains available for genuine live participant submissions.

## Stack
- Next.js App Router, TypeScript, Tailwind CSS
- Supabase (database, authentication, private storage)
- Vercel deployment

## Environment
Set the following in local .env.local and Vercel Project Settings. Never commit real credentials.
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
The service-role key must remain server-only and must never use a NEXT_PUBLIC_ prefix.

## Modules
1. Workbook upload and parsing
2. Column-to-question mapping
3. Required-field and allowed-value validation
4. Duplicate detection and pseudonymous respondent IDs
5. Research dataset import with source-row and audit metadata
6. XLSX/CSV export
7. Separate test-form integration for authorized QA only

## Local development
```bash
npm install
npm run dev
```

Keep the original workbook unchanged. Treat free-text and identifiers as sensitive research data. Restrict access and define a retention policy before production.
