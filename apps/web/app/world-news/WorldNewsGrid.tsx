"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Channel = {
  id: string;
  name: string;
  source_id: string;
};

type Props = {
  channels: Channel[];
  embedOrigin: string;
};

type YouTubeCommand = "playVideo" | "pauseVideo" | "mute";

export default function WorldNewsGrid({ channels, embedOrigin }: Props) {
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const embedUrls = useMemo(() => {
    return Object.fromEntries(
      channels.map((channel) => [
        channel.id,
        `https://www.youtube.com/embed/${channel.source_id}?enablejsapi=1&playsinline=1&rel=0&origin=${encodeURIComponent(embedOrigin)}`,
      ]),
    );
  }, [channels, embedOrigin]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const sendCommandToAll = (command: YouTubeCommand) => {
    channels.forEach((channel) => {
      const iframe = iframeRefs.current[channel.id];
      const target = iframe?.contentWindow;
      if (!target) return;

      target.postMessage(
        JSON.stringify({
          event: "command",
          func: command,
          args: [],
        }),
        "*",
      );
    });
  };

  const playAllMuted = () => {
    sendCommandToAll("mute");
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
          <DropdownMenuContent align="end" container={containerRef.current}>
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
            <iframe
              ref={(el) => {
                iframeRefs.current[channel.id] = el;
              }}
              src={embedUrls[channel.id]}
              title={channel.name}
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
