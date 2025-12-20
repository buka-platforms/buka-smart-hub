"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { mediaAudioStateAtom, radioStationStateAtom } from "@/data/store";
import type { RadioStation } from "@/data/type";
import { play, stop } from "@/lib/audio";
import { useReadable } from "@/lib/react_use_svelte_store";
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
import { useEffect, useState } from "react";
import { get, writable } from "svelte/store";

const searchQueryStore = writable("");
const pageStore = writable(1);
const isLoadingStore = writable(false);
const isReachingEndPageStore = writable(false);
const radioStationsStore = writable([] as RadioStation[]);
const isNotFoundStore = writable(false);

const getInitialRadioStations = async (query: string) => {
  isLoadingStore.set(true);
  isNotFoundStore.set(false);

  let queryUrl = `${process.env.NEXT_PUBLIC_API_URL_V1}/radio-stations`;

  if (query.trim().length > 0) {
    queryUrl += `?q=${query}`;
  }

  await fetch(`${queryUrl}`, {
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
  }).then(async (res) => {
    const results = await res.json();
    radioStationsStore.set(results.data.data);
    isLoadingStore.set(false);

    // Detect if radio stations are not found
    if (results.data.data.length === 0) {
      isNotFoundStore.set(true);
    } else {
      isNotFoundStore.set(false);
    }

    // Detect if reaching the end of the page
    if (results.data.next_page_url === null) {
      isReachingEndPageStore.set(true);
    } else {
      isReachingEndPageStore.set(false);
    }
  });
};

