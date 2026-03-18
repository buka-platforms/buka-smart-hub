"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, Maximize2, Minimize2, Pause, Play, X } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
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
  channels: Channel[];
  embedOrigin: string;
};

type YouTubeCommand = "playVideo" | "pauseVideo" | "mute" | "unMute";

export default function WorldNewsGrid({ channels, embedOrigin }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playersRef = useRef<Record<string, any>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerElement, setContainerElement] =
    useState<HTMLDivElement | null>(null);
  const isEmbedded = useSyncExternalStore(
    () => () => {},
    () => window.parent !== window,
    () => false,
  );
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerElement(node);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
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

      channels.forEach((c) => {
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
  }, [channels, embedOrigin]);

  const sendCommandToAll = (command: YouTubeCommand) => {
    channels.forEach((channel) => {
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

  return (
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
                <DropdownMenuItem className="cursor-pointer" onClick={playAll}>
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
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="overflow-hidden rounded-lg border border-white/10 bg-black/55 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white md:text-base">
                  {channel.name}
                </h2>
                <p className="text-xs tracking-[0.08em] text-white/55 uppercase">
                  {channel.country}
                </p>
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
        ))}
      </div>
    </div>
  );
}
