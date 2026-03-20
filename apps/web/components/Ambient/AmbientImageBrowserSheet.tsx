"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { backgroundImageStateAtom } from "@/data/store";
import type { Unsplash } from "@/data/type";
import { useAtomValue, useSetAtom } from "jotai";
import { Images, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AmbientImageBrowserSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type UnsplashSearchResponse = {
  status?: number;
  message?: string;
  data?: {
    results?: Unsplash[];
    total_pages?: number;
  };
};

const getPreferredWallpaperOrientation = () =>
  window.matchMedia("(max-width: 767px)").matches ? "portrait" : "landscape";

function normalizeUnsplashImage(data: Unsplash) {
  return {
    id: data.id,
    urls: data.urls,
    alt_description: data.alt_description,
    links: data.links,
    user: data.user,
    width: data.width,
    height: data.height,
  };
}

/* eslint-disable @next/next/no-img-element */
export default function AmbientImageBrowserSheet({
  open,
  onOpenChange,
}: AmbientImageBrowserSheetProps) {
  const backgroundImageState = useAtomValue(backgroundImageStateAtom);
  const setBackgroundImageState = useSetAtom(backgroundImageStateAtom);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const [isDesktopSheet, setIsDesktopSheet] = useState(false);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [images, setImages] = useState<Unsplash[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [applyingImageId, setApplyingImageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const hasSearched = submittedQuery.length > 0;
  const hasMoreResults =
    hasSearched && currentPage > 0 && currentPage < totalPages;
  const helperText = useMemo(() => {
    if (errorMessage) {
      return errorMessage;
    }

    if (!hasSearched) {
      return "Search Unsplash for a new ambient wallpaper.";
    }

    if (images.length === 0) {
      return `No images found for "${submittedQuery}".`;
    }

    return `${images.length} image${images.length === 1 ? "" : "s"} for "${submittedQuery}".`;
  }, [errorMessage, hasSearched, images.length, submittedQuery]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const syncDesktopSheet = () => {
      setIsDesktopSheet(mediaQuery.matches);
    };

    syncDesktopSheet();
    mediaQuery.addEventListener("change", syncDesktopSheet);

    return () => {
      mediaQuery.removeEventListener("change", syncDesktopSheet);
    };
  }, []);

  useEffect(() => {
    if (!applyingImageId) {
      return;
    }

    const currentImageId = backgroundImageState.randomBackgroundImage?.id;

    if (currentImageId !== applyingImageId) {
      return;
    }

    if (!backgroundImageState.isLoading) {
      setApplyingImageId(null);
    }
  }, [
    applyingImageId,
    backgroundImageState.isLoading,
    backgroundImageState.randomBackgroundImage?.id,
  ]);

  const fetchImages = useCallback(async (searchQuery: string, page: number) => {
    const orientation = getPreferredWallpaperOrientation();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL_V1}/api/background-image/search/unsplash?query=${encodeURIComponent(searchQuery)}&per_page=24&page=${page}&orientation=${orientation}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    const json = (await response.json()) as UnsplashSearchResponse;

    if (!response.ok || json?.status === 1) {
      throw new Error(json?.message || "Unable to search images right now.");
    }

    return {
      images: Array.isArray(json?.data?.results)
        ? (json.data.results as Unsplash[])
        : [],
      totalPages:
        typeof json?.data?.total_pages === "number" ? json.data.total_pages : 0,
    };
  }, []);

  const handleSearch = useCallback(
    async (rawQuery?: string) => {
      const nextQuery = (rawQuery ?? query).trim();
      const requestId = requestIdRef.current + 1;

      requestIdRef.current = requestId;

      if (!nextQuery) {
        setSubmittedQuery("");
        setImages([]);
        setErrorMessage(null);
        setCurrentPage(0);
        setTotalPages(0);
        return;
      }

      setIsSearching(true);
      setIsFetchingMore(false);
      setErrorMessage(null);
      setSubmittedQuery(nextQuery);
      setCurrentPage(0);
      setTotalPages(0);

      try {
        const result = await fetchImages(nextQuery, 1);

        if (requestIdRef.current !== requestId) {
          return;
        }

        setImages(result.images);
        setCurrentPage(result.images.length > 0 ? 1 : 0);
        setTotalPages(result.totalPages);
      } catch {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setImages([]);
        setErrorMessage("Unable to search images right now.");
        setCurrentPage(0);
        setTotalPages(0);
      } finally {
        if (requestIdRef.current === requestId) {
          setIsSearching(false);
        }
      }
    },
    [fetchImages, query],
  );

  const handleLoadMore = useCallback(async () => {
    if (
      isSearching ||
      isFetchingMore ||
      !hasMoreResults ||
      !submittedQuery.trim()
    ) {
      return;
    }

    const nextPage = currentPage + 1;
    setIsFetchingMore(true);

    try {
      const result = await fetchImages(submittedQuery, nextPage);

      setImages((prev) => {
        const next = new Map(prev.map((image) => [image.id, image]));

        for (const image of result.images) {
          next.set(image.id, image);
        }

        return Array.from(next.values());
      });
      setCurrentPage(nextPage);
      setTotalPages(result.totalPages);
    } catch {
      setErrorMessage("Unable to load more images right now.");
    } finally {
      setIsFetchingMore(false);
    }
  }, [
    currentPage,
    fetchImages,
    hasMoreResults,
    isFetchingMore,
    isSearching,
    submittedQuery,
  ]);

  useEffect(() => {
    if (!open || !hasMoreResults || isSearching || isFetchingMore) {
      return;
    }

    const root = resultsContainerRef.current;
    const target = loadMoreTriggerRef.current;

    if (!root || !target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void handleLoadMore();
        }
      },
      {
        root,
        rootMargin: "0px 0px 240px 0px",
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [handleLoadMore, hasMoreResults, isFetchingMore, isSearching, open]);

  const handleUseImage = useCallback(
    async (image: Unsplash) => {
      setApplyingImageId(image.id);
      setBackgroundImageState((prev) => ({
        ...prev,
        isFollowsCoverArt: false,
        isLoading: true,
        isLoaded: false,
        randomBackgroundImage: normalizeUnsplashImage(image),
      }));
      localStorage.setItem("randomBackgroundImageId", image.id);
    },
    [setBackgroundImageState],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 [&>button]:cursor-pointer"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchInputRef.current?.focus();
        }}
        style={
          isDesktopSheet
            ? {
                width: "33.333vw",
                maxWidth: "33.333vw",
              }
            : undefined
        }
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b px-4 py-4 text-left sm:px-6 sm:py-5">
            <SheetTitle className="flex items-center gap-2">
              <Images className="h-4 w-4" />
              Browse images
            </SheetTitle>
            <SheetDescription>{helperText}</SheetDescription>
          </SheetHeader>

          <div className="border-b px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSearch();
                  }
                }}
                placeholder="Search Unsplash images"
                className="w-full"
              />
              <Button
                type="button"
                onClick={() => {
                  void handleSearch();
                }}
                disabled={isSearching}
                className="cursor-pointer sm:min-w-28"
              >
                {isSearching ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Search data-icon="inline-start" />
                )}
                Search
              </Button>
            </div>
          </div>

          <div
            ref={resultsContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4 sm:px-6"
          >
            {!hasSearched && !isSearching ? (
              <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed">
                <div className="flex max-w-sm flex-col items-center gap-2 text-center">
                  <Images className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Search for a wallpaper</p>
                  <p className="text-sm text-muted-foreground">
                    On desktop, results are limited to landscape-oriented images
                    for ambient mode.
                  </p>
                </div>
              </div>
            ) : null}

            {hasSearched ? (
              <div className="flex flex-col gap-4">
                <div className="columns-1 gap-2.5 sm:columns-2 sm:gap-3">
                  {images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => {
                        void handleUseImage(image);
                      }}
                      className="group mb-2.5 block w-full cursor-pointer break-inside-avoid overflow-hidden rounded-xl border text-left transition hover:border-foreground/20 sm:mb-3"
                    >
                      <div className="relative bg-muted">
                        <img
                          src={
                            image.urls.regular ||
                            image.urls.full ||
                            image.urls.small
                          }
                          alt={image.alt_description || image.user.name}
                          className="relative z-0 block h-auto w-full transition duration-300 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-3 pt-10 pb-3 text-white">
                          <div className="min-w-0 pr-14">
                            <p className="truncate text-sm font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                              {image.user.name}
                            </p>
                            <p className="truncate text-xs whitespace-nowrap text-white/82 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                              {image.alt_description || "Unsplash photo"}
                            </p>
                          </div>
                          <span className="absolute right-3 bottom-3 inline-flex h-7 w-11 cursor-pointer items-center justify-center rounded-md border border-white/24 bg-black/18 px-2.5 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
                            {applyingImageId === image.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Use"
                            )}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {isFetchingMore ? (
                  <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading more images...
                  </div>
                ) : null}

                {hasMoreResults ? (
                  <div ref={loadMoreTriggerRef} className="h-4 w-full" />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
