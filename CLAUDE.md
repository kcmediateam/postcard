@AGENTS.md

# Postcard Platform — build rules

- Read `SPEC.md` before doing anything. Build **Phase 1 only**.
- Work incrementally — **one milestone / one screen at a time**, and **stop for review after each**.
- Never commit secrets. All keys go in `.env.local` (gitignored). See `.env.local.example` for the variable names.

## Current approach: frontend-first

We are building the UI first against a **typed mock data layer**, before wiring any real backend.

- All data access goes through the `DataProvider` interface in `src/lib/data/`. Components never import a concrete backend — they call the active provider via the `useData()` hook / `db` export.
- The mock provider (`src/lib/data/mock/`) holds placeholder data in memory (persisted to `localStorage` so edits survive reloads). It mirrors the SPEC §4 data model exactly.
- When the real backend lands, we add a Supabase-backed provider implementing the same `DataProvider` interface — **no component changes required**.
- No real Supabase / Stripe / Lob calls yet. Stripe + Lob stay in TEST mode for the entire build regardless.

## Stack (as scaffolded)

Next.js 16 (App Router, TS) · React 19 · Tailwind v4 · `src/` dir · import alias `@/*`.
This is Next.js 16 — read the bundled docs in `node_modules/next/dist/docs/` before using framework APIs; training data may be stale.
