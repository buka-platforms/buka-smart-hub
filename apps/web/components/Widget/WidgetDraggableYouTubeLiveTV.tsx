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
import { widgetVisibilityAtom } from "@/data/store";
import type { TVChannel } from "@/data/type";
import {
  observeWidget,
  setWidgetMeasuredHeight,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
  WIDGET_POSITION_KEYS,
  type WidgetId,
} from "@/lib/widget-positions";
import {
  fetchYoutubeLiveTvChannel,
  fetchYoutubeLiveTvCollection,
  fetchYoutubeLiveTvFilterOptions,
  groupTvChannelsByCategory,
} from "@/lib/youtube-live-tv-api";
import { useAtom } from "jotai";
import { Heart, MoreHorizontal, Tv } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import {
  widgetCommandDialogContentClass,
  widgetCommandItemActiveClass,
  widgetCommandItemClass,
  widgetCommandListClass,
  widgetCommandSearchInputClass,
  widgetCommandSelectContentClass,
  widgetCommandSelectTriggerClass,
  widgetLogoPlateClass,
} from "./widgetCommandDialogStyles";

const SELECTED_CHANNEL_KEY = "widgetYouTubeLiveTVSelectedChannel";
const FAVORITE_CHANNELS_KEY = "widgetYouTubeLiveTVFavorites";
const VOLUME_KEY = "widgetYouTubeLiveTVVolume";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_VERSION = "1.0.0";
const CHANNEL_PAGE_SIZE = 50;

