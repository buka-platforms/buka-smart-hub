"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Channel = {
  id: string;
  slug: string;
  name: string;
  country: string;
  source_id: string;
};

type Props = {
  channels: Channel[];
  defaultChannels: Channel[];
  embedOrigin: string;
};

type YouTubeCommand = "playVideo" | "pauseVideo" | "mute" | "unMute";

const MAX_CHANNELS = 8;
const STORAGE_KEY = "world-news:selected-channel-ids:v1";

function getDefaultSelectedIds(channels: Channel[]) {
  return channels.map((channel) => channel.id).slice(0, MAX_CHANNELS);
}

function sanitizeSelectedIds(
  candidateIds: string[],
  availableIds: Set<string>,
) {
  return candidateIds
    .filter((id, idx) => candidateIds.indexOf(id) === idx)
    .filter((id) => availableIds.has(id))
    .slice(0, MAX_CHANNELS);
}

export default function WorldNewsGrid({
  channels,
  defaultChannels,
  embedOrigin,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playersRef = useRef<Record<string, any>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>(() => {
    const availableIds = new Set(channels.map((channel) => channel.id));
    const defaultIds = sanitizeSelectedIds(
      getDefaultSelectedIds(defaultChannels),
      availableIds,
    );

    if (typeof window === "undefined") {
      return defaultIds;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultIds;

    try {
      const parsed = JSON.parse(raw);
      const candidateIds = Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [];
      const sanitizedIds = sanitizeSelectedIds(candidateIds, availableIds);
      return sanitizedIds.length > 0 ? sanitizedIds : defaultIds;
    } catch {
      return defaultIds;
    }
  });

  // embedUrls removed — using programmatic YT.Player instances instead
  const selectedChannels = useMemo(() => {
    const selectedSet = new Set(selectedChannelIds);
    const selected = channels.filter((channel) => selectedSet.has(channel.id));

    // Preserve the user-selected ordering first, then append any missing channels.
    const selectedById = new Map(
      selected.map((channel) => [channel.id, channel]),
    );
    return selectedChannelIds
      .map((id) => selectedById.get(id))
      .filter((channel): channel is Channel => Boolean(channel));
  }, [channels, selectedChannelIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedChannelIds));
  }, [selectedChannelIds]);

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
    setContainerElement(containerRef.current);
  }, []);

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

      selectedChannels.forEach((c) => {
        const elId = `yt-${c.id}`;
        if (playersRef.current[c.id]?.destroy) {
          playersRef.current[c.id].destroy();
        }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.values(playersRef.current).forEach((p: any) => {
        if (p && p.destroy) p.destroy();
      });
      playersRef.current = {};
    };
  }, [selectedChannels, embedOrigin]);

  const sendCommandToAll = (command: YouTubeCommand) => {
    selectedChannels.forEach((channel) => {
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

  const toggleChannel = (channelId: string, checked: boolean) => {
    setSelectedChannelIds((prev) => {
      if (checked) {
        if (prev.includes(channelId) || prev.length >= MAX_CHANNELS)
          return prev;
        return [...prev, channelId];
      }

      if (prev.length <= 1) return prev;
      return prev.filter((id) => id !== channelId);
    });
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

  return (
    <div
      ref={containerRef}
      className="container mx-auto flex h-[calc(100vh-4rem)] flex-col overflow-hidden p-2 md:p-4"
    >
      <div className="mb-2 flex shrink-0 items-center justify-end">
        <span className="mr-2 text-xs text-muted-foreground">
          Selected channels: {selectedChannels.length}/{MAX_CHANNELS}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="cursor-pointer">
              Select Action
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            container={containerElement}
            className="max-h-[70vh] w-[20rem] overflow-y-auto"
          >
            <DropdownMenuItem className="cursor-pointer" onClick={playAll}>
              <Play className="mr-2 h-4 w-4" />
              Play All
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={playAllMuted}>
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
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="mr-2 h-4 w-4" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Fullscreen
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Display Channels (max {MAX_CHANNELS})
            </DropdownMenuLabel>
            {channels.map((channel) => {
              const isSelected = selectedChannelIds.includes(channel.id);
              const reachedMax =
                !isSelected && selectedChannelIds.length >= MAX_CHANNELS;
              const isLastSelected =
                isSelected && selectedChannelIds.length <= 1;

              return (
                <DropdownMenuCheckboxItem
                  key={channel.id}
                  checked={isSelected}
                  disabled={reachedMax || isLastSelected}
                  onCheckedChange={(checked) =>
                    toggleChannel(channel.id, checked === true)
                  }
                  onSelect={(event) => event.preventDefault()}
                  className="cursor-pointer"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{channel.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {channel.country}
                    </span>
                  </div>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        {selectedChannels.map((channel) => (
          <div
            key={channel.id}
            className="relative h-full w-full overflow-hidden rounded-lg border"
          >
            <div
              id={`yt-${channel.id}`}
              title={channel.name}
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
