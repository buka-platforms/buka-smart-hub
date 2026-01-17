"use client";

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
import { widgetVisibilityAtom } from "@/data/store";
import { getSurah, getSurahList } from "@/lib/quran-api";
import {
  getSavedWidgetPosition,
  observeWidget,
  resetWidgetPosition,
  saveWidgetPosition,
  triggerLayoutUpdate,
  unobserveWidget,
} from "@/lib/widget-positions";
import { useAtom } from "jotai";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Disc3,
  MoreHorizontal,
  Pause,
  Play,
  Play as PlayIcon,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const WIDGET_ID = "quran";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const LAST_SURAH_KEY = "widgetQuranLastSurah";
const LAST_AYAH_KEY = "widgetQuranLastAyah";
const WIDGET_VERSION = "1.0.0";

export default function WidgetDraggableQuran() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [surahList, setSurahList] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [surahData, setSurahData] = useState<any | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const autoAdvanceRef = useRef(true);

  // Keep ref in sync with state
  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [jumpToAyahValue, setJumpToAyahValue] = useState("");

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
      const initial = saved ?? { x: 0, y: 0 };
      setPosition(initial);
      positionRef.current = initial;
      if (containerRef.current)
        containerRef.current.style.transform = `translate(${initial.x}px, ${initial.y}px)`;
      setIsPositionLoaded(true);
    });
  }, []);

  useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent<
        Record<string, { x: number; y: number }>
      >;
      const detail = customEvent.detail || {};

      if (Object.prototype.hasOwnProperty.call(detail, WIDGET_ID)) {
        const newPos = detail[WIDGET_ID];
        if (newPos) setPosition(newPos);
      } else if (Object.keys(detail).length > 1) {
        const newPos = detail[WIDGET_ID];
        if (newPos) setPosition(newPos);
      }
    };

    window.addEventListener("widget-positions-reset", handleReset);
    return () =>
      window.removeEventListener("widget-positions-reset", handleReset);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    observeWidget(WIDGET_ID, el);
    try {
      triggerLayoutUpdate();
    } catch {
      // ignore
    }
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
        // Always start from the beginning (ayah 1) when switching surahs
        setCurrentAyahIndex(0);
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
        audioRef.current.load(); // Reset audio element
      }
      queueMicrotask(() => {
        setIsPlaying(false);
        setIsLoading(false);
      });
      return;
    }

    const audioUrl = ayah.audio || ayah.audioSecondary || "";
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    // Reset audio state before setting new source
    audio.pause();
    queueMicrotask(() => {
      setIsPlaying(false);
      setIsLoading(false);
    });

    // Clear previous event listeners
    audio.onplaying = null;
    audio.onwaiting = null;
    audio.oncanplay = null;
    audio.onerror = null;
    audio.onended = null;

    // Set up new event listeners
    audio.onplaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    audio.onwaiting = () => setIsLoading(true);
    audio.oncanplay = () => {
      setIsLoading(false);
      // Audio is now ready to play
    };
    audio.onerror = () => {
      setIsLoading(false);
      setIsPlaying(false);
    };
    audio.onended = () => {
      setIsPlaying(false);
      if (
        autoAdvanceRef.current &&
        surahData &&
        currentAyahIndex < surahData.ayahs.length - 1
      ) {
        setCurrentAyahIndex((i) => i + 1);
        // Auto-play the next ayah
        setTimeout(() => {
          if (audioRef.current && audioRef.current.src) {
            audioRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        }, 100); // Small delay to allow state update
      }
    };

    // Set new source and load
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

  const playAyah = useCallback(async (ayahIndex: number) => {
    setCurrentAyahIndex(ayahIndex);
    setAutoAdvance(false); // Individual ayah plays don't auto-advance
    autoAdvanceRef.current = false;
    // Small delay to allow state update, then play
    setTimeout(async () => {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        setIsLoading(true);
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
        setIsLoading(false);
      }
    }, 50);
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return; // Ensure audio source is set

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        setIsLoading(false);
      } else {
        setAutoAdvance(true); // Main play button enables auto-advance
        autoAdvanceRef.current = true;
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

  const jumpToFirstAyah = useCallback(() => {
    setCurrentAyahIndex(0);
  }, []);

  const jumpToLastAyah = useCallback(() => {
    if (!surahData) return;
    setCurrentAyahIndex(surahData.ayahs.length - 1);
  }, [surahData]);

  const jumpToAyah = useCallback(
    (ayahNumber: number) => {
      if (!surahData || ayahNumber < 1 || ayahNumber > surahData.ayahs.length)
        return;
      setCurrentAyahIndex(ayahNumber - 1); // Convert to 0-based index
      setJumpToAyahValue("");
    },
    [surahData],
  );

  const handleJumpToAyahSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const ayahNumber = parseInt(jumpToAyahValue.trim());
      if (!isNaN(ayahNumber)) {
        jumpToAyah(ayahNumber);
      }
    },
    [jumpToAyahValue, jumpToAyah],
  );

  // Drag handlers - only for drag handle area
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y,
    };
  }, []);

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
    <>
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
            className={`flex items-center justify-center border-r border-white/10 px-1 select-none hover:bg-white/5 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
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
                    <div className="text-xs font-semibold text-white/60">
                      {surahData?.englishName || "Surah"}
                    </div>
                    <div className="truncate text-sm font-medium text-white">
                      {surahData?.name ||
                        (selectedSurah ? `Surah ${selectedSurah}` : "—")}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={jumpToFirstAyah}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                      title="First Ayah"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </button>
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
                    <button
                      onClick={jumpToLastAyah}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                      title="Last Ayah"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div
                  ref={textContainerRef}
                  className="mt-2 max-h-34 overflow-auto text-xs text-white/80 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30"
                >
                  {useMemo(
                    () =>
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      surahData?.ayahs?.map((a: any, idx: number) => (
                        <React.Fragment key={a.number}>
                          <div
                            data-ayah-index={idx}
                            className={`group relative px-2 py-1 ${idx === currentAyahIndex ? "rounded bg-white/5" : ""}`}
                          >
                            <div className="flex items-start gap-2 py-1">
                              <button
                                onClick={() => playAyah(idx)}
                                className={`mt-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-200 ${
                                  idx === currentAyahIndex
                                    ? "bg-white/20 text-white opacity-100"
                                    : "bg-white/10 text-white/60 opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:text-white"
                                }`}
                                title={`Play Ayah ${a.numberInSurah}`}
                              >
                                {idx === currentAyahIndex && isPlaying ? (
                                  <Pause
                                    className="h-3 w-3"
                                    fill="currentColor"
                                  />
                                ) : (
                                  <Play
                                    className="h-3 w-3"
                                    fill="currentColor"
                                  />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="text-right text-2xl leading-tight">
                                  {a.text}
                                </div>
                                <div className="mt-1 text-xs text-white/60">
                                  Ayah {a.numberInSurah}
                                </div>
                              </div>
                            </div>
                          </div>
                          {idx < (surahData?.ayahs?.length || 0) - 1 && (
                            <div className="my-1 border-b border-white/10" />
                          )}
                        </React.Fragment>
                      )),
                    [surahData?.ayahs, currentAyahIndex, isPlaying, playAyah],
                  )}
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
                    className="flex h-8 cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 text-[10px] font-semibold tracking-wide text-white hover:bg-white/20"
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
                  <Command
                    className="bg-transparent text-white"
                    value={
                      selectedSurah
                        ? `${selectedSurah} ${surahList.find((s) => s.number === selectedSurah)?.englishName || ""}`
                        : ""
                    }
                  >
                    <CommandInput
                      placeholder="Search surah..."
                      className="h-10 border-b border-white/10 px-3 text-sm text-white placeholder:text-white/40"
                    />
                    <CommandList className="max-h-80 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/5">
                      <CommandEmpty className="py-6 text-center text-sm text-white/50">
                        No surah found.
                      </CommandEmpty>
                      {surahList.map(
                        (
                          s: // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          any,
                        ) => (
                          <CommandItem
                            key={s.number}
                            value={`${s.number} ${s.englishName}`}
                            onSelect={() => setSelectedSurah(s.number)}
                            className={`cursor-pointer ${
                              s.number === selectedSurah
                                ? "bg-white/10 text-white"
                                : "hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1 text-left">
                                <div className="font-bold">{`${s.number}. ${s.englishName}`}</div>
                                <div className="flex items-center gap-2">
                                  <div className="text-[12px]">{s.name}</div>
                                  <div className="text-[10px] opacity-70">
                                    {s.numberOfAyahs} ayahs
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CommandItem>
                        ),
                      )}
                    </CommandList>
                  </Command>
                </DropdownMenuContent>
              </DropdownMenu>

              {surahData && (
                <form
                  onSubmit={handleJumpToAyahSubmit}
                  className="flex items-center gap-1"
                >
                  <input
                    type="number"
                    min={1}
                    max={surahData.ayahs.length}
                    value={jumpToAyahValue}
                    onChange={(e) => setJumpToAyahValue(e.target.value)}
                    placeholder={`${currentAyahIndex + 1}`}
                    className="h-8 w-16 rounded border border-white/10 bg-white/10 px-2 text-center text-[10px] font-semibold tracking-wide text-white placeholder:text-white/60 focus:border-white/30 focus:outline-none"
                    title={`Jump to Ayah (1-${surahData.ayahs.length})`}
                  />
                  <span className="text-[10px] text-white/60">
                    / {surahData.ayahs.length}
                  </span>
                </form>
              )}

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
              setMoreMenuOpen(false);
              setVisibility((prev) => ({ ...prev, [WIDGET_ID]: false }));
              try {
                localStorage.setItem(
                  WIDGET_VISIBILITY_KEY,
                  JSON.stringify({ ...visibility, [WIDGET_ID]: false }),
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
              setMoreMenuOpen(false);
              requestAnimationFrame(() => resetPosition());
            }}
          >
            Reset widget position
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setMoreMenuOpen(false);
              setAboutDialogOpen(true);
            }}
            className="cursor-pointer"
          >
            About widget
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>About Quran Widget</DialogTitle>
            <DialogDescription className="mt-2 text-left">
              Listen to the Holy Quran with beautiful Arabic recitation.
              Navigate through surahs and ayahs with audio playback controls.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-medium">{WIDGET_VERSION}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
