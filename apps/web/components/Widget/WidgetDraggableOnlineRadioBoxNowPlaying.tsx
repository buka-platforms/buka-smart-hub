"use client";

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
import {
  onlineRadioBoxAudioStateAtom,
  widgetVisibilityAtom,
} from "@/data/store";
import {
  attachOnlineRadioListeners,
  detachOnlineRadioListeners,
  playOnlineRadioStream,
  setOnlineRadioVolume,
  setupOnlineRadioBoxAudio,
  stopOnlineRadio,
} from "@/lib/onlineradioboxnowplaying-audio";
import {
  getSavedWidgetPosition,
  observeWidget,
  resetWidgetPosition,
  setWidgetMeasuredHeight,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
} from "@/lib/widget-positions";
import type { WidgetId } from "@/lib/widget-positions";
import { useAtom } from "jotai";
import {
  Disc3,
  LoaderCircle,
  MoreHorizontal,
  Music,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface NowPlayingStation {
  radioId: string;
  radioName: string;
  radioImg: string;
  stream: string;
  streamType: string;
  artist: string;
  title: string;
  trackImg: string;
  listeners?: number;
}

const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const COUNTRY_KEY = "widgetOnlineRadioBoxNowPlayingCountry";
const WIDGET_ID = "onlineradioboxnowplaying";
const WIDGET_VERSION = "1.0.0";

// Supported countries for OnlineRadioBox
const COUNTRIES = [
  { code: "id", name: "Indonesia" },
  { code: "us", name: "United States" },
  { code: "gb", name: "United Kingdom" },
  { code: "de", name: "Germany" },
  { code: "fr", name: "France" },
  { code: "es", name: "Spain" },
  { code: "it", name: "Italy" },
  { code: "mx", name: "Mexico" },
  { code: "ar", name: "Argentina" },
  { code: "pl", name: "Poland" },
  { code: "tr", name: "Turkey" },
  { code: "se", name: "Sweden" },
  { code: "sg", name: "Singapore" },
  { code: "my", name: "Malaysia" },
  { code: "ph", name: "Philippines" },
];

function parseHtmlResponse(html: string): NowPlayingStation[] {
  const stations: NowPlayingStation[] = [];

  // Use regex to parse the HTML response
  // Match each tr.now_playing_tr element
  const trRegex = /<tr\s+class="now_playing_tr"[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const trContent = trMatch[1];

    // Extract button attributes
    const streamMatch = trContent.match(/stream="([^"]+)"/);
    const streamTypeMatch = trContent.match(/streamType="([^"]+)"/);
    const radioIdMatch = trContent.match(/radioId="([^"]+)"/);
    const radioImgMatch = trContent.match(/radioImg="([^"]+)"/);
    const radioNameMatch = trContent.match(/radioName="([^"]+)"/);
    const listenersMatch = trContent.match(/listeners="(\d+)"/);

    // Extract track image
    const trackImgMatch = trContent.match(
      /<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/,
    );

    // Extract track title - contains <b>Artist</b> Title
    const trackTitleMatch = trContent.match(
      /<div\s+class="table__track-title"[^>]*>([\s\S]*?)<\/div>/i,
    );

    if (
      streamMatch &&
      radioIdMatch &&
      radioNameMatch &&
      radioImgMatch &&
      trackTitleMatch
    ) {
      // Parse artist and title from track title div
      const trackTitleHtml = trackTitleMatch[1];
      const artistMatch = trackTitleHtml.match(/<b>([^<]+)<\/b>/);
      const artist = artistMatch
        ? decodeHtmlEntities(artistMatch[1].trim())
        : "";

      // Get title - everything after </b> tag
      let title = trackTitleHtml.replace(/<b>[^<]+<\/b>/, "").trim();
      title = decodeHtmlEntities(title);

      // Decode radio name HTML entities
      let radioName = radioNameMatch[1];
      radioName = decodeHtmlEntities(radioName);

      // Fix radioImg URL if it starts with //
      let radioImg = radioImgMatch[1];
      if (radioImg.startsWith("//")) {
        radioImg = "https:" + radioImg;
      }

      const streamType = streamTypeMatch?.[1] || "mp3";

      // Only include mp3 streams
      if (streamType !== "mp3") continue;

      stations.push({
        radioId: radioIdMatch[1],
        radioName,
        radioImg,
        stream: streamMatch[1],
        streamType,
        artist,
        title,
        trackImg: trackImgMatch?.[1]?.replace(/\d+x\d+bb/, "200x200bb") || "",
        listeners: listenersMatch ? parseInt(listenersMatch[1], 10) : undefined,
      });
    }
  }

  return stations;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

