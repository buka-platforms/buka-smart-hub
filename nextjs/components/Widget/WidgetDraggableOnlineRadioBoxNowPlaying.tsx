"use client";

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
import {
  calculateAutoArrangePositions,
  getSavedWidgetPosition,
  observeWidget,
  resetWidgetPosition,
  saveWidgetPosition,
  unobserveWidget,
} from "@/lib/widget-positions";
import { useAtom } from "jotai";
import {
  Disc3,
  ExternalLink,
  Globe,
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
const VOLUME_KEY = "widgetOnlineRadioBoxNowPlayingVolume";
const WIDGET_ID = "onlineradioboxnowplaying";

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
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  const [stations, setStations] = useState<NowPlayingStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState(() => {
    if (typeof window === "undefined") return "id";
    return localStorage.getItem(COUNTRY_KEY) || "id";
  });

  // Audio playback state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] =
    useState<NowPlayingStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 0.5;
    try {
      const saved = localStorage.getItem(VOLUME_KEY);

      // If there's no saved value, or the saved value is the old default '0',
      // migrate it to 50 (50%). This keeps behavior consistent with other widgets.
      if (saved === null || saved === "0") {
        localStorage.setItem(VOLUME_KEY, "50");
        return 0.5;
      }

      const parsed = Number(saved);
      if (Number.isFinite(parsed)) {
        // If stored as a decimal 0-1, use directly
        if (parsed >= 0 && parsed <= 1) return parsed;
        // If stored as a percent 0-100, convert to 0-1
        if (parsed >= 0 && parsed <= 100) return parsed / 100;
      }

      // Fallback: set to 50%
      localStorage.setItem(VOLUME_KEY, "50");
      return 0.5;
    } catch {
      return 0.5;
    }
  });

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;

    const handlePlay = () => {
      setIsPlaying(true);
      setIsAudioLoading(false);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof window !== "undefined" && (window as any).gtag) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).gtag("event", "page_view", {
            page_title: `OnlineRadioBox: ${selectedStation?.radioName || selectedStation?.radioId || currentlyPlaying}`,
            page_location: window.location.href,
            page_path: window.location.pathname,
          });
        }
      } catch {
        /* ignore */
      }
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentlyPlaying(null);
    };
    const handleWaiting = () => setIsAudioLoading(true);
    const handleCanPlay = () => setIsAudioLoading(false);
    const handleError = () => {
      setIsAudioLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [
    currentlyPlaying,
    selectedStation?.radioId,
    selectedStation?.radioName,
    volume,
  ]);

  // Track last sent track to avoid duplicate GA hits
  const lastTrackRef = useRef<string | null>(null);

  // Send GA virtual page_view when track metadata changes while playing
  useEffect(() => {
    if (!selectedStation) {
      lastTrackRef.current = null;
      return;
    }

    const trackKey = `${selectedStation.artist || ""} - ${selectedStation.title || ""}`;

    if (isPlaying && trackKey && trackKey !== lastTrackRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof window !== "undefined" && (window as any).gtag) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).gtag("event", "page_view", {
            page_title: `OnlineRadioBox: ${selectedStation.radioName || selectedStation.radioId} — ${selectedStation.artist || ""} - ${selectedStation.title || ""}`,
            page_location: window.location.href,
            page_path: window.location.pathname,
          });
        }
      } catch {
        /* ignore */
      }
    }

    lastTrackRef.current = trackKey;
  }, [isPlaying, lastTrackRef, selectedStation]);

  // Update volume when changed and persist as integer percent (0-100)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(VOLUME_KEY, String(Math.round(volume * 100)));
      } catch {}
    }
  }, [volume]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const playStation = useCallback(
    (station: NowPlayingStation) => {
      if (!audioRef.current) return;

      // If clicking on currently playing station, toggle pause/play
      if (currentlyPlaying === station.radioId) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
        return;
      }

      // Play new station - save the station info
      setIsAudioLoading(true);
      setCurrentlyPlaying(station.radioId);
      setSelectedStation(station);
      audioRef.current.src = station.stream;
      audioRef.current.play().catch((err) => {
        console.error("Failed to play:", err);
        setIsAudioLoading(false);
        setCurrentlyPlaying(null);
      });
    },
    [currentlyPlaying, isPlaying],
  );

  const stopPlayback = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.src = "";
    setCurrentlyPlaying(null);
    setIsPlaying(false);
    setIsAudioLoading(false);
    // Keep selectedStation so user can play again
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
  }, [country]);

  // Fetch data on mount and when country changes
  useEffect(() => {
    fetchNowPlaying();

    // Refresh every 15 seconds
    const intervalId = setInterval(fetchNowPlaying, 15000);

    return () => clearInterval(intervalId);
  }, [fetchNowPlaying]);

  // Load position from storage on mount
  useEffect(() => {
    queueMicrotask(() => {
      const saved = getSavedWidgetPosition(WIDGET_ID);
      const initial = saved ??
        calculateAutoArrangePositions()[WIDGET_ID] ?? { x: 0, y: 0 };
      setPosition(initial);
      positionRef.current = initial;
      if (containerRef.current)
        containerRef.current.style.transform = `translate(${initial.x}px, ${initial.y}px)`;
      setIsPositionLoaded(true);
    });
  }, []);

  // Register with ResizeObserver for automatic layout updates
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    observeWidget(WIDGET_ID, el);
    return () => unobserveWidget(WIDGET_ID);
  }, []);

  // Listen for widget position reset events
  useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent<
        Record<string, { x: number; y: number }>
      >;
      const detail = customEvent.detail || {};

      if (Object.prototype.hasOwnProperty.call(detail, WIDGET_ID)) {
        const newPos = detail[WIDGET_ID];
        if (newPos) setPosition(newPos);
      } else if (Object.keys(detail).length > 1) {
        const newPos = detail[WIDGET_ID];
        if (newPos) setPosition(newPos);
      }
    };

    window.addEventListener("widget-positions-reset", handleReset);
    return () =>
      window.removeEventListener("widget-positions-reset", handleReset);
  }, []);

  // Drag handlers - only start drag from left label
  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      setIsDragging(true);
      dragStartRef.current = {
        x: clientX,
        y: clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX, e.clientY);
    },
    [handleDragStart],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      handleDragStart(t.clientX, t.clientY);
    },
    [handleDragStart],
  );

  useEffect(() => {
    if (!isDragging) return;

    // transitions/shadow are controlled via JSX className using `isDragging`

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const next = {
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY,
      };
      positionRef.current = next;
      if (containerRef.current)
        containerRef.current.style.transform = `translate(${next.x}px, ${next.y}px)`;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const deltaX = t.clientX - dragStartRef.current.x;
      const deltaY = t.clientY - dragStartRef.current.y;
      const next = {
        x: dragStartRef.current.posX + deltaX,
        y: dragStartRef.current.posY + deltaY,
      };
      positionRef.current = next;
      if (containerRef.current)
        containerRef.current.style.transform = `translate(${next.x}px, ${next.y}px)`;
    };

    const handleEnd = () => {
      setIsDragging(false);
      const pos = positionRef.current;
      setPosition(pos);
      saveWidgetPosition(WIDGET_ID, pos.x, pos.y);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
      // no-op: JSX handles transition/shadow classes
    };
  }, [isDragging]);

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
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        className={`pointer-events-auto absolute z-50 flex transform-gpu rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 backdrop-blur-md will-change-transform ${isDragging ? "shadow-none transition-none" : "transition-opacity duration-300"} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical Label */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`flex items-center justify-center border-r border-white/10 px-1 transition-colors select-none hover:bg-white/5 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
            Radio Now Playing
          </span>
        </div>

        {/* Main Column */}
        <div className="flex w-80 flex-col">
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
                    const next = Math.min(1, Math.max(0, percent / 100));
                    setVolume(next);
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
                  <Globe className="h-3 w-3" />
                  {selectedCountry?.code.toUpperCase() || "ID"}
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
              <ExternalLink className="h-3 w-3" />
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
            requestAnimationFrame(() => {
              resetWidgetPosition(WIDGET_ID);
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
