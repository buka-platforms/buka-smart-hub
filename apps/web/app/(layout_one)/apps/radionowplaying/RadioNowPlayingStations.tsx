"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { onlineRadioBoxAudioStateAtom } from "@/data/store";
import {
  attachOnlineRadioListeners,
  detachOnlineRadioListeners,
  playOnlineRadioStream,
  setOnlineRadioVolume,
  setupOnlineRadioBoxAudio,
  stopOnlineRadio,
} from "@/lib/onlineradioboxnowplaying-audio";
import { useAtom } from "jotai";
import {
  Check,
  Disc3,
  Globe,
  LoaderCircle,
  Music,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const COUNTRY_KEY = "widgetOnlineRadioBoxNowPlayingCountry";

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

function parseHtmlResponse(html: string): NowPlayingStation[] {
  const stations: NowPlayingStation[] = [];

  const trRegex = /<tr\s+class="now_playing_tr"[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const trContent = trMatch[1];

    const streamMatch = trContent.match(/stream="([^"]+)"/);
    const streamTypeMatch = trContent.match(/streamType="([^"]+)"/);
    const radioIdMatch = trContent.match(/radioId="([^"]+)"/);
    const radioImgMatch = trContent.match(/radioImg="([^"]+)"/);
    const radioNameMatch = trContent.match(/radioName="([^"]+)"/);
    const listenersMatch = trContent.match(/listeners="(\d+)"/);

    const trackImgMatch = trContent.match(
      /<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/,
    );

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
      const trackTitleHtml = trackTitleMatch[1];
      const artistMatch = trackTitleHtml.match(/<b>([^<]+)<\/b>/);
      const artist = artistMatch
        ? decodeHtmlEntities(artistMatch[1].trim())
        : "";

      let title = trackTitleHtml.replace(/<b>[^<]+<\/b>/, "").trim();
      title = decodeHtmlEntities(title);

      let radioName = radioNameMatch[1];
      radioName = decodeHtmlEntities(radioName);

      let radioImg = radioImgMatch[1];
      if (radioImg.startsWith("//")) {
        radioImg = "https:" + radioImg;
      }

      const streamType = streamTypeMatch?.[1] || "mp3";

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

