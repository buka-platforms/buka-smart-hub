"use client";

import { Loading } from "@/components/General/AudioUI";
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
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// Storage keys
const VOLUME_KEY = "widgetRadioPlayerVolume";
const STATION_SLUG_KEY = "widgetRadioPlayerStationSlug";
const FAVORITES_KEY = "widgetRadioPlayerStationFavorites";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";

/* eslint-disable @next/next/no-img-element */
export default function WidgetDraggableRadioPlayer() {
  const draggableRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
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

  // Load position from localStorage on mount
  useEffect(() => {
    const saved = getSavedWidgetPosition("radio");
    // Use queueMicrotask to avoid synchronous setState warning
    queueMicrotask(() => {
      if (saved) {
        setPosition(saved);
      } else {
        // Use calculated position based on actual widget sizes
        const positions = calculateAutoArrangePositions();
        setPosition(positions.radio);
      }
      setIsPositionLoaded(true);
    });
  }, []);

  // Sync volume with audio element and localStorage
  useEffect(() => {
    const audio = radioAudioState.radioAudio;
    if (!audio) return;
    const handleVolumeChange = () => {
      setVolume(Math.round((audio.volume ?? 0) * 100));
    };
    audio.addEventListener("volumechange", handleVolumeChange);
    return () => audio.removeEventListener("volumechange", handleVolumeChange);
  }, [radioAudioState.radioAudio]);

  // Listen for widget position reset events
  useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent<
        Record<string, { x: number; y: number }>
      >;
      if (customEvent.detail?.radio) {
        setPosition(customEvent.detail.radio);
      } else {
        const positions = calculateAutoArrangePositions();
        setPosition(positions.radio);
      }
    };
    window.addEventListener("widget-positions-reset", handleReset);
    return () =>
      window.removeEventListener("widget-positions-reset", handleReset);
  }, []);

  // Handle drag end to save position
  const handleDragEnd = useCallback(
    (data: { offset: { x: number; y: number } }) => {
      const newPosition = { x: data.offset.x, y: data.offset.y };
      setPosition(newPosition);
      saveWidgetPosition("radio", newPosition.x, newPosition.y);
    },
    [],
  );

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
    resetWidgetPosition("radio");
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

  // Reactive position plugin - updates when position state changes
  const positionCompartment = useCompartment(
    () => positionPlugin({ current: position }),
    [position.x, position.y],
  );

  useDraggable(draggableRef, () => [
    controls({
      block: ControlFrom.selector("a, button"),
    }),
    events({
      onDragEnd: handleDragEnd,
    }),
    positionCompartment,
  ]);

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
    visibility.radio !== false;

  // Report rendered height for accurate stacking
  useLayoutEffect(() => {
    const report = () => {
      const el = draggableRef.current;
      if (!el) return;
      const h = el.getBoundingClientRect().height;
      if (Number.isFinite(h)) setWidgetMeasuredHeight("radio", h);
    };
    report();
    window.addEventListener("resize", report);
    return () => window.removeEventListener("resize", report);
  }, [stationName, title, artist, isVisible]);

  return (
    <DropdownMenu
      open={moreMenuOpen}
      onOpenChange={setMoreMenuOpen}
      modal={false}
    >
      <div
        ref={draggableRef}
        data-widget-id="radio"
        className={`pointer-events-auto absolute z-50 flex transform-gpu cursor-grab rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 backdrop-blur-md transition-opacity duration-300 will-change-transform data-[neodrag-state=dragging]:cursor-grabbing data-[neodrag-state=dragging]:shadow-none ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical "Radio" Label */}
        <div className="flex items-center justify-center border-r border-white/10 px-1">
          <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
            Radio
          </span>
        </div>

        {/* Main Column */}
        <div className="flex w-80 flex-col">
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
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
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
            setVisibility((prev) => ({ ...prev, radio: false }));
            try {
              localStorage.setItem(
                WIDGET_VISIBILITY_KEY,
                JSON.stringify({ ...visibility, radio: false }),
              );
            } catch {}
          }}
        >
          Hide widget
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={toggleFavorite} className="cursor-pointer">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
