"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Frown, LoaderCircle, Search as SearchIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

const DEFAULT_TOPICS = [
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
] as const;

interface BookTrack {
  trackId: string;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  releaseDate: string;
  trackViewUrl: string;
}

type SearchBarProps = {
  isLoading: boolean;
  searchQuery: string;
  onSearch: (query: string) => void;
  onSearchQueryChange: (value: string) => void;
};

type BookListProps = {
  isLoading: boolean;
  tracks: BookTrack[];
};

function SearchBar({
  isLoading,
  searchQuery,
  onSearch,
  onSearchQueryChange,
}: SearchBarProps) {
  return (
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

function BookItem({ item }: { item: BookTrack }) {
  const [isTrackImageLoaded, setIsTrackImageLoaded] = useState(false);

  return (
    <a href={item.trackViewUrl} target="_blank" rel="noreferrer">
      <div className="w-20 cursor-pointer space-y-3 md:w-32">
        <div className="group relative flex h-28 w-20 items-start justify-start md:h-40 md:w-32">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`${item.trackName} by ${item.artistName} from ${item.collectionName}`}
            loading="lazy"
            decoding="async"
            className={`max-h-full max-w-fit rounded-sm object-contain transition-all ${isTrackImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
            src={item.artworkUrl100.replace("100x100", "600x600")}
            onLoad={() => setIsTrackImageLoaded(true)}
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
  );
}

function BookList({ isLoading, tracks }: BookListProps) {
  return (
    <>
      {tracks.map((item) => (
        <BookItem item={item} key={item.trackId} />
      ))}
      {isLoading
        ? Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="w-20 space-y-3 md:w-32">
              <div className="group relative h-28 w-20 rounded-md md:h-40 md:w-32">
                <Skeleton className="h-full w-full rounded-md" />
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

export default function BookPreview() {
  const [defaultTopic] = useState(
    () => DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)],
  );
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get("q") || defaultTopic;

  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<BookTrack[]>([]);
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

    const resultBookTracks = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL_V1}/api/book-track?q=${trimmedQuery}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      },
    ).then((res) => res.json());

    if (!resultBookTracks.data) {
      setTracks([]);
      setIsLoading(false);
      setIsNotFound(true);
      return;
    }

    const nextTracks = resultBookTracks.data.results as BookTrack[];
    setTracks(nextTracks);
    setIsLoading(false);
    setIsNotFound(nextTracks.length === 0);

    history.pushState({}, "", `/apps/book-preview?q=${trimmedQuery}`);

    if (window && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: `Search book preview: ${trimmedQuery}`,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }, []);

  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

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
        onSearch={(query) => {
          void search(query);
        }}
        onSearchQueryChange={setSearchQuery}
      />
      <div className="mt-11">
        <div className="flex flex-wrap gap-7 md:gap-9">
          <BookList isLoading={isLoading} tracks={tracks} />
          <NotFound isNotFound={isNotFound} queryParam={queryParam} />
        </div>
      </div>
    </>
  );
}
