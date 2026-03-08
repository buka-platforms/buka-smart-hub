"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { iptv } from "@/data/iptv";
import { widgetVisibilityAtom } from "@/data/store";
import {
  startAudioVisualizationForSource,
  stopAudioVisualizationForSource,
} from "@/lib/audio-visualizer";
import {
  observeWidget,
  setWidgetMeasuredHeight,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
  WIDGET_POSITION_KEYS,
  type WidgetId,
} from "@/lib/widget-positions";
import Hls from "hls.js";
import { useAtom } from "jotai";
import { Heart, MoreHorizontal, Tv } from "lucide-react";
// Link import removed (unused)
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Basic IPTV channel shape
interface IPTVChannel {
  id: string;
  name: string;
  stream_url: string;
  logo_url?: string;
  category?: string;
  country?: string;
  language?: string;
  status?: string;
}

// Use iptv data
const iptvChannels = iptv as IPTVChannel[];

// Group channels by category
const groupedChannels = Object.fromEntries(
  Object.entries(
    iptvChannels.reduce(
      (acc, channel) => {
        const category = channel.category || "Other";
        if (!acc[category]) acc[category] = [];
        acc[category].push(channel);
        return acc;
      },
      {} as Record<string, IPTVChannel[]>,
    ),
  ).map(([category, channels]) => [
    category,
    [...channels].sort((a, b) => a.name.localeCompare(b.name)),
  ]),
) as Record<string, IPTVChannel[]>;

const sortedCategories = Object.keys(groupedChannels).sort();
const countries = [
  ...new Set(iptvChannels.map((c) => c.country).filter(Boolean)),
].sort() as string[];

// Storage keys
const SELECTED_CHANNEL_KEY = "widgetIPTVSelectedChannel";
const FAVORITE_CHANNELS_KEY = "widgetIPTVFavorites";
const VOLUME_KEY = "widgetIPTVVolume";
const QUALITY_KEY = "widgetIPTVQuality";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_VERSION = "1.0.0";

