"use client";

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  calculateAutoArrangePositions,
  getSavedWidgetPosition,
  observeWidget,
  resetWidgetPosition,
  saveWidgetPosition,
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

const VOLUME_KEY = "widgetSomaFMVolume";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";

export default function WidgetDraggableSomaFM() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const positionRef = useRef(position);
  const [channels, setChannels] = useState<SomaFMChannel[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 0.5;
    const saved = localStorage.getItem(VOLUME_KEY);
    const parsed = Number(saved);
    if (Number.isFinite(parsed)) {
      if (parsed === 0) return 0.5;
      if (parsed > 100) return Math.min(1, Math.max(0, parsed / 100));
      return Math.min(1, Math.max(0, parsed / 100));
    }
    return 0.5;
  });
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

  // Load position on mount
  useEffect(() => {
    queueMicrotask(() => {
      const saved = getSavedWidgetPosition("somafm");
      const initial = saved ??
        calculateAutoArrangePositions()["somafm"] ?? { x: 0, y: 0 };
      setPosition(initial);
      positionRef.current = initial;
      if (containerRef.current)
        containerRef.current.style.transform = `translate(${initial.x}px, ${initial.y}px)`;
      setIsPositionLoaded(true);
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    observeWidget("somafm", el);
    return () => unobserveWidget("somafm");
  }, []);

  useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent<
        Record<string, { x: number; y: number }>
      >;
      const detail = customEvent.detail || {};
      if (Object.prototype.hasOwnProperty.call(detail, "somafm")) {
        const newPos = detail["somafm"];
        if (newPos) setPosition(newPos);
      } else if (Object.keys(detail).length > 1) {
        const newPos = detail["somafm"];
        if (newPos) setPosition(newPos);
      }
    };

    window.addEventListener("widget-positions-reset", handleReset);
    return () =>
      window.removeEventListener("widget-positions-reset", handleReset);
  }, []);

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      setIsDragging(true);
      dragStartRef.current = {
        x: clientX,
        y: clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX, e.clientY);
    },
    [handleDragStart],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    },
    [handleDragStart],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const next = {
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY,
      };
      positionRef.current = next;
      if (containerRef.current)
        containerRef.current.style.transform = `translate(${next.x}px, ${next.y}px)`;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;
      const next = {
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY,
      };
      positionRef.current = next;
      if (containerRef.current)
        containerRef.current.style.transform = `translate(${next.x}px, ${next.y}px)`;
    };

    const handleEnd = () => {
      setIsDragging(false);
      const pos = positionRef.current;
      setPosition(pos);
      saveWidgetPosition("somafm", pos.x, pos.y);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging]);

  const currentChannel = channels.find((c) => c.id === selected);
  // Use direct mp3 stream URL as per SomaFM docs
  const streamUrl = currentChannel?.id
    ? `https://ice1.somafm.com/${currentChannel.id}-128-mp3`
    : "";
  const isVisible = isPositionLoaded && visibility.somafm !== false;
  const visibleNowPlaying = selected ? nowPlaying : null;

  // Sync audio element volume and persist to localStorage when volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(VOLUME_KEY, Math.round(volume * 100).toString());
    } catch {
      /* ignore */
    }
  }, [volume]);

  // Ensure volume is applied whenever the stream URL changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [streamUrl, volume]);

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
    <DropdownMenu
      open={moreMenuOpen}
      onOpenChange={setMoreMenuOpen}
      modal={false}
    >
      <div
        ref={containerRef}
        data-widget-id="somafm"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        className={`pointer-events-auto absolute z-50 flex transform-gpu rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 backdrop-blur-md will-change-transform ${isDragging ? "shadow-none transition-none" : "transition-opacity duration-300"} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical "SomaFM" Label */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`flex items-center justify-center border-r border-white/10 px-1 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
            SomaFM
          </span>
        </div>

        {/* Main Column */}
        <div className="flex w-85 flex-col">
          {/* Player Row: Channel Art, Info, Play Button and Volume on right */}
          <div className="flex items-center gap-3 p-3">
            {/* Channel Art */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white/10">
              {visibleNowPlaying?.albumArt ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="pointer-events-none h-full w-full object-contain"
                  src={visibleNowPlaying.albumArt}
                  alt={
                    visibleNowPlaying.title || currentChannel?.title || "SomaFM"
                  }
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
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              {currentChannel && (
                <span
                  className="truncate text-xs font-semibold text-white/60"
                  title={currentChannel.title}
                >
                  {currentChannel.title}
                </span>
              )}
              {visibleNowPlaying && (
                <span
                  className="truncate text-sm font-medium text-white"
                  title={visibleNowPlaying.title}
                >
                  {visibleNowPlaying.title}
                </span>
              )}
              {visibleNowPlaying && (
                <span
                  className="truncate text-xs text-white/70"
                  title={`${visibleNowPlaying.artist}${visibleNowPlaying.album ? ` — ${visibleNowPlaying.album}` : ""}`}
                >
                  {visibleNowPlaying.artist}
                  {visibleNowPlaying.album
                    ? ` — ${visibleNowPlaying.album}`
                    : ""}
                </span>
              )}
            </div>

            {/* Play/Pause Button on right */}
            <button
              disabled={!streamUrl}
              onClick={() => {
                if (!audioRef.current) return;
                if (isPlaying) {
                  audioRef.current.pause();
                } else {
                  setIsLoading(true);
                  audioRef.current.play();
                }
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

          {currentChannel && (
            <div className="px-3 pb-3 text-xs text-white">
              {currentChannel.description && (
                <div
                  className="mt-1 overflow-hidden leading-snug text-white/70"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                  }}
                  title={currentChannel.description}
                >
                  {currentChannel.description}
                </div>
              )}
              <div className="mt-1 flex items-center gap-3 text-[10px] text-white/50">
                <span
                  className="flex items-center gap-1"
                  title={`DJ: ${currentChannel.dj}`}
                >
                  <User className="inline-block h-3 w-3" />
                  {currentChannel.dj}
                </span>
                <span className="opacity-50">•</span>
                <span
                  className="flex items-center gap-1"
                  title={`Listeners: ${currentChannel.listeners}`}
                >
                  <Users className="inline-block h-3 w-3" />
                  {currentChannel.listeners}
                </span>
                {currentChannel.genre && (
                  <>
                    <span className="opacity-50">•</span>
                    <span
                      className="flex items-center gap-1"
                      title={`Genre: ${currentChannel.genre.replace(/\|/g, ", ")}`}
                    >
                      <Music2 className="inline-block h-3 w-3" />
                      {currentChannel.genre.replace(/\|/g, ", ")}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Hidden audio element */}
          <>
            {streamUrl && (
              <audio
                ref={audioRef}
                src={streamUrl}
                preload="none"
                onPlay={() => {
                  setIsPlaying(true);
                  setIsLoading(false);
                  try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (typeof window !== "undefined" && (window as any).gtag) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (window as any).gtag("event", "page_view", {
                        page_title: `SomaFM: ${currentChannel?.title || selected}`,
                        page_location: window.location.href,
                        page_path: window.location.pathname,
                      });
                    }
                  } catch {
                    /* ignore */
                  }
                }}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onWaiting={() => setIsLoading(true)}
                onCanPlay={() => setIsLoading(false)}
                style={{ display: "none" }}
              />
            )}
          </>

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
                    const next = Math.min(1, Math.max(0, percent / 100));
                    setVolume(next);
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
                          onSelect={() => {
                            setSelected(c.id);
                            setTimeout(() => {
                              try {
                                if (audioRef.current) {
                                  audioRef.current.pause();
                                  audioRef.current.load();
                                  audioRef.current.play();
                                }
                              } catch {}
                            }, 0);
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
                                  <span className="text-white/40">Genre:</span>{" "}
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
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-40">
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            setMoreMenuOpen(false);
            setVisibility((prev) => ({ ...prev, somafm: false }));
            try {
              localStorage.setItem(
                WIDGET_VISIBILITY_KEY,
                JSON.stringify({ ...visibility, somafm: false }),
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
            requestAnimationFrame(() => {
              resetWidgetPosition("somafm");
            });
          }}
        >
          Reset widget position
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
