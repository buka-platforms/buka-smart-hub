"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  jotaiStore,
  radioAudioStateAtom,
  radioStationStateAtom,
} from "@/data/store";
import type { RadioStation } from "@/data/type";
import { play, stop } from "@/lib/radio-audio";
import { useAtomValue, useSetAtom } from "jotai";
import {
  CirclePlay,
  CircleStop,
  Frown,
  LoaderCircle,
  Search as SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type RadioStationsResponse = {
  data: {
    data: RadioStation[];
    next_page_url: string | null;
  };
};

type SearchBarProps = {
  isLoading: boolean;
  searchQuery: string;
  showReset: boolean;
  onReset: () => void;
  onSearch: (query: string) => void;
  onSearchQueryChange: (value: string) => void;
};

type RadioListProps = {
  isLoading: boolean;
  stations: RadioStation[];
};

type LoadMoreProps = {
  isLoading: boolean;
  isReachingEndPage: boolean;
  stationCount: number;
  onLoadMore: () => void;
};

async function fetchRadioStations(
  query: string,
  page: number,
): Promise<RadioStationsResponse> {
  let queryUrl = `${process.env.NEXT_PUBLIC_API_URL_V1}/api/radio-stations`;

  if (page > 1) {
    queryUrl += `?page=${page}`;
  }

  if (query.trim().length > 0) {
    queryUrl += page > 1 ? `&q=${query}` : `?q=${query}`;
  }

  return fetch(queryUrl, {
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json());
}

function RadioStationItem({ item }: { item: RadioStation }) {
  const radioAudioState = useAtomValue(radioAudioStateAtom);
  const radioStationState = useAtomValue(radioStationStateAtom);
  const setRadioStationState = useSetAtom(radioStationStateAtom);
  const [isRadioStationLogoLoaded, setIsRadioStationLogoLoaded] =
    useState(false);

  const playSelected = useCallback(
    async (radioStation: RadioStation) => {
      if (radioAudioState.isLoading) {
        return;
      }

      setRadioStationState((prev) => ({
        ...prev,
        radioStation,
      }));

      jotaiStore.set(radioAudioStateAtom, (prev) => ({
        ...prev,
        isLoading: true,
        isPlaying: false,
      }));

      await stop({
        preserveLoading: true,
        resumeIdleMetadata: false,
      });

      await play(false);
    },
    [radioAudioState.isLoading, setRadioStationState],
  );

  return (
    <div className="w-full space-y-3">
      <div className="group relative overflow-hidden rounded-md border border-slate-200 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={`${item.name} from ${item.country.name_alias}`}
          loading="lazy"
          decoding="async"
          className={`aspect-square h-full w-full rounded-md object-scale-down transition-all ${isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
          src={item.logo}
          onLoad={() => setIsRadioStationLogoLoaded(true)}
        />
        <div
          className={`absolute top-0 left-0 h-full w-full items-center justify-center bg-black ${radioStationState.radioStation?.id === item.id && (radioAudioState.isPlaying || radioAudioState.isLoading) ? "flex opacity-40" : "hidden group-hover:flex group-hover:opacity-40"}`}
        ></div>
        <div
          className={`absolute top-0 left-0 h-full w-full items-center justify-center group-hover:cursor-pointer ${radioStationState.radioStation?.id === item.id && (radioAudioState.isPlaying || radioAudioState.isLoading) ? "flex" : "hidden group-hover:flex"}`}
        >
          {radioStationState.radioStation?.id === item.id ? (
            !radioAudioState.isPlaying && !radioAudioState.isLoading ? (
              <CirclePlay
                className="absolute h-10 w-10 text-slate-50"
                onClick={() => void playSelected(item)}
              />
            ) : radioAudioState.isLoading ? (
              <LoaderCircle className="absolute h-10 w-10 animate-spin text-slate-50" />
            ) : radioAudioState.isPlaying ? (
              <CircleStop
                className="absolute h-10 w-10 text-slate-50"
                onClick={() => void stop()}
              />
            ) : null
          ) : (
            <CirclePlay
              className="absolute h-10 w-10 text-slate-50"
              onClick={() => void playSelected(item)}
            />
          )}
        </div>
      </div>
      <div className="space-y-1 text-sm">
        <h3
          className="truncate-3-lines leading-tight font-medium"
          title={item.name}
        >
          <Link href={`/radio/${item.slug}`}>{item.name}</Link>
        </h3>
        <p
          className="truncate-3-lines text-xs text-muted-foreground"
          title={item.country.name_alias}
        >
          {item.country.name_alias}
        </p>
      </div>
    </div>
  );
}

function RadioList({ isLoading, stations }: RadioListProps) {
  return (
    <>
      {stations.map((item) => (
        <RadioStationItem item={item} key={item.id} />
      ))}
      {isLoading
        ? Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="w-full space-y-3">
              <div className="group relative overflow-hidden rounded-md border border-slate-200 p-2">
                <Skeleton className="aspect-square h-full w-full rounded-md" />
              </div>
              <div className="space-y-1 text-sm">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))
        : null}
    </>
  );
}

function SearchBar({
  isLoading,
  searchQuery,
  showReset,
  onReset,
  onSearch,
  onSearchQueryChange,
}: SearchBarProps) {
  return (
    <>
      <div className="relative flex w-full items-center gap-x-1 md:w-1/2">
        {isLoading ? (
          <LoaderCircle className="absolute left-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <SearchIcon className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          placeholder="Search radio stations..."
          className="flex w-full items-center pl-8 leading-9"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSearch(searchQuery);
            }
          }}
        />
        <Button
          className="cursor-pointer"
          onClick={() => onSearch(searchQuery)}
        >
          Search
        </Button>
      </div>
      {showReset ? (
        <div className="mt-1 flex self-start">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onReset}
            className="cursor-pointer"
          >
            Reset filter
          </Button>
        </div>
      ) : null}
    </>
  );
}

function LoadMore({
  isLoading,
  isReachingEndPage,
  stationCount,
  onLoadMore,
}: LoadMoreProps) {
  if (stationCount === 0 || isReachingEndPage) {
    return null;
  }

  return (
    <div className="mt-14 flex w-full items-center">
      <Button
        variant="outline"
        size="default"
        type="button"
        className="mx-auto mt-3 w-36 cursor-pointer gap-1.5"
        onClick={onLoadMore}
      >
        {isLoading ? (
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          "Load more"
        )}
      </Button>
    </div>
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

export default function RadioStations() {
  const searchParams = useSearchParams();
  const queryParam = searchParams?.get("q") || "";

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isReachingEndPage, setIsReachingEndPage] = useState(false);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isNotFound, setIsNotFound] = useState(false);

  const loadInitialStations = useCallback(async (query: string) => {
    setIsLoading(true);
    setIsNotFound(false);
    setIsReachingEndPage(false);
    setPage(1);

    const results = await fetchRadioStations(query, 1);
    const nextStations = results.data.data;

    setStations(nextStations);
    setIsLoading(false);
    setIsNotFound(nextStations.length === 0);
    setIsReachingEndPage(results.data.next_page_url === null);
  }, []);

  const runSearch = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim();

      if (trimmedQuery === "") {
        return;
      }

      await loadInitialStations(trimmedQuery);
      setSearchQuery(trimmedQuery);
      history.pushState({}, "", `/apps/radio?q=${trimmedQuery}`);
    },
    [loadInitialStations],
  );

  const resetFilter = useCallback(async () => {
    setSearchQuery("");
    setStations([]);
    setIsNotFound(false);
    history.pushState({}, "", "/apps/radio");
    await loadInitialStations("");
  }, [loadInitialStations]);

  const loadMoreRadioStations = useCallback(async () => {
    if (isLoading || isReachingEndPage) {
      return;
    }

    const nextPage = page + 1;
    setIsLoading(true);

    const results = await fetchRadioStations(searchQuery, nextPage);
    const nextStations = results.data.data;

    setPage(nextPage);
    setStations((prevStations) => [...prevStations, ...nextStations]);
    setIsReachingEndPage(results.data.next_page_url === null);
    setIsLoading(false);
  }, [isLoading, isReachingEndPage, page, searchQuery]);

  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    void loadInitialStations(queryParam);
  }, [loadInitialStations, queryParam]);

  return (
    <div className="mt-7">
      <SearchBar
        isLoading={isLoading}
        searchQuery={searchQuery}
        showReset={queryParam !== ""}
        onReset={() => {
          void resetFilter();
        }}
        onSearch={(query) => {
          void runSearch(query);
        }}
        onSearchQueryChange={setSearchQuery}
      />
      <div className="mt-11">
        <div className="mb-4 grid gap-4 sm:grid-cols-2 md:mb-8 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          <RadioList isLoading={isLoading} stations={stations} />
        </div>
        <div className="flex flex-wrap gap-7 md:gap-9">
          <NotFound isNotFound={isNotFound} queryParam={queryParam} />
        </div>
        <LoadMore
          isLoading={isLoading}
          isReachingEndPage={isReachingEndPage}
          stationCount={stations.length}
          onLoadMore={() => {
            void loadMoreRadioStations();
          }}
        />
      </div>
    </div>
  );
}
