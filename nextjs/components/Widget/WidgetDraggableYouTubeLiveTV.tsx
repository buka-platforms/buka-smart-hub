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
import { tv } from "@/data/tv";
import type { TVChannel } from "@/data/type";
import {
  calculateAutoArrangePositions,
  getSavedWidgetPosition,
  resetWidgetPosition,
  saveWidgetPosition,
  setWidgetMeasuredHeight,
} from "@/lib/widget-positions";
import {
  ControlFrom,
  controls,
  events,
  position as positionPlugin,
  useCompartment,
  useDraggable,
} from "@neodrag/react";
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
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Filter only YouTube-based channels for the widget
const youtubeChannels = (tv as TVChannel[]).filter(
  (channel) => channel.source === "YouTube" && !channel.external,
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

/* eslint-disable @next/next/no-img-element */
export default function WidgetDraggableYouTubeLiveTV() {
  // Shared styles for command palette items to keep dark theme consistent
  const commandItemClass =
    "group cursor-pointer rounded-md px-2 py-1.5 text-white/80 transition-colors hover:bg-white/5 data-[highlighted=true]:bg-white/10 data-[highlighted=true]:text-white data-[selected=true]:bg-white/10 data-[selected=true]:text-white";

  const draggableRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Position state
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);

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

  // YouTube Player API
  const playerInstanceRef = useRef<YTPlayer | null>(null);
  const shouldAutoPlayRef = useRef(false);
  const volumeRafRef = useRef<number | null>(null);
  const pendingVolumeRef = useRef<number | null>(null);

  // Load saved state on mount
  useEffect(() => {
    queueMicrotask(() => {
      // Load position
      const savedPosition = getSavedWidgetPosition("youtubelivetv");
      if (savedPosition) {
        setPosition(savedPosition);
      } else {
        const positions = calculateAutoArrangePositions();
        setPosition(positions.youtubelivetv || { x: 0, y: 0 });
      }
      setIsPositionLoaded(true);

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

  // Listen for widget position reset events
  useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent<
        Record<string, { x: number; y: number }>
      >;
      const resetPos =
        customEvent.detail?.youtubelivetv || customEvent.detail?.livetv;
      if (resetPos) {
        setPosition(resetPos);
      } else {
        const positions = calculateAutoArrangePositions();
        setPosition(positions.youtubelivetv || { x: 0, y: 0 });
      }
    };
    window.addEventListener("widget-positions-reset", handleReset);
    return () =>
      window.removeEventListener("widget-positions-reset", handleReset);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (data: { offset: { x: number; y: number } }) => {
      const newPosition = { x: data.offset.x, y: data.offset.y };
      setPosition(newPosition);
      saveWidgetPosition("youtubelivetv", newPosition.x, newPosition.y);
    },
    [],
  );

  // Reactive position plugin
  const positionCompartment = useCompartment(
    () => positionPlugin({ current: position }),
    [position.x, position.y],
  );

  useDraggable(draggableRef, () => [
    controls({ block: ControlFrom.selector("a, button, select, iframe") }),
    events({ onDragEnd: handleDragEnd }),
    positionCompartment,
  ]);

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
    if (!isPlayerReady || !selectedChannel || !containerRef.current) return;

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
      containerRef.current.appendChild(playerContainer);
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
    resetWidgetPosition("youtubelivetv");
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
      )?.getIframe?.() || containerRef.current?.querySelector("iframe");
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
  const isVisible = isPositionLoaded;

  // Report height for stacking
  useLayoutEffect(() => {
    const report = () => {
      const el = draggableRef.current;
      if (!el) return;
      const h = el.getBoundingClientRect().height;
      if (Number.isFinite(h)) setWidgetMeasuredHeight("youtubelivetv", h);
    };
    report();
    window.addEventListener("resize", report);
    return () => window.removeEventListener("resize", report);
  }, [selectedChannel, isVisible]);

  return (
    <DropdownMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
      <div
        ref={draggableRef}
        data-widget-id="youtubelivetv"
        className={`pointer-events-auto absolute z-50 flex transform-gpu cursor-grab rounded-lg bg-black/90 shadow-xl ring-1 ring-white/15 backdrop-blur-xl transition-opacity duration-300 will-change-transform data-[neodrag-state=dragging]:cursor-grabbing data-[neodrag-state=dragging]:shadow-none ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical "Live TV" Label */}
        <div className="flex items-center justify-center border-r border-white/10 px-1">
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
                  className="flex h-7 cursor-pointer items-center gap-1 rounded-sm border border-white/10 bg-white/5 px-2 text-[10px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
                            value={`${channel.name} ${channel.country}`}
                            onSelect={() => selectChannel(channel)}
                            className={commandItemClass}
                          >
                            <div className="flex w-full items-center gap-2">
                              {channel.logo_url && (
                                <img
                                  src={channel.logo_url}
                                  alt={channel.name}
                                  className="h-5 w-5 rounded bg-white/10 object-contain"
                                  draggable={false}
                                />
                              )}
                              <div className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-xs font-medium text-white">
                                  {channel.name}
                                </span>
                                <span className="truncate text-[10px] text-white/50">
                                  {channel.country}
                                </span>
                              </div>
                              <Heart
                                className="h-3 w-3 text-pink-400"
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
                              value={`${channel.name} ${channel.country} ${channel.category}`}
                              onSelect={() => selectChannel(channel)}
                              className={commandItemClass}
                            >
                              <div className="flex w-full items-center gap-2">
                                {channel.logo_url && (
                                  <img
                                    src={channel.logo_url}
                                    alt={channel.name}
                                    className="h-5 w-5 rounded bg-white/10 object-contain"
                                    draggable={false}
                                  />
                                )}
                                <div className="flex min-w-0 flex-1 flex-col">
                                  <span className="truncate text-xs font-medium text-white">
                                    {channel.name}
                                  </span>
                                  <span className="truncate text-[10px] text-white/50">
                                    {channel.country}
                                    {channel.audience_type &&
                                      ` • ${channel.audience_type}`}
                                  </span>
                                </div>
                                {favorites.includes(channel.slug) && (
                                  <Heart
                                    className="h-3 w-3 text-pink-400"
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
            ref={containerRef}
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
      </DropdownMenuContent>
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
