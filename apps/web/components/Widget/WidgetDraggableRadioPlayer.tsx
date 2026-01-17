"use client";

import { Loading } from "@/components/General/AudioUI";
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
  radioAudioStateAtom,
  radioStationStateAtom,
  widgetVisibilityAtom,
} from "@/data/store";
import { loadRadioStationBySlug, play, stop } from "@/lib/radio-audio";
import {
  getSavedWidgetPosition,
  observeWidget,
  resetWidgetPosition,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
} from "@/lib/widget-positions";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  Heart,
  MoreHorizontal,
  Pause,
  Play as PlayIcon,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// Storage keys
const VOLUME_KEY = "widgetRadioPlayerVolume";
const STATION_SLUG_KEY = "widgetRadioPlayerStationSlug";
const FAVORITES_KEY = "widgetRadioPlayerStationFavorites";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_VERSION = "1.0.0";

/* eslint-disable @next/next/no-img-element */
const WIDGET_ID = "radio";

export default function WidgetDraggableRadioPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef(position);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 50;
    const stored = localStorage.getItem(VOLUME_KEY);
    if (stored !== null && !Number.isNaN(Number(stored))) return Number(stored);
    return Math.round((radioAudioState.radioAudio?.volume ?? 0.5) * 100);
  });
  const setRadioAudioState = useSetAtom(radioAudioStateAtom);
  const radioAudioState = useAtomValue(radioAudioStateAtom);
  const radioStationState = useAtomValue(radioStationStateAtom);

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

  const resetPosition = useCallback(() => {
    resetWidgetPosition(WIDGET_ID);
  }, []);

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
    if (source && source !== WIDGET_ID) {
      swapWidgetPositions(source as any, WIDGET_ID as any);
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

  // Always render the element so the ref is attached, but hide when no station or position not loaded
  const isVisible =
    !!radioStationState.radioStation &&
    isPositionLoaded &&
    visibility[WIDGET_ID] !== false;

  return (
    <>
      <DropdownMenu
        open={moreMenuOpen}
        onOpenChange={setMoreMenuOpen}
        modal={false}
      >
        <div
          ref={containerRef}
          data-widget-id={WIDGET_ID}
          className={`pointer-events-auto flex transform-gpu rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 backdrop-blur-md will-change-transform ${isDragging ? "shadow-none transition-none" : "transition-opacity duration-300"} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          {/* Vertical "Radio" Label */}
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`flex items-center justify-center border-r border-white/10 px-1 transition-colors select-none hover:bg-white/5 ${isDragging ? "opacity-60" : "opacity-100"}`}
          >
            <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
              Radio
            </span>
          </div>

          {/* Main Column */}
          <div className="flex w-full flex-col truncate">
            {/* Player Row */}
            <div className="flex items-center gap-3 p-3">
              {/* Cover Art */}
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-white/10">
                <img
                  className="pointer-events-none h-full w-full object-contain"
                  src={artworkSrc || transparent1x1Pixel}
                  alt={title}
                  loading="lazy"
                  draggable={false}
                />
              </div>

              {/* Track Info */}
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                <span
                  className="block max-w-full truncate text-xs font-semibold text-white/60"
                  title={stationName}
                >
                  {stationName}
                </span>
                <span
                  className="max-w-full truncate text-sm font-medium text-white"
                  title={title}
                >
                  {title || "\u00A0"}
                </span>
                {artist && (
                  <span
                    className="max-w-full truncate text-xs text-white/70"
                    title={artist}
                  >
                    {artist}
                  </span>
                )}
              </div>

              {/* Play/Stop Button */}
              <div className="shrink-0">
                {radioAudioState.isLoading ? (
                  <Loading
                    className="h-10 w-10 animate-spin text-white/80"
                    color="#f5f5f5"
                  />
                ) : radioAudioState.isPlaying ? (
                  <button
                    onClick={stop}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    title="Stop"
                  >
                    <Pause className="h-5 w-5" fill="currentColor" />
                  </button>
                ) : (
                  <button
                    onClick={() => play(false)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    title="Play"
                  >
                    <PlayIcon className="h-5 w-5" fill="currentColor" />
                  </button>
                )}
              </div>
            </div>

            {/* Separator and action bar */}
            <div className="border-t border-white/10" />
            <div className="flex items-center gap-2 px-3 py-2 text-[10px] leading-tight">
              <button
                onClick={toggleFavorite}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20 ${isFavorite ? "border-pink-400/60 bg-pink-500/30" : ""}`}
                title={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
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
                    <span className="text-white/60">{Math.round(volume)}%</span>
                  </div>
                  <Slider
                    value={[volume]}
                    onValueChange={(v) => updateVolume(v[0] ?? volume)}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                  />
                </PopoverContent>
              </Popover>

              <Link
                href="/apps/radio"
                className="flex h-8 items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
                title="Browse more stations"
              >
                Stations
              </Link>
              {radioStationState.radioStation?.slug && (
                <Link
                  href={`/radio/${radioStationState.radioStation.slug}`}
                  className="flex h-8 items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
                  title={`Go to ${radioStationState.radioStation.name} details`}
                >
                  Details
                </Link>
              )}

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
            className="cursor-pointer"
          >
            {isFavorite ? "Remove from favorites" : "Add to favorites"}
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/apps/radio">Browse more stations</Link>
          </DropdownMenuItem>
          {radioStationState.radioStation?.slug && (
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/radio/${radioStationState.radioStation.slug}`}>
                {`Go to ${radioStationState.radioStation.name} station page`}
              </Link>
            </DropdownMenuItem>
          )}
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
    </>
  );
}
