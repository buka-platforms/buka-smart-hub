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
import { widgetVisibilityAtom } from "@/data/store";
import { tv } from "@/data/tv";
import type { TVChannel } from "@/data/type";
import {
  getSavedWidgetPosition,
  observeWidget,
  resetWidgetPosition,
  setWidgetMeasuredHeight,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
} from "@/lib/widget-positions";
import { useAtom } from "jotai";
import {
  ChevronDown,
  ExternalLink,
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

// containerRef = draggable wrapper; playerRef = inner video container

// Filter only YouTube-based channels for the widget
const youtubeChannels = (tv as TVChannel[]).filter(
  (channel) => channel.source === "YouTube",
);

// Group channels by category
const groupedChannels = youtubeChannels.reduce(
  (acc, channel) => {
    const category = channel.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(channel);
    return acc;
  },
  {} as Record<string, TVChannel[]>,
);

// Sort categories alphabetically
const sortedCategories = Object.keys(groupedChannels).sort();

// Get unique countries for filtering
const countries = [...new Set(youtubeChannels.map((c) => c.country))].sort();

// Storage keys
const SELECTED_CHANNEL_KEY = "widgetYouTubeLiveTVSelectedChannel";
const FAVORITE_CHANNELS_KEY = "widgetYouTubeLiveTVFavorites";
const VOLUME_KEY = "widgetYouTubeLiveTVVolume";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_VERSION = "1.0.0";

/* eslint-disable @next/next/no-img-element */
export default function WidgetDraggableYouTubeLiveTV() {
  // Shared styles for command palette items to keep dark theme consistent
  const commandItemClass =
    "group cursor-pointer rounded-md px-2 py-1.5 text-white/80 transition-colors hover:bg-white/5 data-[highlighted=true]:bg-white/10 data-[highlighted=true]:text-white data-[selected=true]:bg-white/10 data-[selected=true]:text-white";

  const WIDGET_ID = "youtubelivetv";
  const containerRef = useRef<HTMLDivElement>(null); // wrapper
  const playerRef = useRef<HTMLDivElement>(null); // player container

  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Player state
  const [selectedChannel, setSelectedChannel] = useState<TVChannel | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  // YouTube Player API
  const playerInstanceRef = useRef<YTPlayer | null>(null);
  const shouldAutoPlayRef = useRef(false);
  const volumeRafRef = useRef<number | null>(null);
  const pendingVolumeRef = useRef<number | null>(null);
  const prevPlayerPointerRef = useRef<string | null>(null);

  // Load saved state on mount
  useEffect(() => {
    queueMicrotask(() => {
      // Load selected channel
      try {
        const savedChannelSlug = localStorage.getItem(SELECTED_CHANNEL_KEY);
        if (savedChannelSlug) {
          const channel = youtubeChannels.find(
            (c) => c.slug === savedChannelSlug,
          );
          if (channel) setSelectedChannel(channel);
        }
        if (!savedChannelSlug) {
          // Default to first news channel
          const defaultChannel =
            youtubeChannels.find((c) => c.category === "News") ||
            youtubeChannels[0];
          if (defaultChannel) setSelectedChannel(defaultChannel);
        }

        // Load favorites
        const savedFavorites = localStorage.getItem(FAVORITE_CHANNELS_KEY);
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites));
        }

        // Load volume
        const savedVolume = localStorage.getItem(VOLUME_KEY);
        if (savedVolume) setVolume(Number(savedVolume));
      } catch {
        // Ignore
      }
    });
  }, []);

  // Mark position loaded after mount (layout system will place widgets)
  useEffect(() => {
    queueMicrotask(() => setIsPositionLoaded(true));
  }, []);

  // Observe wrapper for layout adjustments
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

  // Listen for global reset events
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

  // Drag/drop handlers (swap behavior)
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

  // Disable pointer events on the embedded player while dragging so iframe doesn't intercept events
  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;
    if (isDragging) {
      prevPlayerPointerRef.current = el.style.pointerEvents ?? null;
      el.style.pointerEvents = "none";
    } else {
      // restore previous value (or empty string)
      if (prevPlayerPointerRef.current !== null)
        el.style.pointerEvents = prevPlayerPointerRef.current;
      else el.style.pointerEvents = "";
      prevPlayerPointerRef.current = null;
    }
  }, [isDragging]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      queueMicrotask(() => setIsPlayerReady(true));
      return;
    }

    // Load YouTube IFrame API
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;

    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // YouTube API callback
    (
      window as unknown as { onYouTubeIframeAPIReady: () => void }
    ).onYouTubeIframeAPIReady = () => {
      queueMicrotask(() => setIsPlayerReady(true));
    };
  }, []);

  // Store refs for initial player setup (doesn't need to trigger re-render)
  const initialVolumeRef = useRef(volume);
  const initialMutedRef = useRef(volume === 0);

  // Update refs when values change
  useEffect(() => {
    initialVolumeRef.current = volume;
    initialMutedRef.current = volume === 0;
  }, [volume]);

  // Track fullscreen state
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Initialize YouTube player when API is ready and channel is selected
  useEffect(() => {
    if (!isPlayerReady || !selectedChannel || !playerRef.current) return;

    // Clean up existing player
    if (playerInstanceRef.current) {
      try {
        playerInstanceRef.current.destroy();
      } catch {
        // Ignore
      }
      playerInstanceRef.current = null;
    }

    // Create player container if needed
    const playerId = "yt-live-tv-player";
    let playerContainer = document.getElementById(playerId);

    if (!playerContainer) {
      playerContainer = document.createElement("div");
      playerContainer.id = playerId;
      playerRef.current.appendChild(playerContainer);
    }

    // Capture current values from refs
    const currentVolume = initialVolumeRef.current;
    const currentMuted = initialMutedRef.current;

    // Create new player
    playerInstanceRef.current = new window.YT.Player(playerId, {
      videoId: selectedChannel.source_id,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 0,
        mute: currentMuted ? 1 : 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        playsinline: 1,
        enablejsapi: 1,
        origin: typeof window !== "undefined" ? window.location.origin : "",
      },
      events: {
        onReady: (event: YTPlayerEvent) => {
          event.target.setVolume(currentVolume);
          if (currentMuted) event.target.mute();
          else event.target.unMute();

          if (shouldAutoPlayRef.current) {
            try {
              event.target.playVideo();
            } catch {
              // Ignore play errors
            }
            shouldAutoPlayRef.current = false;
            setIsPlaying(true);
          } else {
            setIsPlaying(false);
          }
        },
        onStateChange: (event: YTOnStateChangeEvent) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (typeof window !== "undefined" && (window as any).gtag) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).gtag("event", "page_view", {
                  page_title: `Live TV: ${selectedChannel?.name || selectedChannel?.slug}`,
                  page_location: window.location.href,
                  page_path: window.location.pathname,
                });
              }
            } catch {
              /* ignore */
            }
          } else if (
            event.data === window.YT.PlayerState.PAUSED ||
            event.data === window.YT.PlayerState.ENDED
          ) {
            setIsPlaying(false);
          }
        },
      },
    });

    // Cleanup
    return () => {
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.destroy();
        } catch {
          // Ignore
        }
        playerInstanceRef.current = null;
      }
    };
  }, [isPlayerReady, selectedChannel]);

  // Measure widget after player/channel changes to ensure height is accurate
  useEffect(() => {
    if (!containerRef.current) return;
    const raf = requestAnimationFrame(() => {
      setTimeout(() => {
        const h = containerRef.current?.getBoundingClientRect().height ?? 0;
        if (h > 0) setWidgetMeasuredHeight(WIDGET_ID, h);
      }, 80);
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedChannel, isPlayerReady, isPositionLoaded, isPlaying]);

  // Apply volume/mute to the iframe player with rAF batching to reduce per-tick work
  const applyPlayerVolume = useCallback((nextVolume: number) => {
    pendingVolumeRef.current = nextVolume;

    if (volumeRafRef.current !== null) return;

    volumeRafRef.current = requestAnimationFrame(() => {
      volumeRafRef.current = null;
      const player = playerInstanceRef.current;
      const pendingVolume = pendingVolumeRef.current;
      pendingVolumeRef.current = null;

      if (!player || pendingVolume === null) return;
      const shouldMute = pendingVolume <= 0;
      try {
        player.setVolume(pendingVolume);
        if (shouldMute) player.mute();
        else player.unMute();
      } catch {
        // Ignore player errors
      }
    });
  }, []);

  // Sync volume/mute with player (reactive)
  useEffect(() => {
    applyPlayerVolume(volume);
  }, [volume, applyPlayerVolume]);

  // Handle channel selection
  const selectChannel = useCallback(
    (channel: TVChannel) => {
      shouldAutoPlayRef.current = isPlaying;
      setIsPlaying(false);
      setSelectedChannel(channel);
      setChannelPickerOpen(false);
      try {
        localStorage.setItem(SELECTED_CHANNEL_KEY, channel.slug);
      } catch {
        // Ignore
      }
    },
    [isPlaying],
  );

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!playerInstanceRef.current) return;
    try {
      if (isPlaying) {
        playerInstanceRef.current.pauseVideo();
      } else {
        playerInstanceRef.current.playVideo();
      }
    } catch {
      // Ignore
    }
  }, [isPlaying]);

  // Update volume
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
    } catch {
      // Ignore
    }
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback(() => {
    if (!selectedChannel) return;
    setFavorites((prev) => {
      const newFavorites = prev.includes(selectedChannel.slug)
        ? prev.filter((s) => s !== selectedChannel.slug)
        : [...prev, selectedChannel.slug];
      try {
        localStorage.setItem(
          FAVORITE_CHANNELS_KEY,
          JSON.stringify(newFavorites),
        );
      } catch {
        // Ignore
      }
      return newFavorites;
    });
  }, [selectedChannel]);

  // Reset position using centralized auto-arrange logic
  const resetPosition = useCallback(() => {
    resetWidgetPosition(WIDGET_ID);
  }, []);

  // Filtered channels
  const filteredChannels = useMemo(() => {
    if (!countryFilter) return groupedChannels;
    const filtered: Record<string, TVChannel[]> = {};
    for (const [category, channels] of Object.entries(groupedChannels)) {
      const categoryChannels = channels.filter(
        (c) => c.country === countryFilter,
      );
      if (categoryChannels.length > 0) {
        filtered[category] = categoryChannels;
      }
    }
    return filtered;
  }, [countryFilter]);

  // Favorite channels for quick access
  const favoriteChannels = useMemo(
    () => youtubeChannels.filter((c) => favorites.includes(c.slug)),
    [favorites],
  );

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const iframe =
      (
        playerInstanceRef.current as unknown as {
          getIframe?: () => HTMLIFrameElement;
        }
      )?.getIframe?.() || playerRef.current?.querySelector("iframe");
    if (!iframe) return;

    const element: HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    } = iframe;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }

    const request =
      element.requestFullscreen ||
      element.webkitRequestFullscreen ||
      element.msRequestFullscreen;
    if (request) {
      Promise.resolve(request.call(element)).catch(() => {});
    }
  }, []);

  const isFavorite = selectedChannel
    ? favorites.includes(selectedChannel.slug)
    : false;
  const isVisible = isPositionLoaded && visibility[WIDGET_ID] !== false;

  return (
    <DropdownMenu
      open={moreMenuOpen}
      onOpenChange={setMoreMenuOpen}
      modal={false}
    >
      <div
        ref={containerRef}
        data-widget-id={WIDGET_ID}
        className={`pointer-events-auto flex transform-gpu rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 backdrop-blur-md will-change-transform ${isDragging ? "shadow-none" : "transition-opacity duration-300"} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical "Live TV" Label - drag handle */}
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex items-center justify-center border-r border-white/10 px-1 transition-colors select-none hover:bg-white/5 ${isDragging ? "opacity-60" : "opacity-100"}`}
        >
          <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
            YouTube Live TV
          </span>
        </div>

        {/* Main Column */}
        <div className="flex w-85 flex-col">
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
                    {/* Country Filter */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border transition-colors ${
                            countryFilter
                              ? "border-purple-500/50 bg-purple-500/20 text-purple-400"
                              : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                          }`}
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
                          className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/10 ${
                            !countryFilter
                              ? "bg-purple-500/20 text-purple-400"
                              : "text-white/70"
                          }`}
                        >
                          All Countries
                        </button>
                        {countries.map((country) => (
                          <button
                            key={country}
                            onClick={() => setCountryFilter(country)}
                            className={`flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/10 ${
                              countryFilter === country
                                ? "bg-purple-500/20 text-purple-400"
                                : "text-white/70"
                            }`}
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

                    {/* Favorites Section */}
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
                            // value={`${channel.name} ${channel.country}`}
                            value={`${channel.slug}`}
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

                    {/* Categorized Channels */}
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
                              // value={`${channel.name} ${channel.country} ${channel.category}`}
                              value={`${channel.slug}`}
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
                                {favorites.includes(channel.slug) && (
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
            {/* Gradient overlay for controls visibility */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-linear-to-t from-black/80 to-transparent" />

            {/* Loading state */}
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
            {/* Play/Pause */}
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

            {/* Volume */}
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

            {/* Favorite */}
            <button
              onClick={toggleFavorite}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                isFavorite
                  ? "border-pink-400/60 bg-pink-500/30 text-pink-400"
                  : "border-white/10 bg-white/10 text-white hover:bg-white/20"
              }`}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart
                className="h-3.5 w-3.5"
                fill={isFavorite ? "currentColor" : "none"}
              />
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                isFullscreen
                  ? "border-purple-400/60 bg-purple-500/30 text-purple-400"
                  : "border-white/10 bg-white/10 text-white hover:bg-white/20"
              }`}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Channel Page Link */}
            {selectedChannel && (
              <Link
                href={`/tv/${selectedChannel.slug}`}
                className="flex h-8 items-center justify-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
                title="Open channel page"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">Details</span>
              </Link>
            )}

            {/* More Options */}
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
                title="More options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
          </div>
        </div>
      </div>

      {/* Dropdown Menu */}
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-44">
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
          onSelect={toggleFavorite}
          className="cursor-pointer gap-2"
        >
          {isFavorite ? "Remove from favorites" : "Add to favorites"}
        </DropdownMenuItem>
        {selectedChannel && (
          <DropdownMenuItem asChild className="cursor-pointer gap-2">
            <Link href={`/tv/${selectedChannel.slug}`}>Open channel page</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="cursor-pointer gap-2">
          <Link href="/apps/tv">Browse all channels</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setMoreMenuOpen(false);
            // Delay reset until after dropdown closes to avoid scroll jump
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

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>About YouTube Live TV Widget</DialogTitle>
            <DialogDescription className="mt-2 text-left">
              Watch live YouTube TV channels with favorites, volume control, and
              fullscreen support. Browse channels by category or country.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-medium">{WIDGET_VERSION}</span>
          </div>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}

// YouTube IFrame API types
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  getVolume(): number;
  destroy(): void;
  loadVideoById(videoId: string): void;
  // Non-standard helper present on the iframe API instance
  getIframe?: () => HTMLIFrameElement;
}

interface YTPlayerEvent {
  target: YTPlayer;
}

interface YTOnStateChangeEvent {
  target: YTPlayer;
  data: number;
}

interface YTPlayerVars {
  autoplay?: number;
  mute?: number;
  controls?: number;
  modestbranding?: number;
  rel?: number;
  showinfo?: number;
  iv_load_policy?: number;
  playsinline?: number;
  enablejsapi?: number;
  origin?: string;
}

interface YTPlayerOptions {
  videoId?: string;
  width?: string | number;
  height?: string | number;
  playerVars?: YTPlayerVars;
  events?: {
    onReady?: (event: YTPlayerEvent) => void;
    onStateChange?: (event: YTOnStateChangeEvent) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YTPlayerConstructor {
  new (elementId: string | HTMLElement, options: YTPlayerOptions): YTPlayer;
}

interface YTNamespace {
  Player: YTPlayerConstructor;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT: YTNamespace;
  }
}
