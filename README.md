# Pokédex Card Binder

A kid-friendly Pokémon card organizer. Add cards, mark them **Got it / Want it / Trade**, favorite them, and search or filter your collection. Data is stored locally in the browser.

Built with React, TypeScript, Vite and Tailwind CSS.

## Develop

```sh
npm install
npm run dev
```

## Database (Supabase)

Cards are stored per user in Supabase Postgres with row-level security. Sign-in is a passwordless email magic link (a grown-up's email). Without Supabase configured, the app falls back to browser-only storage.

1. Create a free project at https://supabase.com.
2. Run `supabase/schema.sql` in the SQL editor.
3. Under Authentication → URL Configuration, set the Site URL to `https://paulcalabro.github.io/pokedex/` and add `http://localhost:5173/pokedex/` as a redirect URL.
4. Locally, copy `.env.example` to `.env.local` and fill in the project URL and anon key.
5. For deployment, add repo **variables** (Settings → Secrets and variables → Actions → Variables) `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is public by design; row-level security protects the data.

## Deploy

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`
(https://paulcalabro.github.io/pokedex/).
