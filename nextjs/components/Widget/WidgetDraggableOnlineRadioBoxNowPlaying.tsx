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
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

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
const COUNTRY_KEY = "widgetOnlineRadioBoxCountry";
const VOLUME_KEY = "widgetOnlineRadioBoxVolume";

// Supported countries for OnlineRadioBox
const COUNTRIES = [
  { code: "id", name: "Indonesia" },
  { code: "us", name: "United States" },
  { code: "gb", name: "United Kingdom" },
  { code: "de", name: "Germany" },
  { code: "fr", name: "France" },
  { code: "es", name: "Spain" },
  { code: "it", name: "Italy" },
  { code: "br", name: "Brazil" },
  { code: "jp", name: "Japan" },
  { code: "kr", name: "South Korea" },
  { code: "au", name: "Australia" },
  { code: "ca", name: "Canada" },
  { code: "nl", name: "Netherlands" },
  { code: "ru", name: "Russia" },
  { code: "in", name: "India" },
  { code: "mx", name: "Mexico" },
  { code: "ar", name: "Argentina" },
  { code: "pl", name: "Poland" },
  { code: "tr", name: "Turkey" },
  { code: "se", name: "Sweden" },
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

      stations.push({
        radioId: radioIdMatch[1],
        radioName,
        radioImg,
        stream: streamMatch[1],
        streamType: streamTypeMatch?.[1] || "mp3",
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
  const draggableRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
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
    if (typeof window === "undefined") return 0.7;
    const saved = localStorage.getItem(VOLUME_KEY);
    const parsed = Number(saved);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
    return 0.7;
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
  }, [volume]);

  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(VOLUME_KEY, volume.toString());
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

  const fetchNowPlaying = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use local API route to avoid CORS issues
      const response = await fetch(`https://api1.buka.sh/radio-stations/orb/now-playing/${country}`, {
        headers: {
          Accept: "application/json",
        },
      });

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

    // Refresh every 60 seconds
    const intervalId = setInterval(fetchNowPlaying, 60000);

    return () => clearInterval(intervalId);
  }, [fetchNowPlaying]);

  // Save country to localStorage when changed
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(COUNTRY_KEY, country);
    }
  }, [country]);

  // Load position from localStorage on mount
  useEffect(() => {
    const saved = getSavedWidgetPosition("onlineradiobox");
    queueMicrotask(() => {
      if (saved) {
        setPosition(saved);
      } else {
        const positions = calculateAutoArrangePositions();
        setPosition(positions.onlineradiobox || { x: 0, y: 0 });
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
      if (customEvent.detail?.onlineradiobox) {
        setPosition(customEvent.detail.onlineradiobox);
      } else {
        const positions = calculateAutoArrangePositions();
        setPosition(positions.onlineradiobox || { x: 0, y: 0 });
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
      saveWidgetPosition("onlineradiobox", newPosition.x, newPosition.y);
    },
    [],
  );

  // Reactive position plugin
  const positionCompartment = useCompartment(
    () => positionPlugin({ current: position }),
    [position.x, position.y],
  );

  useDraggable(draggableRef, () => [
    controls({ block: ControlFrom.selector("a, button, select") }),
    events({ onDragEnd: handleDragEnd }),
    positionCompartment,
  ]);

  const isVisible = isPositionLoaded && visibility.onlineradiobox !== false;

  const selectedCountry = COUNTRIES.find((c) => c.code === country);

  // Report rendered height for accurate stacking
  useLayoutEffect(() => {
    const report = () => {
      const el = draggableRef.current;
      if (!el) return;
      const h = el.getBoundingClientRect().height;
      if (Number.isFinite(h)) setWidgetMeasuredHeight("onlineradiobox", h);
    };
    report();
    window.addEventListener("resize", report);
    return () => window.removeEventListener("resize", report);
  }, [stations, isVisible]);

  return (
    <DropdownMenu
      open={moreMenuOpen}
      onOpenChange={setMoreMenuOpen}
      modal={false}
    >
      <div
        ref={draggableRef}
        data-widget-id="onlineradiobox"
        className={`pointer-events-auto absolute z-50 flex transform-gpu cursor-grab rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 backdrop-blur-md transition-opacity duration-300 will-change-transform data-[neodrag-state=dragging]:cursor-grabbing data-[neodrag-state=dragging]:shadow-none ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical Label */}
        <div className="flex items-center justify-center border-r border-white/10 px-1">
          <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
            Now Playing
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
                    <Play
                      className="h-5 w-5 translate-x-0.5"
                      fill="currentColor"
                    />
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
                className="max-h-64 overflow-y-auto"
              >
                {COUNTRIES.map((c) => (
                  <DropdownMenuItem
                    key={c.code}
                    onSelect={() => setCountry(c.code)}
                    className={`cursor-pointer ${country === c.code ? "bg-white/10" : ""}`}
                  >
                    <span className="mr-2 w-6 text-xs text-white/50 uppercase">
                      {c.code}
                    </span>
                    {c.name}
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
            setVisibility((prev) => ({ ...prev, onlineradiobox: false }));
            try {
              localStorage.setItem(
                WIDGET_VISIBILITY_KEY,
                JSON.stringify({ ...visibility, onlineradiobox: false }),
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
              resetWidgetPosition("onlineradiobox");
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
