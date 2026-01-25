"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { widgetVisibilityAtom } from "@/data/store";
import {
  observeWidget,
  resetWidgetPosition,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
  WIDGET_POSITION_KEYS,
} from "@/lib/widget-positions";
import type { WidgetId } from "@/lib/widget-positions";
import { useAtom } from "jotai";
import {
  MoreHorizontal,
  Music,
  Pause,
  Play as PlayIcon,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";

const WIDGET_ID: WidgetId = "musicpreview";

type ITunesTrack = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
};

type RawITunesResult = {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
};

export default function WidgetDraggableMusicPreview() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Curated list of 20 popular artists for a pleasant random default search
  const TOP_ARTISTS = [
    "Taylor Swift",
    "Drake",
    "The Weeknd",
    "Adele",
    "Beyoncé",
    "Ed Sheeran",
    "Billie Eilish",
    "Kendrick Lamar",
    "Coldplay",
    "Bruno Mars",
    "Ariana Grande",
    "Post Malone",
    "Imagine Dragons",
    "Dua Lipa",
    "Rihanna",
    "Justin Bieber",
    "Lady Gaga",
    "Eminem",
    "Shakira",
    "Maroon 5",
  ];

  const [query, setQuery] = useState(() => {
    const idx = Math.floor(Math.random() * TOP_ARTISTS.length);
    return TOP_ARTISTS[idx];
  });
  const [results, setResults] = useState<ITunesTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const WIDGET_VISIBILITY_KEY = "widgetVisibility";

  // Match existing widgets: store volume as 0-100 integer under a descriptive key
  const WIDGET_VOLUME_KEY = "widgetMusicPreviewVolume";
  const WIDGET_VERSION = "1.0.0";

  const [volume, setVolume] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(WIDGET_VOLUME_KEY);
      if (raw != null) {
        const n = Number(raw);
        if (!Number.isNaN(n)) return Math.min(Math.max(n / 100, 0), 1);
      }
    } catch {}
    return 0.5;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    observeWidget(WIDGET_ID, el);
    try {
      triggerLayoutUpdate();
    } catch {}
    return () => unobserveWidget(WIDGET_ID);
  }, []);

  useEffect(() => {
    // load initial results
    void search(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (!audio || !audio.duration) return setProgress(0);
      setProgress((audio.currentTime / (audio.duration || 1)) * 100);
    };
    const onEnd = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    try {
      // Persist as 0-100 integer to match other widgets
      localStorage.setItem(WIDGET_VOLUME_KEY, String(Math.round(volume * 100)));
    } catch {}
  }, [volume]);

  const search = useCallback(async (q: string) => {
    try {
      const term = encodeURIComponent(q || "");
      const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=20`;
      const res = await fetch(url);
      const json = await res.json();
      const items = (json.results || []).map((r: RawITunesResult) => ({
        trackId: r.trackId ?? 0,
        trackName: r.trackName ?? "",
        artistName: r.artistName ?? "",
        collectionName: r.collectionName,
        artworkUrl100: r.artworkUrl100,
        previewUrl: r.previewUrl,
        trackTimeMillis: r.trackTimeMillis,
      }));
      setResults(items);
    } catch {
      setResults([]);
    }
  }, []);

  const playPreview = useCallback(async (previewUrl?: string) => {
    if (!previewUrl) return;
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    if (audio.src !== previewUrl) {
      audio.pause();
      audio.src = previewUrl;
      audio.currentTime = 0;
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const pausePreview = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const handleSelect = useCallback(
    async (t: ITunesTrack) => {
      if (!t.previewUrl) return;
      if (isPlaying && audioRef.current?.src === t.previewUrl) {
        pausePreview();
      } else {
        await playPreview(t.previewUrl);
      }
    },
    [isPlaying, pausePreview, playPreview],
  );

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/widget-id", WIDGET_ID);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnd = useCallback(() => {
    // no-op for now; kept for parity with other widgets
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = "move";
    } catch {}
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const source = e.dataTransfer.getData("text/widget-id");
    const isWidgetId = (v: string): v is WidgetId =>
      Object.prototype.hasOwnProperty.call(WIDGET_POSITION_KEYS, v);
    if (isWidgetId(source) && source !== WIDGET_ID) {
      swapWidgetPositions(source, WIDGET_ID);
    }
  }, []);

  // resetPosition removed — Reset button intentionally omitted

  const isVisible = visibility[WIDGET_ID] !== false;

  return (
    <div
      ref={containerRef}
      data-widget-id="musicpreview"
      className={`pointer-events-auto flex w-full max-w-full rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div className="relative flex w-full flex-col">
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex h-8 w-full cursor-move items-center gap-2 border-b border-white/10 px-3 select-none"
        >
          <span className="flex-1 text-[10px] leading-none font-semibold tracking-widest text-white/50 uppercase">
            Music Preview
          </span>
          <div className="ml-auto">
            <DropdownMenu
              open={moreMenuOpen}
              onOpenChange={setMoreMenuOpen}
              modal={false}
            >
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="More options"
                  className="flex h-5 w-5 min-w-5 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/3 text-white/50 transition-colors hover:bg-white/8"
                  title="More options"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="h-2.5 w-2.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="min-w-40"
              >
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    setMoreMenuOpen(false);
                    setVisibility((prev) => ({ ...prev, [WIDGET_ID]: false }));
                    try {
                      localStorage.setItem(
                        WIDGET_VISIBILITY_KEY,
                        JSON.stringify({ ...visibility, [WIDGET_ID]: false }),
                      );
                    } catch {}
                  }}
                >
                  Hide widget
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    setMoreMenuOpen(false);
                    requestAnimationFrame(() => resetWidgetPosition(WIDGET_ID));
                  }}
                >
                  Reset widget position
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setMoreMenuOpen(false);
                    setAboutDialogOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  About widget
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex w-full flex-col">
          <div className="px-3 py-2">
            <div className="flex items-center gap-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void search(query);
                }}
                placeholder="Search tracks, artists, albums..."
                className="w-full rounded-md border border-white/10 bg-black/90 px-2 py-1.5 text-xs text-white placeholder:text-white/40"
              />
              <button
                onClick={() => void search(query)}
                className="flex h-8 cursor-pointer items-center justify-center rounded-md bg-white/5 px-2 text-xs font-semibold text-white/80"
              >
                Search
              </button>
            </div>

            <div className="mt-3 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:cursor-default [&::-webkit-scrollbar-thumb]:cursor-default [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:cursor-default [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5">
              <div className="space-y-2">
                {results.map((t) => (
                  <div
                    key={t.trackId}
                    className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-white/5"
                    onClick={() => void handleSelect(t)}
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-white/5">
                      {t.artworkUrl100 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.artworkUrl100}
                          alt={t.trackName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/30">
                          <Music className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-xs font-semibold text-white"
                        title={t.trackName}
                      >
                        {t.trackName}
                      </div>
                      <div
                        className="truncate text-[11px] text-white/60"
                        title={
                          t.collectionName
                            ? `${t.artistName} • ${t.collectionName}`
                            : t.artistName
                        }
                      >
                        {t.artistName}
                        {t.collectionName ? ` • ${t.collectionName}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleSelect(t);
                        }}
                        className={`pointer-events-auto z-10 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all ${
                          isPlaying && audioRef.current?.src === t.previewUrl
                            ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/50"
                            : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                        }`}
                        title={
                          isPlaying && audioRef.current?.src === t.previewUrl
                            ? "Pause"
                            : "Play"
                        }
                      >
                        {isPlaying && audioRef.current?.src === t.previewUrl ? (
                          <Pause className="h-4 w-4" fill="currentColor" />
                        ) : (
                          <PlayIcon className="h-4 w-4" fill="currentColor" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="-mx-3 border-t border-white/10" />
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] leading-tight">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
                  title="Volume"
                >
                  {volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="flex w-36 flex-col gap-2 rounded-md border border-white/10 bg-black/90 p-3 shadow-lg"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
                  <span>Volume</span>
                  <span className="text-white/60">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[Math.round(volume * 100)]}
                  onValueChange={(v) =>
                    setVolume((v[0] ?? Math.round(volume * 100)) / 100)
                  }
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
              </PopoverContent>
            </Popover>

            <div className="flex-1">
              <div className="h-1.5 w-full rounded-full bg-white/10">
                <div
                  className="h-1.5 rounded-full bg-purple-600"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Reset button removed per request */}
          </div>

          {/* hidden audio element */}
          <audio ref={audioRef} preload="none" />
          <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
            <DialogContent className="sm:max-w-106.25">
              <DialogHeader>
                <DialogTitle>About Music Preview Widget</DialogTitle>
                <DialogDescription className="mt-2 text-left">
                  Search the iTunes catalog and preview track samples. Includes
                  volume control with persistent settings and a simple progress
                  indicator.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm font-medium">{WIDGET_VERSION}</span>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
