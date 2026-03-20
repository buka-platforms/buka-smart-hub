"use client";

import AudioSpectrumCanvas from "@/components/General/AudioSpectrumCanvas";
import { transparent1x1Pixel } from "@/data/general";
import {
  audioVisualizationStateAtom,
  backgroundImageStateAtom,
  onlineRadioBoxAudioStateAtom,
  radioAudioStateAtom,
  radioStationStateAtom,
  somafmAudioStateAtom,
} from "@/data/store";
import type { Unsplash } from "@/data/type";
import { useAtomValue, useSetAtom } from "jotai";
import { Fullscreen, ImageDown, Loader2, Music2, X } from "lucide-react";
import { Manrope } from "next/font/google";
import { useEffect, useMemo, useRef, useState } from "react";

type AmbientExperienceProps = {
  mode?: "page" | "dialog";
  onClose?: () => void;
};

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

function normalizeUnsplashImage(data: Unsplash) {
  return {
    id: data.id,
    urls: data.urls,
    alt_description: data.alt_description,
    links: data.links,
    user: data.user,
    width: data.width,
    height: data.height,
  };
}

export default function AmbientExperience({
  mode = "page",
  onClose,
}: AmbientExperienceProps) {
  const backgroundImageState = useAtomValue(backgroundImageStateAtom);
  const visualizationState = useAtomValue(audioVisualizationStateAtom);
  const radioAudioState = useAtomValue(radioAudioStateAtom);
  const radioStationState = useAtomValue(radioStationStateAtom);
  const onlineRadioState = useAtomValue(onlineRadioBoxAudioStateAtom);
  const somaFmAudioState = useAtomValue(somafmAudioStateAtom);
  const setBackgroundImageState = useSetAtom(backgroundImageStateAtom);

  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [wallpaperLayers, setWallpaperLayers] = useState<
    [string | null, string | null]
  >([null, null]);
  const [activeWallpaperLayer, setActiveWallpaperLayer] = useState<0 | 1>(0);
  const animationFrameRef = useRef<number | null>(null);

  const activeSource = visualizationState.activeSource;
  const ambientImage = backgroundImageState.randomBackgroundImage;
  const currentArtwork =
    radioStationState.exposedArtwork &&
    radioStationState.exposedArtwork !== transparent1x1Pixel
      ? radioStationState.exposedArtwork
      : null;

  const currentAudioSummary = useMemo(() => {
    if (activeSource === "radio" && radioAudioState.isPlaying) {
      const title =
        radioStationState.exposedTitle ||
        radioStationState.exposedTitleOnly ||
        radioStationState.currentTitle ||
        radioStationState.radioStation?.name ||
        "Live radio";
      const subtitle =
        radioStationState.exposedArtist ||
        radioStationState.radioStation?.name ||
        "Streaming now";

      return {
        title,
        subtitle,
      };
    }

    if (activeSource === "somafm" && somaFmAudioState.isPlaying) {
      return {
        title: somaFmAudioState.lastChannelId
          ? `Channel ${somaFmAudioState.lastChannelId}`
          : "SomaFM is live",
        subtitle: "Visualizer is reacting to the current stream.",
      };
    }

    if (
      activeSource === "onlineradioboxnowplaying" &&
      onlineRadioState.isPlaying
    ) {
      return {
        title: "Live station stream",
        subtitle: "Visualizer is reacting to the selected now playing station.",
      };
    }

    if (activeSource === "iptv" && visualizationState.isActive) {
      return {
        title: "Live channel audio",
        subtitle: "Visualizer is reacting to the active stream.",
      };
    }

    return {
      title: "Wallpaper, light motion, live sound",
      subtitle:
        "Start Radio, Radio Now Playing, SomaFM, or another supported stream to wake the visualization.",
    };
  }, [
    activeSource,
    onlineRadioState.isPlaying,
    radioAudioState.isPlaying,
    radioStationState.currentTitle,
    radioStationState.exposedArtist,
    radioStationState.exposedTitle,
    radioStationState.exposedTitleOnly,
    radioStationState.radioStation?.name,
    somaFmAudioState.isPlaying,
    somaFmAudioState.lastChannelId,
    visualizationState.isActive,
  ]);

  useEffect(() => {
    const imageUrl =
      ambientImage?.urls?.full || ambientImage?.urls?.regular || null;

    if (!imageUrl) {
      return;
    }

    const image = new Image();
    image.onload = () => {
      const activeUrl = wallpaperLayers[activeWallpaperLayer];

      if (!activeUrl) {
        setWallpaperLayers([imageUrl, null]);
        setActiveWallpaperLayer(0);
        return;
      }

      if (activeUrl === imageUrl) {
        return;
      }

      const nextLayer = activeWallpaperLayer === 0 ? 1 : 0;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      setWallpaperLayers((prev) => {
        const next = [...prev] as [string | null, string | null];
        next[nextLayer] = imageUrl;
        return next;
      });
      animationFrameRef.current = requestAnimationFrame(() => {
        setActiveWallpaperLayer(nextLayer);
        animationFrameRef.current = null;
      });
    };
    image.onerror = () => {};
    image.src = imageUrl;

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [
    activeWallpaperLayer,
    ambientImage?.urls?.full,
    ambientImage?.urls?.regular,
    wallpaperLayers,
  ]);

  useEffect(() => {
    if (ambientImage) {
      return;
    }

    const controller = new AbortController();

    const loadDefaultWallpaper = async () => {
      const defaultImageId =
        process.env.NEXT_PUBLIC_DEFAULT_UNSPLASH_BACKGROUND_IMAGE_ID;

      if (!defaultImageId) {
        return;
      }

      setIsFetchingImage(true);
      setBackgroundImageState((prev) => ({
        ...prev,
        isLoading: true,
        isLoaded: false,
      }));

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL_V1}/api/background-image?id=${defaultImageId}`,
          {
            cache: "no-cache",
            headers: {
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          },
        );
        const json = await response.json();

        if (!controller.signal.aborted && json?.data?.id) {
          setBackgroundImageState((prev) => ({
            ...prev,
            isLoading: false,
            isLoaded: true,
            randomBackgroundImage: normalizeUnsplashImage(json.data),
          }));
        }
      } catch {
        if (!controller.signal.aborted) {
          setBackgroundImageState((prev) => ({
            ...prev,
            isLoading: false,
            isLoaded: false,
          }));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsFetchingImage(false);
        }
      }
    };

    void loadDefaultWallpaper();

    return () => {
      controller.abort();
    };
  }, [ambientImage, setBackgroundImageState]);

  const refreshWallpaper = async () => {
    if (isFetchingImage) {
      return;
    }

    setIsFetchingImage(true);
    setBackgroundImageState((prev) => ({
      ...prev,
      isLoading: true,
      isLoaded: false,
    }));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL_V1}/api/background-image?random=true`,
        {
          cache: "no-cache",
        },
      );
      const json = await response.json();

      if (json?.data?.id) {
        const nextImage = normalizeUnsplashImage(json.data);
        setBackgroundImageState((prev) => ({
          ...prev,
          isLoading: false,
          isLoaded: true,
          randomBackgroundImage: nextImage,
        }));
        try {
          localStorage.setItem("randomBackgroundImageId", nextImage.id);
        } catch {}
      }
    } catch {
      setBackgroundImageState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    } finally {
      setIsFetchingImage(false);
    }
  };

  const toggleFullscreen = async () => {
    const element = document.documentElement;

    if (!document.fullscreenElement) {
      try {
        await element.requestFullscreen();
      } catch {
        // no-op
      }
      return;
    }

    try {
      await document.exitFullscreen();
    } catch {
      // no-op
    }
  };

  const handleClose = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // no-op
      }
      return;
    }

    onClose?.();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        className={`absolute inset-0 transition-opacity duration-[900ms] ${
          wallpaperLayers[0]
            ? activeWallpaperLayer === 0
              ? "opacity-100"
              : "opacity-0"
            : "opacity-0"
        }`}
        style={
          wallpaperLayers[0]
            ? {
                backgroundImage: `url(${wallpaperLayers[0]})`,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
              }
            : undefined
        }
      />
      <div
        className={`absolute inset-0 transition-opacity duration-[900ms] ${
          wallpaperLayers[1]
            ? activeWallpaperLayer === 1
              ? "opacity-100"
              : "opacity-0"
            : "opacity-0"
        }`}
        style={
          wallpaperLayers[1]
            ? {
                backgroundImage: `url(${wallpaperLayers[1]})`,
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
              }
            : undefined
        }
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_42%),linear-gradient(180deg,rgba(3,7,18,0.16),rgba(3,7,18,0.72)_70%,rgba(2,6,23,0.94))]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.55),rgba(15,23,42,0.12)_35%,rgba(2,6,23,0.72))]" />

      <div className="absolute top-4 right-4 z-20 md:top-6 md:right-6">
        <div
          className="flex items-center gap-0.5 rounded-full border p-0.5 shadow-lg shadow-black/20 backdrop-blur-xl"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.48)",
            borderColor: "rgba(0, 0, 0, 0.44)",
          }}
        >
          <button
            type="button"
            onClick={refreshWallpaper}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/12"
            title="Random wallpaper"
          >
            <ImageDown
              className={`h-3.5 w-3.5 ${isFetchingImage ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/12"
            title="Fullscreen"
          >
            <Fullscreen className="h-3.5 w-3.5" />
          </button>
          {mode === "dialog" && onClose ? (
            <button
              type="button"
              onClick={() => {
                void handleClose();
              }}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white transition-colors hover:bg-white/12"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {!wallpaperLayers[activeWallpaperLayer] ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-sm text-white/80">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading ambient wallpaper
          </div>
        </div>
      ) : null}

      {ambientImage ? (
        <div
          className={`absolute right-4 bottom-3 z-20 text-right md:right-6 md:bottom-5 ${manrope.className}`}
        >
          <div
            className="px-2.5 py-1.5 text-xs text-white shadow-lg shadow-black/20 backdrop-blur-xl"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.42)",
            }}
          >
            Photo by{" "}
            <a
              href={`${ambientImage.user.links.html}?utm_source=Buka&utm_medium=referral`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-white underline decoration-white/35"
            >
              {ambientImage.user.name}
            </a>{" "}
            on{" "}
            <a
              href={`${ambientImage.links.html}?utm_source=Buka&utm_medium=referral`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-white underline decoration-white/35"
            >
              Unsplash
            </a>
          </div>
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="p-4 pr-20 md:p-6 md:pr-28">
          <div
            className={`inline-flex h-14 max-w-[min(24rem,calc(100vw-2rem))] overflow-hidden shadow-lg shadow-black/20 backdrop-blur-xl ${manrope.className}`}
            style={{ backgroundColor: "rgba(0, 0, 0, 0.34)" }}
          >
            <div className="flex aspect-square h-full shrink-0 items-center justify-center overflow-hidden bg-black/35">
              {currentArtwork ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentArtwork}
                  alt={currentAudioSummary.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Music2 className="h-4.5 w-4.5 text-white/70" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center px-3">
              <div className="truncate text-[15px] font-semibold tracking-[-0.01em] text-white">
                {currentAudioSummary.title}
              </div>
              <div className="truncate text-[12px] font-medium tracking-[0.01em] text-white/78">
                {currentAudioSummary.subtitle}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1" />

        <footer className="relative z-10 pt-6">
          <AudioSpectrumCanvas hideWhenAmbientDialogOpen={false} />
        </footer>
      </div>
    </div>
  );
}
