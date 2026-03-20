"use client";

import { Loading } from "@/components/General/AudioUI";
import { Button } from "@/components/ui/button";
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
import { transparent1x1Pixel } from "@/data/general";
import {
  jotaiStore,
  radioAudioStateAtom,
  radioStationStateAtom,
  widgetVisibilityAtom,
} from "@/data/store";
import type { RadioStation } from "@/data/type";
import { loadRadioStationBySlug, play, stop } from "@/lib/radio-audio";
import {
  getSavedWidgetPosition,
  observeWidget,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
} from "@/lib/widget-positions";
import type { WidgetId } from "@/lib/widget-positions";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  Heart,
  LoaderCircle,
  MoreHorizontal,
  Pause,
  Play as PlayIcon,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  widgetCommandDialogContentClass,
  widgetCommandItemActiveClass,
  widgetCommandItemClass,
  widgetCommandListClass,
  widgetCommandSearchInputClass,
  widgetLogoPlateClass,
} from "./widgetCommandDialogStyles";

// Storage keys
const VOLUME_KEY = "widgetRadioPlayerVolume";
const STATION_SLUG_KEY = "widgetRadioPlayerStationSlug";
const FAVORITES_KEY = "widgetRadioPlayerStationFavorites";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_VERSION = "1.0.0";

/* eslint-disable @next/next/no-img-element */
const WIDGET_ID = "radio";
const STATION_PAGE_SIZE = 100;

type RadioStationsResponse = {
  data: {
    data: RadioStation[];
    next_page_url: string | null;
  };
};