/* eslint-disable @next/next/no-img-element */
export default function WidgetDraggableYouTubeLiveTV() {
  const WIDGET_ID = "youtubelivetv";
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const channelListRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<YTPlayer | null>(null);
  const shouldAutoPlayRef = useRef(false);
  const volumeRafRef = useRef<number | null>(null);
  const pendingVolumeRef = useRef<number | null>(null);
  const prevPlayerPointerRef = useRef<string | null>(null);
  const didHydrateSavedStateRef = useRef(false);
  const dialogRequestIdRef = useRef(0);
  const initialVolumeRef = useRef(100);
  const initialMutedRef = useRef(false);

  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedChannelSlug, setSelectedChannelSlug] = useState<string | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [channelSearchInput, setChannelSearchInput] = useState("");
  const deferredChannelSearchInput = useDeferredValue(channelSearchInput);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [isInitializingChannel, setIsInitializingChannel] = useState(true);
  const [dialogChannels, setDialogChannels] = useState<TVChannel[]>([]);
  const [dialogPage, setDialogPage] = useState(1);
  const [hasMoreDialogChannels, setHasMoreDialogChannels] = useState(true);
  const [isDialogLoading, setIsDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  const {
    data: selectedChannel,
    error: selectedChannelError,
    isLoading: isLoadingSelectedChannel,
  } = useSWR<TVChannel | null, Error, [string, string] | null>(
    selectedChannelSlug
      ? ["youtube-live-tv-channel", selectedChannelSlug]
      : null,
    ([, slug]) => fetchYoutubeLiveTvChannel({ slug }),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );
  const { data: youtubeFilterOptions, error: youtubeFilterOptionsError } =
    useSWR(
      channelPickerOpen ? "youtube-live-tv-filter-options" : null,
      fetchYoutubeLiveTvFilterOptions,
      { revalidateOnFocus: false, revalidateOnReconnect: false },
    );
  const { data: favoriteChannels = [] } = useSWR<
    TVChannel[],
    Error,
    [string, ...string[]] | null
  >(
    favorites.length > 0 ? ["youtube-live-tv-favorites", ...favorites] : null,
    async ([, ...slugs]) => {
      const channels = await Promise.all(
        slugs.map((slug) => fetchYoutubeLiveTvChannel({ slug })),
      );
      return channels.filter((channel): channel is TVChannel =>
        Boolean(channel),
      );
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );
  const groupedChannels = useMemo(
    () => groupTvChannelsByCategory(dialogChannels),
    [dialogChannels],
  );
  const sortedCategories = useMemo(
    () => Object.keys(groupedChannels).sort(),
    [groupedChannels],
  );
  const countries = youtubeFilterOptions?.countries ?? [];

  useEffect(() => {
    if (didHydrateSavedStateRef.current) return;
    let isCancelled = false;
    const hydrate = async () => {
      try {
        const savedChannelSlug = localStorage.getItem(SELECTED_CHANNEL_KEY);
        const savedFavorites = localStorage.getItem(FAVORITE_CHANNELS_KEY);
        const savedVolume = localStorage.getItem(VOLUME_KEY);
        if (savedFavorites)
          setFavorites(JSON.parse(savedFavorites) as string[]);
        if (savedVolume) setVolume(Number(savedVolume));
        if (savedChannelSlug) {
          if (!isCancelled) setSelectedChannelSlug(savedChannelSlug);
        } else {
          const newsCollection = await fetchYoutubeLiveTvCollection({
            page: 1,
            limit: 1,
            category: "News",
          });
          const fallbackCollection =
            newsCollection.data.length > 0
              ? newsCollection
              : await fetchYoutubeLiveTvCollection({ page: 1, limit: 1 });
          if (!isCancelled)
            setSelectedChannelSlug(fallbackCollection.data[0]?.slug ?? null);
        }
        didHydrateSavedStateRef.current = true;
      } catch {
      } finally {
        if (!isCancelled) setIsInitializingChannel(false);
      }
    };
    void hydrate();
    return () => {
      isCancelled = true;
    };
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
    } catch {}
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
      el.style.pointerEvents = prevPlayerPointerRef.current ?? "";
      prevPlayerPointerRef.current = null;
    }
  }, [isDragging]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.YT && window.YT.Player) {
      queueMicrotask(() => setIsPlayerReady(true));
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    (
      window as unknown as { onYouTubeIframeAPIReady: () => void }
    ).onYouTubeIframeAPIReady = () => {
      queueMicrotask(() => setIsPlayerReady(true));
    };
  }, []);

  useEffect(() => {
    initialVolumeRef.current = volume;
    initialMutedRef.current = volume === 0;
  }, [volume]);

  useEffect(() => {
    if (!isPlayerReady || !selectedChannel || !playerRef.current) return;
    if (playerInstanceRef.current) {
      try {
        playerInstanceRef.current.destroy();
      } catch {}
      playerInstanceRef.current = null;
    }
    const playerId = "yt-live-tv-player";
    let playerContainer = document.getElementById(playerId);
    if (!playerContainer) {
      playerContainer = document.createElement("div");
      playerContainer.id = playerId;
      playerRef.current.appendChild(playerContainer);
    }
    const currentVolume = initialVolumeRef.current;
    const currentMuted = initialMutedRef.current;
    playerInstanceRef.current = new window.YT.Player(playerId, {
      videoId: selectedChannel.source_id,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 0,
        mute: currentMuted ? 1 : 0,
        controls: 1,
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
            } catch {}
            shouldAutoPlayRef.current = false;
            setIsPlaying(true);
          } else {
            setIsPlaying(false);
          }
        },
        onStateChange: (event: YTOnStateChangeEvent) => {
          if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
          else if (
            event.data === window.YT.PlayerState.PAUSED ||
            event.data === window.YT.PlayerState.ENDED
          )
            setIsPlaying(false);
        },
      },
    });
    return () => {
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.destroy();
        } catch {}
        playerInstanceRef.current = null;
      }
    };
  }, [isPlayerReady, selectedChannel]);

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

  const applyPlayerVolume = useCallback((nextVolume: number) => {
    pendingVolumeRef.current = nextVolume;
    if (volumeRafRef.current !== null) return;
    volumeRafRef.current = requestAnimationFrame(() => {
      volumeRafRef.current = null;
      const player = playerInstanceRef.current;
      const pendingVolume = pendingVolumeRef.current;
      pendingVolumeRef.current = null;
      if (!player || pendingVolume === null) return;
      try {
        player.setVolume(pendingVolume);
        if (pendingVolume <= 0) player.mute();
        else player.unMute();
      } catch {}
    });
  }, []);
  useEffect(() => {
    applyPlayerVolume(volume);
  }, [volume, applyPlayerVolume]);

  const loadDialogChannels = useCallback(
    async (page: number, mode: "replace" | "append") => {
      const requestId = ++dialogRequestIdRef.current;
      setIsDialogLoading(true);
      setDialogError(null);
      try {
        const collection = await fetchYoutubeLiveTvCollection({
          page,
          limit: CHANNEL_PAGE_SIZE,
          q: deferredChannelSearchInput.trim() || undefined,
          country: countryFilter ?? undefined,
        });
        if (dialogRequestIdRef.current !== requestId) return;
        setDialogPage(page);
        setHasMoreDialogChannels(collection.nextPageUrl !== null);
        setDialogChannels((prev) =>
          mode === "append" ? [...prev, ...collection.data] : collection.data,
        );
      } catch (error) {
        if (dialogRequestIdRef.current !== requestId) return;
        setDialogError(
          error instanceof Error ? error.message : "Unable to load channels.",
        );
        if (mode === "replace") setDialogChannels([]);
        setHasMoreDialogChannels(false);
      } finally {
        if (dialogRequestIdRef.current === requestId) setIsDialogLoading(false);
      }
    },
    [countryFilter, deferredChannelSearchInput],
  );
  const loadMoreDialogChannels = useCallback(async () => {
    if (isDialogLoading || !hasMoreDialogChannels) return;
    await loadDialogChannels(dialogPage + 1, "append");
  }, [dialogPage, hasMoreDialogChannels, isDialogLoading, loadDialogChannels]);
  useEffect(() => {
    if (!channelPickerOpen) return;
    void loadDialogChannels(1, "replace");
  }, [channelPickerOpen, loadDialogChannels]);

  const selectChannel = useCallback(
    (channel: TVChannel) => {
      shouldAutoPlayRef.current = isPlaying;
      setIsPlaying(false);
      setSelectedChannelSlug(channel.slug);
      setChannelPickerOpen(false);
      try {
        localStorage.setItem(SELECTED_CHANNEL_KEY, channel.slug);
      } catch {}
    },
    [isPlaying],
  );
  const toggleFavorite = useCallback(() => {
    if (!selectedChannel) return;
    setFavorites((prev) => {
      const next = prev.includes(selectedChannel.slug)
        ? prev.filter((slug) => slug !== selectedChannel.slug)
        : [...prev, selectedChannel.slug];
      try {
        localStorage.setItem(FAVORITE_CHANNELS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [selectedChannel]);

  useEffect(() => {
    if (!channelPickerOpen) return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const active = channelListRef.current?.querySelector<HTMLElement>(
          '[data-current-channel="true"]',
        );
        active?.scrollIntoView({ block: "center" });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [channelPickerOpen, selectedChannel?.slug, countryFilter, favorites]);

  const isFavorite = selectedChannel
    ? favorites.includes(selectedChannel.slug)
    : false;
  const isVisible = isPositionLoaded && visibility[WIDGET_ID] !== false;

  return (
    <>
      <div
        ref={containerRef}
        data-widget-id={WIDGET_ID}
        className={`pointer-events-auto flex rounded-lg border bg-card shadow-sm ${isDragging ? "shadow-none transition-none" : "transition-opacity duration-300"} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div className="relative flex w-full flex-col">
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`flex h-8 w-full cursor-move items-center gap-2 rounded-t-lg border-b border-border bg-muted/50 px-3 select-none ${isDragging ? "opacity-60" : "opacity-100"}`}
          >
            <span className="flex-1 text-[10px] leading-none font-semibold tracking-widest text-muted-foreground uppercase">
              YouTube Live TV
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
                    className="flex h-5 w-5 min-w-5 cursor-pointer items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-accent"
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
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              {selectedChannel?.logo_url && (
                <div
                  className={`relative h-6 w-6 shrink-0 ${widgetLogoPlateClass} p-0.5`}
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
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-semibold text-foreground">
                  {selectedChannel?.name ||
                    (isInitializingChannel || isLoadingSelectedChannel
                      ? "Loading channels..."
                      : "Select Channel")}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {selectedChannel
                    ? `${selectedChannel.country} • ${selectedChannel.category}`
                    : selectedChannelError
                      ? "Unable to load live channels"
                      : isInitializingChannel || isLoadingSelectedChannel
                        ? "Fetching from backend"
                        : "Choose a live channel"}
                </span>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                <span className="text-[10px] font-bold text-red-400 uppercase">
                  Live
                </span>
              </div>
              <button
                onClick={() => setChannelPickerOpen(true)}
                disabled={isInitializingChannel}
                className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-border bg-muted/50 px-2 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Change channel"
              >
                <Tv className="h-3 w-3" />
              </button>
            </div>

            <div
              ref={playerRef}
              className="relative aspect-video overflow-hidden bg-black"
            >
              {selectedChannelError && (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                  <div className="flex max-w-56 flex-col items-center gap-2 text-muted-foreground">
                    <Tv className="h-10 w-10" />
                    <span className="text-xs">
                      Unable to load channels from the backend API.
                    </span>
                  </div>
                </div>
              )}
              {!selectedChannelError &&
                (isInitializingChannel || isLoadingSelectedChannel) &&
                !selectedChannel && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Tv className="h-10 w-10 animate-pulse" />
                      <span className="text-xs">Loading live channels</span>
                    </div>
                  </div>
                )}
              {!selectedChannelError &&
                !isInitializingChannel &&
                !isLoadingSelectedChannel &&
                !selectedChannel && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Tv className="h-10 w-10" />
                      <span className="text-xs">Select a channel to watch</span>
                    </div>
                  </div>
                )}
            </div>

            <div className="flex items-center gap-2 border-t border-border px-3 py-2">
              <button
                onClick={toggleFavorite}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-colors ${isFavorite ? "border-pink-400/60 bg-pink-500/30 text-pink-400" : "border-border bg-muted text-foreground hover:bg-accent"}`}
                title={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                <Heart
                  className="h-3.5 w-3.5"
                  fill={isFavorite ? "currentColor" : "none"}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

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

      <Dialog open={channelPickerOpen} onOpenChange={setChannelPickerOpen}>
        <DialogContent
          className={`${widgetCommandDialogContentClass} [&>button]:cursor-pointer`}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Select YouTube channel</DialogTitle>
            <DialogDescription>
              Search and choose a live YouTube TV channel.
            </DialogDescription>
          </DialogHeader>
          <Command
            shouldFilter={false}
            className="border-0 bg-transparent text-foreground **:[[cmdk-input-wrapper]]:flex-1 **:[[cmdk-input-wrapper]]:border-0 **:[[cmdk-input-wrapper]]:px-0"
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-2 pr-10">
              <CommandInput
                value={channelSearchInput}
                onValueChange={setChannelSearchInput}
                placeholder="Search channels..."
                className={widgetCommandSearchInputClass}
              />
              <Select
                value={countryFilter ?? "all"}
                onValueChange={(value) =>
                  setCountryFilter(value === "all" ? null : value)
                }
              >
                <SelectTrigger
                  aria-label="Filter by country"
                  className={widgetCommandSelectTriggerClass}
                >
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent className={widgetCommandSelectContentClass}>
                  <SelectItem
                    value="all"
                    className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                  >
                    All countries
                  </SelectItem>
                  {countries.map((country) => (
                    <SelectItem
                      key={country}
                      value={country}
                      className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                    >
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CommandList
              ref={channelListRef}
              className={widgetCommandListClass}
              onScroll={(event) => {
                const target = event.currentTarget;
                const remaining =
                  target.scrollHeight - target.scrollTop - target.clientHeight;
                if (remaining < 80) void loadMoreDialogChannels();
              }}
            >
              <CommandEmpty className="px-3 py-2 text-xs text-muted-foreground">
                {isDialogLoading ? "Loading channels..." : "No channels found."}
              </CommandEmpty>
              {dialogError ? (
                <div className="px-3 py-3 text-xs text-destructive">
                  {dialogError}
                </div>
              ) : null}
              {youtubeFilterOptionsError ? (
                <div className="px-3 py-3 text-xs text-destructive">
                  Unable to load country filters.
                </div>
              ) : null}
              {favoriteChannels.length > 0 && (
                <CommandGroup
                  heading={
                    <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Favorites
                    </span>
                  }
                >
                  {favoriteChannels.map((channel) => (
                    <CommandItem
                      key={channel.id}
                      value={`${channel.name} ${channel.country} ${channel.category} ${channel.slug}`}
                      onSelect={() => selectChannel(channel)}
                      data-current-channel={
                        channel.slug === selectedChannel?.slug
                          ? "true"
                          : undefined
                      }
                      className={`${widgetCommandItemClass} ${channel.slug === selectedChannel?.slug ? widgetCommandItemActiveClass : ""}`}
                    >
                      <DialogChannelRow channel={channel} isFavorite />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {selectedChannel ? (
                <CommandGroup
                  heading={
                    <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Current
                    </span>
                  }
                >
                  <CommandItem
                    value={`${selectedChannel.name} ${selectedChannel.country} ${selectedChannel.category} ${selectedChannel.slug}`}
                    onSelect={() => selectChannel(selectedChannel)}
                    data-current-channel="true"
                    className={`${widgetCommandItemClass} ${widgetCommandItemActiveClass}`}
                  >
                    <DialogChannelRow
                      channel={selectedChannel}
                      badge="Current"
                    />
                  </CommandItem>
                </CommandGroup>
              ) : null}
              {sortedCategories.map((category) => {
                const channels = groupedChannels[category];
                if (!channels || channels.length === 0) return null;
                return (
                  <CommandGroup
                    key={category}
                    heading={
                      <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {category}
                      </span>
                    }
                  >
                    {channels.map((channel) => (
                      <CommandItem
                        key={channel.id}
                        value={`${channel.name} ${channel.country} ${channel.category} ${channel.slug}`}
                        onSelect={() => selectChannel(channel)}
                        data-current-channel={
                          channel.slug === selectedChannel?.slug
                            ? "true"
                            : undefined
                        }
                        className={`${widgetCommandItemClass} ${channel.slug === selectedChannel?.slug ? widgetCommandItemActiveClass : ""}`}
                      >
                        <DialogChannelRow
                          channel={channel}
                          isFavorite={favorites.includes(channel.slug)}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
              {isDialogLoading ? (
                <div className="flex items-center justify-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                  <Tv className="h-4 w-4 animate-pulse" />
                  Loading channels...
                </div>
              ) : null}
              {!isDialogLoading && hasMoreDialogChannels ? (
                <div className="px-3 py-3">
                  <button
                    type="button"
                    className="w-full cursor-pointer rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    onClick={() => {
                      void loadMoreDialogChannels();
                    }}
                  >
                    Load more channels
                  </button>
                </div>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DialogChannelRow({
  channel,
  isFavorite = false,
  badge,
}: {
  channel: TVChannel;
  isFavorite?: boolean;
  badge?: string;
}) {
  return (
    <div className="flex w-full items-center gap-3">
      {channel.logo_url ? (
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center ${widgetLogoPlateClass} p-1`}
        >
          <img
            src={channel.logo_url}
            alt={channel.name}
            className="h-full w-full object-contain"
            draggable={false}
          />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-medium text-foreground">
          {channel.name}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          {channel.country}
        </span>
      </div>
      {badge ? (
        <span className="ml-2 rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] font-medium text-foreground">
          {badge}
        </span>
      ) : null}
      {!badge && isFavorite ? (
        <Heart className="h-3.5 w-3.5 text-pink-400" fill="currentColor" />
      ) : null}
    </div>
  );
}

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
