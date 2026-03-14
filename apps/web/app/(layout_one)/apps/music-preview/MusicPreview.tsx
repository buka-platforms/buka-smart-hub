"use client";

import { Loading } from "@/components/General/AudioUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { radioAudioStateAtom } from "@/data/store";
import { stop as stopMediaAudio } from "@/lib/radio-audio";
import { useAtomValue, useSetAtom } from "jotai";
import {
  CirclePlay,
  CircleStop,
  Frown,
  Loader2,
  LoaderCircle,
  Search as SearchIcon,
  StopCircle,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

const WIDGET_RADIO_PLAYER_VOLUME_KEY = "widgetRadioPlayerVolume";
const DEFAULT_TOPICS = [
  "eternal flame",
  "loving you",
  "i will always love you",
  "my heart will go on",
  "endless love",
  "unbreak my heart",
  "i don't want to miss a thing",
  "you are not alone",
  "i will remember you",
  "the power of love",
  "always",
  "i don't want to live without you",
] as const;

interface MusicTrack {
  trackId: string;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string;
  artworkUrl100: string;
  releaseDate: string;
  primaryGenreName: string;
}

type SearchBarProps = {
  isLoading: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: (query: string) => void;
};

type MusicListProps = {
  isLoading: boolean;
  isPlaying: boolean;
  isPreviewLoading: boolean;
  tracks: MusicTrack[];
  selectedTrack: MusicTrack | null;
  onPlay: (track: MusicTrack) => void;
  onStop: () => void;
};

type FooterProps = {
  progress: number;
  isPlaying: boolean;
  isPreviewLoading: boolean;
  selectedTrack: MusicTrack | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  onStop: () => void;
};

function SearchBar({
  isLoading,
  searchQuery,
  onSearchQueryChange,
  onSearch,
}: SearchBarProps) {
  return (
    <div className="relative flex w-full items-center gap-x-1 md:w-1/2">
      {isLoading ? (
        <LoaderCircle className="absolute left-2.5 h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <SearchIcon className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
      )}
      <Input
        placeholder="Search songs by name or artist..."
        className="flex w-full items-center pl-8 leading-9"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSearch(e.currentTarget.value);
          }
        }}
      />
      <Button className="cursor-pointer" onClick={() => onSearch(searchQuery)}>
        Search
      </Button>
    </div>
  );
}

