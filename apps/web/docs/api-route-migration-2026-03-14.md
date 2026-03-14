# API Route Migration Note (March 14, 2026)

Date: March 14, 2026
Scope: Buka Smart Hub frontend + api1 backend route migration

## Summary

- Migrated frontend calls from legacy web routes to API-prefixed routes.
- Duplicated backend routes were added to `routes/api.php` first.
- Frontend switched to `/api/...` endpoints.
- Duplicated non-API routes were removed from backend `routes/web.php`.
- Temporary legacy-route guards were added (410 + warning logs) to detect old client traffic.

## Endpoint Mapping

- `/background-image` -> `/api/background-image`
- `/background-images` -> `/api/background-images`
- `/background-image/search/unsplash` -> `/api/background-image/search/unsplash`
- `/book-track` -> `/api/book-track`
- `/movie-track` -> `/api/movie-track`
- `/music-track` -> `/api/music-track`
- `/radio-station` -> `/api/radio-station`
- `/radio-station/stream-metadata` -> `/api/radio-station/stream-metadata`
- `/radio-stations` -> `/api/radio-stations`
- `/radio-stations/orb/now-playing/{country}` -> `/api/radio-stations/orb/now-playing/{country}`
- `/flight-status` -> `/api/flight-status`

## Rollback Safety

- Backups were created on backend for `routes/api.php` and `routes/web.php` before edits.

## Next Cleanup

- After observing no legacy hits for an agreed window, remove temporary guard routes from backend `web.php`.
