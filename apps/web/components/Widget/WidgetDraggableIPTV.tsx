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
  setWidgetMeasuredHeight,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
  WIDGET_POSITION_KEYS,
  type WidgetId,
} from "@/lib/widget-positions";
import Hls from "hls.js";
import { useAtom } from "jotai";
import {
  ChevronDown,
  Flag,
  Globe,
  Heart,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Pause,
  Play as PlayIcon,
  Tv,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
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
const groupedChannels = iptvChannels.reduce(
  (acc, channel) => {
    const category = channel.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(channel);
    return acc;
  },
  {} as Record<string, IPTVChannel[]>,
);

const sortedCategories = Object.keys(groupedChannels).sort();
const countries = [
  ...new Set(iptvChannels.map((c) => c.country).filter(Boolean)),
].sort() as string[];

// Storage keys
const SELECTED_CHANNEL_KEY = "widgetIPTVSelectedChannel";
const FAVORITE_CHANNELS_KEY = "widgetIPTVFavorites";
const VOLUME_KEY = "widgetIPTVVolume";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_VERSION = "1.0.0";

/* eslint-disable @next/next/no-img-element */
export default function WidgetDraggableIPTV() {
  const commandItemClass =
    "group cursor-pointer rounded-md px-2 py-1.5 text-white/80 transition-colors hover:bg-white/5 data-[highlighted=true]:bg-white/10 data-[highlighted=true]:text-white data-[selected=true]:bg-white/10 data-[selected=true]:text-white";

  const WIDGET_ID = "iptv";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [selectedChannel, setSelectedChannel] = useState<IPTVChannel | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  const hlsRef = useRef<Hls | null>(null);
  const shouldAutoPlayRef = useRef(false);
  const volumeRafRef = useRef<number | null>(null);
  const pendingVolumeRef = useRef<number | null>(null);
  const prevPlayerPointerRef = useRef<string | null>(null);

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

  // Initialize video / hls when channel changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedChannel) return;

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
      } catch {
        // ignore
      }
    } else {
      // Fallback: set src and hope for the best
      video.src = src;
    }

    // Autoplay if was playing before selection (set state asynchronously)
    if (shouldAutoPlayRef.current) {
      video.play().catch(() => {});
      requestAnimationFrame(() => setIsPlaying(true));
      shouldAutoPlayRef.current = false;
    } else {
      requestAnimationFrame(() => setIsPlaying(false));
    }

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
    };
  }, [selectedChannel]);

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
    });
  }, []);

  useEffect(() => {
    applyPlayerVolume(volume);
  }, [volume, applyPlayerVolume]);

  const selectChannel = useCallback(
    (channel: IPTVChannel) => {
      shouldAutoPlayRef.current = isPlaying;
      setIsPlaying(false);
      setSelectedChannel(channel);
      setChannelPickerOpen(false);
      try {
        localStorage.setItem(SELECTED_CHANNEL_KEY, channel.id);
      } catch {}
    },
    [isPlaying],
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (isPlaying) video.pause();
      else video.play();
    } catch {}
  }, [isPlaying]);

  const updateVolume = useCallback(
    (value: number) => {
      setVolume(value);
      applyPlayerVolume(value);
    },
    [applyPlayerVolume],
  );

  const handleVolumeCommit = useCallback((value: number) => {
    try {
      localStorage.setItem(VOLUME_KEY, String(value));
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

  const resetPosition = useCallback(() => {
    resetWidgetPosition(WIDGET_ID);
  }, []);

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

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    const webkitFs = (
      video as unknown as {
        webkitRequestFullscreen?: () => Promise<void> | void;
      }
    ).webkitRequestFullscreen;
    const msFs = (
      video as unknown as { msRequestFullscreen?: () => Promise<void> | void }
    ).msRequestFullscreen;
    const request = (video.requestFullscreen || webkitFs || msFs)?.bind(video);
    if (request) {
      Promise.resolve(request()).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

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
                  {selectedChannel && (
                    <DropdownMenuItem asChild className="cursor-pointer gap-2">
                      <Link href={`/tv/${selectedChannel.id}`}>
                        Open channel page
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="cursor-pointer gap-2">
                    <Link href="/apps/tv">Browse all channels</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setMoreMenuOpen(false);
                      requestAnimationFrame(() => {
                        resetPosition();
                      });
                    }}
                    className="cursor-pointer"
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

          {/* Main Column */}
          <div className="flex w-full flex-col">
            {/* Channel Header */}
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
              {/* Channel Logo */}
              {selectedChannel?.logo_url && (
                <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded bg-white/10">
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
              <Popover
                open={channelPickerOpen}
                onOpenChange={setChannelPickerOpen}
              >
                <PopoverTrigger asChild>
                  <button
                    className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 text-[10px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    title="Change channel"
                  >
                    <Tv className="h-3 w-3" />
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-96 rounded-lg border border-white/10 bg-[#0c0c10]/95 p-0 shadow-2xl backdrop-blur-xl"
                >
                  <Command className="border-0 bg-transparent text-white **:[[cmdk-input-wrapper]]:flex-1 **:[[cmdk-input-wrapper]]:border-0 **:[[cmdk-input-wrapper]]:px-0">
                    <div className="flex items-center gap-2 border-b border-white/10 p-2">
                      <CommandInput
                        placeholder="Search channels..."
                        className="h-8 flex-1 text-sm text-white placeholder:text-white/40"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border transition-colors ${countryFilter ? "border-purple-500/50 bg-purple-500/20 text-purple-400" : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"}`}
                            title="Filter by country"
                          >
                            <Globe className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          className="max-h-60 w-48 overflow-y-auto rounded-md border border-white/10 bg-black/95 p-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5"
                        >
                          <button
                            onClick={() => setCountryFilter(null)}
                            className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/10 ${!countryFilter ? "bg-purple-500/20 text-purple-400" : "text-white/70"}`}
                          >
                            All Countries
                          </button>
                          {countries.map((country) => (
                            <button
                              key={country}
                              onClick={() => setCountryFilter(country)}
                              className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/10 ${countryFilter === country ? "bg-purple-500/20 text-purple-400" : "text-white/70"}`}
                            >
                              <Flag className="h-3 w-3" />
                              {country}
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    </div>
                    <CommandList className="max-h-72 overflow-y-auto bg-transparent [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5">
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
                              className={commandItemClass}
                            >
                              <div className="flex w-full items-center gap-3">
                                {channel.logo_url && (
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/5 p-1">
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
                                className={commandItemClass}
                              >
                                <div className="flex w-full items-center gap-3">
                                  {channel.logo_url && (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/5 p-1">
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
                </PopoverContent>
              </Popover>
            </div>

            {/* Video Player Area */}
            <div
              ref={playerRef}
              className="relative aspect-video overflow-hidden bg-black"
            >
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
              />
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
                onClick={togglePlay}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" fill="currentColor" />
                ) : (
                  <PlayIcon className="h-4 w-4" fill="currentColor" />
                )}
              </button>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
                    title="Volume"
                  >
                    {volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : volume < 50 ? (
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
                    <span className="text-white/60">{volume}%</span>
                  </div>
                  <Slider
                    value={[volume]}
                    onValueChange={(v) => updateVolume(v[0] ?? volume)}
                    onValueCommit={(v) => handleVolumeCommit(v[0] ?? volume)}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                  />
                </PopoverContent>
              </Popover>

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

              <div className="flex-1" />

              <button
                onClick={toggleFullscreen}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-colors ${isFullscreen ? "border-purple-400/60 bg-purple-500/30 text-purple-400" : "border-white/10 bg-white/10 text-white hover:bg-white/20"}`}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
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
    </>
  );
}
