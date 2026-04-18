# Rural Khata+

Voice-first multilingual ledger for rural shops, with:

- PWA installability
- Browser-native voice transcription (one-click record & transcript using Web Speech API)
- OCR scan parsing with import into the digital ledger
- WhatsApp and SMS reminder deep links

## Local app setup

1. Copy `.env.example` to `.env`.
2. Fill in your Supabase project values.
3. Add your Gemini API key for AI image extraction.
4. Install dependencies with `npm install`.
5. Run the frontend with `npm run dev`.

Required environment variables:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_GEMINI_API_KEY`
- `VITE_GEMINI_MODEL` (optional, defaults to `gemini-2.5-flash`)

## Supabase setup

Create a fresh Supabase project you own, then point this codebase to it.

1. Create a new project in the Supabase dashboard.
2. Copy these values into your local `.env`:
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Link this local repo to the new project:

- `npx supabase login`
- `npx supabase link --project-ref your-new-project-ref`

4. Push the existing database schema from this repo:

- `npx supabase db push`

## Notes

- The app uses browser-native Web Speech API for voice transcription (works offline, no server calls needed).
- The app uses direct WhatsApp and SMS links for reminders, so Twilio is not required.
- The scan page tries Gemini Vision extraction first and automatically falls back to local OCR when Gemini is unavailable.
- If `npx supabase link` fails again, make sure you are logged into the same Supabase account that owns the new project.
