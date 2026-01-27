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
import { iptv } from "@/data/iptv";
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
  Pause,
  Play as PlayIcon,
  Tv,
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

const WIDGET_ID = "iptv" as unknown as WidgetId;

type Channel = {
  id: string;
  name: string;
  stream_url: string;
  logo_url?: string;
  category?: string;
  country?: string;
  language?: string;
  status?: string;
};

export default function WidgetDraggableIPTV() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [channels] = useState<Channel[]>(iptv);
  const [filtered, setFiltered] = useState<Channel[]>(channels);
  const [selected, setSelected] = useState<Channel | null>(channels[0] ?? null);
  const [isPlaying, setIsPlaying] = useState(false);
  const WIDGET_VOLUME_KEY = "widgetIptvVolume";
  const WIDGET_VERSION = "1.0.0";

  const [volume, setVolume] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(WIDGET_VOLUME_KEY);
      if (raw != null) {
        const n = Number(raw);
        if (!Number.isNaN(n)) return Math.min(Math.max(n / 100, 0), 1);
      }
    } catch {}
    return 0.8;
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
    setFiltered(
      channels.filter((c) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          (c.category ?? "").toLowerCase().includes(q) ||
          (c.country ?? "").toLowerCase().includes(q) ||
          (c.language ?? "").toLowerCase().includes(q)
        );
      }),
    );
  }, [query, channels]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    try {
      localStorage.setItem(WIDGET_VOLUME_KEY, String(Math.round(volume * 100)));
    } catch {}
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!videoRef.current || !selected) return;
    const v = videoRef.current;
    try {
      if (v.paused) {
        try {
          const Hls = (await import("hls.js")).default;
          if (Hls && Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(selected.stream_url);
            hls.attachMedia(v);
            await v.play();
            setIsPlaying(true);
            return;
          }
        } catch {
          // ignore - fall back
        }
        v.src = selected.stream_url;
        v.currentTime = 0;
        await v.play();
      } else {
        v.pause();
      }
    } catch {
      // ignore playback errors
    }
  }, [selected]);

  const selectChannel = useCallback(
    async (c: Channel) => {
      setSelected(c);
      const v = videoRef.current;
      if (!v) return;
      v.pause();
      v.src = "";
      try {
        setTimeout(async () => {
          v.src = c.stream_url;
          if (isPlaying) {
            try {
              await v.play();
            } catch {}
          }
        }, 50);
      } catch {}
    },
    [isPlaying],
  );

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/widget-id", WIDGET_ID);
    e.dataTransfer.effectAllowed = "move";
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

  const isVisible = visibility[WIDGET_ID] !== false;

  return (
    <div
      ref={containerRef}
      data-widget-id="iptv"
      className={`pointer-events-auto flex w-full max-w-full overflow-hidden rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div className="relative flex w-full flex-col">
        <div
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex h-8 w-full cursor-move items-center gap-2 border-b border-white/10 px-3 select-none"
        >
          <span className="flex-1 text-[10px] leading-none font-semibold tracking-widest text-white/50 uppercase">
            IPTV
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
                        "widgetVisibility",
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
            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter channels by name, country, language..."
                className="w-full rounded-md border border-white/10 bg-black/90 px-2 py-1.5 text-xs text-white placeholder:text-white/40"
              />
              <button
                onClick={() => {
                  setQuery("");
                }}
                className="flex h-8 cursor-pointer items-center justify-center rounded-md bg-white/5 px-2 text-xs font-semibold text-white/80"
                title="Clear"
              >
                Clear
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="max-h-60 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-white/5 ${selected?.id === c.id ? "bg-white/3 ring-1 ring-white/10" : ""}`}
                    onClick={() => void selectChannel(c)}
                  >
                    <div className="h-10 w-14 shrink-0 overflow-hidden rounded-sm bg-white/5">
                      {c.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.logo_url}
                          alt={c.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/30">
                          <Tv className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-xs font-semibold text-white"
                        title={c.name}
                      >
                        {c.name}
                      </div>
                      <div
                        className="truncate text-[11px] text-white/60"
                        title={`${c.country ?? ""} • ${c.language ?? ""}`}
                      >
                        {c.category ? `${c.category} • ` : ""}
                        {c.country ?? ""} {c.language ? `• ${c.language}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void selectChannel(c);
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isPlaying && selected?.id === c.id ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/50" : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"}`}
                        title={
                          isPlaying && selected?.id === c.id ? "Pause" : "Play"
                        }
                      >
                        {isPlaying && selected?.id === c.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <PlayIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col">
                <div className="relative flex-1 overflow-hidden rounded-md bg-black/70">
                  <video
                    ref={videoRef}
                    className="h-44 w-full bg-black object-cover"
                    controls={false}
                    playsInline
                    // preload="metadata"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <button
                      onClick={() => void handlePlayPause()}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <PlayIcon className="h-4 w-4" />
                      )}
                    </button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                          title="Volume"
                        >
                          {volume === 0 ? (
                            <VolumeX className="h-4 w-4" />
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
                  </div>

                  <div className="absolute top-2 right-2 text-right text-xs text-white/60">
                    <div className="font-semibold">
                      {selected?.name ?? "No channel selected"}
                    </div>
                    <div className="text-[11px]">
                      {selected?.country ?? ""}{" "}
                      {selected?.language ? `• ${selected?.language}` : ""}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-white/60">
                  Tip: Click a channel to select. Click play to start the
                  stream. Some browsers require native HLS support or hls.js.
                </div>
              </div>
            </div>
          </div>

          <div className="-mx-3 border-t border-white/10" />
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] leading-tight">
            <div className="flex-1 text-[11px] text-white/60">
              Live IPTV — {filtered.length} channels
            </div>
            <div className="flex items-center gap-2">
              {/* Reset button */}
              <button
                onClick={() => {
                  requestAnimationFrame(() => resetWidgetPosition(WIDGET_ID));
                }}
                className="rounded-md bg-white/5 px-2 py-1 text-xs text-white/80"
              >
                Reset position
              </button>
            </div>
          </div>

          <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
            <DialogContent className="sm:max-w-106.25">
              <DialogHeader>
                <DialogTitle>About IPTV Widget</DialogTitle>
                <DialogDescription className="mt-2 text-left">
                  Stream live channels defined in your data store. Supports
                  basic playback, volume persistence, and channel selection. HLS
                  playback will use hls.js when available.
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
