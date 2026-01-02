# Copilot Instructions for buka-platforms/web-buka/nextjs

## Project Overview
- This is a Next.js monorepo app with a modular structure under `app/`, `components/`, `data/`, and `lib/`.
- The `app/` directory uses the new Next.js App Router, with nested layouts and route handlers.
- UI is component-driven, with reusable elements in `components/General/`, `components/Home/`, and `components/Layout/`.
- Data and configuration are centralized in `data/` and `lib/`.

## Key Patterns & Conventions
- **Routing:** All routes and API endpoints are under `app/`. Use `[slug]` for dynamic routes. Route handlers (API) use `route.ts`.
- **Layouts:** Shared layouts are in `app/layout.tsx` and nested under subfolders (e.g., `app/(layout_one)/layout.tsx`).
- **UI Components:** Prefer using and extending components from `components/ui/` for consistency.
- **State Management:** Uses Jotai (see `components/JotaiProvider.tsx`).
- **Styling:** Uses global CSS (`app/globals.css`) and PostCSS. Follow existing className patterns.
- **TypeScript:** All code is TypeScript-first. Types are in `data/type.ts` and `global.d.ts`.

## Developer Workflows
- **Start Dev Server:** `npm run dev`
- **Format Code:** `npm run format:fix`
- **Lint:** `npm run lint`
- **Build:** `npm run build`
- **No explicit test scripts found.**

## Integration & Data Flow
- **Radio/TV:** Streaming logic in `app/radio/` and `app/tv/`, with helpers in `lib/radio-audio.ts` and `lib/radio-track-metadata.ts`.
- **Auth:** Social login under `app/auth/` and `app/login/`.
- **Widget System:** Widgets in `components/Widget/` and related state in `lib/widget-positions.ts`.
- **Analytics:** Google Analytics in `components/General/GoogleAnalytics.tsx`.

## External Dependencies
- Next.js, React, Jotai, PostCSS, and various social auth providers.

## Examples
- To add a new page: create a folder in `app/` and add `page.tsx`.
- To add a new widget: add a component to `components/Widget/` and update state logic if needed.
- For new data types, extend `data/type.ts`.

## References
- Main config: `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`
- Entry point: `app/page.tsx`, `app/layout.tsx`
- UI primitives: `components/ui/`

---
**Keep instructions concise and up-to-date. Update this file if project structure or conventions change.**
