"use client";

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  calculateAutoArrangePositions,
  getSavedWidgetPosition,
  saveWidgetPosition,
  setWidgetMeasuredHeight,
} from "@/lib/widget-positions";
import {
  ControlFrom,
  controls,
  events,
  position as positionPlugin,
  useCompartment,
  useDraggable,
} from "@neodrag/react";
import {
  Disc3,
  LoaderCircle,
  MoreHorizontal,
  Music2,
  Pause,
  Play as PlayIcon,
  User,
  Users,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

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
  lastPlaying: string;
}

export default function WidgetDraggableSomaFM() {
  const draggableRef = useRef<HTMLDivElement>(null);
  const [channels, setChannels] = useState<SomaFMChannel[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(1);
  const [nowPlaying, setNowPlaying] = useState<{
    title: string;
    artist: string;
    album?: string;
    albumArt?: string;
  } | null>(null);

  useEffect(() => {
    fetch("https://somafm.com/channels.json")
      .then((res) => res.json())
      .then((data) => {
        // Sort channels alphabetically by title for display
        const sortedChannels = (data.channels || [])
          .slice()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .sort((a: any, b: any) => a.title.localeCompare(b.title));
        setChannels(sortedChannels);
        // Find the channel with the most listeners
        const mostListenersChannel = (data.channels || []).slice().sort(
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          (a: any, b: any) =>
            (Number(b.listeners) || 0) - (Number(a.listeners) || 0),
        )[0];
        setSelected(mostListenersChannel?.id || sortedChannels?.[0]?.id || "");
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
  const visibleNowPlaying = selected ? nowPlaying : null;

  // Report rendered height for accurate stacking
  useLayoutEffect(() => {
    const report = () => {
      const el = draggableRef.current;
      if (!el) return;
      const h = el.getBoundingClientRect().height;
      if (Number.isFinite(h)) setWidgetMeasuredHeight("somafm", h);
    };
    report();
    window.addEventListener("resize", report);
    return () => window.removeEventListener("resize", report);
  }, [visibleNowPlaying, currentChannel, isVisible]);

  // Fetch now playing info for selected channel
  useEffect(() => {
    if (!selected) return;

    const controller = new AbortController();
    let intervalId: number | undefined;
    let currentInterval = 7000;

    const fetchNowPlaying = () => {
      fetch(`https://somafm.com/songs/${selected}.json`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          const firstSong = data?.songs?.[0];
          if (firstSong) {
            setNowPlaying({
              title: firstSong.title || "",
              artist: firstSong.artist || "",
              album: firstSong.album || "",
              albumArt: firstSong.albumArt || "",
            });
          } else {
            setNowPlaying(null);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setNowPlaying(null);
          }
        });
    };

    const setupInterval = (ms: number) => {
      if (intervalId) window.clearInterval(intervalId);
      intervalId = window.setInterval(fetchNowPlaying, ms);
      currentInterval = ms;
    };

    fetchNowPlaying();
    setupInterval(isPlaying ? 7000 : 60000);

    // Listen for isPlaying changes to adjust interval
    const handlePlayState = () => {
      const desired = isPlaying ? 7000 : 60000;
      if (currentInterval !== desired) {
        setupInterval(desired);
      }
    };

    handlePlayState();

    // Observe isPlaying changes
    const observer = setInterval(() => {
      handlePlayState();
    }, 1000);

    return () => {
      controller.abort();
      if (intervalId) window.clearInterval(intervalId);
      clearInterval(observer);
    };
  }, [selected, isPlaying]);

  return (
    <DropdownMenu>
      <div
        ref={draggableRef}
        data-widget-id="somafm"
        className={`pointer-events-auto absolute z-50 flex transform-gpu cursor-grab rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 backdrop-blur-md transition-opacity duration-300 will-change-transform data-[neodrag-state=dragging]:cursor-grabbing data-[neodrag-state=dragging]:shadow-none ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical "SomaFM" Label */}
        <div className="flex items-center justify-center border-r border-white/10 px-1">
          <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
            SomaFM
          </span>
        </div>

        {/* Main Column */}
        <div className="flex w-85 flex-col">
          {/* Player Row: Channel Art, Info, Play Button and Volume on right */}
          <div className="flex items-center gap-3 p-3">
            {/* Channel Art */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white/10">
              {visibleNowPlaying?.albumArt ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="pointer-events-none h-full w-full object-contain"
                  src={visibleNowPlaying.albumArt}
                  alt={
                    visibleNowPlaying.title || currentChannel?.title || "SomaFM"
                  }
                  loading="lazy"
                  draggable={false}
                />
              ) : currentChannel && currentChannel.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="pointer-events-none h-full w-full object-contain"
                  src={currentChannel.image}
                  alt={currentChannel.title}
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <LoaderCircle className="h-8 w-8 animate-spin text-white/40" />
              )}
            </div>

            {/* Channel Info */}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              {currentChannel && (
                <span
                  className="truncate text-[11px] font-semibold text-white/70"
                  title={currentChannel.title}
                >
                  {currentChannel.title}
                </span>
              )}
              {visibleNowPlaying && (
                <span
                  className="truncate text-xs font-semibold text-white"
                  title={visibleNowPlaying.title}
                >
                  {visibleNowPlaying.title}
                </span>
              )}
              {visibleNowPlaying && (
                <span
                  className="truncate text-xs text-white/70"
                  title={`${visibleNowPlaying.artist}${visibleNowPlaying.album ? ` — ${visibleNowPlaying.album}` : ""}`}
                >
                  {visibleNowPlaying.artist}
                  {visibleNowPlaying.album
                    ? ` — ${visibleNowPlaying.album}`
                    : ""}
                </span>
              )}
            </div>

            {/* Play/Pause Button on right */}
            <button
              disabled={!streamUrl}
              onClick={() => {
                if (!audioRef.current) return;
                if (isPlaying) {
                  audioRef.current.pause();
                } else {
                  setIsLoading(true);
                  audioRef.current.play();
                }
              }}
              className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full ${isLoading ? "bg-white/10" : "bg-white/10 hover:bg-white/20"} text-white transition-colors ${!streamUrl ? "cursor-not-allowed opacity-50" : ""}`}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isLoading ? (
                <Disc3 className="h-10 w-10 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <PlayIcon className="h-5 w-5" fill="currentColor" />
              )}
            </button>
          </div>

          {currentChannel && (
            <div className="px-3 pb-3 text-xs text-white">
              {currentChannel.description && (
                <div
                  className="mt-1 overflow-hidden leading-snug text-white/70"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                  }}
                  title={currentChannel.description}
                >
                  {currentChannel.description}
                </div>
              )}
              <div className="mt-1 flex items-center gap-3 text-[10px] text-white/50">
                <span
                  className="flex items-center gap-1"
                  title={`DJ: ${currentChannel.dj}`}
                >
                  <User className="inline-block h-3 w-3" />
                  {currentChannel.dj}
                </span>
                <span className="opacity-50">•</span>
                <span
                  className="flex items-center gap-1"
                  title={`Listeners: ${currentChannel.listeners}`}
                >
                  <Users className="inline-block h-3 w-3" />
                  {currentChannel.listeners}
                </span>
                {currentChannel.genre && (
                  <>
                    <span className="opacity-50">•</span>
                    <span
                      className="flex items-center gap-1"
                      title={`Genre: ${currentChannel.genre.replace(/\|/g, ", ")}`}
                    >
                      <Music2 className="inline-block h-3 w-3" />
                      {currentChannel.genre.replace(/\|/g, ", ")}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Hidden audio element */}
          <>
            {streamUrl && (
              <audio
                ref={audioRef}
                src={streamUrl}
                preload="none"
                onPlay={() => {
                  setIsPlaying(true);
                  setIsLoading(false);
                }}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onWaiting={() => setIsLoading(true)}
                onCanPlay={() => setIsLoading(false)}
                style={{ display: "none" }}
              />
            )}
          </>

          {/* Separator and action bar */}
          <div className="border-t border-white/10" />
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] leading-tight">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/20"
                  title="Volume"
                >
                  {volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="flex w-32 flex-col gap-2 rounded-md border border-white/10 bg-black/90 p-3 shadow-lg"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
                  <span>Volume</span>
                  <span className="text-white/60">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[Math.round(volume * 100)]}
                  onValueChange={(v) => {
                    const percent = v[0] ?? Math.round(volume * 100);
                    setVolume(percent / 100);
                    if (audioRef.current)
                      audioRef.current.volume = percent / 100;
                  }}
                  max={100}
                  step={1}
                />
              </PopoverContent>
            </Popover>
            {/* CHANNELS button with searchable command menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white/20"
                  type="button"
                  aria-label="Select channel"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        "https://somafm.com/channels.json",
                      );
                      const data = await res.json();
                      const sortedChannels = (data.channels || [])
                        .slice()
                        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                        .sort((a: any, b: any) =>
                          a.title.localeCompare(b.title),
                        );
                      setChannels(sortedChannels);
                    } catch {}
                  }}
                >
                  Channels
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-84 rounded-lg border border-white/10 bg-black/90 p-1.5 shadow-lg"
              >
                <Command>
                  <CommandInput placeholder="Search channels..." />
                  <CommandList>
                    <CommandEmpty>No channels found.</CommandEmpty>
                    {[...channels]
                      .slice()
                      .sort(
                        (a, b) =>
                          (Number(b.listeners) || 0) -
                          (Number(a.listeners) || 0),
                      )
                      .map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.title}
                          onSelect={() => {
                            setSelected(c.id);
                            setTimeout(() => {
                              try {
                                if (audioRef.current) {
                                  audioRef.current.pause();
                                  audioRef.current.load();
                                  audioRef.current.play();
                                }
                              } catch {}
                            }, 0);
                          }}
                          className="group cursor-pointer rounded-md px-2! py-2! transition-colors hover:bg-white/10 focus:bg-white/10"
                        >
                          <div className="flex w-full items-start gap-3">
                            {/* Logo */}
                            {c.image && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={c.image}
                                alt={c.title}
                                className="mt-1 h-8 w-8 rounded border border-white/10 bg-white/20 object-contain shadow"
                                style={{ minWidth: 32, minHeight: 32 }}
                                draggable={false}
                              />
                            )}
                            <div className="flex min-w-0 flex-1 flex-col">
                              {/* Title */}
                              <span className="truncate text-[13px] font-bold text-neutral-600">
                                {c.title}
                              </span>
                              {/* Description (truncated) */}
                              {c.description && (
                                <span
                                  className="truncate text-[12px] text-neutral-500"
                                  title={c.description}
                                  style={{ maxWidth: 220 }}
                                >
                                  {c.description}
                                </span>
                              )}
                              {/* Last playing */}
                              {c.lastPlaying && (
                                <span
                                  className="truncate text-[11px] text-neutral-500"
                                  title={c.lastPlaying}
                                >
                                  <span className="opacity-80">Last:</span>{" "}
                                  {c.lastPlaying}
                                </span>
                              )}
                              {/* Genre */}
                              {c.genre && (
                                <span
                                  className="truncate text-[11px] text-neutral-500"
                                  title={c.genre.replace(/\|/g, ", ")}
                                >
                                  <span className="opacity-80">Genre:</span>{" "}
                                  {c.genre.replace(/\|/g, ", ")}
                                </span>
                              )}
                            </div>
                            {/* Listeners */}
                            <span className="ml-2 flex min-w-9.5 flex-col items-end">
                              <span
                                className="flex items-center gap-1 rounded bg-black/30 px-2 py-1 text-[12px] font-semibold text-neutral-100 shadow"
                                title={`Listeners: ${c.listeners}`}
                              >
                                <Users className="inline-block h-3.5 w-3.5" />
                                {c.listeners}
                              </span>
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                  </CommandList>
                </Command>
              </DropdownMenuContent>
            </DropdownMenu>
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
