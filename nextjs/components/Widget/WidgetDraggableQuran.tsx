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
import { widgetVisibilityAtom } from "@/data/store";
import { getSurah, getSurahList } from "@/lib/quran-api";
import {
  calculateAutoArrangePositions,
  getSavedWidgetPosition,
  observeWidget,
  resetWidgetPosition,
  saveWidgetPosition,
  unobserveWidget,
} from "@/lib/widget-positions";
import { useAtom } from "jotai";
import {
  ChevronLeft,
  ChevronRight,
  Disc3,
  MoreHorizontal,
  Pause,
  Play as PlayIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const WIDGET_ID = "quran";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const LAST_SURAH_KEY = "widgetQuranLastSurah";
const LAST_AYAH_KEY = "widgetQuranLastAyah";

export default function WidgetDraggableQuran() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const [surahList, setSurahList] = useState<any[]>([]);
  const [surahData, setSurahData] = useState<any | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const textContainerRef = useRef<HTMLDivElement | null>(null);

  const refreshSurahList = useCallback(async () => {
    try {
      const list = await getSurahList();
      setSurahList(list || []);
      const last =
        typeof window !== "undefined"
          ? localStorage.getItem(LAST_SURAH_KEY)
          : null;
      const num = last ? Number(last) : (list?.[0]?.number ?? 1);
      setSelectedSurah(num);
    } catch (error) {
      console.error("Failed to refresh surah list:", error);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = getSavedWidgetPosition(WIDGET_ID);
      const initial = saved ??
        calculateAutoArrangePositions()[WIDGET_ID] ?? { x: 0, y: 0 };
      setPosition(initial);
      positionRef.current = initial;
      if (containerRef.current)
        containerRef.current.style.transform = `translate(${initial.x}px, ${initial.y}px)`;
      setIsPositionLoaded(true);
    });
  }, []);

  useEffect(() => {
    refreshSurahList();
  }, [refreshSurahList]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    observeWidget(WIDGET_ID, el);
    return () => unobserveWidget(WIDGET_ID);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getSurahList();
        if (!mounted) return;
        setSurahList(list || []);
        const last =
          typeof window !== "undefined"
            ? localStorage.getItem(LAST_SURAH_KEY)
            : null;
        const num = last ? Number(last) : (list?.[0]?.number ?? 1);
        setSelectedSurah(num);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSurah) return;
    let mounted = true;
    (async () => {
      try {
        const data = await getSurah(selectedSurah, "ar.alafasy");
        if (!mounted) return;
        setSurahData(data);
        const last =
          typeof window !== "undefined"
            ? localStorage.getItem(LAST_AYAH_KEY)
            : null;
        setCurrentAyahIndex(last ? Number(last) : 0);
      } catch {}
    })();
    try {
      localStorage.setItem(LAST_SURAH_KEY, String(selectedSurah));
    } catch {}
    return () => {
      mounted = false;
    };
  }, [selectedSurah]);

  useEffect(() => {
    const ayah = surahData?.ayahs?.[currentAyahIndex];
    if (!ayah) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    const audioUrl = ayah.audio || ayah.audioSecondary || "";
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    audio.onplaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    audio.onwaiting = () => setIsLoading(true);
    audio.oncanplay = () => setIsLoading(false);
    audio.onerror = () => {
      setIsLoading(false);
      setIsPlaying(false);
    };
    audio.onended = () => {
      setIsPlaying(false);
      if (surahData && currentAyahIndex < surahData.ayahs.length - 1) {
        setCurrentAyahIndex((i) => i + 1);
        // Auto-play the next ayah
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        }, 100); // Small delay to allow state update
      }
    };

    audio.src = audioUrl;
    audio.preload = "auto";
    audio.load(); // Ensure audio is loaded

    try {
      localStorage.setItem(LAST_AYAH_KEY, String(currentAyahIndex));
    } catch {}

    if (textContainerRef.current) {
      requestAnimationFrame(() => {
        const el = textContainerRef.current;
        if (!el) return;
        const target = el.querySelector(
          `[data-ayah-index="${currentAyahIndex}"]`,
        ) as HTMLElement | null;
        if (target)
          target.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  }, [currentAyahIndex, surahData]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        setIsLoading(false);
      } else {
        setIsLoading(true);
        await audio.play();
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, [isPlaying]);

  const nextAyah = useCallback(() => {
    if (!surahData) return;
    setCurrentAyahIndex((i) => Math.min(i + 1, surahData.ayahs.length - 1));
  }, [surahData]);

  const prevAyah = useCallback(() => {
    setCurrentAyahIndex((i) => Math.max(0, i - 1));
  }, []);

  // Drag handlers - only for drag handle area
  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      setIsDragging(true);
      dragStartRef.current = {
        x: clientX,
        y: clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX, e.clientY);
    },
    [handleDragStart],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    },
    [handleDragStart],
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const next = {
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      };
      positionRef.current = next;
      if (containerRef.current)
        containerRef.current.style.transform = `translate(${next.x}px, ${next.y}px)`;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const dx = t.clientX - dragStartRef.current.x;
      const dy = t.clientY - dragStartRef.current.y;
      const next = {
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      };
      positionRef.current = next;
      if (containerRef.current)
        containerRef.current.style.transform = `translate(${next.x}px, ${next.y}px)`;
    };
    const handleEnd = () => {
      setIsDragging(false);
      const p = positionRef.current;
      setPosition(p);
      saveWidgetPosition(WIDGET_ID, p.x, p.y);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging]);

  const resetPosition = useCallback(() => resetWidgetPosition(WIDGET_ID), []);

  const isVisible = isPositionLoaded && visibility[WIDGET_ID] !== false;

  return (
    <DropdownMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
      <div
        ref={containerRef}
        data-widget-id={WIDGET_ID}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        className={`pointer-events-auto absolute z-50 flex transform-gpu rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 backdrop-blur-md will-change-transform ${isDragging ? "shadow-none transition-none" : "transition-opacity duration-300"} ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Vertical "Quran" Label - Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`flex items-center justify-center border-r border-white/10 px-1 transition-colors select-none hover:bg-white/5 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <span className="transform-[rotate(180deg)] text-[10px] font-semibold tracking-widest text-white/50 uppercase [writing-mode:vertical-rl]">
            Quran
          </span>
        </div>

        <div className="flex w-80 flex-col">
          <div className="flex items-center gap-3 p-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white/60">
                    {surahData?.englishName || "Surah"}
                  </div>
                  <div className="truncate text-sm font-medium text-white">
                    {surahData?.name ||
                      (selectedSurah ? `Surah ${selectedSurah}` : "—")}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={prevAyah}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                    title="Previous"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isLoading ? (
                      <Disc3 className="h-5 w-5 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-5 w-5" fill="currentColor" />
                    ) : (
                      <PlayIcon className="h-5 w-5" fill="currentColor" />
                    )}
                  </button>

                  <button
                    onClick={nextAyah}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                    title="Next"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div
                ref={textContainerRef}
                className="mt-2 max-h-28 space-y-1 overflow-auto text-xs text-white/80 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30"
              >
                {surahData?.ayahs?.map((a: any, idx: number) => (
                  <div
                    key={a.number}
                    data-ayah-index={idx}
                    className={`p-1 ${idx === currentAyahIndex ? "rounded bg-white/5" : ""}`}
                  >
                    <div className="text-right text-2xl leading-tight">
                      {a.text}
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      Ayah {a.numberInSurah}
                    </div>
                  </div>
                ))}
                {!surahData && (
                  <div className="text-xs text-white/60">Loading…</div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10" />
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] leading-tight">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 text-[11px] font-semibold text-white hover:bg-white/20"
                >
                  {selectedSurah
                    ? `${selectedSurah}. ${surahList.find((s) => s.number === selectedSurah)?.englishName || "Surah"}`
                    : "Select Surah"}
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="w-64 rounded-lg border border-white/20 bg-black/95 p-1.5 shadow-2xl backdrop-blur-xl"
              >
                <Command className="bg-transparent text-white">
                  <CommandInput
                    placeholder="Search surah..."
                    className="h-10 border-b border-white/10 px-3 text-sm text-white placeholder:text-white/40"
                  />
                  <CommandList className="max-h-80 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5">
                    <CommandEmpty className="py-6 text-center text-sm text-white/50">
                      No surah found.
                    </CommandEmpty>
                    {surahList.map((s: any) => (
                      <CommandItem
                        key={s.number}
                        value={String(s.number)}
                        onSelect={() => setSelectedSurah(s.number)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1 text-left">
                            <div className="font-bold">{`${s.number}. ${s.englishName}`}</div>
                            <div className="text-[12px] text-white/60">
                              {s.name}
                            </div>
                          </div>
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
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20"
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
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            try {
              localStorage.setItem(
                WIDGET_VISIBILITY_KEY,
                JSON.stringify({ [WIDGET_ID]: false }),
              );
            } catch {}
          }}
        >
          Hide widget
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => {
            refreshSurahList();
          }}
        >
          Refresh surah list
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={async () => {
            if (selectedSurah) {
              try {
                const data = await getSurah(selectedSurah, "ar.alafasy");
                setSurahData(data);
              } catch (error) {
                console.error("Failed to refresh active surah:", error);
              }
            }
          }}
        >
          Refresh active surah
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            requestAnimationFrame(() => resetPosition());
          }}
        >
          Reset widget position
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
