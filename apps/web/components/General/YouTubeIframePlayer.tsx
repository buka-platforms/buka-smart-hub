"use client";

import { loadYouTubeIframeApi } from "@/lib/load-youtube-iframe-api";
import { useEffect, useRef } from "react";

type YTPlayer = {
  destroy(): void;
};

type YTPlayerOptions = {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: {
    autoplay?: 0 | 1;
    playsinline?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    showinfo?: 0 | 1;
    controls?: 0 | 1 | 2;
    origin?: string;
  };
  events?: {
    onError?: () => void;
  };
};

type YTNamespace = {
  Player: new (
    element: string | HTMLElement,
    options: YTPlayerOptions,
  ) => YTPlayer;
};

type YouTubeWindow = Window & {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
};

type Props = {
  videoId: string;
  title?: string;
  autoplay?: boolean;
  className?: string;
};

export default function YouTubeIframePlayer({
  videoId,
  title,
  autoplay = true,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeIframeApi().then(() => {
      if (cancelled || !containerRef.current) return;

      // Clean up any previous instance
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore
        }
        playerRef.current = null;
      }

      const w = window as YouTubeWindow;
      const origin = w.location.origin;

      playerRef.current = new w.YT!.Player(containerRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          showinfo: 0,
          controls: 1,
          origin,
        },
        events: {
          onError: () => {
            // Nothing fancy; let YouTube show its own UI
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore
        }
        playerRef.current = null;
      }
    };
  }, [videoId, autoplay]);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-label={title || "YouTube video player"}
    />
  );
}
