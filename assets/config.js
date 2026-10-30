/* PREVIEW COPY: demo mode on purpose so this preview never writes to the live community backend. */
/*
 * Prince 365 community backend config.
 * Leave SUPABASE_URL / SUPABASE_ANON_KEY empty to run in DEMO MODE
 * (everything is stored only in the visitor's own browser via localStorage).
 * To go live, paste your Supabase project URL and *anon public* key here
 * (Supabase dashboard → Project Settings → API). Never put the service_role key here.
 * See backend/README.md for the full setup.
 */
window.P365_CONFIG = {
  SUPABASE_URL: '',        // e.g. 'https://abcdefghijkl.supabase.co'
  SUPABASE_ANON_KEY: '', // public publishable key (safe in browser)   // e.g. 'eyJhbGciOi...'
  PHOTO_BUCKET: 'fan-photos',
  SUPABASE_JS_URL: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
};
