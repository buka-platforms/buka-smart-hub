Quran Widget

- Files:
  - `components/Widget/WidgetDraggableQuran.tsx` - draggable widget component
  - `lib/quran-api.ts` - small helper to fetch surah list and surah details

Features:

- Surah selection
- Choose reciter edition (audio)
- Optional translation selection
- Play/pause, next/prev ayah, repeat
- Auto-scroll to active ayah
- Last-read surah/ayah persisted in `localStorage`

Usage:

- Open the widget via the launcher dock or visit `/widgets/quran` page.

Notes:

- Reciters and translations are edition codes passed to https://api.alquran.cloud.
- This widget uses client-side fetches and `localStorage` for preferences/bookmarks.
