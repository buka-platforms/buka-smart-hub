"use client";

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { somafmAudioStateAtom, widgetVisibilityAtom } from "@/data/store";
import {
  attachSomaFMListeners,
  detachSomaFMListeners,
  playSomaFMStream,
  setSomaFMVolume,
  setupSomaFMAudio,
  stopSomaFM,
} from "@/lib/somafm-audio";
import {
  getSavedWidgetPosition,
  observeWidget,
  resetWidgetPosition,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
} from "@/lib/widget-positions";
// removed neodrag in favor of manual drag handlers
import { useAtom } from "jotai";
import {
  Disc3,
  LoaderCircle,
  MoreHorizontal,
  Music2,
  Pause,
  Play as PlayIcon,
  User,
  Users,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SomaFMChannel {
  id: string;
  title: string;
  description: string;
  dj: string;
  listeners: number;
  updated: string;
  playlist: string;
  genre: string;
  image: string;
  largeimage: string;
  twitter: string;
  stream: string[];
  lastPlaying: string;
}

const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_ID = "somafm";
const WIDGET_VERSION = "1.0.0";

export default function WidgetDraggableSomaFM() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const positionRef = useRef(position);
  const [channels, setChannels] = useState<SomaFMChannel[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [somafmAudioState] = useAtom(somafmAudioStateAtom);
  const isPlaying = !!somafmAudioState?.isPlaying;
  const isLoading = !!somafmAudioState?.isLoading;
  const volume = Number.isFinite(somafmAudioState?.volume)
    ? somafmAudioState.volume
    : 0.5;
  const [nowPlaying, setNowPlaying] = useState<{
    title: string;
    artist: string;
    album?: string;
    albumArt?: string;
  } | null>(null);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  useEffect(() => {
    fetch("https://somafm.com/channels.json")
      .then((res) => res.json())
      .then((data) => {
        // Sort channels alphabetically by title for display
        const sortedChannels = (data.channels || [])
          .slice()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .sort((a: any, b: any) => a.title.localeCompare(b.title));
        setChannels(sortedChannels);
        // Find the channel with the most listeners
        const mostListenersChannel = (data.channels || []).slice().sort(
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          (a: any, b: any) =>
            (Number(b.listeners) || 0) - (Number(a.listeners) || 0),
        )[0];
        setSelected(mostListenersChannel?.id || sortedChannels?.[0]?.id || "");
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load channels");
        setLoading(false);
      });
  }, []);

  // setup shared audio on mount and attach listeners (do not stop audio on unmount)
  useEffect(() => {
    setupSomaFMAudio();
    attachSomaFMListeners();
    return () => {
      detachSomaFMListeners();
    };
  }, []);

  // If we have an existing last channel in shared audio state, rehydrate selection when channels load
  useEffect(() => {
    if (channels.length === 0) return;
    const last = somafmAudioState?.lastChannelId;
    if (last) {
      const found = channels.find((c) => c.id === last);
      if (found) queueMicrotask(() => setSelected(last));
    }
  }, [channels, somafmAudioState?.lastChannelId]);

  useEffect(() => {
    queueMicrotask(() => setIsPositionLoaded(true));
  }, []);

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
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent<
        Record<string, { x: number; y: number }>
      >;
      const detail = customEvent.detail || {};
      // Only update if we do NOT have a saved position
      if (!getSavedWidgetPosition(WIDGET_ID)) {
        if (Object.prototype.hasOwnProperty.call(detail, WIDGET_ID)) {
          const newPos = detail[WIDGET_ID];
          if (newPos) setPosition(newPos);
        } else if (Object.keys(detail).length > 1) {
          const newPos = detail[WIDGET_ID];
          if (newPos) setPosition(newPos);
        }
      }
    };

    window.addEventListener("widget-positions-reset", handleReset);
    return () =>
      window.removeEventListener("widget-positions-reset", handleReset);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData("text/widget-id", WIDGET_ID);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => setIsDragging(false), []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const source = e.dataTransfer.getData("text/widget-id");
    if (source && source !== WIDGET_ID)
      swapWidgetPositions(source as any, WIDGET_ID as any);
  }, []);

  const resetPosition = useCallback(() => resetWidgetPosition(WIDGET_ID), []);

  // Positioning is handled centrally by the container via layout events.
  // This component uses swap-based drag/drop on the left label and no
  // longer performs per-pixel drag transforms itself.

  const currentChannel = channels.find((c) => c.id === selected);
  // Use direct mp3 stream URL as per SomaFM docs
  const streamUrl = currentChannel?.id
    ? `https://ice1.somafm.com/${currentChannel.id}-128-mp3`
    : "";
  const isVisible = isPositionLoaded && visibility[WIDGET_ID] !== false;
  const visibleNowPlaying = selected ? nowPlaying : null;

  // volume persisted and applied via shared audio manager

  // Fetch now playing info for selected channel
  useEffect(() => {
    if (!selected) return;

    const controller = new AbortController();
    let intervalId: number | undefined;
    let currentInterval = 7000;

    const fetchNowPlaying = () => {
      fetch(`https://somafm.com/songs/${selected}.json`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          const firstSong = data?.songs?.[0];
          if (firstSong) {
            setNowPlaying({
              title: firstSong.title || "",
              artist: firstSong.artist || "",
              album: firstSong.album || "",
              albumArt: firstSong.albumArt || "",
            });
          } else {
            setNowPlaying(null);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setNowPlaying(null);
          }
        });
    };

    const setupInterval = (ms: number) => {
      if (intervalId) window.clearInterval(intervalId);
      intervalId = window.setInterval(fetchNowPlaying, ms);
      currentInterval = ms;
    };

    fetchNowPlaying();
    setupInterval(isPlaying ? 7000 : 60000);

    // Listen for isPlaying changes to adjust interval
    const handlePlayState = () => {
      const desired = isPlaying ? 7000 : 60000;
      if (currentInterval !== desired) {
        setupInterval(desired);
      }
    };

    handlePlayState();

    // Observe isPlaying changes
    const observer = setInterval(() => {
      handlePlayState();
    }, 1000);

    return () => {
      controller.abort();
      if (intervalId) window.clearInterval(intervalId);
      clearInterval(observer);
    };
  }, [selected, isPlaying]);

  // Track last sent SomaFM track to avoid duplicate GA hits
  const lastSomaTrackRef = useRef<string | null>(null);

  // Send GA virtual page_view when SomaFM now playing changes while playing
  useEffect(() => {
    if (!nowPlaying) {
      lastSomaTrackRef.current = null;
      return;
    }

    const trackKey = `${nowPlaying.artist || ""} - ${nowPlaying.title || ""}`;

    if (isPlaying && trackKey && trackKey !== lastSomaTrackRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof window !== "undefined" && (window as any).gtag) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).gtag("event", "page_view", {
            page_title: `SomaFM: ${currentChannel?.title || selected} — ${nowPlaying.artist || ""} - ${nowPlaying.title || ""}`,
            page_location: window.location.href,
            page_path: window.location.pathname,
          });
        }
      } catch {
        /* ignore */
      }
    }

    lastSomaTrackRef.current = trackKey;
  }, [currentChannel?.title, isPlaying, nowPlaying, selected]);

  return (
    <>
      <DropdownMenu
        open={moreMenuOpen}
        onOpenChange={setMoreMenuOpen}
        modal={false}
      >
        <div
          ref={containerRef}
          data-widget-id="somafm"
          className={`pointer-events-auto flex rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 ${isDragging ? "shadow-none" : "transition-opacity duration-300"} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <div className="relative flex w-full flex-col">
            {/* Top Title (drag handle) */}
            <div
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`flex items-center h-8 px-3 gap-2 cursor-move select-none border-b border-white/10 ${isDragging ? "opacity-60" : "opacity-100"}`}
            >
              <span className="text-[10px] font-semibold tracking-widest text-white/50 uppercase leading-none">SomaFM</span>
            </div>

            {/* Main Column */}
            <div className="flex w-full flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
              <div className="flex items-center gap-3">
                {/* Channel Art */}
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white/10">
                  {visibleNowPlaying?.albumArt ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="pointer-events-none h-full w-full object-contain"
                      src={visibleNowPlaying.albumArt}
                      alt={visibleNowPlaying.title || currentChannel?.title || "SomaFM"}
                      loading="lazy"
                      draggable={false}
                    />
                  ) : currentChannel && currentChannel.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="pointer-events-none h-full w-full object-contain"
                      src={currentChannel.image}
                      alt={currentChannel.title}
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <LoaderCircle className="h-8 w-8 animate-spin text-white/40" />
                  )}
                </div>

                {/* Channel Info */}
                <div className="flex min-w-0 flex-auto flex-col justify-center gap-0.5">
                  {currentChannel && (
                    <span className="truncate text-xs font-semibold text-white/60" title={currentChannel.title}>
                      {currentChannel.title}
                    </span>
                  )}
                  {visibleNowPlaying && (
                    <span className="truncate text-sm font-medium text-white" title={visibleNowPlaying.title}>
                      {visibleNowPlaying.title}
                    </span>
                  )}
                  {visibleNowPlaying && (
                    <span className="truncate text-xs text-white/70" title={`${visibleNowPlaying.artist}${visibleNowPlaying.album ? ` — ${visibleNowPlaying.album}` : ""}`}>
                      {visibleNowPlaying.artist}
                      {visibleNowPlaying.album ? ` — ${visibleNowPlaying.album}` : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Play/Pause Button on right */}
              <div>
                <button
                  disabled={!streamUrl}
                  onClick={async () => {
                    if (!streamUrl) return;
                    try {
                      if (somafmAudioState?.lastStream === streamUrl) {
                        if (somafmAudioState?.isPlaying) {
                          stopSomaFM();
                        } else {
                          await playSomaFMStream(streamUrl, selected);
                        }
                      } else {
                        await playSomaFMStream(streamUrl, selected);
                      }
                    } catch {}
                  }}
                  className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full ${isLoading ? "bg-white/10" : "bg-white/10 hover:bg-white/20"} text-white transition-colors ${!streamUrl ? "cursor-not-allowed opacity-50" : ""}`}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isLoading ? (
                    <Disc3 className="h-10 w-10 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="h-5 w-5" fill="currentColor" />
                  ) : (
                    <PlayIcon className="h-5 w-5" fill="currentColor" />
                  )}
                </button>
              </div>
            </div>

            {currentChannel && (
              <div className="px-3 pb-3 text-xs text-white">
                {currentChannel.description && (
                  <div className="mt-1 overflow-hidden leading-snug text-white/70" style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }} title={currentChannel.description}>
                    {currentChannel.description}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-3 text-[10px] text-white/50">
                  <span className="flex items-center gap-1" title={`DJ: ${currentChannel.dj}`}>
                    <User className="inline-block h-3 w-3" />
                    {currentChannel.dj}
                  </span>
                  <span className="opacity-50">•</span>
                  <span className="flex items-center gap-1" title={`Listeners: ${currentChannel.listeners}`}>
                    <Users className="inline-block h-3 w-3" />
                    {currentChannel.listeners}
                  </span>
                  {currentChannel.genre && (
                    <>
                      <span className="opacity-50">•</span>
                      <span className="flex items-center gap-1" title={`Genre: ${currentChannel.genre.replace(/\|/g, ", ")}`}>
                        <Music2 className="inline-block h-3 w-3" />
                        {currentChannel.genre.replace(/\|/g, ", ")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* audio element managed in shared somafm audio module */}

            {/* Separator and action bar */}
            <div className="border-t border-white/10" />
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
                  className="flex w-32 flex-col gap-2 rounded-md border border-white/10 bg-black/90 p-3 shadow-lg"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
                    <span>Volume</span>
                    <span className="text-white/60">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[Math.round(volume * 100)]}
                    onValueChange={(v) => {
                      const percent = v[0] ?? Math.round(volume * 100);
                      try {
                        setSomaFMVolume(percent);
                      } catch {}
                    }}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                  />
                </PopoverContent>
              </Popover>
              {/* CHANNELS button with searchable command menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
                    type="button"
                    aria-label="Select channel"
                    onClick={async () => {
                      try {
                        const res = await fetch(
                          "https://somafm.com/channels.json",
                        );
                        const data = await res.json();
                        const sortedChannels = (data.channels || [])
                          .slice()
                          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                          .sort((a: any, b: any) =>
                            a.title.localeCompare(b.title),
                          );
                        setChannels(sortedChannels);
                      } catch {}
                    }}
                  >
                    Channels
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-84 rounded-lg border border-white/20 bg-black/95 p-1.5 shadow-2xl backdrop-blur-xl"
                >
                  <Command className="bg-transparent text-white">
                    <CommandInput
                      placeholder="Search channels..."
                      className="h-10 border-b border-white/10 bg-transparent px-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                    />
                    <CommandList className="max-h-96 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5">
                      <CommandEmpty className="py-6 text-center text-sm text-white/50">
                        No channels found.
                      </CommandEmpty>
                      {[...channels]
                        .slice()
                        .sort(
                          (a, b) =>
                            (Number(b.listeners) || 0) -
                            (Number(a.listeners) || 0),
                        )
                        .map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.title}
                            onSelect={async () => {
                              setSelected(c.id);
                              try {
                                await playSomaFMStream(
                                  `https://ice1.somafm.com/${c.id}-128-mp3`,
                                  c.id,
                                );
                              } catch {}
                            }}
                            className="group cursor-pointer rounded-md px-2! py-2! transition-all duration-200 hover:bg-white/10 focus:bg-white/10 data-[selected=true]:bg-blue-500/10"
                          >
                            <div className="flex w-full items-start gap-3">
                              {/* Logo */}
                              {c.image && (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={c.image}
                                  alt={c.title}
                                  className="mt-1 h-8 w-8 rounded border border-white/20 bg-white/10 object-contain shadow-lg transition-all group-hover:border-white/40"
                                  style={{ minWidth: 32, minHeight: 32 }}
                                  draggable={false}
                                />
                              )}
                              <div className="flex min-w-0 flex-1 flex-col">
                                {/* Title */}
                                <span className="truncate text-[13px] font-bold text-white transition-all group-hover:text-white/95">
                                  {c.title}
                                </span>
                                {/* Description (truncated) */}
                                {c.description && (
                                  <span
                                    className="truncate text-[12px] text-white/65 transition-colors group-hover:text-white/75"
                                    title={c.description}
                                    style={{ maxWidth: 220 }}
                                  >
                                    {c.description}
                                  </span>
                                )}
                                {/* Last playing */}
                                {c.lastPlaying && (
                                  <span
                                    className="truncate text-[11px] text-white/50 transition-colors group-hover:text-white/60"
                                    title={c.lastPlaying}
                                  >
                                    <span className="text-white/40">Last:</span>{" "}
                                    {c.lastPlaying}
                                  </span>
                                )}
                                {/* Genre */}
                                {c.genre && (
                                  <span
                                    className="truncate text-[11px] text-white/50 transition-colors group-hover:text-white/60"
                                    title={c.genre.replace(/\|/g, ", ")}
                                  >
                                    <span className="text-white/40">
                                      Genre:
                                    </span>{" "}
                                    {c.genre.replace(/\|/g, ", ")}
                                  </span>
                                )}
                              </div>
                              {/* Listeners */}
                              <span className="ml-2 flex min-w-9.5 flex-col items-end">
                                <span
                                  className="flex items-center gap-1 rounded bg-blue-500/10 px-2 py-1 text-[12px] font-bold text-white shadow-lg ring-1 ring-white/10 transition-all group-hover:bg-blue-500/20"
                                  title={`Listeners: ${c.listeners}`}
                                >
                                  <Users className="inline-block h-3.5 w-3.5" />
                                  {c.listeners}
                                </span>
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                    </CommandList>
                  </Command>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="ml-auto">
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
                    title="More options"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
              </div>
            </div>
            </div>
          </div>
        </div>
        <DropdownMenuContent align="end" sideOffset={6} className="min-w-40">
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
            onSelect={(e) => {
              e.preventDefault();
              setMoreMenuOpen(false);
              requestAnimationFrame(resetPosition);
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

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>About SomaFM Widget</DialogTitle>
            <DialogDescription className="mt-2 text-left">
              Stream your favorite SomaFM radio channels with real-time now
              playing information, channel details, and volume control.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-medium">{WIDGET_VERSION}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
