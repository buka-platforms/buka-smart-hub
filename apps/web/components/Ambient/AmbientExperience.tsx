"use client";

import AudioSpectrumCanvas from "@/components/General/AudioSpectrumCanvas";
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
import { Fullscreen, ImageDown, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AmbientExperienceProps = {
  mode?: "page" | "dialog";
  onClose?: () => void;
};

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

  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);

  const activeSource = visualizationState.activeSource;
  const ambientImage = backgroundImageState.randomBackgroundImage;

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
      setImageLoaded(false);
      return;
    }

    const image = new Image();
    image.onload = () => setImageLoaded(true);
    image.onerror = () => setImageLoaded(false);
    image.src = imageUrl;
  }, [ambientImage?.urls?.full, ambientImage?.urls?.regular]);

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

  const wallpaperUrl =
    ambientImage?.urls?.full || ambientImage?.urls?.regular || null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        className={`absolute inset-0 transition-all duration-700 ${
          imageLoaded ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"
        }`}
        style={
          wallpaperUrl
            ? {
                backgroundImage: `url(${wallpaperUrl})`,
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
        <div className="flex items-center gap-0.5 rounded-full border border-white/12 bg-black/18 p-0.5 shadow-lg shadow-black/20 backdrop-blur-xl">
          <button
            type="button"
            onClick={refreshWallpaper}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white/72 transition-colors hover:bg-white/12 hover:text-white"
            title="Random wallpaper"
          >
            <ImageDown
              className={`h-3.5 w-3.5 ${isFetchingImage ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white/72 transition-colors hover:bg-white/12 hover:text-white"
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
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white/72 transition-colors hover:bg-white/12 hover:text-white"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {!imageLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/80">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading ambient wallpaper
          </div>
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex flex-col gap-4 p-4 pr-20 md:p-6 md:pr-28">
          <div className="max-w-2xl space-y-3">
            <div className="space-y-1">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                {currentAudioSummary.title}
              </h1>
              <p className="max-w-xl text-sm leading-6 text-white/72 md:text-base">
                {currentAudioSummary.subtitle}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1" />

        <footer className="relative z-10 pt-6">
          <div className="flex justify-end px-3 pb-4 text-right md:px-4 md:pb-5">
            {ambientImage ? (
              <div className="text-xs text-white/72">
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
            ) : null}
          </div>

          <AudioSpectrumCanvas hideWhenAmbientDialogOpen={false} />
        </footer>
      </div>
    </div>
  );
}
