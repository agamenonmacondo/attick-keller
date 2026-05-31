# supabase/client.ts

- **Que hace**: Creates the browser-side Supabase client using `@supabase/ssr` for auth cookie handling
- **Exports**: `supabase` — singleton browser client
- **Datos**: Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
- **Pitfalls**: Must only be used client-side ('use client'); shared across all browser hooks