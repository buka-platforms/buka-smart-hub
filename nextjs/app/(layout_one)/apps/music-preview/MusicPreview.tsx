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
import {
  isMediaAudioPlaying as isMediaAudioPlayingStore,
  mediaAudio as mediaAudioStore,
} from "@/data/store";
import { stop as stopMediaAudio } from "@/lib/audio";
import { useReadable } from "@/lib/react_use_svelte_store";
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
import React, { useCallback, useEffect, useState } from "react";
import { get, writable } from "svelte/store";

const selectedMusicTrackStore = writable(null as any);
const searchQueryStore = writable("");
const isMediaAudioMusicPreviewPlayingStore = writable(false);
const isMediaAudioMusicPreviewLoadingStore = writable(false);
const musicTrackPlayingProgressStore = writable(0);
const musicTracksStore = writable([] as any);
const isLoadingStore = writable(false);
const isNotFoundStore = writable(false);
const mediaAudioMusicPreviewStore = writable(null as HTMLAudioElement | null);

/* eslint-disable @next/next/no-img-element */
export default function MusicPreview() {
  const topics = [
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
  ];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || randomTopic;

  const search = useCallback(async (query: string) => {
    if (query.trim().length === 0) {
      return;
    }

    musicTracksStore.set([]);
    isLoadingStore.set(true);
    isNotFoundStore.set(false);

    if (query.trim().length === 0) {
      musicTracksStore.set([]);
      isNotFoundStore.set(false);
      return;
    }

    searchQueryStore.set(query);

    const resultMusicTracks = await fetch(
      `${process.env.NEXT_PUBLIC_BUKA_API_URL_V1}/music-track?q=${query}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      },
    ).then((res) => res.json());

    if (!resultMusicTracks.data) {
      musicTracksStore.set([]);
      isLoadingStore.set(false);
      isNotFoundStore.set(true);
      return;
    }

    musicTracksStore.set(resultMusicTracks.data.results);

    isLoadingStore.set(false);

    if (resultMusicTracks.data.results.length === 0) {
      isNotFoundStore.set(true);
    } else {
      isNotFoundStore.set(false);
    }

    // Push the query to the URL
    history.pushState({}, "", `/apps/music-preview?q=${query}`);

    // Send virtual page view event to Google Analytics
    if (window && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: `Search music preview: ${query}`,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }, []);

  const play = async (item: any) => {
    selectedMusicTrackStore.set(item);
    isMediaAudioMusicPreviewLoadingStore.set(true);
    isMediaAudioMusicPreviewPlayingStore.set(false);
    const mediaAudioMusicPreview = get(mediaAudioMusicPreviewStore);

    if (mediaAudioMusicPreview) {
      if (get(isMediaAudioPlayingStore)) {
        await stopMediaAudio();
      }

      mediaAudioMusicPreview.src = item.previewUrl;
      mediaAudioMusicPreview.currentTime = 0;

      mediaAudioMusicPreviewStore.set(mediaAudioMusicPreview);

      const playPromise = mediaAudioMusicPreview.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            isMediaAudioMusicPreviewPlayingStore.set(true);
            isMediaAudioMusicPreviewLoadingStore.set(false);

            // Send virtual page view event to Google Analytics
            if (window && window.gtag) {
              window.gtag("event", "page_view", {
                page_title: `Play music preview: ${item.trackName} by ${item.artistName}`,
                page_location: window.location.href,
                page_path: window.location.pathname,
              });
            }
          })
          .catch((error: any) => {
            isMediaAudioMusicPreviewPlayingStore.set(false);
            isMediaAudioMusicPreviewLoadingStore.set(false);

            console.error("Music Preview Error: ", error);

            // Send virtual page view event to Google Analytics
            if (window && window.gtag) {
              window.gtag("event", "page_view", {
                page_title: `Error play music preview: ${item.trackName} by ${item.artistName}`,
                page_location: window.location.href,
                page_path: window.location.pathname,
              });
            }
          });
      }
    }
  };

  const stop = async () => {
    const mediaAudioMusicPreview = get(mediaAudioMusicPreviewStore);

    if (mediaAudioMusicPreview) {
      mediaAudioMusicPreview.pause();
      mediaAudioMusicPreview.currentTime = 0;

      isMediaAudioMusicPreviewPlayingStore.set(false);
      isMediaAudioMusicPreviewLoadingStore.set(false);

      selectedMusicTrackStore.set(null);

      // Send virtual page view event to Google Analytics
      if (window && window.gtag) {
        window.gtag("event", "page_view", {
          page_title: `Stop music preview`,
          page_location: window.location.href,
          page_path: window.location.pathname,
        });
      }
    }
  };

  const Footer = () => {
    const selectedMusicTrack = useReadable(selectedMusicTrackStore);
    const isMediaAudioMusicPreviewPlaying = useReadable(
      isMediaAudioMusicPreviewPlayingStore,
    );
    const isMediaAudioMusicPreviewLoading = useReadable(
      isMediaAudioMusicPreviewLoadingStore,
    );

    const Stop = () => (
      <div onClick={stop} className="cursor-pointer" title="Stop">
        <StopCircle className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
      </div>
    );

    const Volume = () => {
      const mediaAudio = useReadable(mediaAudioStore);

      const [volume, setVolume] = useState([
        (mediaAudio?.volume as number) * 100 || 0,
      ]);

      const adjustVolume = useCallback((value: number[]) => {
        const mediaAudioMusicPreview = get(mediaAudioMusicPreviewStore);

        setVolume(value);

        // Adjust the volume of the audio on mediaAudioStore
        mediaAudioStore.update((ma) => {
          ma && (ma.volume = value[0] / 100);
          return ma;
        });

        // Adjust the volume of the audio on mediaAudioMusicPreview
        mediaAudioMusicPreview &&
          (mediaAudioMusicPreview.volume = value[0] / 100);

        // Save the volume to local storage
        localStorage.setItem("mediaAudioVolume", JSON.stringify(value[0]));
      }, []);

      return (
        <Popover>
          <PopoverTrigger>
            <div id="volume" className="cursor-pointer" title="Volume">
              {Number(mediaAudio?.volume) * 100 === 0 ? (
                <VolumeX className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
              ) : Number(mediaAudio?.volume) * 100 <= 50 ? (
                <Volume1 className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
              ) : Number(mediaAudio?.volume) * 100 > 50 ? (
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
    };

    const Progress = () => {
      const isMediaAudioMusicPreviewPlaying = useReadable(
        isMediaAudioMusicPreviewPlayingStore,
      );
      const musicTrackPlayingProgress = useReadable(
        musicTrackPlayingProgressStore,
      );

      if (!isMediaAudioMusicPreviewPlaying) {
        return null;
      }

      return (
        <>
          <div className="fixed right-0 bottom-16 left-0 z-20 h-1 w-full bg-gray-200">
            <div
              id="music-preview-progress"
              className={`h-full bg-rose-700`}
              style={{ width: `${musicTrackPlayingProgress}%` }}
            ></div>
          </div>
        </>
      );
    };

    if (!isMediaAudioMusicPreviewPlaying && !selectedMusicTrack) {
      return null;
    }

    return (
      <>
        <Progress />
        <div
          className={`fixed right-0 bottom-0 left-0 z-20 flex w-full items-center justify-between gap-2 text-gray-600 backdrop-blur-lg ${!isMediaAudioMusicPreviewPlaying ? "border-t" : ""}`}
        >
          <div className="flex gap-1">
            <div className="h-16 w-16 shrink-0 p-1">
              <img
                className="h-full w-full overflow-hidden rounded-md object-cover"
                src={selectedMusicTrack?.artworkUrl100.replace(
                  "100x100",
                  "600x600",
                )}
                alt=""
              />
            </div>

            <div className="flex flex-col justify-between py-1 text-sm">
              <div className="w-36 overflow-hidden text-xs text-ellipsis whitespace-nowrap md:w-full">
                Music Preview
              </div>
              <div>
                <div
                  title={selectedMusicTrack?.trackName as string}
                  className="w-36 overflow-hidden font-medium text-ellipsis whitespace-nowrap md:w-52"
                >
                  {selectedMusicTrack?.trackName}
                </div>
                <div
                  title={selectedMusicTrack?.artistName as string}
                  className="w-36 overflow-hidden text-xs text-ellipsis whitespace-nowrap md:w-52"
                >
                  {selectedMusicTrack?.artistName}
                </div>
              </div>
            </div>
          </div>
          <div className="mr-5 flex shrink-0 gap-1 md:gap-2">
            {isMediaAudioMusicPreviewLoading && (
              <Loading className="h-8 w-8 animate-spin text-slate-600 opacity-80 hover:opacity-100" />
            )}
            {isMediaAudioMusicPreviewPlaying && <Stop />}
            {selectedMusicTrack && <Volume />}
          </div>
        </div>
      </>
    );
  };

  const Item = ({ item }: any) => {
    const selectedMusicTrack = useReadable(selectedMusicTrackStore);
    const isMediaAudioMusicPreviewPlaying = useReadable(
      isMediaAudioMusicPreviewPlayingStore,
    );
    const isMediaAudioMusicPreviewLoading = useReadable(
      isMediaAudioMusicPreviewLoadingStore,
    );

    const [isTrackImageLoaded, setIsTrackImageLoaded] = useState(false);

    const handleTrackImageLoad = () => {
      setIsTrackImageLoaded(true);
    };

    return (
      <>
        <div className="w-24 cursor-pointer space-y-3 md:w-36">
          <div className="group relative h-24 w-24 overflow-hidden rounded-sm md:h-36 md:w-36">
            <img
              alt={`${item.trackName} by ${item.artistName} from ${item.collectionName}`}
              loading="lazy"
              decoding="async"
              className={`aspect-square h-full w-full object-scale-down transition-all ${isTrackImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
              src={item.artworkUrl100.replace("100x100", "600x600")}
              onLoad={handleTrackImageLoad}
            />
            <div
              className={`absolute top-0 left-0 h-full w-full items-center justify-center bg-black ${selectedMusicTrack?.trackId === item.trackId && (isMediaAudioMusicPreviewPlaying || isMediaAudioMusicPreviewLoading) ? "flex opacity-40" : "hidden group-hover:flex group-hover:opacity-40"}`}
            ></div>
            <div
              className={`absolute top-0 left-0 h-full w-full items-center justify-center group-hover:cursor-pointer ${selectedMusicTrack?.trackId === item.trackId && (isMediaAudioMusicPreviewPlaying || isMediaAudioMusicPreviewLoading) ? "flex" : "hidden group-hover:flex"}`}
            >
              {selectedMusicTrack?.trackId === item.trackId ? (
                !isMediaAudioMusicPreviewPlaying &&
                !isMediaAudioMusicPreviewLoading ? (
                  <CirclePlay
                    className="absolute h-10 w-10 text-slate-50"
                    onClick={() => play(item)}
                  />
                ) : isMediaAudioMusicPreviewLoading ? (
                  <LoaderCircle className="absolute h-10 w-10 animate-spin text-slate-50" />
                ) : isMediaAudioMusicPreviewPlaying ? (
                  <CircleStop
                    className="absolute h-10 w-10 text-slate-50"
                    onClick={stop}
                  />
                ) : null
              ) : (
                <CirclePlay
                  className="absolute h-10 w-10 text-slate-50"
                  onClick={() => play(item)}
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
      </>
    );
  };

  const List = () => {
    const tracks = useReadable(musicTracksStore);

    const ItemSkeleton = () => {
      const isLoading = useReadable(isLoadingStore);

      return (
        <>
          {isLoading ? (
            <>
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="w-24 space-y-3 md:w-36">
                  <div className="group relative h-24 w-24 overflow-hidden rounded-md md:h-36 md:w-36">
                    <Skeleton className="aspect-square h-full w-full rounded-md" />
                  </div>
                  <div className="space-y-1 text-sm">
                    <Skeleton className="h-4 w-full md:h-5" />
                    <Skeleton className="h-3 w-3/4 md:h-4" />
                  </div>
                </div>
              ))}
            </>
          ) : null}
        </>
      );
    };

    return (
      <>
        {tracks.map((item: any) => (
          <Item item={item} key={item.trackId} />
        ))}
        <ItemSkeleton />
      </>
    );
  };

  const Search = () => {
    const searchQuery = useReadable(searchQueryStore);
    const isLoading = useReadable(isLoadingStore);

    const changeSearchQuery = async (value: string) => {
      searchQueryStore.set(value);
    };

    return (
      <>
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
            onChange={(e) => changeSearchQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                search(e.currentTarget.value);
              }
            }}
          />
          <Button
            className="cursor-pointer"
            onClick={(e) => search(searchQuery)}
          >
            Search
          </Button>
        </div>
      </>
    );
  };

  const NotFound = () => {
    const isNotFound = useReadable(isNotFoundStore);

    return (
      <>
        {isNotFound ? (
          <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center gap-3">
            <Frown className="h-8 w-8" />
            <div className="text-center text-sm">
              Your search for <strong>{queryParam}</strong> did not return any
              results.
            </div>
          </div>
        ) : null}
      </>
    );
  };

  const handleTimeUpdate = () => {
    const mediaAudioMusicPreview = get(mediaAudioMusicPreviewStore);

    if (mediaAudioMusicPreview) {
      const duration = mediaAudioMusicPreview.duration;
      const currentTime = mediaAudioMusicPreview.currentTime;
      const progress = (currentTime / duration) * 100;

      // If progress is NaN, set it to 0
      if (isNaN(progress)) {
        musicTrackPlayingProgressStore.set(0);
      } else {
        musicTrackPlayingProgressStore.set(progress);
      }
    }
  };

  const handleEnded = () => {
    isMediaAudioMusicPreviewPlayingStore.set(false);
    isMediaAudioMusicPreviewLoadingStore.set(false);
    selectedMusicTrackStore.set(null);
  };

  useEffect(() => {
    searchQueryStore.set(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const mediaAudioMusicPreview = get(mediaAudioMusicPreviewStore);

    if (!mediaAudioMusicPreview) {
      const audio = new Audio();
      audio.volume = get(mediaAudioStore)?.volume ?? 1.0;
      mediaAudioMusicPreviewStore.set(audio);

      get(mediaAudioMusicPreviewStore)?.addEventListener(
        "timeupdate",
        handleTimeUpdate,
      );
      get(mediaAudioMusicPreviewStore)?.addEventListener("ended", handleEnded);
    } else {
      mediaAudioMusicPreview.volume = get(mediaAudioStore)?.volume ?? 1.0;
    }

    return () => {
      if (mediaAudioMusicPreview) {
        // Remove event listeners
        get(mediaAudioMusicPreviewStore)?.removeEventListener(
          "timeupdate",
          handleTimeUpdate,
        );
        get(mediaAudioMusicPreviewStore)?.removeEventListener(
          "ended",
          handleEnded,
        );
      }
    };
  }, []);

  useEffect(() => {
    if (
      get(searchQueryStore).trim() !== "" &&
      get(searchQueryStore).trim().length > 0
    ) {
      search(get(searchQueryStore));
    }

    // Do unmount cleanup
    return () => {
      musicTracksStore.set([]);
      searchQueryStore.set("");
      selectedMusicTrackStore.set(null);
      isMediaAudioMusicPreviewPlayingStore.set(false);
      isMediaAudioMusicPreviewLoadingStore.set(false);
      musicTrackPlayingProgressStore.set(0);
      isNotFoundStore.set(false);
      isLoadingStore.set(false);

      // Pause the audio element
      get(mediaAudioMusicPreviewStore)?.pause();

      // Destroy the audio element
      get(mediaAudioMusicPreviewStore)?.remove();

      mediaAudioMusicPreviewStore.set(null);
    };
  }, [search]);

  return (
    <>
      <Search />
      <div className="mt-11">
        <div className="flex flex-wrap gap-7 md:gap-9">
          <List />
          <NotFound />
        </div>
      </div>
      <Footer />
    </>
  );
}
