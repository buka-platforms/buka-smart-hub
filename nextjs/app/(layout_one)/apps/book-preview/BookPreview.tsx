"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useReadable } from "@/lib/react-use-svelte-store";
import { Frown, LoaderCircle, Search as SearchIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { get, writable } from "svelte/store";

const searchQueryStore = writable("");
/* eslint-disable @typescript-eslint/no-explicit-any */
const bookTracksStore = writable([] as any);
const isLoadingStore = writable(false);
const isNotFoundStore = writable(false);

/* eslint-disable @next/next/no-img-element */
export default function BookPreview() {
  const topics = [
    "mystery",
    "thriller",
    "comedy",
    "management",
    "kids",
    "art",
    "life",
    "love",
    "history",
    "science",
    "technology",
    "business",
    "health",
    "travel",
    "food",
    "sports",
    "politics",
  ];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || randomTopic;

  const search = useCallback(async (query: string) => {
    if (query.trim().length === 0) {
      return;
    }

    bookTracksStore.set([]);
    isLoadingStore.set(true);
    isNotFoundStore.set(false);

    if (query.trim().length === 0) {
      bookTracksStore.set([]);
      isNotFoundStore.set(false);
      return;
    }

    searchQueryStore.set(query);

    const resultBookTracks = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL_V1}/book-track?q=${query}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      },
    ).then((res) => res.json());

    if (!resultBookTracks.data) {
      bookTracksStore.set([]);
      isLoadingStore.set(false);
      isNotFoundStore.set(true);
      return;
    }

    bookTracksStore.set(resultBookTracks.data.results);

    isLoadingStore.set(false);

    if (resultBookTracks.data.results.length === 0) {
      isNotFoundStore.set(true);
    } else {
      isNotFoundStore.set(false);
    }

    // Push the query to the URL
    history.pushState({}, "", `/apps/book-preview?q=${query}`);

    // Send virtual page view event to Google Analytics
    if (window && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: `Search book preview: ${query}`,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }, []);

  const Item = ({ item }: any) => {
    const [isTrackImageLoaded, setIsTrackImageLoaded] = useState(false);

    const handleTrackImageLoad = () => {
      setIsTrackImageLoaded(true);
    };

    return (
      <>
        <a href={item.trackViewUrl} target="_blank">
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
            </div>
          </div>
        </a>
      </>
    );
  };

  const List = () => {
    const tracks = useReadable(bookTracksStore);

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
            placeholder="Search books by title or author..."
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
            onClick={() => search(searchQuery)}
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
      bookTracksStore.set([]);
      searchQueryStore.set("");
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
    </>
  );
}
