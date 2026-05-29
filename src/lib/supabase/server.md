# supabase/server.ts

- **Que hace**: Creates a server-side Supabase client with cookie-based auth for Server Components and API routes
- **Exports**: `createClient()` — async function returning Supabase client with cookie handling
- **Datos**: Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; reads cookies from request
- **Pitfalls**: Must only be used server-side; handles cookie refresh for auth sessions