````instructions
# Copilot Instructions for buka-platforms/buka-smart-hub/apps/web (Next.js)

This file gives concrete, repo-specific guidance for AI coding agents so contributions are safe, consistent, and immediately useful.

## Big picture

- Next.js App Router app at the repo root — the Next.js app for this workspace lives under `apps/web`.
- Component-driven UI in `components/`. Shared types and small utilities live in `data/` and `lib/`.
- Primary domain concerns: streaming (radio & TV), social auth, widget layout/state, and client-side audio visualizations.

## Key patterns (do these in this repo)

- Routing & API handlers: add folders under `app/`. Dynamic routes use `[slug]`. API route handlers are `route.ts` files (example: [app/radio/route.ts](app/radio/route.ts)). Return Next.js `Response` objects from `route.ts` handlers.
- Layouts: top-level layout is [app/layout.tsx](app/layout.tsx). Use folder-scoped nested layouts (example: [app/(layout_one)/layout.tsx](app/(layout_one)/layout.tsx)). Avoid broad changes to global layout markup without coordination.
- Server vs Client: files default to server components. Add "use client" for client components (see [components/Home/BackgroundImageContainerClient.tsx](components/Home/BackgroundImageContainerClient.tsx)). Do not import browser-only APIs into server components.
- UI primitives: use `components/ui/*` primitives for consistent styling and accessibility.
- State: Jotai is the global state solution. The provider is [components/JotaiProvider.tsx](components/JotaiProvider.tsx). Widget positions and local widget state live in [lib/widget-positions.ts](lib/widget-positions.ts) and [data/store.ts](data/store.ts).

## Important libraries & integration points (where to look)

- Radio/streaming helpers: `lib/radio-audio.ts`, `lib/radio-track-metadata.ts`, and `app/radio/buka-radio-streams.ts`.
- Audio visualizer: `lib/audio-visualizer.ts` and `audio-visualizer.worker.ts` implement the client-side worklet/worker pattern — follow these when adding visuals or workers.
- Other helpers: `lib/header.ts`, `lib/cookies.ts`, `lib/mailer.ts`, `lib/quran-api.ts`, `lib/somafm-audio.ts`, `lib/onlineradioboxnowplaying-audio.ts`.
- Auth flows: social provider routes under `app/auth/*` and login at [app/login/page.tsx](app/login/page.tsx).

## Developer workflows (concrete commands)

- Start dev server: `npm run dev` (Next dev) — iterative changes will hot-reload.
- Build + type-check: `npm run build` (use to validate type errors and production build).
- Lint: `npm run lint` (auto-fix: `npm run lint -- --fix`).
- Format: `npm run format:fix`.
- Tests: there are no repo-level test scripts; rely on `npm run build` for type checks and local manual testing.

## Conventions & PR guidance (repo-specific)

- Keep changes small and localized. This repo prefers incremental, scoped PRs over large refactors.
- When adding APIs, create `app/<path>/route.ts` rather than ad-hoc server files. Mirror examples in [app/radio/route.ts](app/radio/route.ts).
- Avoid changing types in `data/type.ts` without coordinating — many components assume those shapes.
- Use existing UI primitives in `components/ui/` and patterns from `components/General/` for new components.
- For client-side audio work, follow `lib/audio-visualizer.ts` and `audio-visualizer.worker.ts` for worker/Worklet patterns.

## Safe-guard notes (what not to do)

- Do not alter global layout markup in `app/layout.tsx` except for meta/analytics/global CSS imports — discuss with maintainers first.
- Do not change API object shapes in `data/type.ts` without coordination.
- Avoid importing window/browser-only APIs into server components; move that logic to client components or hooks.

## Quick links (examples to copy from)

- Page + route example: [app/radio/route.ts](app/radio/route.ts)
- Layout example: [app/(layout_one)/layout.tsx](app/(layout_one)/layout.tsx)
- Jotai provider: [components/JotaiProvider.tsx](components/JotaiProvider.tsx)
- Audio visualizer: [lib/audio-visualizer.ts](lib/audio-visualizer.ts)

---

If you want, I can add short code snippets showing: a minimal `route.ts` handler example, a server → client migration checklist, or the widget state shape. Which would help most?

## Examples & snippets

**Minimal `route.ts` example** — follow this pattern for new API routes. Save as `app/example/route.ts`.

```ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const data = { ok: true, message: 'hello from route' };
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ received: body });
}
````

See [app/radio/route.ts](app/radio/route.ts) for a real-world handler.

**Server → Client migration checklist** — for moving DOM, `window`, audio, or worker logic to the client:

- Confirm the file is currently a server component (no `"use client"`).
- Create a client component and add `"use client"` at the top (example: [components/Home/BackgroundImageContainerClient.tsx](components/Home/BackgroundImageContainerClient.tsx)).
- Move browser-only APIs (`window`, `document`, `AudioContext`, `Worker`, etc.) into the client component or a client-only hook.
- For audio visualizers, mirror patterns in `lib/audio-visualizer.ts` and `audio-visualizer.worker.ts` (workers/worklets started from client code).
- Keep data fetching on the server where possible; pass results to client components as props or fetch from the client when interactivity requires it.
- Run `npm run dev` and `npm run build` to catch server-side import errors early.

**Widget state shape (reference)** — canonical locations: [lib/widget-positions.ts](lib/widget-positions.ts) and [data/store.ts](data/store.ts).

Example (TypeScript style) of the primary widget state:

```ts
type WidgetPosition = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized?: boolean;
};

type WidgetState = {
  positions: Record<string, WidgetPosition>;
  activeWidget?: string;
  localState: Record<string, unknown>;
};
```

If you'd like, I can expand any of these into full templates (validated `route.ts`, a `useClientAudio` hook, or a `useWidgetState` hook).

```

```
