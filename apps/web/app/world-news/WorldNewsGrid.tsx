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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  Home,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type Channel = {
  id: string;
  slug: string;
  name: string;
  country: string;
  source_id: string;
};

type Props = {
  allChannels: Channel[];
  defaultChannelIds: string[];
  embedOrigin: string;
};

type YouTubeCommand = "playVideo" | "pauseVideo" | "mute" | "unMute";

type ChannelPickerState = {
  mode: "add" | "replace";
  tileIndex: number | null;
};

const MAX_VISIBLE_CHANNELS = 8;
const VISIBLE_CHANNELS_STORAGE_KEY = "world-news:visible-channel-ids:v1";

function sanitizeChannelIds(candidateIds: string[], availableIds: Set<string>) {
  return candidateIds
    .filter((id, index) => candidateIds.indexOf(id) === index)
    .filter((id) => availableIds.has(id))
    .slice(0, MAX_VISIBLE_CHANNELS);
}

export default function WorldNewsGrid({
  allChannels,
  defaultChannelIds,
  embedOrigin,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playersRef = useRef<Record<string, any>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const didHydrateVisibleChannelsRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [channelPickerState, setChannelPickerState] =
    useState<ChannelPickerState | null>(null);
  const isEmbedded = useSyncExternalStore(
    () => () => {},
    () => window.parent !== window,
    () => false,
  );
  const availableChannelIds = useMemo(
    () => new Set(allChannels.map((channel) => channel.id)),
    [allChannels],
  );
  const fallbackChannelIds = useMemo(
    () =>
      allChannels.map((channel) => channel.id).slice(0, MAX_VISIBLE_CHANNELS),
    [allChannels],
  );
  const initialVisibleChannelIds = useMemo(() => {
    const preferred = sanitizeChannelIds(
      defaultChannelIds,
      availableChannelIds,
    );
    if (preferred.length > 0) return preferred;
    return sanitizeChannelIds(fallbackChannelIds, availableChannelIds);
  }, [availableChannelIds, defaultChannelIds, fallbackChannelIds]);
  const [visibleChannelIds, setVisibleChannelIds] = useState<string[]>(
    initialVisibleChannelIds,
  );
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerElement(node);
  }, []);
  const allChannelsById = useMemo(
    () => new Map(allChannels.map((channel) => [channel.id, channel])),
    [allChannels],
  );
  const visibleChannels = useMemo(
    () =>
      visibleChannelIds
        .map((channelId) => allChannelsById.get(channelId))
        .filter((channel): channel is Channel => Boolean(channel)),
    [allChannelsById, visibleChannelIds],
  );
  const visibleChannelIdSet = useMemo(
    () => new Set(visibleChannelIds),
    [visibleChannelIds],
  );
  const pickerTargetChannelId =
    channelPickerState?.tileIndex != null
      ? (visibleChannelIds[channelPickerState.tileIndex] ?? null)
      : null;
  const pickerTargetChannel = pickerTargetChannelId
    ? (allChannelsById.get(pickerTargetChannelId) ?? null)
    : null;
  const commandItemClass =
    "cursor-pointer rounded-lg border border-transparent px-3 py-3 text-white aria-disabled:cursor-not-allowed data-[selected=true]:border-white/10 data-[selected=true]:bg-white/8 data-[selected=true]:text-white";

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (didHydrateVisibleChannelsRef.current) return;
    if (typeof window === "undefined") return;

    let nextVisibleIds = initialVisibleChannelIds;
    const raw = window.localStorage.getItem(VISIBLE_CHANNELS_STORAGE_KEY);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const savedIds = Array.isArray(parsed)
          ? parsed.filter((id): id is string => typeof id === "string")
          : [];
        const sanitizedSavedIds = sanitizeChannelIds(
          savedIds,
          availableChannelIds,
        );
        if (sanitizedSavedIds.length > 0) {
          nextVisibleIds = sanitizedSavedIds;
        }
      } catch {
        nextVisibleIds = initialVisibleChannelIds;
      }
    }

    setVisibleChannelIds((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(nextVisibleIds)) return prev;
      return nextVisibleIds;
    });
    didHydrateVisibleChannelsRef.current = true;
  }, [availableChannelIds, initialVisibleChannelIds]);

  useEffect(() => {
    if (!didHydrateVisibleChannelsRef.current) return;

    setVisibleChannelIds((prev) => {
      const sanitizedIds = sanitizeChannelIds(prev, availableChannelIds);
      const nextVisibleIds =
        sanitizedIds.length > 0 ? sanitizedIds : initialVisibleChannelIds;

      if (JSON.stringify(prev) === JSON.stringify(nextVisibleIds)) return prev;
      return nextVisibleIds;
    });
  }, [availableChannelIds, initialVisibleChannelIds]);

  useEffect(() => {
    if (!didHydrateVisibleChannelsRef.current) return;
    if (typeof window === "undefined") return;

    const sanitizedIds = sanitizeChannelIds(
      visibleChannelIds,
      availableChannelIds,
    );
    window.localStorage.setItem(
      VISIBLE_CHANNELS_STORAGE_KEY,
      JSON.stringify(sanitizedIds),
    );
  }, [availableChannelIds, visibleChannelIds]);

  // Load YouTube IFrame API and create players
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function loadYouTubeAPI(): Promise<any> {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).YT && (window as any).YT.Player) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return resolve((window as any).YT);
      }

      const existing = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      );
      if (!existing) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(s);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).onYouTubeIframeAPIReady = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolve((window as any).YT);
      };
    });
  }

  useEffect(() => {
    let mounted = true;

    loadYouTubeAPI().then((YT) => {
      if (!mounted) return;

      const nextVisibleIds = new Set(
        visibleChannels.map((channel) => channel.id),
      );

      Object.keys(playersRef.current).forEach((channelId) => {
        if (nextVisibleIds.has(channelId)) return;

        const player = playersRef.current[channelId];
        if (player?.destroy) player.destroy();
        delete playersRef.current[channelId];
      });

      visibleChannels.forEach((c) => {
        if (playersRef.current[c.id]) return;

        const elId = `yt-${c.id}`;
        playersRef.current[c.id] = new YT.Player(elId, {
          host: "https://www.youtube-nocookie.com",
          videoId: c.source_id,
          playerVars: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            origin: embedOrigin || (window as any).location?.origin,
            rel: 0,
            playsinline: 1,
          },
          events: {
            onReady: () => {},
            onStateChange: () => {},
            onError: () => {},
          },
        });
      });
    });

    return () => {
      mounted = false;
    };
  }, [embedOrigin, visibleChannels]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.values(playersRef.current).forEach((p: any) => {
        if (p && p.destroy) p.destroy();
      });
      playersRef.current = {};
    };
  }, []);

  const sendCommandToAll = (command: YouTubeCommand) => {
    visibleChannels.forEach((channel) => {
      const player = playersRef.current[channel.id];
      if (!player) return;

      switch (command) {
        case "playVideo":
          player.playVideo?.();
          break;
        case "pauseVideo":
          player.pauseVideo?.();
          break;
        case "mute":
          player.mute?.();
          break;
        case "unMute":
          player.unMute?.();
          break;
      }
    });
  };

  const playAllMuted = () => {
    sendCommandToAll("mute");
    sendCommandToAll("playVideo");
  };

  const playAll = () => {
    sendCommandToAll("unMute");
    sendCommandToAll("playVideo");
  };

  const closeChannelPicker = () => {
    setChannelPickerState(null);
  };

  const openAddChannelPicker = (tileIndex: number | null) => {
    if (visibleChannelIds.length >= MAX_VISIBLE_CHANNELS) return;
    setChannelPickerState({ mode: "add", tileIndex });
  };

  const openReplaceChannelPicker = (tileIndex: number) => {
    setChannelPickerState({ mode: "replace", tileIndex });
  };

  const removeChannel = (channelId: string) => {
    setVisibleChannelIds((prev) => prev.filter((id) => id !== channelId));
  };

  const selectChannelFromPicker = (nextChannelId: string) => {
    if (!channelPickerState) return;

    setVisibleChannelIds((prev) => {
      const nextVisibleIds = [...prev];
      const targetIndex = channelPickerState.tileIndex;

      if (channelPickerState.mode === "add") {
        if (
          nextVisibleIds.includes(nextChannelId) ||
          nextVisibleIds.length >= MAX_VISIBLE_CHANNELS
        ) {
          return prev;
        }

        const insertIndex =
          targetIndex == null
            ? nextVisibleIds.length
            : Math.min(targetIndex + 1, nextVisibleIds.length);
        nextVisibleIds.splice(insertIndex, 0, nextChannelId);
        return nextVisibleIds;
      }

      if (
        targetIndex == null ||
        targetIndex < 0 ||
        targetIndex >= nextVisibleIds.length
      ) {
        return prev;
      }

      if (
        nextVisibleIds[targetIndex] === nextChannelId ||
        nextVisibleIds.includes(nextChannelId)
      ) {
        return prev;
      }

      nextVisibleIds[targetIndex] = nextChannelId;
      return nextVisibleIds;
    });

    closeChannelPicker();
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      await container.requestFullscreen();
      setIsFullscreen(true);
      return;
    }

    await document.exitFullscreen();
    setIsFullscreen(false);
  };

  const closeModal = () => {
    if (!isEmbedded) return;
    window.parent.postMessage(
      { type: "WORLD_NEWS_CLOSE_MODAL" },
      window.location.origin,
    );
  };

  const pickerDescription = channelPickerState
    ? channelPickerState.mode === "replace"
      ? `Replace ${pickerTargetChannel?.name ?? "this channel"} with another live channel source.`
      : `Add another live news channel. You can show up to ${MAX_VISIBLE_CHANNELS} tiles at once.`
    : "";

  return (
    <>
      <div
        ref={setContainerRef}
        className={
          isEmbedded
            ? "h-screen w-full overflow-y-auto px-0 py-0 [scrollbar-color:rgba(255,255,255,0.22)_rgba(255,255,255,0.04)] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:bg-clip-padding [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5"
            : "container mx-auto max-w-450 px-3 py-4 md:px-4 md:py-6"
        }
      >
        <div
          className={
            isEmbedded
              ? "sticky top-0 z-20 mb-4 border-b border-white/10 bg-black/85 px-3 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl md:mb-5 md:px-4"
              : "mb-4 rounded-lg border border-white/10 bg-black/55 px-3 py-3 shadow-2xl backdrop-blur-xl md:mb-6 md:px-4"
          }
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-white md:text-xl">
                  World News
                </h1>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-white/65">
                Watch live news from around the world.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="cursor-pointer">
                    Select Action
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  container={containerElement ?? undefined}
                  className="max-h-[70vh] w-[20rem] overflow-y-auto"
                >
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={playAll}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Play All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={playAllMuted}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Play All (Muted)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => sendCommandToAll("pauseVideo")}
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Pause All
                  </DropdownMenuItem>
                  {!isEmbedded ? (
                    <>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={toggleFullscreen}
                      >
                        {isFullscreen ? (
                          <span className="inline-flex items-center">
                            <Minimize2 className="mr-2 h-4 w-4" />
                            Exit Fullscreen
                          </span>
                        ) : (
                          <span className="inline-flex items-center">
                            <Maximize2 className="mr-2 h-4 w-4" />
                            Fullscreen
                          </span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href="/">
                          <Home className="mr-2 h-4 w-4" />
                          Back to Home
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
              {isEmbedded ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="cursor-pointer"
                  onClick={closeModal}
                  aria-label="Close world news modal"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="cursor-pointer"
                >
                  <Link href="/" aria-label="Back to home" title="Back to Home">
                    <Home className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div
          className={
            isEmbedded
              ? "grid grid-cols-1 gap-3 px-3 pb-3 sm:grid-cols-2 md:gap-4 md:px-4 md:pb-4 lg:grid-cols-3 xl:grid-cols-4"
              : "grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4"
          }
        >
          {visibleChannels.length > 0 ? (
            visibleChannels.map((channel, index) => (
              <div
                key={channel.id}
                className="overflow-hidden rounded-lg border border-white/10 bg-black/55 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
              >
                <div className="border-b border-white/10 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-white md:text-base">
                        {channel.name}
                      </h2>
                      <p className="text-xs tracking-[0.08em] text-white/55 uppercase">
                        {channel.country}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 cursor-pointer rounded-full text-white/60 hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white"
                          aria-label={`Manage ${channel.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={8}
                        container={containerElement ?? undefined}
                        className="w-48"
                      >
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => openReplaceChannelPicker(index)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Replace Channel
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400"
                          onClick={() => removeChannel(channel.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Channel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="relative aspect-video w-full bg-black">
                  <div
                    id={`yt-${channel.id}`}
                    title={channel.name}
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
              </div>
            ))
          ) : (
            <></>
          )}

          {visibleChannels.length < MAX_VISIBLE_CHANNELS ? (
            <button
              type="button"
              onClick={() => openAddChannelPicker(null)}
              className="group cursor-pointer overflow-hidden rounded-lg border border-dashed border-white/12 bg-black/30 text-left shadow-[0_20px_60px_rgba(0,0,0,0.18)] transition-colors **:cursor-pointer hover:border-white/22 hover:bg-black/40"
            >
              <div className="flex aspect-video w-full items-center justify-center px-6 text-center">
                <div>
                  <span className="mx-auto flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/75 transition-colors group-hover:border-white/20 group-hover:bg-white/10 group-hover:text-white">
                    <Plus className="h-5 w-5" />
                  </span>
                  <span className="mt-4 block text-sm font-semibold text-white">
                    Add Channel
                  </span>
                  <span className="mt-1 block max-w-52 text-xs text-white/55">
                    Fill this slot with a live channel.
                  </span>
                </div>
              </div>
            </button>
          ) : null}
        </div>
      </div>

      <Dialog
        open={Boolean(channelPickerState)}
        onOpenChange={(open) => {
          if (!open) closeChannelPicker();
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl gap-0 border-white/10 bg-[#0c0c10]/95 p-0 text-white shadow-2xl backdrop-blur-xl">
          <DialogHeader className="border-b border-white/10 px-4 py-3 text-left">
            <DialogTitle className="text-base text-white">
              {channelPickerState?.mode === "replace"
                ? "Replace Channel"
                : "Add Channel"}
            </DialogTitle>
            <DialogDescription className="text-sm text-white/55">
              {pickerDescription}
            </DialogDescription>
          </DialogHeader>
          <Command className="border-0 bg-transparent text-white **:[[cmdk-input-wrapper]]:border-white/10 **:[[cmdk-input-wrapper]]:bg-transparent">
            <CommandInput
              placeholder="Search channels..."
              className="h-auto py-2 text-sm text-white placeholder:text-white/35"
            />
            <CommandList className="max-h-[min(70vh,34rem)] overflow-y-auto bg-transparent p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5">
              <CommandEmpty className="px-3 py-6 text-sm text-white/55">
                No channels found.
              </CommandEmpty>
              {allChannels.map((channel) => {
                const isCurrentChannel = channel.id === pickerTargetChannelId;
                const isVisibleElsewhere =
                  visibleChannelIdSet.has(channel.id) && !isCurrentChannel;
                const isDisabled =
                  channelPickerState?.mode === "add"
                    ? visibleChannelIdSet.has(channel.id)
                    : isVisibleElsewhere || isCurrentChannel;

                return (
                  <CommandItem
                    key={channel.id}
                    value={`${channel.name} ${channel.country} ${channel.slug}`}
                    disabled={isDisabled}
                    onSelect={() => {
                      if (!isDisabled) selectChannelFromPicker(channel.id);
                    }}
                    className={`${commandItemClass} ${
                      isDisabled ? "opacity-55" : ""
                    }`}
                  >
                    <div className="flex w-full items-center gap-3">
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[13px] font-medium text-white">
                          {channel.name}
                        </span>
                        <span className="truncate text-[11px] text-white/45">
                          {channel.country}
                        </span>
                      </div>
                      {isCurrentChannel ? (
                        <span className="rounded-full border border-white/10 bg-white/6 px-2 py-1 text-[10px] font-medium text-white/55 uppercase">
                          Current
                        </span>
                      ) : isVisibleElsewhere ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/6 px-2 py-1 text-[10px] font-medium text-white/65 uppercase">
                          <Check className="h-3 w-3" />
                          On Screen
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-white/35 uppercase">
                          Available
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
