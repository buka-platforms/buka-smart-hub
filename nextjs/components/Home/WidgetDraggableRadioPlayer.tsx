"use client";

import { Loading } from "@/components/General/AudioUI";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mediaAudioStateAtom, radioStationStateAtom } from "@/data/store";
import {
  loadRadioStationBySlug,
  play,
  stop,
  transparent1x1Pixel,
} from "@/lib/audio";
import {
  calculateAutoArrangePositions,
  getSavedWidgetPosition,
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
import { useAtomValue } from "jotai";
import {
  Heart,
  ListMusic,
  MoreHorizontal,
  Pause,
  Play as PlayIcon,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// Marquee text component for long strings
const MarqueeText = ({
  text,
  className,
}: {
  text: string;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useLayoutEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && measureRef.current) {
        // Measure the hidden single-text span to get accurate width
        const isOverflowing =
          measureRef.current.scrollWidth > containerRef.current.clientWidth;
        setShouldAnimate(isOverflowing);
      }
    };

    checkOverflow();

    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className || ""}`}>
      {/* Hidden measurement span - always contains just the text */}
      <span
        ref={measureRef}
        className="pointer-events-none absolute whitespace-nowrap opacity-0"
        aria-hidden="true"
      >
        {text}
      </span>
      {/* Visible span with optional duplicate for marquee */}
      <span
        className={`inline-block whitespace-nowrap ${shouldAnimate ? "animate-marquee" : ""}`}
        title={text}
      >
        {text}
        {shouldAnimate && <span className="mx-8">{text}</span>}
      </span>
    </div>
  );
};

/* eslint-disable @next/next/no-img-element */
export default function WidgetDraggableRadioPlayer() {
  const draggableRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const mediaAudioState = useAtomValue(mediaAudioStateAtom);
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
        // Check if localStorage has radioStationSlug
        if (localStorage.getItem("radioStationSlug")) {
          await loadRadioStationBySlug(
            localStorage.getItem("radioStationSlug") as string,
          );
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
        const saved = localStorage.getItem("favoriteRadioStations");
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
      const saved = localStorage.getItem("favoriteRadioStations");
      const parsed: string[] = saved ? JSON.parse(saved) : [];
      const next = parsed.includes(slug)
        ? parsed.filter((s) => s !== slug)
        : [...parsed, slug];
      localStorage.setItem("favoriteRadioStations", JSON.stringify(next));
      setIsFavorite(next.includes(slug));
    } catch {
      /* noop */
    }
  }, [radioStationState.radioStation?.slug]);

  const resetPosition = useCallback(() => {
    const positions = calculateAutoArrangePositions();
    setPosition(positions.radio);
    saveWidgetPosition("radio", positions.radio.x, positions.radio.y);
  }, []);

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
  const isVisible = !!radioStationState.radioStation && isPositionLoaded;

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
    <DropdownMenu>
      <div
        ref={draggableRef}
        data-widget-id="radio"
        className={`pointer-events-auto absolute z-50 flex transform-gpu cursor-grab rounded-lg bg-black/80 shadow-lg backdrop-blur-md transition-opacity duration-300 will-change-transform data-[neodrag-state=dragging]:cursor-grabbing data-[neodrag-state=dragging]:shadow-none ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
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
              <Link
                href={`/radio/${radioStationState.radioStation?.slug}`}
                className="block overflow-hidden text-xs text-white/60 hover:text-white/80"
              >
                <MarqueeText text={stationName} />
              </Link>
              <MarqueeText
                text={title || "\u00A0"}
                className="text-sm font-medium text-white"
              />
              {artist && (
                <MarqueeText text={artist} className="text-xs text-white/70" />
              )}
            </div>

            {/* Play/Stop Button */}
            <div className="shrink-0">
              {mediaAudioState.isLoading ? (
                <Loading
                  className="h-10 w-10 animate-spin text-white/80"
                  color="#f5f5f5"
                />
              ) : mediaAudioState.isPlaying ? (
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

            <Link
              href="/apps/radio"
              className="flex h-8 items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
              title="Browse more stations"
            >
              <ListMusic className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">More</span>
            </Link>

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
        <DropdownMenuItem onSelect={resetPosition}>
          Reset widget position
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
