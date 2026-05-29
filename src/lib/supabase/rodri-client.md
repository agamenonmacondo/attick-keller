# supabase/rodri-client.ts

- **Que hace**: Lazy-initialized Supabase client for Rodrigo/Seadotec separate database. Only created when first accessed to avoid build-time errors.
- **Exports**: `rodriSupabase` — lazy-getter client
- **Datos**: Uses `NEXT_PUBLIC_RODRI_SUPABASE_URL` and `NEXT_PUBLIC_RODRI_SUPABASE_ANON_KEY`
- **Pitfalls**: Lazy init prevents build crash when env vars are missing in CI; must not be used server-side