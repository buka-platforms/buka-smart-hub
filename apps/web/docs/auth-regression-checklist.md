# Auth Regression Checklist

## Scope

- OAuth routes owned by Laravel: `GET /auth/{provider}/redirect`, `GET /auth/{provider}/callback`
- Session API endpoints:
  - `GET /api/auth/session`
  - `POST /api/auth/session/upsert`
  - `POST /api/auth/logout`
- Direct browser logout via `POST /api/auth/logout`

## Pre-flight

1. Confirm `NEXT_PUBLIC_API_URL_V1` points to the intended backend.
2. Confirm backend auth routes are loaded from `routes/web.php` and `routes/api.php`.

## Provider Login (manual)

1. Login with Google and verify:
   - `_b_ust`, `_b_uid`, and `_b_did` cookies are set.
   - Redirect returns to expected route (`_b_crt`).
2. Repeat for GitHub, LinkedIn, Discord, and X.
3. For each provider, refresh once and ensure user remains authenticated.

## Logout (manual)

1. Trigger logout from each UI entry point.
2. Verify request method is `POST` to `/api/auth/logout`.
3. Verify auth cookies are cleared by the backend response.
4. Refresh and confirm user stays logged out.

## API Sanity (smoke)

1. `GET /api/auth/session` without auth cookies returns `200` with `is_authenticated=false`.
2. `POST /api/auth/session/upsert` with empty body returns `400`.
3. `POST /api/auth/logout` with empty body returns `400`.

## Security Checks

1. Ensure no FE OAuth callback routes remain under `app/auth/*`.
2. Ensure logout is not routed through a Next.js API proxy.
3. Ensure user display state does not depend on `_b_ud`.
4. Ensure no Directus SDK usage remains in auth/logout/session-check code paths.

## Database Checks (manual)

1. After login, confirm `users.last_login_at` updates.
2. Confirm `user_sessions` row exists for `user_id + device_id`.
3. After logout, confirm matching `user_sessions` row is marked with `revoked_at`.

## Rollback trigger

If any provider callback fails to create session cookies, pause rollout and inspect:

- Backend `OAuthController` provider mapping.
- Provider callback cookie/session creation on `api1.buka.sh`.