/* eslint-disable @next/next/no-img-element */
export default function WidgetDraggableOnlineRadioBoxNowPlaying() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const positionRef = useRef(position);
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  const [stations, setStations] = useState<NowPlayingStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState(() => {
    if (typeof window === "undefined") return "id";
    return localStorage.getItem(COUNTRY_KEY) || "id";
  });

  // Audio playback state via shared atom/manager
  const [audioState] = useAtom(onlineRadioBoxAudioStateAtom);

  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] =
    useState<NowPlayingStation | null>(null);

  const isPlaying = !!audioState?.isPlaying;
  const isAudioLoading = !!audioState?.isLoading;
  const volume = Number.isFinite(audioState?.volume) ? audioState.volume : 0.5;

  // Setup audio and attach listeners on mount (do not stop audio on unmount)
  useEffect(() => {
    setupOnlineRadioBoxAudio();
    attachOnlineRadioListeners();
    return () => {
      detachOnlineRadioListeners();
    };
  }, []);

  const playStation = useCallback(
    async (station: NowPlayingStation) => {
      // Toggle if clicking same station
      const audio = audioState.audio as HTMLAudioElement | undefined | null;
      if (audio && currentlyPlaying === station.radioId) {
        if (audio.paused) {
          try {
            await audio.play();
          } catch {}
        } else {
          audio.pause();
        }
        return;
      }
      setCurrentlyPlaying(station.radioId);
      setSelectedStation(station);
      await playOnlineRadioStream(
        station.stream,
        station.streamType === "hls" ? 2 : 1,
        station.radioId,
      );
    },
    [audioState.audio, currentlyPlaying],
  );

  const stopPlayback = useCallback(() => {
    stopOnlineRadio();
    setCurrentlyPlaying(null);
    setSelectedStation(null);
  }, []);

  const clearSelectedStation = useCallback(() => {
    stopPlayback();
    setSelectedStation(null);
  }, [stopPlayback]);

  // Fetch metadata for selected station periodically
  // When playing: every 7 seconds, when paused/stopped: every 60 seconds
  useEffect(() => {
    if (!selectedStation) return;

    const radioId = selectedStation.radioId;
    const interval = isPlaying ? 7000 : 60000;

    const fetchMetadata = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL_V1}/radio-station/stream-metadata?type=1&id=${radioId}`,
        );
        if (!response.ok) return;

        const json = await response.json();
        const data = json?.data;

        // Update selectedStation with new metadata if available
        // Check if we have actual track data (updated > 0 means we have data)
        if (data && data.updated > 0) {
          setSelectedStation((prev) => {
            if (!prev || prev.radioId !== radioId) return prev;

            // Extract metadata from API response
            // API returns: iName (song title), iArtist, iImg, or title (combined "Artist - Title")
            let newTitle = prev.title;
            let newArtist = prev.artist;
            let newTrackImg = prev.trackImg;

            if (data.iName) {
              newTitle = data.iName;
            }
            if (data.iArtist) {
              newArtist = data.iArtist;
            }
            // Fallback: parse from combined title "Artist - Title"
            if (!data.iName && !data.iArtist && data.title) {
              const parts = data.title.split(" - ");
              if (parts.length >= 2) {
                newArtist = parts[0].trim();
                newTitle = parts.slice(1).join(" - ").trim();
              } else {
                newTitle = data.title;
              }
            }
            if (data.iImg) {
              newTrackImg = data.iImg.replace(/\d+x\d+bb/, "200x200bb");
            }

            return {
              ...prev,
              title: newTitle,
              artist: newArtist,
              trackImg: newTrackImg,
            };
          });
        }
      } catch (err) {
        console.error("Error fetching metadata:", err);
      }
    };

    // Fetch immediately
    fetchMetadata();

    // Then fetch at the appropriate interval
    const intervalId = setInterval(fetchMetadata, interval);

    return () => clearInterval(intervalId);
  }, [selectedStation, isPlaying]);

  const fetchNowPlaying = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL_V1}/radio-stations/orb/now-playing/${country}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.data) {
        const parsedStations = parseHtmlResponse(data.data);
        setStations(parsedStations);

        // Attempt to rehydrate selected station from in-memory atom (SPA navigation)
        try {
          const lastId = audioState?.lastRadioId ?? null;
          const lastStream = audioState?.lastStream ?? null;
          let match: NowPlayingStation | undefined;
          if (lastId) {
            match = parsedStations.find((s) => s.radioId === lastId);
          }
          if (!match && lastStream) {
            match = parsedStations.find((s) => s.stream === lastStream);
          }
          if (match) {
            setSelectedStation(match);
            setCurrentlyPlaying(match.radioId);
          }
        } catch {}
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch now playing",
      );
      console.error("Error fetching now playing:", err);
    } finally {
      setIsLoading(false);
    }
  }, [audioState?.lastRadioId, audioState?.lastStream, country]);

  // Fetch data on mount and when country changes
  useEffect(() => {
    fetchNowPlaying();

    // Refresh every 15 seconds
    const intervalId = setInterval(fetchNowPlaying, 15000);

    return () => clearInterval(intervalId);
  }, [fetchNowPlaying]);

  // Measure widget after stations/load state changes so layout uses accurate height
  useEffect(() => {
    if (!containerRef.current) return;
    const raf = requestAnimationFrame(() => {
      setTimeout(() => {
        const h = containerRef.current?.getBoundingClientRect().height ?? 0;
        if (h > 0) setWidgetMeasuredHeight(WIDGET_ID, h);
      }, 60);
    });
    return () => cancelAnimationFrame(raf);
  }, [stations.length, selectedStation, isLoading, isPositionLoaded]);

  // Load position from storage on mount
  useEffect(() => {
    queueMicrotask(() => {
      const saved = getSavedWidgetPosition(WIDGET_ID);
      const initial = saved ?? { x: 0, y: 0 };
      setPosition(initial);
      positionRef.current = initial;
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

  // Drag/Drop swap handlers will be attached to the left label below

  // Reset position using centralized auto-arrange logic
  const resetPosition = useCallback(() => {
    resetWidgetPosition(WIDGET_ID);
  }, []);

  // Save country to localStorage when changed
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(COUNTRY_KEY, country);
    }
  }, [country]);

  const isVisible = isPositionLoaded && visibility[WIDGET_ID] !== false;

  const selectedCountry = COUNTRIES.find((c) => c.code === country);

  return (
    <DropdownMenu
      open={moreMenuOpen}
      onOpenChange={setMoreMenuOpen}
      modal={false}
    >
      <div
        ref={containerRef}
        data-widget-id={WIDGET_ID}
        className={`pointer-events-auto flex rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 transition-opacity duration-300 ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div className="relative flex w-full flex-col">
          {/* Top Title - Drag Handle */}
          <div
            className={`flex h-8 cursor-move items-center gap-2 border-b border-white/10 px-3 select-none ${isDragging ? "opacity-60" : "opacity-100"}`}
            draggable
            onDragStart={(e) => {
              try {
                e.dataTransfer?.setData("text/widget-id", WIDGET_ID);
                if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
              } catch {}
              setIsDragging(true);
            }}
            onDragEnd={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const src = e.dataTransfer?.getData("text/widget-id");
                if (src && src !== WIDGET_ID)
                  swapWidgetPositions(
                    src as unknown as WidgetId,
                    WIDGET_ID as unknown as WidgetId,
                  );
              } catch {}
            }}
          >
            <span className="text-[10px] leading-none font-semibold tracking-widest text-white/50 uppercase">
              Radio Now Playing
            </span>
          </div>

          {/* Main Column */}
          <div className="flex w-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-white/70" />
                <span className="text-xs font-semibold text-white/90">
                  Live Radio
                </span>
                {selectedCountry && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                    {selectedCountry.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchNowPlaying}
                  disabled={isLoading}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            {/* Selected Station Player */}
            {selectedStation && (
              <div className="border-b border-white/10 bg-white/5 px-3 py-3">
                <div className="flex items-center gap-3">
                  {/* Cover Art */}
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-white/10 shadow-lg">
                    {selectedStation.trackImg ? (
                      <img
                        src={selectedStation.trackImg}
                        alt={`${selectedStation.artist} - ${selectedStation.title}`}
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : selectedStation.radioImg ? (
                      <img
                        src={selectedStation.radioImg}
                        alt={selectedStation.radioName}
                        className="h-full w-full object-contain p-1"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music className="h-5 w-5 text-white/30" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className="truncate text-xs font-semibold text-white"
                      title={selectedStation.title}
                    >
                      {selectedStation.title || "Unknown Title"}
                    </span>
                    <span
                      className="truncate text-[11px] text-white/70"
                      title={selectedStation.artist}
                    >
                      {selectedStation.artist || "Unknown Artist"}
                    </span>
                    <span
                      className="truncate text-[10px] text-white/50"
                      title={selectedStation.radioName}
                    >
                      {selectedStation.radioName}
                    </span>
                  </div>

                  {/* Play/Pause Button */}
                  <button
                    onClick={() => playStation(selectedStation)}
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-green-500 text-black transition-all hover:scale-105 hover:bg-green-400"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isAudioLoading ? (
                      <Disc3 className="h-5 w-5 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-5 w-5" fill="currentColor" />
                    ) : (
                      <Play className="h-5 w-5" fill="currentColor" />
                    )}
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={clearSelectedStation}
                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
                    title="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Station List */}
            <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:cursor-default [&::-webkit-scrollbar-thumb]:cursor-default [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:cursor-default [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5">
              {isLoading && stations.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <LoaderCircle className="h-6 w-6 animate-spin text-white/40" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <span className="text-xs text-red-400/80">{error}</span>
                  <button
                    onClick={fetchNowPlaying}
                    className="text-xs text-white/50 underline hover:text-white/80"
                  >
                    Try again
                  </button>
                </div>
              ) : stations.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-xs text-white/50">
                    No stations currently playing
                  </span>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {stations.map((station) => {
                    const isThisPlaying = currentlyPlaying === station.radioId;
                    const isThisLoading = isThisPlaying && isAudioLoading;

                    return (
                      <div
                        key={station.radioId}
                        className={`group flex items-center gap-2 px-3 py-2 transition-colors hover:bg-white/5 ${isThisPlaying ? "bg-white/5" : ""}`}
                      >
                        {/* Cover Art - Clean, no overlay */}
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-white/10">
                          {station.trackImg ? (
                            <img
                              src={station.trackImg}
                              alt={`${station.artist} - ${station.title}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              draggable={false}
                            />
                          ) : station.radioImg ? (
                            <img
                              src={station.radioImg}
                              alt={station.radioName}
                              className="h-full w-full object-contain p-1"
                              loading="lazy"
                              draggable={false}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Music className="h-4 w-4 text-white/30" />
                            </div>
                          )}
                        </div>

                        {/* Track Info - Takes remaining space, truncates */}
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span
                            className={`truncate text-[11px] font-medium ${isThisPlaying ? "text-green-400" : "text-white/90"}`}
                            title={station.title}
                          >
                            {station.title || "Unknown Title"}
                          </span>
                          <span
                            className="truncate text-[10px] text-white/60"
                            title={station.artist}
                          >
                            {station.artist || "Unknown Artist"}
                          </span>
                          <span
                            className="truncate text-[9px] text-white/40"
                            title={station.radioName}
                          >
                            {station.radioName}
                          </span>
                        </div>

                        {/* Play/Pause Button - Right side */}
                        <button
                          onClick={() => playStation(station)}
                          className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all ${
                            isThisPlaying
                              ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/50"
                              : "bg-white/10 text-white/60 opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:text-white"
                          }`}
                          title={
                            isThisPlaying && isPlaying
                              ? "Pause"
                              : `Play ${station.radioName}`
                          }
                        >
                          {isThisLoading ? (
                            <Disc3 className="h-4 w-4 animate-spin" />
                          ) : isThisPlaying && isPlaying ? (
                            <Pause className="h-4 w-4" fill="currentColor" />
                          ) : (
                            <Play className="h-4 w-4" fill="currentColor" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="border-t border-white/10" />
            <div className="flex items-center gap-2 px-3 py-2 text-[10px] leading-tight">
              {/* Volume Control */}
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
                      const next = Math.min(100, Math.max(0, percent));
                      setOnlineRadioVolume(next);
                    }}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                  />
                </PopoverContent>
              </Popover>

              {/* Country Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-8 cursor-pointer items-center justify-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
                    type="button"
                  >
                    Country: {selectedCountry?.code.toUpperCase() || "ID"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-64 overflow-y-auto rounded-md border border-white/10 bg-black/90 p-2 text-white shadow-lg [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:cursor-default [&::-webkit-scrollbar-thumb]:cursor-default [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:cursor-default [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5"
                >
                  {COUNTRIES.map((c) => (
                    <DropdownMenuItem
                      key={c.code}
                      onSelect={() => setCountry(c.code)}
                      className={`group cursor-pointer ${country === c.code ? "bg-white/10" : ""}`}
                    >
                      <span
                        className={`mr-2 w-6 text-xs uppercase ${country === c.code ? "text-white group-hover:text-gray-950" : "text-white/50 group-hover:text-gray-950"}`}
                      >
                        {c.code}
                      </span>
                      <span
                        className={`${country === c.code ? "text-white group-hover:text-gray-950" : "text-white/90 group-hover:text-gray-950"}`}
                      >
                        {c.name}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <a
                href={`https://onlineradiobox.com/${country}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 items-center justify-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
                title="Open OnlineRadioBox"
              >
                More
              </a>

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
          onSelect={(e) => {
            e.preventDefault();
            setMoreMenuOpen(false);
            fetchNowPlaying();
          }}
          className="cursor-pointer"
        >
          Refresh now
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setMoreMenuOpen(false);
            requestAnimationFrame(resetPosition);
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
            <DialogTitle>About Radio Now Playing Widget</DialogTitle>
            <DialogDescription className="mt-2 text-left">
              Shows currently playing tracks from OnlineRadioBox stations around
              the world. Select a country to view live radio stations and play
              music directly from the widget.
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
