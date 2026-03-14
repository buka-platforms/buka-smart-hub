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
import { Slider } from "@/components/ui/slider";
import { getSurah, getSurahList } from "@/lib/quran-api";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Disc3,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const LAST_SURAH_KEY = "quranPageLastSurah";
const LAST_AYAH_KEY = "quranPageLastAyah";
const VOLUME_KEY = "quranPageVolume";

export default function QuranReader() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [surahList, setSurahList] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [surahData, setSurahData] = useState<any | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [surahPickerOpen, setSurahPickerOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 80;
    try {
      const stored = localStorage.getItem(VOLUME_KEY);
      if (stored !== null && !Number.isNaN(Number(stored)))
        return Number(stored);
    } catch {}
    return 80;
  });
  const [autoAdvance, setAutoAdvance] = useState(true);
  const autoAdvanceRef = useRef(true);

  const textContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    autoAdvanceRef.current = autoAdvance;
  }, [autoAdvance]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.volume = Math.max(0, Math.min(1, volume / 100));
    } catch {}
  }, [volume]);

  // Load surah list
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

  // Load surah data when selected
  useEffect(() => {
    if (!selectedSurah) return;
    let mounted = true;
    (async () => {
      try {
        const data = await getSurah(selectedSurah, "ar.alafasy");
        if (!mounted) return;
        setSurahData(data);
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

  // Audio playback management
  useEffect(() => {
    const ayah = surahData?.ayahs?.[currentAyahIndex];
    if (!ayah) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.load();
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

    audio.pause();
    queueMicrotask(() => {
      setIsPlaying(false);
      setIsLoading(false);
    });

    audio.onplaying = null;
    audio.onwaiting = null;
    audio.oncanplay = null;
    audio.onerror = null;
    audio.onended = null;

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
      if (
        autoAdvanceRef.current &&
        surahData &&
        currentAyahIndex < surahData.ayahs.length - 1
      ) {
        setCurrentAyahIndex((i) => i + 1);
        setTimeout(() => {
          if (audioRef.current && audioRef.current.src) {
            audioRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        }, 100);
      }
    };

    audio.src = audioUrl;
    audio.preload = "auto";
    audio.load();

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

  const playAyah = useCallback(
    async (ayahIndex: number) => {
      setCurrentAyahIndex(ayahIndex);
      setAutoAdvance(false);
      autoAdvanceRef.current = false;
      setTimeout(async () => {
        const audio = audioRef.current;
        if (!audio) return;
        try {
          setIsLoading(true);
          audio.volume = Math.max(0, Math.min(1, volume / 100));
          await audio.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
          setIsLoading(false);
        }
      }, 50);
    },
    [volume],
  );

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        setIsLoading(false);
      } else {
        setAutoAdvance(true);
        autoAdvanceRef.current = true;
        setIsLoading(true);
        audio.volume = Math.max(0, Math.min(1, volume / 100));
        await audio.play();
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, [isPlaying, volume]);

  const updateVolume = useCallback((v: number) => {
    const next = Math.max(0, Math.min(100, Math.round(v)));
    setVolume(next);
    try {
      if (audioRef.current)
        audioRef.current.volume = Math.max(0, Math.min(1, next / 100));
    } catch {}
    try {
      localStorage.setItem(VOLUME_KEY, String(next));
    } catch {}
  }, []);

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

  const currentAyah = surahData?.ayahs?.[currentAyahIndex];

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Surah selector */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setSurahPickerOpen(true)}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
        >
          <BookOpen className="h-4 w-4 text-slate-500" />
          {selectedSurah
            ? `${selectedSurah}. ${surahList.find((s) => s.number === selectedSurah)?.englishName || "Surah"}`
            : "Select Surah"}
        </button>

        {surahData && (
          <div className="text-sm text-slate-500">
            {surahData.ayahs?.length} ayahs &middot;{" "}
            {surahData.revelationType === "Meccan" ? "Meccan" : "Medinan"}
          </div>
        )}
      </div>

      {/* Surah info header */}
      {surahData && (
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-emerald-900">
                {surahData.englishName}
              </h2>
              <p className="text-sm text-emerald-700">
                {surahData.englishNameTranslation}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold text-emerald-800">
                {surahData.name}
              </p>
              <p className="text-xs text-emerald-600">
                Surah {surahData.number} &middot; {surahData.revelationType}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Audio controls */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Now playing */}
        {currentAyah && (
          <div className="text-center">
            <p className="text-xs font-medium text-slate-500">Now playing</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              Ayah {currentAyah.numberInSurah}{" "}
              <span className="text-sm font-normal text-slate-400">
                of {surahData?.ayahs?.length}
              </span>
            </p>
          </div>
        )}

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={jumpToFirstAyah}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="First Ayah"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={prevAyah}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Previous Ayah"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={togglePlay}
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-colors hover:bg-emerald-700"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <Disc3 className="h-6 w-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6" fill="currentColor" />
            ) : (
              <Play className="h-6 w-6" fill="currentColor" />
            )}
          </button>
          <button
            onClick={nextAyah}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Next Ayah"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={jumpToLastAyah}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title="Last Ayah"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>

        {/* Volume */}
        <div className="mx-auto flex w-full max-w-xs items-center gap-3">
          <button
            type="button"
            onClick={() => updateVolume(volume === 0 ? 80 : 0)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
            title="Toggle mute"
          >
            {volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : volume < 50 ? (
              <Volume1 className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <Slider
            value={[volume]}
            onValueChange={(v) => updateVolume(v[0] ?? volume)}
            max={100}
            step={1}
            className="flex-1 cursor-pointer"
          />
          <span className="w-8 text-right text-xs text-slate-400">
            {Math.round(volume)}%
          </span>
        </div>
      </div>

      {/* Ayah list */}
      <div
        ref={textContainerRef}
        className="rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {surahData?.ayahs ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          surahData.ayahs.map((a: any, idx: number) => (
            <div
              key={a.number}
              data-ayah-index={idx}
              className={`group border-b border-slate-100 px-4 py-4 last:border-b-0 sm:px-6 ${
                idx === currentAyahIndex
                  ? "bg-emerald-50/60"
                  : "hover:bg-slate-50/50"
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <button
                  onClick={() => playAyah(idx)}
                  className={`mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all ${
                    idx === currentAyahIndex
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-emerald-100 hover:text-emerald-600"
                  }`}
                  title={`Play Ayah ${a.numberInSurah}`}
                >
                  {idx === currentAyahIndex && isPlaying ? (
                    <Pause className="h-3.5 w-3.5" fill="currentColor" />
                  ) : (
                    <Play className="h-3.5 w-3.5" fill="currentColor" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-right text-2xl leading-loose text-slate-900 sm:text-3xl sm:leading-loose">
                    {a.text}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Ayah {a.numberInSurah}
                  </p>
                </div>
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                  {a.numberInSurah}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-sm text-slate-400">
            Loading surah…
          </div>
        )}
      </div>

      {/* Surah picker dialog */}
      <Dialog open={surahPickerOpen} onOpenChange={setSurahPickerOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Select Surah</DialogTitle>
            <DialogDescription>
              Search and choose a Surah to read.
            </DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput
              placeholder="Search surah…"
              className="h-12 border-b px-4 text-sm"
            />
            <CommandList className="max-h-[min(70vh,28rem)] overflow-y-auto p-2">
              <CommandEmpty className="py-6 text-center text-sm text-slate-400">
                No surah found.
              </CommandEmpty>
              {useMemo(
                () =>
                  surahList.map(
                    (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      s: any,
                    ) => (
                      <CommandItem
                        key={s.number}
                        value={`${s.number} ${s.englishName} ${s.name}`}
                        onSelect={() => {
                          setSelectedSurah(s.number);
                          setSurahPickerOpen(false);
                        }}
                        className={`cursor-pointer rounded-lg px-3 py-2.5 ${
                          s.number === selectedSurah ? "bg-emerald-50" : ""
                        }`}
                      >
                        <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {s.number}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-800">
                            {s.englishName}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{s.englishNameTranslation}</span>
                            <span>&middot;</span>
                            <span>{s.numberOfAyahs} ayahs</span>
                          </div>
                        </div>
                        <div className="text-right text-lg text-slate-600">
                          {s.name}
                        </div>
                        {s.number === selectedSurah && (
                          <Check className="ml-2 h-4 w-4 text-emerald-600" />
                        )}
                      </CommandItem>
                    ),
                  ),
                [surahList, selectedSurah],
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
