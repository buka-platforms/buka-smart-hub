```instructions
# Copilot Instructions (monorepo root)

This file orients AI coding agents to the monorepo layout and points to per-app instructions.

Repo layout

- `apps/web` — Next.js frontend (this workspace). See `apps/web/.github/copilot-instructions.md` for app-specific guidance.
- `apps/*` — add other services or apps here (API servers, workers, etc.). Each service should include its own `.github/copilot-instructions.md` when its build/run differs.

How agents should use these files

- Read this root file first for monorepo-level conventions and links.
- Then open the target app's instructions (for example, `apps/web/.github/copilot-instructions.md`) for concrete commands, patterns, and code examples.

Common workspace commands (from `apps/web` example)

To run the web app locally:

```
cd apps/web
npm install
npm run dev
```

To build/type-check the web app:

```
cd apps/web
npm run build
```

Guidance for adding new services

- Add a `.github/copilot-instructions.md` in the service folder when:
  - the service has nonstandard build/run steps, or
  - it requires specific environment setup (DB, secrets, workers).
- Document where to run tests, CI targets, and any bootstrap steps in the service-level file.

Notes

- Keep agent guidance minimal and actionable. Link to service README or service-level copilot file rather than duplicating large content.
- If you want, I can scaffold `apps/api/.github/copilot-instructions.md` (or similar) using patterns from `apps/web`.

```