export default function WidgetDraggableRadioPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stationListRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef(position);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [stationPickerOpen, setStationPickerOpen] = useState(false);
  const [stationSearchInput, setStationSearchInput] = useState("");
  const deferredStationSearchInput = useDeferredValue(stationSearchInput);
  const [stationResults, setStationResults] = useState<RadioStation[]>([]);
  const [stationPage, setStationPage] = useState(1);
  const [hasMoreStations, setHasMoreStations] = useState(true);
  const [isStationListLoading, setIsStationListLoading] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 50;
    const stored = localStorage.getItem(VOLUME_KEY);
    if (stored !== null && !Number.isNaN(Number(stored))) return Number(stored);
    return Math.round((radioAudioState.radioAudio?.volume ?? 0.5) * 100);
  });
  const setRadioAudioState = useSetAtom(radioAudioStateAtom);
  const setRadioStationState = useSetAtom(radioStationStateAtom);
  const radioAudioState = useAtomValue(radioAudioStateAtom);
  const radioStationState = useAtomValue(radioStationStateAtom);
  const stationQueryRequestIdRef = useRef(0);

  useEffect(() => {
    const audio = radioAudioState.radioAudio;
    if (!audio) return;
    const handleVolumeChange = () => {
      setVolume(Math.round((audio.volume ?? 0) * 100));
    };
    audio.addEventListener("volumechange", handleVolumeChange);
    return () => audio.removeEventListener("volumechange", handleVolumeChange);
  }, [radioAudioState.radioAudio]);

  useEffect(() => {
    const handleUseEffect = async () => {
      if (!radioStationState.radioStation) {
        // Check if localStorage has STATION_SLUG_KEY
        const storedSlug = localStorage.getItem(STATION_SLUG_KEY);
        if (storedSlug) {
          await loadRadioStationBySlug(storedSlug);
        } else {
          await loadRadioStationBySlug("gold905");
        }
      }
    };

    handleUseEffect();
  }, [radioStationState.radioStation]);

  // Sync favorite flag with localStorage
  useEffect(() => {
    const slug = radioStationState.radioStation?.slug;
    if (!slug || typeof window === "undefined") return;
    let isMounted = true;

    queueMicrotask(() => {
      if (!isMounted) return;
      try {
        const saved = localStorage.getItem(FAVORITES_KEY);
        const parsed: string[] = saved ? JSON.parse(saved) : [];
        setIsFavorite(parsed.includes(slug));
      } catch {
        setIsFavorite(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [radioStationState.radioStation?.slug]);

  const toggleFavorite = useCallback(() => {
    const slug = radioStationState.radioStation?.slug;
    if (!slug || typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      const parsed: string[] = saved ? JSON.parse(saved) : [];
      const next = parsed.includes(slug)
        ? parsed.filter((s) => s !== slug)
        : [...parsed, slug];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      setIsFavorite(next.includes(slug));
    } catch {
      /* noop */
    }
  }, [radioStationState.radioStation?.slug]);

  const updateVolume = useCallback(
    (value: number) => {
      setVolume(value);
      setRadioAudioState((prev) => {
        if (prev.radioAudio) {
          prev.radioAudio.volume = value / 100;
        }
        return { ...prev };
      });
      try {
        localStorage.setItem(VOLUME_KEY, value.toString());
      } catch {
        /* noop */
      }
    },
    [setVolume, setRadioAudioState],
  );

  const fetchStationPage = useCallback(async (page: number, query: string) => {
    const trimmedQuery = query.trim();
    const params = new URLSearchParams({
      page: String(page),
    });

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL_V1}/api/radio-stations?${params.toString()}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const payload = (await response.json()) as RadioStationsResponse;
    return {
      stations: payload.data.data,
      hasMore: payload.data.next_page_url !== null,
    };
  }, []);

  const loadStationPage = useCallback(
    async (page: number, query: string, mode: "replace" | "append") => {
      const requestId = ++stationQueryRequestIdRef.current;
      setIsStationListLoading(true);

      try {
        const { stations, hasMore } = await fetchStationPage(page, query);
        if (stationQueryRequestIdRef.current !== requestId) {
          return;
        }

        setStationPage(page);
        setHasMoreStations(hasMore);
        setStationResults((prev) =>
          mode === "append" ? [...prev, ...stations] : stations,
        );
      } catch {
        if (stationQueryRequestIdRef.current !== requestId) {
          return;
        }

        if (mode === "replace") {
          setStationResults([]);
        }
        setHasMoreStations(false);
      } finally {
        if (stationQueryRequestIdRef.current === requestId) {
          setIsStationListLoading(false);
        }
      }
    },
    [fetchStationPage],
  );

  const loadMoreStations = useCallback(async () => {
    if (isStationListLoading || !hasMoreStations) {
      return;
    }

    await loadStationPage(
      stationPage + 1,
      deferredStationSearchInput,
      "append",
    );
  }, [
    deferredStationSearchInput,
    hasMoreStations,
    isStationListLoading,
    loadStationPage,
    stationPage,
  ]);

  const handleStationSelect = useCallback(
    async (station: RadioStation) => {
      setStationPickerOpen(false);

      try {
        localStorage.setItem(STATION_SLUG_KEY, station.slug);
      } catch {
        /* noop */
      }

      setRadioStationState((prev) => ({
        ...prev,
        radioStation: station,
      }));

      jotaiStore.set(radioAudioStateAtom, (prev) => ({
        ...prev,
        isLoading: true,
        isPlaying: false,
      }));

      await stop({
        preserveLoading: true,
        resumeIdleMetadata: false,
      });

      await play(false);
    },
    [setRadioStationState],
  );

  const openStationPicker = useCallback(() => {
    setMoreMenuOpen(false);
    setStationPickerOpen(true);
  }, []);

  // Load position from localStorage on mount
  useEffect(() => {
    queueMicrotask(() => {
      const saved = getSavedWidgetPosition(WIDGET_ID);
      const initial = saved ?? { x: 0, y: 0 };
      setPosition(initial);
      positionRef.current = initial;
      // apply initial transform to DOM to avoid visual jump
      // Position is applied by WidgetContainer wrapper; do not set per-widget transform here.
      setIsPositionLoaded(true);
    });
  }, []);

  // Register with ResizeObserver for automatic layout updates
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    observeWidget(WIDGET_ID, el);
    try {
      triggerLayoutUpdate();
    } catch {}

    return () => unobserveWidget(WIDGET_ID);
  }, []);

  // Listen for widget position reset events
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

  // Drag/drop handlers for swapping positions between widgets
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData("text/widget-id", WIDGET_ID);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const source = e.dataTransfer.getData("text/widget-id");
    const isWidgetId = (s: string | null): s is WidgetId => {
      if (!s) return false;
      // Basic runtime guard: check if an element with that data-widget-id exists
      return !!document.querySelector(`[data-widget-id="${s}"]`);
    };

    if (source && source !== WIDGET_ID) {
      if (isWidgetId(source)) {
        swapWidgetPositions(source as WidgetId, WIDGET_ID as WidgetId);
      }
    }
  }, []);

  // Determine which artwork to show
  const artworkSrc = radioStationState.metadataExists
    ? radioStationState.exposedArtwork
    : radioStationState.radioStation?.logo || transparent1x1Pixel;

  // Determine title and artist
  const title = radioStationState.metadataExists
    ? radioStationState.exposedTitle
    : radioStationState.exposedTitleOnly || "No track info";

  const artist = radioStationState.metadataExists
    ? radioStationState.exposedArtist
    : "";

  const stationName = radioStationState.radioStation?.name || "";

  const hasStation = !!radioStationState.radioStation;
  const currentStationSlug = radioStationState.radioStation?.slug;

  useEffect(() => {
    if (!stationPickerOpen) {
      return;
    }

    void loadStationPage(1, deferredStationSearchInput, "replace");
  }, [deferredStationSearchInput, loadStationPage, stationPickerOpen]);

  // Always render the element so the ref is attached; show loading UI when no station yet
  const isVisible = isPositionLoaded && visibility[WIDGET_ID] !== false;

  return (
    <>
      <div
        ref={containerRef}
        data-widget-id={WIDGET_ID}
        className={`pointer-events-auto flex rounded-lg border bg-card shadow-sm ${isDragging ? "shadow-none transition-none" : "transition-opacity duration-300"} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Top Title - Drag Handle */}

        {/* Main Column */}
        <div className="flex w-full flex-col">
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`flex h-8 cursor-move items-center gap-2 rounded-t-lg border-b border-border bg-muted/50 px-3 select-none ${isDragging ? "opacity-60" : "opacity-100"}`}
          >
            <span className="text-[10px] leading-none font-semibold tracking-widest text-muted-foreground uppercase">
              Radio
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
                    className="cursor-pointer"
                  >
                    {isFavorite ? "Remove from favorites" : "Add to favorites"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      openStationPicker();
                    }}
                  >
                    Browse stations
                  </DropdownMenuItem>
                  {radioStationState.radioStation?.slug && (
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link
                        href={`/radio/${radioStationState.radioStation.slug}`}
                      >
                        {`Go to ${radioStationState.radioStation.name} station page`}
                      </Link>
                    </DropdownMenuItem>
                  )}
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
          {/* Player Row */}
          <div className="flex items-center gap-3 p-3">
            {/* Cover Art */}
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-muted">
              <img
                className="pointer-events-none h-full w-full object-contain"
                src={artworkSrc || transparent1x1Pixel}
                alt={title}
                loading="lazy"
                draggable={false}
              />
            </div>

            {/* Track Info */}
            <div className="flex min-w-0 flex-auto flex-col justify-center gap-0.5">
              <span
                className="block max-w-full truncate text-xs font-semibold text-muted-foreground"
                title={stationName}
              >
                {stationName}
              </span>
              <span
                className="max-w-full truncate text-sm font-medium text-foreground"
                title={title}
              >
                {title || "\u00A0"}
              </span>
              {artist && (
                <span
                  className="max-w-full truncate text-xs text-muted-foreground"
                  title={artist}
                >
                  {artist}
                </span>
              )}
            </div>

            {/* Play/Stop Button */}
            <div className="shrink-0">
              {!hasStation ? (
                <button
                  className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full bg-muted/50 text-muted-foreground"
                  title="Loading"
                  aria-disabled
                >
                  <Loading className="h-5 w-5 animate-spin text-muted-foreground" />
                </button>
              ) : radioAudioState.isLoading ? (
                <Loading className="h-10 w-10 animate-spin text-muted-foreground" />
              ) : radioAudioState.isPlaying ? (
                <button
                  onClick={() => void stop()}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent"
                  title="Stop"
                >
                  <Pause className="h-5 w-5" fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={() => play(false)}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent"
                  title="Play"
                >
                  <PlayIcon className="h-5 w-5" fill="currentColor" />
                </button>
              )}
            </div>
          </div>

          {/* Separator and action bar */}
          <div className="border-t border-border" />
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] leading-tight">
            <button
              onClick={hasStation ? toggleFavorite : undefined}
              className={`flex h-8 w-8 ${hasStation ? "cursor-pointer" : "cursor-not-allowed opacity-60"} items-center justify-center rounded-full border bg-secondary text-secondary-foreground transition-colors hover:bg-accent ${isFavorite ? "border-pink-400/60 bg-pink-500/30" : ""}`}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-disabled={!hasStation}
            >
              <Heart
                className="h-3.5 w-3.5"
                fill={isFavorite ? "currentColor" : "none"}
              />
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`flex h-8 w-8 ${hasStation ? "cursor-pointer" : "cursor-not-allowed opacity-60"} items-center justify-center rounded-full border bg-secondary text-secondary-foreground transition-colors hover:bg-accent`}
                  title="Volume"
                  aria-disabled={!hasStation}
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
                className="flex w-32 flex-col gap-2 rounded-md border bg-popover p-3 shadow-lg"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span>Volume</span>
                  <span className="text-muted-foreground">
                    {Math.round(volume)}%
                  </span>
                </div>
                <Slider
                  value={[volume]}
                  onValueChange={(v) => updateVolume(v[0] ?? volume)}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                  disabled={!hasStation}
                />
              </PopoverContent>
            </Popover>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer rounded-sm border bg-secondary px-2.5 text-[11px] font-medium text-secondary-foreground shadow-none transition-all hover:bg-accent hover:text-accent-foreground"
                type="button"
                onClick={openStationPicker}
              >
                Stations
              </Button>
              {radioStationState.radioStation?.slug && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-7 rounded-sm border bg-secondary px-2.5 text-[11px] font-medium text-secondary-foreground shadow-none transition-all hover:bg-accent hover:text-accent-foreground"
                >
                  <Link
                    href={`/radio/${radioStationState.radioStation.slug}`}
                    title={`Go to ${radioStationState.radioStation.name} details`}
                  >
                    Details
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>About Radio Player Widget</DialogTitle>
            <DialogDescription className="mt-2 text-left">
              Play your favorite radio stations with real-time metadata, volume
              control, and favorite station management.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-medium">{WIDGET_VERSION}</span>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={stationPickerOpen} onOpenChange={setStationPickerOpen}>
        <DialogContent
          className={`${widgetCommandDialogContentClass} [&>button]:cursor-pointer`}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Select Station</DialogTitle>
            <DialogDescription>
              Search and select a radio station without leaving the widget.
            </DialogDescription>
          </DialogHeader>
          <Command
            shouldFilter={false}
            className="border-0 bg-transparent text-foreground **:[[cmdk-input-wrapper]]:flex-1 **:[[cmdk-input-wrapper]]:border-0 **:[[cmdk-input-wrapper]]:px-0"
          >
            <div className="flex items-center gap-2 border-b border-border p-2 pr-10">
              <CommandInput
                value={stationSearchInput}
                onValueChange={setStationSearchInput}
                placeholder="Search stations by name, slug, or city..."
                className={widgetCommandSearchInputClass}
              />
            </div>
            <CommandList
              ref={stationListRef}
              className={widgetCommandListClass}
              onScroll={(event) => {
                const target = event.currentTarget;
                const remaining =
                  target.scrollHeight - target.scrollTop - target.clientHeight;

                if (remaining < 80) {
                  void loadMoreStations();
                }
              }}
            >
              <CommandEmpty className="px-3 py-2 text-xs text-muted-foreground">
                {isStationListLoading
                  ? "Searching stations..."
                  : "No stations found."}
              </CommandEmpty>
              <CommandGroup
                heading={
                  <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Stations
                  </span>
                }
              >
                {stationResults.map((station) => {
                  const isCurrentStation = station.slug === currentStationSlug;

                  return (
                    <CommandItem
                      key={station.id}
                      value={`${station.name} ${station.slug} ${station.city ?? ""} ${station.country?.name_alias ?? ""}`}
                      onSelect={() => {
                        void handleStationSelect(station);
                      }}
                      className={`${widgetCommandItemClass} ${
                        isCurrentStation ? widgetCommandItemActiveClass : ""
                      }`}
                    >
                      <div className="flex w-full items-start gap-3">
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center ${widgetLogoPlateClass} p-1`}
                        >
                          <img
                            src={station.logo || transparent1x1Pixel}
                            alt={station.name}
                            className="h-full w-full object-contain"
                            draggable={false}
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[13px] font-medium text-foreground">
                            {station.name}
                          </span>
                          <span
                            className="truncate text-[11px] text-muted-foreground"
                            title={station.country?.name_alias}
                          >
                            {station.country?.name_alias}
                            {station.city ? ` · ${station.city}` : ""}
                          </span>
                        </div>
                        {isCurrentStation ? (
                          <span className="ml-2 rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] font-medium text-foreground">
                            Current
                          </span>
                        ) : null}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              {isStationListLoading ? (
                <div className="flex items-center justify-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Loading stations...
                </div>
              ) : null}

              {!isStationListLoading && hasMoreStations ? (
                <div className="px-3 py-3">
                  <button
                    type="button"
                    className="w-full cursor-pointer rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    onClick={() => {
                      void loadMoreStations();
                    }}
                  >
                    Load more stations
                  </button>
                </div>
              ) : null}

              {!isStationListLoading &&
              !hasMoreStations &&
              stationResults.length >= STATION_PAGE_SIZE ? (
                <div className="px-3 py-3 text-center text-[11px] text-muted-foreground">
                  End of station list
                </div>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
