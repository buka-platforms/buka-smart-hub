# Auth Regression Checklist

## Scope

- OAuth callback routes: `google`, `github`, `linkedin`, `discord`, `x`
- Session API endpoints:
  - `POST /api/auth/session/upsert`
  - `POST /api/auth/session/verify`
  - `POST /api/auth/logout`
- UI logout actions (`POST /logout`)

## Pre-flight

1. Confirm `NEXT_PUBLIC_API_URL_V1` points to the intended backend.
2. Confirm backend routes are loaded from `routes/api.php`.

## Provider Login (manual)

1. Login with Google and verify:
   - `_b_ust`, `_b_uid`, `_b_did`, `_b_ud` cookies are set.
   - Redirect returns to expected route (`_b_crt`).
2. Repeat for GitHub, LinkedIn, Discord, and X.
3. For each provider, refresh once and ensure user remains authenticated.

## Logout (manual)

1. Trigger logout from each UI entry point.
2. Verify request method is `POST` to `/logout`.
3. Verify auth cookies are cleared.
4. Refresh and confirm user stays logged out.

## API Sanity (smoke)

1. `POST /api/auth/session/upsert` with empty body returns `400`.
2. `POST /api/auth/session/verify` with empty body returns `400`.
3. `POST /api/auth/logout` with empty body returns `400`.

## Security Checks

1. Ensure logout route does not mutate state on `GET`.
2. Ensure redirect fallback sanitizes `_b_crt` to internal paths only.
3. Ensure no Directus SDK usage remains in auth/logout/session-check code paths.

## Database Checks (manual)

1. After login, confirm `users.last_login_at` updates.
2. Confirm `user_sessions` row exists for `user_id + device_id`.
3. After logout, confirm matching `user_sessions` row is deleted.

## Rollback trigger

If any provider callback fails to create session cookies, pause rollout and inspect:

- Backend `SessionUpsertController` provider mapping.
- Provider user payload shape (`user_info`) from callback route.
