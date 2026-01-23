## Flight status API — Tech plan

**Purpose:** Fetch flight status/details for a flight (example: QZ264 on 2026-01-19) from an AviationStack-style endpoint. This document will inform a future widget implementation.

**HTTP**: GET

**Endpoint (example):** `https://aviationstack.com/flight_api.php`

**Query parameters:**
- `flight_number` (required)
- `flight_date` (YYYY-MM-DD)
- `airline` (optional)
- `access_key` (if required by provider; prefer server-side injection)

### Typical JSON fields for widget consumption
- **flight:** airline name, `flight_number`, `iata`/`icao`
- **status:** `scheduled` | `active` | `landed` | `cancelled` | `diverted`
- **departure:** airport name / iata / icao, scheduled/estimated/actual times, terminal, gate
- **arrival:** same shape as departure
- **duration:** scheduled / actual
- **delays:** minutes or reason (if provided)
- **last_updated:** timestamp or `updated_at`

### Minimal illustrative response
```json
{
	"flight": {"airline": "AirAsia", "flight_number": "QZ264"},
	"status": "landed",
	"departure": {
		"airport": "Soekarno–Hatta Intl",
		"iata": "CGK",
		"scheduled": "2026-01-19T08:00:00Z",
		"actual": "2026-01-19T08:12:00Z",
		"terminal": "2",
		"gate": "A3"
	},
	"arrival": {
		"airport": "Ngurah Rai Intl",
		"iata": "DPS",
		"scheduled": "2026-01-19T10:05:00Z",
		"actual": "2026-01-19T10:00:00Z",
		"terminal": "1",
		"gate": "B5"
	},
	"duration": {"scheduled": "02:05","actual": "01:48"},
	"last_updated": "2026-01-19T10:05:00Z"
}
```

### Widget UI suggestions
- **Header:** Airline + Flight # + small airline logo
- **Status badge:** color-coded (green = on-time/landed, amber = delayed, red = cancelled)
- **Timeline:** departure → in-air → arrival with scheduled vs actual times
- **Cards:** Departure and Arrival details (airport, terminal, gate, local time)
- **Extras:** delay reason, last-updated timestamp, optional map pin, refresh button

### Polling & caching strategy
- Cache results for 1–5 minutes depending on criticality.
- Poll every 30s–2m while flight is active; poll less frequently (5–15m) when scheduled/landed.
- Use ETag/If-Modified-Since or server-side caching to conserve quota.
- Apply exponential backoff on repeated errors.

### Error & edge handling
- Clear UI states: unknown flight, no data, API limit reached, network error.
- Show "last known" cached data when the API fails.
- Validate times and timezones; show local times in UI.

### Security & implementation notes
- Never embed API keys in client-side widget. Create a Next.js API route to proxy requests and inject the API key server-side.
- Rate-limit and cache on server to protect quota.

### Minimal curl (with User-Agent)
```sh
curl -sS \
	-H "Accept: application/json" \
	-H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0" \
	"https://aviationstack.com/flight_api.php?airline=&flight_number=QZ264&flight_date=2026-01-19"
```

---

If you want, I can: add a minimal Next.js API proxy example, scaffold a small React widget mockup, or add sample TypeScript types for the response. Which should I do next?