/* eslint-disable @next/next/no-img-element */
export default function WidgetDraggableIPTV() {
  const commandItemClass =
    "group cursor-pointer rounded-md px-2 py-1.5 text-white/80 transition-colors hover:bg-white/5 data-[highlighted=true]:bg-white/10 data-[highlighted=true]:text-white data-[selected=true]:bg-white/10 data-[selected=true]:text-white";
  const logoPlateClass =
    "overflow-hidden rounded-md border border-white/25 bg-gradient-to-br from-white to-zinc-200 shadow-[0_2px_10px_rgba(0,0,0,0.35)]";

  const WIDGET_ID = "iptv";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const jwElRef = useRef<HTMLDivElement | null>(null);
  type JWPlayerInstance = {
    remove?: () => void;
    on?: (event: string, cb: (...args: unknown[]) => void) => void;
    setVolume?: (v: number) => void;
    play?: () => void;
    pause?: () => void;
  };
  const jwInstanceRef = useRef<JWPlayerInstance | null>(null);
  const [jwLoaded, setJwLoaded] = useState(false);

  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [selectedChannel, setSelectedChannel] = useState<IPTVChannel | null>(
    null,
  );

  const [selectedQuality, setSelectedQuality] = useState<
    number | "auto" | null
  >(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  const channelListRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const shouldAutoPlayRef = useRef(false);
  const playIntentRef = useRef(false);
  const volumeRafRef = useRef<number | null>(null);
  const pendingVolumeRef = useRef<number | null>(null);
  const prevPlayerPointerRef = useRef<string | null>(null);

  const JW_KEY = process.env.NEXT_PUBLIC_JWPLAYER_KEY || "";

  const startIPTVVisualization = useCallback(() => {
    const mediaEl =
      videoRef.current ?? jwElRef.current?.querySelector("video") ?? null;
    if (!mediaEl) return;
    startAudioVisualizationForSource(mediaEl, "iptv");
  }, []);

  const stopIPTVVisualization = useCallback(() => {
    stopAudioVisualizationForSource("iptv");
  }, []);

  // Load JW Player script from public assets and set key when available
  useEffect(() => {
    try {
      const win = window as unknown as { jwplayer?: { key?: string } };
      if (win.jwplayer) {
        try {
          win.jwplayer.key = JW_KEY;
        } catch {}
        queueMicrotask(() => setJwLoaded(true));
        return;
      }
    } catch {}

    const src = "/assets/js/jwplayer.8.27.1.js";
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return;
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => {
      try {
        const win = window as unknown as { jwplayer?: { key?: string } };
        if (win.jwplayer) win.jwplayer.key = JW_KEY;
      } catch {}
      queueMicrotask(() =>
        setJwLoaded(
          Boolean((window as unknown as { jwplayer?: unknown }).jwplayer),
        ),
      );
    };
    document.body.appendChild(s);
    return () => {
      // keep script loaded for session; do not remove
    };
  }, [JW_KEY]);

  // Load saved state
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedId = localStorage.getItem(SELECTED_CHANNEL_KEY);
        if (savedId) {
          const ch = iptvChannels.find((c) => c.id === savedId);
          if (ch) setSelectedChannel(ch);
        }
        if (!savedId && iptvChannels.length > 0) {
          setSelectedChannel(iptvChannels[0]);
        }
        const savedFavorites = localStorage.getItem(FAVORITE_CHANNELS_KEY);
        if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
        const savedVolume = localStorage.getItem(VOLUME_KEY);
        if (savedVolume) setVolume(Number(savedVolume));
        const savedQuality = localStorage.getItem(QUALITY_KEY);
        if (savedQuality) {
          if (savedQuality === "auto") setSelectedQuality("auto");
          else setSelectedQuality(Number(savedQuality));
        }
      } catch {
        /* ignore */
      }
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => setIsPositionLoaded(true));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    observeWidget(WIDGET_ID, el);
    try {
      triggerLayoutUpdate();
    } catch {
      // ignore
    }
    return () => unobserveWidget(WIDGET_ID);
  }, []);

  useEffect(() => {
    const handleReset = () => {};
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
    if (
      source &&
      source !== WIDGET_ID &&
      Object.prototype.hasOwnProperty.call(WIDGET_POSITION_KEYS, source)
    ) {
      swapWidgetPositions(source as WidgetId, WIDGET_ID as WidgetId);
    }
  }, []);

  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;
    if (isDragging) {
      prevPlayerPointerRef.current = el.style.pointerEvents ?? null;
      el.style.pointerEvents = "none";
    } else {
      if (prevPlayerPointerRef.current !== null)
        el.style.pointerEvents = prevPlayerPointerRef.current;
      else el.style.pointerEvents = "";
      prevPlayerPointerRef.current = null;
    }
  }, [isDragging]);

  // Initialize video / hls or JW Player when channel changes
  useEffect(() => {
    if (!selectedChannel) return;
    queueMicrotask(() => setIsLoading(shouldAutoPlayRef.current));
    queueMicrotask(() => setHasRenderedFrame(false));

    // If JW Player is loaded, prefer using it
    const winAny = window as unknown as { jwplayer?: unknown };
    if (jwLoaded && winAny.jwplayer) {
      // cleanup any existing HLS instance
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }

      // remove previous jw instance (call remove only if available)
      if (
        jwInstanceRef.current &&
        typeof jwInstanceRef.current.remove === "function"
      ) {
        try {
          jwInstanceRef.current.remove();
        } catch {}
      }
      jwInstanceRef.current = null;

      try {
        const container = jwElRef.current ?? undefined;
        if (container) {
          const setupConfig: Record<string, unknown> = {
            file: selectedChannel.stream_url,
            width: "100%",
            height: "100%",
            autostart: shouldAutoPlayRef.current || false,
            controls: true,
            // show channel logo as poster/frame when available
            image: selectedChannel.logo_url ?? undefined,
            skin: {
              name: "seven",
            },
          };

          const win = window as unknown as {
            jwplayer?: (container?: unknown) => {
              setup?: (cfg?: unknown) => JWPlayerInstance;
            };
          };
          let instance: JWPlayerInstance | undefined;
          if (typeof win.jwplayer === "function") {
            const creator = win.jwplayer as (container?: unknown) => {
              setup?: (cfg?: unknown) => JWPlayerInstance;
            };
            const created = creator(container);
            instance = created?.setup ? created.setup(setupConfig) : undefined;
          }
          jwInstanceRef.current = instance ?? null;

          if (instance && instance.on) {
            instance.on("ready", () => {
              try {
                // Keep loading state while auto-play is pending; clear only once
                // actual playback starts (play event).
                if (!shouldAutoPlayRef.current) {
                  queueMicrotask(() => setIsLoading(false));
                }
                if (instance.setVolume) instance.setVolume(volume);
                if (shouldAutoPlayRef.current) {
                  if (instance.play) instance.play();
                  shouldAutoPlayRef.current = false;
                }
              } catch {}
            });
            instance.on("play", () => {
              playIntentRef.current = true;
              setIsPlaying(true);
              setIsLoading(false);
              startIPTVVisualization();
            });
            instance.on("pause", () => {
              setIsPlaying(false);
              setIsLoading(playIntentRef.current);
              stopIPTVVisualization();
            });
            instance.on("buffer", () =>
              queueMicrotask(() => setIsLoading(true)),
            );
            instance.on("firstFrame", () => {
              setHasRenderedFrame(true);
              setIsLoading(false);
            });
            instance.on("error", () => {
              playIntentRef.current = false;
              queueMicrotask(() => setIsLoading(false));
              stopIPTVVisualization();
            });
          }
        }
      } catch {
        playIntentRef.current = false;
        queueMicrotask(() => setIsLoading(false));
      }

      return () => {
        stopIPTVVisualization();
        if (
          jwInstanceRef.current &&
          typeof jwInstanceRef.current.remove === "function"
        ) {
          try {
            jwInstanceRef.current.remove();
          } catch {}
        }
        jwInstanceRef.current = null;
      };
    }

    // JW not available — fallback to existing HLS flow
    const video = videoRef.current;
    if (!video) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }

    // Clean up previous hls
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    const src = selectedChannel.stream_url;
    // Prefer native HLS where supported
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      try {
        hls.loadSource(src);
        hls.attachMedia(video);
        // expose available quality levels and track switches
        const onLevelsUpdated = () => {
          try {
            const levels = hls.levels ?? [];
            // levels are available on the Hls instance via hls.levels

            try {
              const saved = localStorage.getItem(QUALITY_KEY);
              if (saved) {
                if (saved === "auto") {
                  hls.currentLevel = -1;
                  setSelectedQuality("auto");
                } else {
                  const n = Number(saved);
                  if (!Number.isNaN(n) && n >= 0 && n < levels.length) {
                    hls.currentLevel = n;
                    setSelectedQuality(n);
                  }
                }
                return;
              }
            } catch {}

            if (levels.length > 0 && selectedQuality === null) {
              hls.currentLevel = -1;
              setSelectedQuality("auto");
            }
          } catch {}
        };

        const onLevelSwitched = (_ev: unknown, data: unknown) => {
          try {
            const level = (data as { level?: number } | null)?.level;
            setSelectedQuality(typeof level === "number" ? level : null);
          } catch {}
        };

        onLevelsUpdated();
        hls.on(Hls.Events.LEVELS_UPDATED, onLevelsUpdated);
        hls.on(Hls.Events.LEVEL_SWITCHED, onLevelSwitched);
      } catch {}
    } else {
      video.src = src;
    }

    if (shouldAutoPlayRef.current) {
      playIntentRef.current = true;
      video.play().catch(() => {
        playIntentRef.current = false;
        setIsLoading(false);
      });
      shouldAutoPlayRef.current = false;
    } else {
      requestAnimationFrame(() => setIsPlaying(false));
    }

    const onPlay = () => {
      playIntentRef.current = true;
      setIsPlaying(true);
      setIsLoading(false);
      startIPTVVisualization();
    };
    const onPause = () => {
      setIsPlaying(false);
      setIsLoading(playIntentRef.current);
      stopIPTVVisualization();
    };
    const onCanPlay = () => setIsLoading(false);
    const onLoadedData = () => {
      setHasRenderedFrame(true);
      setIsLoading(false);
    };
    const onPlaying = () => {
      if (video.readyState >= 2) setHasRenderedFrame(true);
      setIsLoading(false);
    };
    const onWaiting = () => setIsLoading(true);
    const onStalled = () => setIsLoading(true);
    const onError = () => {
      playIntentRef.current = false;
      setIsLoading(false);
      setHasRenderedFrame(false);
      stopIPTVVisualization();
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("error", onError);

    return () => {
      stopIPTVVisualization();
      try {
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("stalled", onStalled);
        video.removeEventListener("error", onError);
      } catch {}
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
    };
  }, [
    selectedChannel,
    jwLoaded,
    selectedQuality,
    volume,
    startIPTVVisualization,
    stopIPTVVisualization,
  ]);

  // measure height
  useEffect(() => {
    if (!containerRef.current) return;
    const raf = requestAnimationFrame(() => {
      setTimeout(() => {
        const h = containerRef.current?.getBoundingClientRect().height ?? 0;
        if (h > 0) setWidgetMeasuredHeight(WIDGET_ID, h);
      }, 80);
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedChannel, isPositionLoaded, isPlaying]);

  const applyPlayerVolume = useCallback((nextVolume: number) => {
    pendingVolumeRef.current = nextVolume;
    if (volumeRafRef.current !== null) return;
    volumeRafRef.current = requestAnimationFrame(() => {
      volumeRafRef.current = null;
      const video = videoRef.current;
      const pending = pendingVolumeRef.current;
      pendingVolumeRef.current = null;
      if (!video || pending === null) return;
      const v = Math.max(0, Math.min(100, pending));
      video.volume = v / 100;
      video.muted = v <= 0;
      // Apply to JW Player instance if present
      try {
        const inst = jwInstanceRef.current;
        if (inst && inst.setVolume) inst.setVolume(v);
      } catch {}
    });
  }, []);

  useEffect(() => {
    applyPlayerVolume(volume);
  }, [volume, applyPlayerVolume]);

  const selectChannel = useCallback((channel: IPTVChannel) => {
    // Channel selection is an explicit user action; always autoplay next stream.
    // Relying on transient `isPlaying` can fail during buffering and leave only poster/frame.
    shouldAutoPlayRef.current = true;
    playIntentRef.current = true;
    setIsPlaying(false);
    setIsLoading(true);
    setHasRenderedFrame(false);
    setSelectedChannel(channel);
    setChannelPickerOpen(false);
    try {
      localStorage.setItem(SELECTED_CHANNEL_KEY, channel.id);
    } catch {}
  }, []);

  const toggleFavorite = useCallback(() => {
    if (!selectedChannel) return;
    setFavorites((prev) => {
      const newFavorites = prev.includes(selectedChannel.id)
        ? prev.filter((s) => s !== selectedChannel.id)
        : [...prev, selectedChannel.id];
      try {
        localStorage.setItem(
          FAVORITE_CHANNELS_KEY,
          JSON.stringify(newFavorites),
        );
      } catch {}
      return newFavorites;
    });
  }, [selectedChannel]);

  const filteredChannels = useMemo(() => {
    if (!countryFilter) return groupedChannels;
    const filtered: Record<string, IPTVChannel[]> = {};
    for (const [category, channels] of Object.entries(groupedChannels)) {
      const categoryChannels = channels.filter(
        (c) => c.country === countryFilter,
      );
      if (categoryChannels.length > 0) filtered[category] = categoryChannels;
    }
    return filtered;
  }, [countryFilter]);

  const favoriteChannels = useMemo(
    () => iptvChannels.filter((c) => favorites.includes(c.id)),
    [favorites],
  );

  // When channel picker opens, jump to the current selected channel.
  useEffect(() => {
    if (!channelPickerOpen) return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const listEl = channelListRef.current;
        if (!listEl) return;
        const active = listEl.querySelector<HTMLElement>(
          '[data-current-channel="true"]',
        );
        active?.scrollIntoView({ block: "center" });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [channelPickerOpen, selectedChannel?.id, countryFilter, favorites]);

  const isFavorite = selectedChannel
    ? favorites.includes(selectedChannel.id)
    : false;
  const isVisible = isPositionLoaded && visibility[WIDGET_ID] !== false;
  return (
    <>
      <div
        ref={containerRef}
        data-widget-id={WIDGET_ID}
        className={`pointer-events-auto flex rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 ${isDragging ? "shadow-none transition-none" : "transition-opacity duration-300"} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div className="relative flex w-full flex-col">
          {/* Top Title - Drag Handle */}
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`flex h-8 w-full cursor-move items-center gap-2 border-b border-white/10 px-3 select-none ${isDragging ? "opacity-60" : "opacity-100"}`}
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
                  >
                    <MoreHorizontal className="h-2.5 w-2.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="min-w-44"
                >
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      setMoreMenuOpen(false);
                      setVisibility((prev) => ({
                        ...prev,
                        [WIDGET_ID]: false,
                      }));
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
                    onSelect={toggleFavorite}
                    className="cursor-pointer gap-2"
                  >
                    {isFavorite ? "Remove from favorites" : "Add to favorites"}
                  </DropdownMenuItem>
                  {selectedChannel && <></>}
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

          {/* Main Column */}
          <div className="flex w-full flex-col">
            {/* Channel Header */}
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
              {/* Channel Logo */}
              {selectedChannel?.logo_url && (
                <div
                  className={`relative h-6 w-6 shrink-0 ${logoPlateClass} p-0.5`}
                >
                  <img
                    src={selectedChannel.logo_url}
                    alt={selectedChannel.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    draggable={false}
                  />
                </div>
              )}

              {/* Channel Info */}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-semibold text-white">
                  {selectedChannel?.name || "Select Channel"}
                </span>
                <span className="truncate text-[10px] text-white/50">
                  {selectedChannel?.country} • {selectedChannel?.category}
                </span>
              </div>

              {/* Live Badge */}
              <div className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-[10px] font-bold text-red-400 uppercase">
                  Live
                </span>
              </div>

              {/* Channel Picker */}
              <button
                onClick={() => setChannelPickerOpen(true)}
                className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 text-[10px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                title="Change channel"
              >
                <Tv className="h-3 w-3" />
              </button>
            </div>

            {/* Video Player Area */}
            <div
              ref={playerRef}
              data-loading={isLoading ? "true" : "false"}
              data-first-frame={hasRenderedFrame ? "true" : "false"}
              className="relative aspect-video overflow-hidden bg-black"
            >
              {jwLoaded ? (
                <div ref={jwElRef} className="h-full w-full" />
              ) : (
                <video
                  ref={videoRef}
                  poster={selectedChannel?.logo_url ?? undefined}
                  className={`h-full w-full ${isPlaying ? "object-cover" : "object-contain"}`}
                  playsInline
                />
              )}
              {!selectedChannel && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-white/50">
                    <Tv className="h-10 w-10" />
                    <span className="text-xs">Select a channel to watch</span>
                  </div>
                </div>
              )}
            </div>

            {/* Player Controls */}
            <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
              <button
                onClick={toggleFavorite}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-colors ${isFavorite ? "border-pink-400/60 bg-pink-500/30 text-pink-400" : "border-white/10 bg-white/10 text-white hover:bg-white/20"}`}
                title={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                <Heart
                  className="h-3.5 w-3.5"
                  fill={isFavorite ? "currentColor" : "none"}
                />
              </button>

              {/* Details button removed */}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>About IPTV Widget</DialogTitle>
            <DialogDescription className="mt-2 text-left">
              Watch IPTV streams (HLS) with favorites, volume control, and
              fullscreen support. Browse channels by category or country.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-medium">{WIDGET_VERSION}</span>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={channelPickerOpen} onOpenChange={setChannelPickerOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl border-white/10 bg-[#0c0c10]/95 p-0 text-white shadow-2xl backdrop-blur-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Select IPTV channel</DialogTitle>
            <DialogDescription>
              Search and choose a live IPTV channel.
            </DialogDescription>
          </DialogHeader>
          <Command className="border-0 bg-transparent text-white **:[[cmdk-input-wrapper]]:flex-1 **:[[cmdk-input-wrapper]]:border-0 **:[[cmdk-input-wrapper]]:px-0">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-2 pr-10">
              <CommandInput
                placeholder="Search channels..."
                className="h-9 min-w-52 flex-1 text-sm text-white placeholder:text-white/40"
              />
              <Select
                value={countryFilter ?? "all"}
                onValueChange={(value) =>
                  setCountryFilter(value === "all" ? null : value)
                }
              >
                <SelectTrigger
                  aria-label="Filter by country"
                  className="h-9 w-auto max-w-44 min-w-32 cursor-pointer gap-2 border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10 focus:ring-0"
                >
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent className="max-h-72 border-white/10 bg-[#121218] text-white">
                  <SelectItem
                    value="all"
                    className="cursor-pointer focus:bg-white/10 focus:text-white"
                  >
                    All countries
                  </SelectItem>
                  {countries.map((country) => (
                    <SelectItem
                      key={country}
                      value={country}
                      className="cursor-pointer focus:bg-white/10 focus:text-white"
                    >
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CommandList
              ref={channelListRef}
              className="max-h-[min(70vh,32rem)] overflow-y-auto bg-transparent [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5"
            >
              <CommandEmpty className="px-3 py-2 text-xs text-white/60">
                No channels found.
              </CommandEmpty>

              {favoriteChannels.length > 0 && (
                <CommandGroup
                  heading={
                    <span className="text-[10px] font-semibold tracking-wide text-white/50 uppercase">
                      Favorites
                    </span>
                  }
                >
                  {favoriteChannels.map((channel) => (
                    <CommandItem
                      key={channel.id}
                      value={`${channel.id}`}
                      onSelect={() => selectChannel(channel)}
                      data-current-channel={
                        channel.id === selectedChannel?.id ? "true" : undefined
                      }
                      className={`${commandItemClass} ${
                        channel.id === selectedChannel?.id
                          ? "bg-white/10 text-white"
                          : ""
                      }`}
                    >
                      <div className="flex w-full items-center gap-3">
                        {channel.logo_url && (
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center ${logoPlateClass} p-1`}
                          >
                            <img
                              src={channel.logo_url}
                              alt={channel.name}
                              className="h-full w-full object-contain"
                              draggable={false}
                            />
                          </div>
                        )}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[13px] font-medium text-white">
                            {channel.name}
                          </span>
                          <span className="truncate text-[11px] text-white/50">
                            {channel.country}
                          </span>
                        </div>
                        <Heart
                          className="h-3.5 w-3.5 text-pink-400"
                          fill="currentColor"
                        />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {sortedCategories.map((category) => {
                const channels = filteredChannels[category];
                if (!channels || channels.length === 0) return null;
                return (
                  <CommandGroup
                    key={category}
                    heading={
                      <span className="text-[10px] font-semibold tracking-wide text-white/50 uppercase">
                        {category}
                      </span>
                    }
                  >
                    {channels.map((channel) => (
                      <CommandItem
                        key={channel.id}
                        value={`${channel.id}`}
                        onSelect={() => selectChannel(channel)}
                        data-current-channel={
                          channel.id === selectedChannel?.id
                            ? "true"
                            : undefined
                        }
                        className={`${commandItemClass} ${
                          channel.id === selectedChannel?.id
                            ? "bg-white/10 text-white"
                            : ""
                        }`}
                      >
                        <div className="flex w-full items-center gap-3">
                          {channel.logo_url && (
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center ${logoPlateClass} p-1`}
                            >
                              <img
                                src={channel.logo_url}
                                alt={channel.name}
                                className="h-full w-full object-contain"
                                draggable={false}
                              />
                            </div>
                          )}
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-[13px] font-medium text-white">
                              {channel.name}
                            </span>
                            <span className="truncate text-[11px] text-white/50">
                              {channel.country}
                            </span>
                          </div>
                          {favorites.includes(channel.id) && (
                            <Heart
                              className="h-3.5 w-3.5 text-pink-400"
                              fill="currentColor"
                            />
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