/* eslint-disable @next/next/no-img-element */
export default function RadioNowPlayingStations() {
  const [stations, setStations] = useState<NowPlayingStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [country, setCountry] = useState(() => {
    if (typeof window === "undefined") return "id";
    return localStorage.getItem(COUNTRY_KEY) || "id";
  });
  const [countryDialogOpen, setCountryDialogOpen] = useState(false);

  const [audioState] = useAtom(onlineRadioBoxAudioStateAtom);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] =
    useState<NowPlayingStation | null>(null);
  const hasSetup = useRef(false);

  const isPlaying = !!audioState?.isPlaying;
  const isAudioLoading = !!audioState?.isLoading;
  const volume = Number.isFinite(audioState?.volume) ? audioState.volume : 0.5;

  useEffect(() => {
    if (!hasSetup.current) {
      setupOnlineRadioBoxAudio();
      attachOnlineRadioListeners();
      hasSetup.current = true;
    }
    return () => {
      detachOnlineRadioListeners();
    };
  }, []);

  const playStation = useCallback(
    async (station: NowPlayingStation) => {
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

  // Fetch metadata for selected station periodically
  useEffect(() => {
    if (!selectedStation) return;

    const radioId = selectedStation.radioId;
    const interval = isPlaying ? 7000 : 60000;

    const fetchMetadata = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL_V1}/api/radio-station/stream-metadata?type=1&id=${radioId}`,
        );
        if (!response.ok) return;

        const json = await response.json();
        const data = json?.data;

        if (data && data.updated > 0) {
          setSelectedStation((prev) => {
            if (!prev || prev.radioId !== radioId) return prev;

            let newTitle = prev.title;
            let newArtist = prev.artist;
            let newTrackImg = prev.trackImg;

            if (data.iName) {
              newTitle = data.iName;
            }
            if (data.iArtist) {
              newArtist = data.iArtist;
            }
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

    fetchMetadata();
    const intervalId = setInterval(fetchMetadata, interval);
    return () => clearInterval(intervalId);
  }, [selectedStation, isPlaying]);

  const fetchNowPlaying = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL_V1}/api/radio-stations/orb/now-playing/${country}`,
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

        // Rehydrate selected station from in-memory atom
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

  useEffect(() => {
    fetchNowPlaying();

    const intervalId = setInterval(fetchNowPlaying, 15000);
    return () => clearInterval(intervalId);
  }, [fetchNowPlaying]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(COUNTRY_KEY, country);
    }
  }, [country]);

  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    const q = searchQuery.toLowerCase();
    return stations.filter(
      (s) =>
        s.radioName.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q),
    );
  }, [stations, searchQuery]);

  const selectedCountry = COUNTRIES.find((c) => c.code === country);

  return (
    <div className="mt-6">
      {/* Now Playing Bar */}
      {selectedStation && (
        <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            {/* Cover Art */}
            <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white/10 shadow-xl sm:mx-0 sm:h-20 sm:w-20">
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
                  className="h-full w-full object-contain p-2"
                  draggable={false}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Music className="h-8 w-8 text-white/30" />
                </div>
              )}
              {isPlaying && (
                <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/40 to-transparent pb-1">
                  <div className="flex items-end gap-0.5">
                    <span className="inline-block h-2 w-0.5 animate-pulse rounded-full bg-green-400" />
                    <span
                      className="inline-block h-3 w-0.5 animate-pulse rounded-full bg-green-400"
                      style={{ animationDelay: "0.15s" }}
                    />
                    <span
                      className="inline-block h-1.5 w-0.5 animate-pulse rounded-full bg-green-400"
                      style={{ animationDelay: "0.3s" }}
                    />
                    <span
                      className="inline-block h-2.5 w-0.5 animate-pulse rounded-full bg-green-400"
                      style={{ animationDelay: "0.45s" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[11px] font-semibold tracking-widest text-green-400 uppercase">
                Now Playing
              </p>
              <h3
                className="mt-1 truncate text-lg font-bold text-white"
                title={selectedStation.title}
              >
                {selectedStation.title || "Unknown Title"}
              </h3>
              <p
                className="truncate text-sm text-white/70"
                title={selectedStation.artist}
              >
                {selectedStation.artist || "Unknown Artist"}
              </p>
              <p
                className="mt-0.5 truncate text-xs text-white/50"
                title={selectedStation.radioName}
              >
                {selectedStation.radioName}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 sm:justify-end">
              {/* Volume */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
                  align="center"
                  sideOffset={8}
                  className="flex w-36 flex-col gap-2 rounded-lg border border-white/10 bg-slate-900 p-3 shadow-xl"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white/70">
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

              {/* Play/Pause */}
              <button
                type="button"
                onClick={() => playStation(selectedStation)}
                className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-green-500 text-black shadow-lg transition-all hover:scale-105 hover:bg-green-400"
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

              {/* Stop */}
              <button
                onClick={stopPlayback}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                title="Stop"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {/* Country Selector */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCountryDialogOpen(true)}
            className="gap-1.5"
          >
            <Globe className="h-3.5 w-3.5" />
            {selectedCountry?.name || "Indonesia"}
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNowPlaying}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search stations, artists, songs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-200 bg-white py-1 pr-3 pl-9 text-sm transition-colors outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* Station Count */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600">
            {isLoading
              ? "Loading stations..."
              : `${filteredStations.length} station${filteredStations.length !== 1 ? "s" : ""} live now`}
          </span>
        </div>
      </div>

      {/* Station Grid */}
      <div className="mt-4">
        {isLoading && stations.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white p-4"
              >
                <Skeleton className="h-14 w-14 shrink-0 rounded-md" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 py-12">
            <span className="text-sm text-red-600">{error}</span>
            <Button variant="outline" size="sm" onClick={fetchNowPlaying}>
              Try again
            </Button>
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Music className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              {searchQuery
                ? "No stations match your search."
                : "No stations available right now."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStations.map((station) => {
              const isThisPlaying = currentlyPlaying === station.radioId;
              const isThisLoading = isThisPlaying && isAudioLoading;

              return (
                <div
                  key={station.radioId}
                  className={`group flex items-center gap-3 rounded-lg border bg-white p-3 transition-all hover:shadow-md ${
                    isThisPlaying
                      ? "border-green-300 bg-green-50/50 ring-1 ring-green-200"
                      : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  {/* Cover Art */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
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
                        className="h-full w-full object-contain p-1.5"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music className="h-5 w-5 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={`truncate text-sm font-semibold ${
                        isThisPlaying ? "text-green-700" : "text-slate-900"
                      }`}
                      title={station.title}
                    >
                      {station.title || "Unknown Title"}
                    </span>
                    <span
                      className="truncate text-xs text-slate-600"
                      title={station.artist}
                    >
                      {station.artist || "Unknown Artist"}
                    </span>
                    <span
                      className="truncate text-[11px] text-slate-400"
                      title={station.radioName}
                    >
                      {station.radioName}
                    </span>
                  </div>

                  {/* Play Button */}
                  <button
                    type="button"
                    onClick={() => playStation(station)}
                    className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all ${
                      isThisPlaying
                        ? "bg-green-500 text-white shadow-md hover:bg-green-600"
                        : "bg-slate-100 text-slate-600 group-hover:bg-slate-200 hover:bg-slate-200 hover:text-slate-900"
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

      {/* Country Selector Dialog */}
      <Dialog open={countryDialogOpen} onOpenChange={setCountryDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Select Country</DialogTitle>
            <DialogDescription>
              Search and select a country for radio now playing.
            </DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput
              placeholder="Search country..."
              className="h-11 px-3 text-sm"
            />
            <CommandList className="max-h-[min(70vh,24rem)] overflow-y-auto p-2">
              <CommandEmpty className="py-6 text-center text-sm text-slate-500">
                No country found.
              </CommandEmpty>
              {COUNTRIES.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.name} ${c.code}`}
                  onSelect={() => {
                    setCountry(c.code);
                    setCountryDialogOpen(false);
                  }}
                  className={`cursor-pointer rounded-md px-2 py-2 ${
                    country === c.code ? "bg-slate-100" : ""
                  }`}
                >
                  <span className="mr-2 w-8 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                    {c.code}
                  </span>
                  <span className="flex-1 text-sm">{c.name}</span>
                  {country === c.code && (
                    <Check className="h-3.5 w-3.5 text-slate-600" />
                  )}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
