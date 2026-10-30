# Pokédex Card Binder

A kid-friendly Pokémon card organizer. Add cards, mark them **Got it / Want it / Trade**, favorite them, and search or filter your collection. Cards are saved to your Supabase account when it is configured, otherwise locally in the browser (see [Database](#database-supabase)).

Built with React, TypeScript, Vite and Tailwind CSS.

## Develop

```sh
npm install
npm run dev
```

The dev server serves the app under `/pokedex/` (the Vite `base`), e.g. http://localhost:5173/pokedex/.

Other scripts: `npm run build` (type-check with `tsc -b`, then `vite build`), `npm run lint` (oxlint) and `npm run preview`. CI builds with Node 22.

## Database (Supabase)

Cards are stored per user in Supabase Postgres with row-level security. Sign-in is a passwordless email magic link (a grown-up's email). Without Supabase configured, the app falls back to browser-only storage.

1. Create a free project at https://supabase.com.
2. Run `supabase/schema.sql` in the SQL editor.
3. In your Supabase project, under Authentication → URL Configuration, set the Site URL to the URL where you deploy your copy of the app. Add `http://localhost:5173/pokedex/` as a redirect URL for local development.
4. Locally, copy `.env.example` to `.env.local` and fill in the project URL and anon key.
5. For deployment, add repo **variables** (Settings → Secrets and variables → Actions → Variables) `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is public by design; row-level security protects the data.

## Features

- Quantity and condition (Mint / Near Mint / Good / Played) per card.
- Official card art, set, number and rarity from the Pokémon TCG API, with TCGdex as a fallback (open a card, then **Pick the official card**).
- Binder view: 3×3 pages with empty slots; "Want it" cards appear faded.
- Overall Pokédex progress and regional breakdowns with milestone badges, covering every species in the PokéAPI species list.
- Export the full collection as a JSON backup and import it later; imported cards are added without replacing existing cards.

Existing Supabase projects need the new columns: run the last section of `supabase/schema.sql`.

## Deploy

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`
(https://paulcalabro.github.io/pokedex/).
