"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { isMediaAudioPlaying as isMediaAudioPlayingStore } from "@/data/store";
import { stop as stopMediaAudio } from "@/lib/audio";
import { useReadable } from "@/lib/react_use_svelte_store";
import {
  CirclePlay,
  CircleX,
  Frown,
  LoaderCircle,
  Search as SearchIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { get, writable } from "svelte/store";

const selectedMovieTrackStore = writable(null as any);
const searchQueryStore = writable("");
const movieTracksStore = writable([] as any);
const isLoadingStore = writable(false);
const isNotFoundStore = writable(false);
const isPlayerOpenStore = writable(false);
const isReadyToPlayStore = writable(false);

/* eslint-disable @next/next/no-img-element */
export default function MoviePreview() {
  const topics = [
    "angelina jolie",
    "brad pitt",
    "matt damon",
    "scarlett johansson",
    "robert downey jr",
    "leonardo dicaprio",
    "tom cruise",
    "will smith",
    "johnny depp",
    "jennifer aniston",
    "robert pattinson",
    "chris hemsworth",
    "gal gadot",
    "ryan reynolds",
    "dwayne johnson",
    "stephen king",
    "james cameron",
    "christopher nolan",
    "martin scorsese",
    "quentin tarantino",
    "george lucas",
    "steven spielberg",
    "tim burton",
    "peter jackson",
    "ridley scott",
    "zack snyder",
    "joss whedon",
    "michael bay",
    "james wan",
  ];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || randomTopic;

  const search = useCallback(async (query: string) => {
    if (query.trim().length === 0) {
      return;
    }

    movieTracksStore.set([]);
    isLoadingStore.set(true);
    isNotFoundStore.set(false);

    if (query.trim().length === 0) {
      movieTracksStore.set([]);
      isNotFoundStore.set(false);
      return;
    }

    searchQueryStore.set(query);

    const resultMovieTracks = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL_V1}/movie-track?q=${query}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      },
    ).then((res) => res.json());

    if (!resultMovieTracks.data) {
      movieTracksStore.set([]);
      isLoadingStore.set(false);
      isNotFoundStore.set(true);
      return;
    }

    movieTracksStore.set(resultMovieTracks.data.results);

    isLoadingStore.set(false);

    if (resultMovieTracks.data.results.length === 0) {
      isNotFoundStore.set(true);
    } else {
      isNotFoundStore.set(false);
    }

    // Push the query to the URL
    history.pushState({}, "", `/apps/movie-preview?q=${query}`);

    // Send virtual page view event to Google Analytics
    if (window && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: `Search movie preview: ${query}`,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }, []);

  const Player = () => {
    const isPlayerOpen = useReadable(isPlayerOpenStore);
    const selectedMovieTrack = useReadable(selectedMovieTrackStore);
    const videoRef = useRef<HTMLVideoElement>(null);
    const isReadyToPlay = useReadable(isReadyToPlayStore);

    const close = () => {
      isPlayerOpenStore.set(false);
      document.body.style.overflow = "auto";
      selectedMovieTrackStore.set(null);
    };

    const play = () => {
      isReadyToPlayStore.set(true);
    };

    useEffect(() => {
      const videoElement = videoRef.current;

      if (videoElement) {
        videoElement.src = selectedMovieTrack.previewUrl;
        videoElement.load();
        videoElement.play().catch((error) => {
          console.error("Error playing video:", error);
        });

        // Send virtual page view event to Google Analytics
        if (window && window.gtag) {
          window.gtag("event", "page_view", {
            page_title: `Play movie preview: ${selectedMovieTrack.trackName} by ${selectedMovieTrack.artistName}`,
            page_location: window.location.href,
            page_path: window.location.pathname,
          });
        }
      }

      return () => {
        if (videoElement) {
          videoElement.pause();
          videoElement.currentTime = 0;
          isReadyToPlayStore.set(false);
        }
      };
    }, [selectedMovieTrack]);

    useEffect(() => {
      if (isPlayerOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "auto";
      }

      return () => {
        document.body.style.overflow = "auto";
      };
    }, [isPlayerOpen]);

    if (!isPlayerOpen) {
      return null;
    }

    return (
      <>
        <div className="fixed top-0 left-0 z-20 flex h-screen w-full items-center justify-center overflow-hidden bg-black text-white">
          <div className="absolute top-5 right-5 left-5 flex items-center justify-end gap-x-3">
            <span className="text-sm md:text-base">
              {selectedMovieTrack.trackName} &middot;{" "}
              {selectedMovieTrack.artistName} &middot;{" "}
              {selectedMovieTrack.releaseDate.substring(0, 4)} &middot;{" "}
              {selectedMovieTrack.primaryGenreName}
            </span>
            <CircleX
              onClick={close}
              className="h-6 w-6 shrink-0 cursor-pointer md:h-10 md:w-10"
            />
          </div>
          {!isReadyToPlay ? (
            <LoaderCircle className="h-10 w-10 animate-spin" />
          ) : null}
          <video
            className={isReadyToPlay ? "block" : "hidden"}
            ref={videoRef}
            controls
            onPlaying={play}
            onEnded={close}
          ></video>
        </div>
      </>
    );
  };

  const Item = ({ item }: any) => {
    const selectedMovieTrack = useReadable(selectedMovieTrackStore);

    const [isTrackImageLoaded, setIsTrackImageLoaded] = useState(false);

    const handleTrackImageLoad = () => {
      setIsTrackImageLoaded(true);
    };

    const playVideo = async (item: any) => {
      if (get(isMediaAudioPlayingStore)) {
        await stopMediaAudio();
      }

      selectedMovieTrackStore.set(item);
      isPlayerOpenStore.set(true);
    };

    return (
      <>
        <div className="w-20 cursor-pointer space-y-3 md:w-32">
          <div className="group relative flex h-28 w-20 items-start justify-start md:h-40 md:w-32">
            <img
              alt={`${item.trackName} by ${item.artistName} from ${item.collectionName}`}
              loading="lazy"
              decoding="async"
              className={`max-h-full max-w-fit rounded-sm object-contain transition-all ${isTrackImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
              src={item.artworkUrl100.replace("100x100", "600x600")}
              onLoad={handleTrackImageLoad}
            />
            {item.previewUrl ? (
              <>
                <div
                  className={`absolute top-0 left-0 h-full w-full items-center justify-center bg-black ${selectedMovieTrack?.trackId === item.trackId ? "flex opacity-40" : "hidden group-hover:flex group-hover:opacity-40"}`}
                ></div>
                <div
                  className={`absolute top-0 left-0 h-full w-full items-center justify-center group-hover:cursor-pointer ${selectedMovieTrack?.trackId === item.trackId ? "flex" : "hidden group-hover:flex"}`}
                >
                  <CirclePlay
                    className="absolute h-10 w-10 text-slate-50"
                    onClick={() => playVideo(item)}
                  />
                </div>
              </>
            ) : null}
          </div>
          <div className="space-y-1 text-sm">
            <a href={item.trackViewUrl} target="_blank">
              <h3
                className="truncate-3-lines leading-tight font-medium"
                title={item.trackName}
              >
                {item.trackName}
              </h3>
            </a>
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
    const tracks = useReadable(movieTracksStore);

    const ItemSkeleton = () => {
      const isLoading = useReadable(isLoadingStore);

      return (
        <>
          {isLoading ? (
            <>
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="w-20 space-y-3 md:w-32">
                  <div className="group relative h-28 w-20 rounded-md md:h-40 md:w-32">
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
            placeholder="Search movies by name..."
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

  useEffect(() => {
    searchQueryStore.set(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (
      get(searchQueryStore).trim() !== "" &&
      get(searchQueryStore).trim().length > 0
    ) {
      search(get(searchQueryStore));
    }

    // Do unmount cleanup
    return () => {
      movieTracksStore.set([]);
      searchQueryStore.set("");
      selectedMovieTrackStore.set(null);
      isNotFoundStore.set(false);
      isLoadingStore.set(false);
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
      <Player />
    </>
  );
}