function MusicItem({
  isPlaying,
  isPreviewLoading,
  item,
  selectedTrack,
  onPlay,
  onStop,
}: {
  isPlaying: boolean;
  isPreviewLoading: boolean;
  item: MusicTrack;
  selectedTrack: MusicTrack | null;
  onPlay: (track: MusicTrack) => void;
  onStop: () => void;
}) {
  const [isTrackImageLoaded, setIsTrackImageLoaded] = useState(false);
  const isSelectedTrack = selectedTrack?.trackId === item.trackId;

  return (
    <div className="w-24 cursor-pointer space-y-3 md:w-36">
      <div className="group relative h-24 w-24 overflow-hidden rounded-sm md:h-36 md:w-36">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={`${item.trackName} by ${item.artistName} from ${item.collectionName}`}
          loading="lazy"
          decoding="async"
          className={`aspect-square h-full w-full object-scale-down transition-all ${isTrackImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
          src={item.artworkUrl100.replace("100x100", "600x600")}
          onLoad={() => setIsTrackImageLoaded(true)}
        />
        <div
          className={`absolute top-0 left-0 h-full w-full items-center justify-center bg-black ${isSelectedTrack && (isPlaying || isPreviewLoading) ? "flex opacity-40" : "hidden group-hover:flex group-hover:opacity-40"}`}
        ></div>
        <div
          className={`absolute top-0 left-0 h-full w-full items-center justify-center group-hover:cursor-pointer ${isSelectedTrack && (isPlaying || isPreviewLoading) ? "flex" : "hidden group-hover:flex"}`}
        >
          {isSelectedTrack ? (
            !isPlaying && !isPreviewLoading ? (
              <CirclePlay
                className="absolute h-10 w-10 text-slate-50"
                onClick={() => onPlay(item)}
              />
            ) : isPreviewLoading ? (
              <LoaderCircle className="absolute h-10 w-10 animate-spin text-slate-50" />
            ) : isPlaying ? (
              <CircleStop
                className="absolute h-10 w-10 text-slate-50"
                onClick={onStop}
              />
            ) : null
          ) : (
            <CirclePlay
              className="absolute h-10 w-10 text-slate-50"
              onClick={() => onPlay(item)}
            />
          )}
        </div>
      </div>
      <div className="space-y-1 text-sm">
        <h3
          className="truncate-3-lines leading-tight font-medium"
          title={item.trackName}
        >
          {item.trackName}
        </h3>
        <p
          className="truncate-3-lines text-xs text-muted-foreground"
          title={item.artistName}
        >
          {item.artistName}
        </p>
        <p className="text-xs text-orange-400">
          {item.releaseDate.substring(0, 4)}
        </p>
        <p className="text-xs text-teal-500">{item.primaryGenreName}</p>
      </div>
    </div>
  );
}

function MusicList({
  isLoading,
  isPlaying,
  isPreviewLoading,
  tracks,
  selectedTrack,
  onPlay,
  onStop,
}: MusicListProps) {
  return (
    <>
      {tracks.map((item) => (
        <MusicItem
          key={item.trackId}
          isPlaying={isPlaying}
          isPreviewLoading={isPreviewLoading}
          item={item}
          selectedTrack={selectedTrack}
          onPlay={onPlay}
          onStop={onStop}
        />
      ))}
      {isLoading
        ? Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="w-24 space-y-3 md:w-36">
              <div className="group relative h-24 w-24 overflow-hidden rounded-md md:h-36 md:w-36">
                <Skeleton className="aspect-square h-full w-full rounded-md" />
              </div>
              <div className="space-y-1 text-sm">
                <Skeleton className="h-4 w-full md:h-5" />
                <Skeleton className="h-3 w-3/4 md:h-4" />
              </div>
            </div>
          ))
        : null}
    </>
  );
}

function NotFound({
  isNotFound,
  queryParam,
}: {
  isNotFound: boolean;
  queryParam: string;
}) {
  if (!isNotFound) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center gap-3">
      <Frown className="h-8 w-8" />
      <div className="text-center text-sm">
        Your search for <strong>{queryParam}</strong> did not return any
        results.
      </div>
    </div>
  );
}

function VolumeControl({
  audioRef,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
}) {
  const radioAudioState = useAtomValue(radioAudioStateAtom);
  const setRadioAudioState = useSetAtom(radioAudioStateAtom);
  const [volume, setVolume] = useState([
    (radioAudioState.radioAudio?.volume as number) * 100 || 0,
  ]);

  const adjustVolume = useCallback(
    (value: number[]) => {
      setVolume(value);

      setRadioAudioState((prev) => {
        if (prev.radioAudio) {
          prev.radioAudio.volume = value[0] / 100;
        }

        return {
          ...prev,
          radioAudio: prev.radioAudio,
        };
      });

      if (audioRef.current) {
        audioRef.current.volume = value[0] / 100;
      }

      localStorage.setItem(
        WIDGET_RADIO_PLAYER_VOLUME_KEY,
        JSON.stringify(value[0]),
      );
    },
    [audioRef, setRadioAudioState],
  );

  useEffect(() => {
    const radioAudio = radioAudioState.radioAudio;

    if (!radioAudio) {
      return;
    }

    const handleVolumeChange = () => {
      const nextVolume = (radioAudio.volume as number) * 100 || 0;
      setVolume([nextVolume]);

      if (audioRef.current) {
        audioRef.current.volume = nextVolume / 100;
      }
    };

    radioAudio.addEventListener("volumechange", handleVolumeChange);
    handleVolumeChange();

    return () => {
      radioAudio.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [audioRef, radioAudioState.radioAudio]);

  return (
    <Popover>
      <PopoverTrigger>
        <div id="volume" className="cursor-pointer" title="Volume">
          {Number(radioAudioState.radioAudio?.volume) * 100 === 0 ? (
            <VolumeX className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
          ) : Number(radioAudioState.radioAudio?.volume) * 100 <= 50 ? (
            <Volume1 className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
          ) : Number(radioAudioState.radioAudio?.volume) * 100 > 50 ? (
            <Volume2 className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
          ) : (
            <Loader2
              className="h-8 w-8 animate-spin opacity-80 hover:opacity-100"
              color="#eee"
            />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="flex w-44 items-center gap-x-2">
        <VolumeX size={20} />
        <Slider
          value={volume}
          max={100}
          step={1}
          onValueChange={adjustVolume}
        />
        <Volume2 size={20} />
      </PopoverContent>
    </Popover>
  );
}

function Footer({
  progress,
  isPlaying,
  isPreviewLoading,
  selectedTrack,
  audioRef,
  onStop,
}: FooterProps) {
  if (!isPlaying && !selectedTrack) {
    return null;
  }

  return (
    <>
      {isPlaying ? (
        <div className="fixed right-0 bottom-16 left-0 z-20 h-1 w-full bg-gray-200">
          <div
            id="music-preview-progress"
            className="h-full bg-rose-700"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      ) : null}
      <div
        className={`fixed right-0 bottom-0 left-0 z-20 flex w-full items-center justify-between gap-2 text-gray-600 backdrop-blur-lg ${!isPlaying ? "border-t" : ""}`}
      >
        <div className="flex gap-1">
          <div className="h-16 w-16 shrink-0 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="h-full w-full overflow-hidden rounded-md object-cover"
              src={selectedTrack?.artworkUrl100.replace("100x100", "600x600")}
              alt=""
            />
          </div>

          <div className="flex flex-col justify-between py-1 text-sm">
            <div className="w-36 overflow-hidden text-xs text-ellipsis whitespace-nowrap md:w-full">
              Music Preview
            </div>
            <div>
              <div
                title={selectedTrack?.trackName}
                className="w-36 overflow-hidden font-medium text-ellipsis whitespace-nowrap md:w-52"
              >
                {selectedTrack?.trackName}
              </div>
              <div
                title={selectedTrack?.artistName}
                className="w-36 overflow-hidden text-xs text-ellipsis whitespace-nowrap md:w-52"
              >
                {selectedTrack?.artistName}
              </div>
            </div>
          </div>
        </div>
        <div className="mr-5 flex shrink-0 gap-1 md:gap-2">
          {isPreviewLoading ? (
            <Loading className="h-8 w-8 animate-spin text-slate-600 opacity-80 hover:opacity-100" />
          ) : null}
          {isPlaying ? (
            <div onClick={onStop} className="cursor-pointer" title="Stop">
              <StopCircle className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
            </div>
          ) : null}
          {selectedTrack ? <VolumeControl audioRef={audioRef} /> : null}
        </div>
      </div>
    </>
  );
}

export default function MusicPreview() {
  const [defaultTopic] = useState(
    () => DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)],
  );
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get("q") || defaultTopic;
  const radioAudioState = useAtomValue(radioAudioStateAtom);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  const search = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length === 0) {
      return;
    }

    setTracks([]);
    setIsLoading(true);
    setIsNotFound(false);
    setSearchQuery(trimmedQuery);

    const resultMusicTracks = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL_V1}/api/music-track?q=${trimmedQuery}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      },
    ).then((res) => res.json());

    if (!resultMusicTracks.data) {
      setTracks([]);
      setIsLoading(false);
      setIsNotFound(true);
      return;
    }

    const nextTracks = resultMusicTracks.data.results as MusicTrack[];
    setTracks(nextTracks);
    setIsLoading(false);
    setIsNotFound(nextTracks.length === 0);

    history.pushState({}, "", `/apps/music-preview?q=${trimmedQuery}`);

    if (window && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: `Search music preview: ${trimmedQuery}`,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setIsPreviewLoading(false);
    setSelectedTrack(null);

    if (window && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: "Stop music preview",
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }, []);

  const play = useCallback(
    async (item: MusicTrack) => {
      const audio = audioRef.current;

      setSelectedTrack(item);
      setIsPreviewLoading(true);
      setIsPlaying(false);

      if (!audio) {
        return;
      }

      if (radioAudioState.isPlaying) {
        await stopMediaAudio();
      }

      audio.src = item.previewUrl;
      audio.currentTime = 0;

      const playPromise = audio.play();

      if (playPromise === undefined) {
        return;
      }

      playPromise
        .then(() => {
          setIsPlaying(true);
          setIsPreviewLoading(false);

          if (window && window.gtag) {
            window.gtag("event", "page_view", {
              page_title: `Play music preview: ${item.trackName} by ${item.artistName}`,
              page_location: window.location.href,
              page_path: window.location.pathname,
            });
          }
        })
        .catch(() => {
          setIsPlaying(false);
          setIsPreviewLoading(false);

          if (window && window.gtag) {
            window.gtag("event", "page_view", {
              page_title: `Error play music preview: ${item.trackName} by ${item.artistName}`,
              page_location: window.location.href,
              page_path: window.location.pathname,
            });
          }
        });
    },
    [radioAudioState.isPlaying],
  );

  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = 1.0;

    const handleTimeUpdate = () => {
      const nextProgress = (audio.currentTime / audio.duration) * 100;
      setProgress(Number.isNaN(nextProgress) ? 0 : nextProgress);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setIsPreviewLoading(false);
      setSelectedTrack(null);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.remove();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = radioAudioState.radioAudio?.volume ?? 1.0;
    }
  }, [radioAudioState.radioAudio?.volume]);

  useEffect(() => {
    if (queryParam.trim().length > 0) {
      void search(queryParam);
    }
  }, [queryParam, search]);

  return (
    <>
      <SearchBar
        isLoading={isLoading}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={(query) => {
          void search(query);
        }}
      />
      <div className="mt-11">
        <div className="flex flex-wrap gap-7 md:gap-9">
          <MusicList
            isLoading={isLoading}
            isPlaying={isPlaying}
            isPreviewLoading={isPreviewLoading}
            tracks={tracks}
            selectedTrack={selectedTrack}
            onPlay={(track) => {
              void play(track);
            }}
            onStop={stop}
          />
          <NotFound isNotFound={isNotFound} queryParam={queryParam} />
        </div>
      </div>
      <Footer
        progress={progress}
        isPlaying={isPlaying}
        isPreviewLoading={isPreviewLoading}
        selectedTrack={selectedTrack}
        audioRef={audioRef}
        onStop={stop}
      />
    </>
  );
}
