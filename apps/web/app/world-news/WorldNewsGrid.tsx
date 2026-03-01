"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Channel = {
  id: string;
  name: string;
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

  // embedUrls removed — using programmatic YT.Player instances instead

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

      channels.forEach((c) => {
        const elId = `yt-${c.id}`;
        if (playersRef.current[c.id]?.destroy) {
          playersRef.current[c.id].destroy();
        }
        playersRef.current[c.id] = new YT.Player(elId, {
          videoId: c.source_id,
          playerVars: { origin: embedOrigin, rel: 0, playsinline: 1 },
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

  return (
    <div
      ref={containerRef}
      className="container mx-auto flex h-[calc(100vh-4rem)] flex-col overflow-hidden p-2 md:p-4"
    >
      <div className="mb-2 flex shrink-0 items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="cursor-pointer">
              Select Action
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" container={containerElement}>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        {channels.map((channel) => (
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
