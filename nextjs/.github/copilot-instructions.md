# Copilot Instructions for buka-platforms/web-buka/nextjs

This file tells AI coding agents the concrete, repo-specific patterns that make contributions safe and productive.

## Big picture

- Next.js App Router app at the repo root. App code, pages, and API route handlers live under `app/`.
- UI is component-driven (`components/`), shared types & small utilities live in `data/` and `lib/`.
- Primary concerns: streaming (radio/tv), social auth, widget layout/state, and lightweight client audio visualizations.

## Key patterns & concrete examples

- Routing & APIs: create files/folders under `app/`. Dynamic routes use `[slug]`. API route handlers are `route.ts` (see [app/radio/route.ts](app/radio/route.ts) and [app/tv/route.ts](app/tv/route.ts)).
- Layouts: top-level shared layout is [app/layout.tsx](app/layout.tsx); nested layouts follow folder-scoped layout pattern (example: [app/(layout_one)/layout.tsx](app/(layout_one)/layout.tsx)).
- Server vs Client: files default to server components. Add `"use client"` at file top for client-only components (see `components/Home/BackgroundImageContainerClient.tsx`).
- UI primitives: prefer `components/ui/*` primitives for consistent styling and accessibility.
- State: Jotai is used app-wide. Provider is `components/JotaiProvider.tsx`; local widget positions live in `lib/widget-positions.ts` and store-like data in `data/store.ts`.

## Integrations and important helpers

- Radio/streaming: core helpers in `lib/radio-audio.ts`, `lib/radio-track-metadata.ts`, and `app/radio/buka-radio-streams.ts`.
- Audio visualizer: `lib/audio-visualizer.ts` and `audio-visualizer.worker.ts` implement client-side worklet/worker logic.
- Headers & cookies: utilities in `lib/header.ts` and `lib/cookies.ts` for consistent request handling.
- Auth flows: social provider handlers are under `app/auth/*`; login page is [app/login/page.tsx](app/login/page.tsx).

## Developer workflows (commands you can run)

- Dev server: `npm run dev` (Next dev server)
- Build: `npm run build`
- Lint: `npm run lint` (fix issues with `npm run lint -- --fix` if configured)
- Format: `npm run format:fix`
- There are no repo-level test scripts; run type checks implicitly via `npm run build`.

## Code conventions & PR guidance

- Keep changes minimal and local to the affected feature. Avoid cross-cutting refactors unless requested.
- Follow existing component patterns (props naming, CSS class composition). Copy patterns from `components/General` when uncertain.
- When adding APIs, match the `route.ts` handler signature and return valid Next.js Response objects.

## Where to look for examples

- Page+route handler: [app/radio/route.ts](app/radio/route.ts)
- Widget patterns: `components/Widget/` and `lib/widget-positions.ts`
- Jotai usage: [components/JotaiProvider.tsx](components/JotaiProvider.tsx)
- Audio/visualization: `lib/audio-visualizer.ts`, `audio-visualizer.worker.ts`

## When to avoid automated edits

- Do not change API shapes in `data/type.ts` without coordinating — many components rely on these types.
- Avoid altering global layout markup in `app/layout.tsx` unless adjusting meta, analytics, or global CSS imports.

---

If anything here is unclear or you want more detail (e.g., typical `route.ts` handler examples, or the widget state shape), tell me which area to expand.
