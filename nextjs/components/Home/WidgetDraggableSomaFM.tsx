"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  calculateAutoArrangePositions,
  getSavedWidgetPosition,
  saveWidgetPosition,
} from "@/lib/widget-positions";
import {
  ControlFrom,
  controls,
  events,
  position as positionPlugin,
  useCompartment,
  useDraggable,
} from "@neodrag/react";
import { MoreHorizontal, Waves } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SomaFMChannel {
  id: string;
  title: string;
  description: string;
  dj: string;
  listeners: number;
  updated: string;
  playlist: string;
  genre: string;
  image: string;
  largeimage: string;
  twitter: string;
  stream: string[];
}

export default function WidgetDraggableSomaFM() {
  const draggableRef = useRef<HTMLDivElement>(null);
  const [channels, setChannels] = useState<SomaFMChannel[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetch("/api/somafm-channels")
      .then((res) => res.json())
      .then((data) => {
        setChannels(data.channels || []);
        setSelected(data.channels?.[0]?.id || "");
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load channels");
        setLoading(false);
      });
  }, []);

  // Load position from localStorage on mount
  useEffect(() => {
    const saved = getSavedWidgetPosition("somafm");
    queueMicrotask(() => {
      if (saved) {
        setPosition(saved);
      } else {
        const positions = calculateAutoArrangePositions();
        setPosition(positions.somafm || { x: 0, y: 0 });
      }
      setIsPositionLoaded(true);
    });
  }, []);

  // Listen for widget position reset events
  useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent<
        Record<string, { x: number; y: number }>
      >;
      if (customEvent.detail?.somafm) {
        setPosition(customEvent.detail.somafm);
      } else {
        const positions = calculateAutoArrangePositions();
        setPosition(positions.somafm || { x: 0, y: 0 });
      }
    };
    window.addEventListener("widget-positions-reset", handleReset);
    return () =>
      window.removeEventListener("widget-positions-reset", handleReset);
  }, []);

  // Handle drag end to save position
  const handleDragEnd = useCallback(
    (data: { offset: { x: number; y: number } }) => {
      const newPosition = { x: data.offset.x, y: data.offset.y };
      setPosition(newPosition);
      saveWidgetPosition("somafm", newPosition.x, newPosition.y);
    },
    [],
  );

  // Reactive position plugin
  const positionCompartment = useCompartment(
    () => positionPlugin({ current: position }),
    [position.x, position.y],
  );

  useDraggable(draggableRef, () => [
    controls({ block: ControlFrom.selector("a, button, select") }),
    events({ onDragEnd: handleDragEnd }),
    positionCompartment,
  ]);

  const currentChannel = channels.find((c) => c.id === selected);
  // Use direct mp3 stream URL as per SomaFM docs
  const streamUrl = currentChannel?.id
    ? `https://ice1.somafm.com/${currentChannel.id}-128-mp3`
    : "";
  const isVisible = isPositionLoaded;

  return (
    <DropdownMenu>
      <div
        ref={draggableRef}
        data-widget-id="somafm"
        className={`pointer-events-auto absolute z-50 flex transform-gpu cursor-grab rounded-lg bg-black/80 shadow-lg backdrop-blur-md transition-opacity duration-300 will-change-transform data-[neodrag-state=dragging]:cursor-grabbing data-[neodrag-state=dragging]:shadow-none ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical "SomaFM" Label */}
        <div className="flex items-center justify-center border-r border-white/10 px-1">
          <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
            SomaFM
          </span>
        </div>

        {/* Main Column */}
        <div className="flex w-80 flex-col">
          {/* Player Row */}
          <div className="flex items-center gap-3 p-3">
            {/* Channel Art */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white/10">
              {currentChannel && currentChannel.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="pointer-events-none h-full w-full object-contain"
                  src={currentChannel.image}
                  alt={currentChannel.title}
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <Waves className="h-8 w-8 text-white/40" />
              )}
            </div>

            {/* Channel Info */}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/somafm.png"
                  alt="SomaFM"
                  className="h-5 w-5"
                />
                <span className="block overflow-hidden text-xs text-white/60">
                  SomaFM Radio
                </span>
              </div>
              <select
                className="mt-1 mb-1 w-full rounded border bg-black/30 p-1 text-xs text-white"
                value={selected}
                onChange={(e) => {
                  const wasPlaying =
                    audioRef.current && !audioRef.current.paused;
                  setSelected(e.target.value);
                  setTimeout(() => {
                    try {
                      audioRef.current?.pause();
                      audioRef.current?.load();
                      if (wasPlaying) {
                        audioRef.current?.play();
                      }
                    } catch {}
                  }, 0);
                }}
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              {currentChannel && (
                <span className="truncate text-xs font-medium text-white">
                  {currentChannel.title}
                </span>
              )}
            </div>
          </div>

          {/* Channel Description & DJ */}
          {currentChannel && (
            <div className="px-3 pb-2">
              <div className="mb-1 truncate text-xs text-white/70">
                {currentChannel.description}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-white/50">
                <span>DJ: {currentChannel.dj}</span>
                <span>|</span>
                <span>Listeners: {currentChannel.listeners}</span>
              </div>
            </div>
          )}

          {/* Audio Player */}
          <div className="px-3 pb-2">
            {streamUrl && (
              <audio
                ref={audioRef}
                src={streamUrl}
                controls
                className="w-full"
              />
            )}
          </div>

          {/* Separator and action bar */}
          <div className="border-t border-white/10" />
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] leading-tight">
            <a
              href="https://somafm.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
              title="Open SomaFM website"
            >
              <Waves className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">More</span>
            </a>
            <div className="ml-auto">
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
                  title="More options"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
            </div>
          </div>
        </div>
      </div>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-40">
        <DropdownMenuItem
          onSelect={() => {
            const positions = calculateAutoArrangePositions();
            setPosition(positions.somafm || { x: 0, y: 0 });
            saveWidgetPosition(
              "somafm",
              positions.somafm?.x || 0,
              positions.somafm?.y || 0,
            );
          }}
        >
          Reset widget position
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