/* eslint-disable @next/next/no-img-element */
const Item = ({ item }: { item: RadioStation }) => {
  const mediaAudioState = useAtomValue(mediaAudioStateAtom);

  const radioStationState = useAtomValue(radioStationStateAtom);
  const setRadioStationState = useSetAtom(radioStationStateAtom);

  const [isRadioStationLogoLoaded, setIsRadioStationLogoLoaded] =
    useState(false);

  const playSelected = async (radioStation: RadioStation) => {
    if (mediaAudioState.isLoading) {
      return;
    } else {
      await stop();
    }

    setRadioStationState((prev) => ({
      ...prev,
      radioStation: radioStation,
    }));

    await play(false);
  };

  const handleRadioStationImageLoad = () => {
    setIsRadioStationLogoLoaded(true);
  };

  return (
    <>
      <div className="w-full space-y-3">
        <div className="group relative overflow-hidden rounded-md border border-slate-200 p-2">
          <img
            alt={`${item?.name} from ${item?.country?.name_alias}`}
            loading="lazy"
            decoding="async"
            className={`aspect-square h-full w-full rounded-md object-scale-down transition-all ${isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
            src={item?.logo}
            onLoad={handleRadioStationImageLoad}
          />
          <div
            className={`absolute top-0 left-0 h-full w-full items-center justify-center bg-black ${radioStationState.radioStation?.id === item.id && (mediaAudioState.isPlaying || mediaAudioState.isLoading) ? "flex opacity-40" : "hidden group-hover:flex group-hover:opacity-40"}`}
          ></div>
          <div
            className={`absolute top-0 left-0 h-full w-full items-center justify-center group-hover:cursor-pointer ${radioStationState.radioStation?.id === item.id && (mediaAudioState.isPlaying || mediaAudioState.isLoading) ? "flex" : "hidden group-hover:flex"}`}
          >
            {radioStationState.radioStation?.id === item.id ? (
              !mediaAudioState.isPlaying && !mediaAudioState.isLoading ? (
                <CirclePlay
                  className="absolute h-10 w-10 text-slate-50"
                  onClick={() => playSelected(item)}
                />
              ) : mediaAudioState.isLoading ? (
                <LoaderCircle className="absolute h-10 w-10 animate-spin text-slate-50" />
              ) : mediaAudioState.isPlaying ? (
                <CircleStop
                  className="absolute h-10 w-10 text-slate-50"
                  onClick={stop}
                />
              ) : null
            ) : (
              <CirclePlay
                className="absolute h-10 w-10 text-slate-50"
                onClick={() => playSelected(item)}
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
    </>
  );
};

const List = () => {
  const radioStations = useReadable(radioStationsStore);

  const ItemSkeleton = () => {
    const isLoading = useReadable(isLoadingStore);

    return (
      <>
        {isLoading ? (
          <>
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="w-full space-y-3">
                <div className="group relative overflow-hidden rounded-md border border-slate-200 p-2">
                  <Skeleton className="aspect-square h-full w-full rounded-md" />
                </div>
                <div className="space-y-1 text-sm">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
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
      {radioStations?.map((item: RadioStation) => (
        <Item item={item} key={item.id} />
      ))}
      <ItemSkeleton />
    </>
  );
};

const Search = () => {
  const searchQuery = useReadable(searchQueryStore);
  const isLoading = useReadable(isLoadingStore);
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const changeSearchQuery = async (value: string) => {
    searchQueryStore.set(value);
  };

  const resetFilter = () => {
    radioStationsStore.set([]);
    searchQueryStore.set("");
    isNotFoundStore.set(false);
    getInitialRadioStations("");
    history.pushState({}, "", "/apps/radio");
  };

  const search = (query: string) => {
    if (query.trim() === "") {
      return;
    }

    radioStationsStore.set([]);
    getInitialRadioStations(query);

    // Push the query to the URL
    history.pushState({}, "", `/apps/radio?q=${query}`);
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
          placeholder="Search radio stations..."
          className="flex w-full items-center pl-8 leading-9"
          value={searchQuery}
          onChange={(e) => changeSearchQuery(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              search(searchQuery);
            }
          }}
        />
        <Button className="cursor-pointer" onClick={() => search(searchQuery)}>
          Search
        </Button>
      </div>
      {queryParam ? (
        <div className="mt-1 flex self-start">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={resetFilter}
            className="cursor-pointer"
          >
            Reset filter
          </Button>
        </div>
      ) : null}
    </>
  );
};

const LoadMore = () => {
  const isLoading = useReadable(isLoadingStore);
  const isReachingEndPage = useReadable(isReachingEndPageStore);
  const radioStations = useReadable(radioStationsStore);

  const loadMoreRadioStations = async () => {
    if (isLoading) {
      return;
    }

    // Set loading state to true
    isLoadingStore.set(true);

    // Increment the page number
    pageStore.set(get(pageStore) + 1);

    let queryUrl = `${process.env.NEXT_PUBLIC_API_URL_V1}/radio-stations?page=${get(pageStore)}`;

    if (get(searchQueryStore).trim().length > 0) {
      queryUrl += `&q=${get(searchQueryStore)}`;
    }

    // Fetch the next radio stations
    const results = await fetch(`${queryUrl}`, {
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
    }).then((res) => res.json());

    // Detect page that has less than 25 radio stations, meaning it's the last page
    if (results.data.next_page_url === null) {
      // Set some state
      isReachingEndPageStore.set(true);
      isLoadingStore.set(false);

      // Append new radio stations to the existing radio stations
      radioStationsStore.update((prevRadioStations) => [
        ...prevRadioStations,
        ...results.data.data,
      ]);

      return;
    }

    // Append new radio stations to the existing radio stations
    radioStationsStore.update((prevRadioStations) => [
      ...prevRadioStations,
      ...results.data.data,
    ]);

    isLoadingStore.set(false);
  };

  return (
    <>
      {radioStations.length > 0 && !isReachingEndPage ? (
        <div className="mt-14 flex w-full items-center">
          <Button
            variant="outline"
            size="default"
            type="button"
            className="mx-auto mt-3 w-36 cursor-pointer gap-1.5"
            onClick={loadMoreRadioStations}
          >
            {isLoading ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      ) : null}
    </>
  );
};

const NotFound = () => {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";

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

export default function RadioStations() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  useEffect(() => {
    searchQueryStore.set(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (
      get(searchQueryStore).trim() !== "" &&
      get(searchQueryStore).trim().length > 0
    ) {
      getInitialRadioStations(get(searchQueryStore));
    } else {
      getInitialRadioStations("");
    }

    // Do unmount cleanup
    return () => {
      radioStationsStore.set([]);
      searchQueryStore.set("");
      isLoadingStore.set(false);
      isReachingEndPageStore.set(false);
      isNotFoundStore.set(false);
    };
  }, []);

  return (
    <>
      <div className="mt-7">
        <Search />
        <div className="mt-11">
          <div className="mb-4 grid gap-4 sm:grid-cols-2 md:mb-8 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            <List />
          </div>
          <div className="flex flex-wrap gap-7 md:gap-9">
            <NotFound />
          </div>
          <LoadMore />
        </div>
      </div>
    </>
  );
}
