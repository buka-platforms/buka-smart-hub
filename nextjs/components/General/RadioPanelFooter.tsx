"use client";

import { Loading } from "@/components/General/AudioUI";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  audioTrackStateAtom,
  isRadioStationLogoLoaded as isRadioStationLogoLoadedStore,
  mediaAudioStateAtom,
  mediaAudio as mediaAudioStore,
  radioStationPlaying as radioStationPlayingStore,
  radioStation as radioStationStore,
} from "@/data/store";
import {
  loadRadioStationBySlug as loadRadioStation,
  loadRandomRadioStation,
  play,
  playRandom,
  stop,
} from "@/lib/audio";
import { useReadable } from "@/lib/react_use_svelte_store";
import { useAtomValue, useSetAtom } from "jotai";
import {
  Loader2,
  PlayCircle,
  Shuffle,
  StopCircle,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { get } from "svelte/store";

const Play = () => {
  const radioStation = useReadable(radioStationStore);

  return (
    <>
      <div
        onClick={() => play(false)}
        className="cursor-pointer"
        title={`Play ${radioStation?.name} from ${radioStation?.country?.name_alias}`}
      >
        <PlayCircle className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
      </div>
    </>
  );
};

const Stop = () => {
  return (
    <>
      <div onClick={stop} className="cursor-pointer" title="Stop">
        <StopCircle className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
      </div>
    </>
  );
};

const Random = () => {
  return (
    <>
      <div
        onClick={() => playRandom(false)}
        className="cursor-pointer"
        title="Random radio station"
      >
        <Shuffle className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
      </div>
    </>
  );
};

const Volume = () => {
  const mediaAudio = useReadable(mediaAudioStore);

  const [volume, setVolume] = useState([
    (mediaAudio?.volume as number) * 100 || 0,
  ]);

  const adjustVolume = (value: number[]) => {
    setVolume(value);

    // Adjust the volume of the audio on mediaAudioStore
    mediaAudioStore.update((ma) => {
      if (ma) {
        ma.volume = value[0] / 100;
      }
      return ma;
    });

    // Save the volume to local storage
    localStorage.setItem("mediaAudioVolume", JSON.stringify(value[0]));
  };

  return (
    <>
      <Popover>
        <PopoverTrigger>
          <div id="volume" className="cursor-pointer" title="Volume">
            {Number(mediaAudio?.volume) * 100 === 0 ? (
              <VolumeX className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
            ) : Number(mediaAudio?.volume) * 100 <= 50 ? (
              <Volume1 className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
            ) : Number(mediaAudio?.volume) * 100 > 50 ? (
              <Volume2 className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
            ) : (
              <Loader2
                className="h-8 w-8 animate-spin opacity-80 hover:opacity-100"
                color="#eee"
              />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="flex w-44 items-center gap-x-2">
          <VolumeX size={20} />
          <Slider
            value={volume}
            max={100}
            step={1}
            onValueChange={adjustVolume}
          />
          <Volume2 size={20} />
        </PopoverContent>
      </Popover>
    </>
  );
};

/* eslint-disable @next/next/no-img-element */
const RadioThumbnail = () => {
  const radioStation = useReadable(radioStationStore);
  const radioStationPlaying = useReadable(radioStationPlayingStore);
  const isRadioStationLogoLoaded = useReadable(isRadioStationLogoLoadedStore);
  const mediaAudioState = useAtomValue(mediaAudioStateAtom);
  const audioTrackState = useAtomValue(audioTrackStateAtom);
  const setAudioTrackState = useSetAtom(audioTrackStateAtom);

  const handleMediaAudioMetadataImageLoad = () => {
    setAudioTrackState((prev) => ({
      ...prev,
      metadataImageLoaded: true,
    }));
  };

  const handleRadioStationImageLoad = () => {
    isRadioStationLogoLoadedStore.set(true);
  };

  return (
    <>
      {!mediaAudioState.isLoading && (
        <>
          <div className="h-16 w-16 shrink-0 p-1">
            <Link
              href={`/radio/${radioStationPlaying?.slug || radioStation?.slug}`}
            >
              {mediaAudioState.isPlaying && audioTrackState.metadataExists ? (
                <img
                  className={`h-full w-full overflow-hidden rounded-md object-scale-down ${
                    audioTrackState.metadataImageLoaded
                      ? "opacity-100 transition-opacity duration-500 ease-in-out"
                      : "opacity-0"
                  }`}
                  src={audioTrackState.exposedArtwork}
                  onLoad={handleMediaAudioMetadataImageLoad}
                  alt=""
                />
              ) : (
                <img
                  className={`h-full w-full overflow-hidden rounded-md border border-slate-200 object-scale-down ${
                    isRadioStationLogoLoaded
                      ? "opacity-100 transition-opacity duration-500 ease-in-out"
                      : "opacity-0"
                  }`}
                  src={radioStation?.logo}
                  onLoad={handleRadioStationImageLoad}
                  alt=""
                />
              )}
            </Link>
          </div>
          <div
            className={`flex flex-col py-1 text-xs md:text-sm ${getFlexClass()}`}
          >
            <div
              title={
                (radioStationPlaying?.country?.name_alias ||
                  radioStation?.country?.name_alias) as string
              }
              className="w-36 overflow-hidden text-ellipsis whitespace-nowrap md:w-full"
            >
              <Link
                href={`/radio/${radioStationPlaying?.slug || radioStation?.slug}`}
              >
                {radioStationPlaying?.name || radioStation?.name}
              </Link>
            </div>
            {renderTrackDetails()}
          </div>
        </>
      )}

      {mediaAudioState.isLoading && (
        <>
          <div className="h-16 w-16 shrink-0 p-1">
            <Skeleton className="h-full w-full overflow-hidden rounded-md" />
          </div>
          <div className="flex flex-col justify-center">
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        </>
      )}
    </>
  );

  // Helper function to determine flex class
  function getFlexClass() {
    if (mediaAudioState.isPlaying && audioTrackState.metadataExists) {
      return "justify-between";
    }

    if (
      mediaAudioState.isPlaying &&
      !audioTrackState.metadataExists &&
      audioTrackState.exposedTitleOnly !== ""
    ) {
      return "justify-between";
    }

    return "justify-center";
  }

  // Helper function to render track details
  function renderTrackDetails() {
    if (mediaAudioState.isPlaying && audioTrackState.metadataExists) {
      return (
        <div>
          <div
            title={
              audioTrackState.exposedTitle !== ""
                ? audioTrackState.exposedTitle
                : ""
            }
            className="w-36 overflow-hidden font-medium text-ellipsis whitespace-nowrap md:w-full"
          >
            {audioTrackState.exposedTitle !== "" &&
              audioTrackState.exposedTitle}
          </div>
          <div
            title={
              audioTrackState.exposedArtist !== ""
                ? audioTrackState.exposedArtist
                : ""
            }
            className="w-36 overflow-hidden text-ellipsis whitespace-nowrap md:w-full"
          >
            {audioTrackState.exposedArtist !== "" &&
              audioTrackState.exposedArtist}
          </div>
        </div>
      );
    }

    if (
      mediaAudioState.isPlaying &&
      !audioTrackState.metadataExists &&
      audioTrackState.exposedTitleOnly !== ""
    ) {
      return (
        <div>
          <div
            title={audioTrackState.exposedTitleOnly as string}
            className="w-36 overflow-hidden text-ellipsis whitespace-nowrap md:w-full"
          >
            {audioTrackState.exposedTitleOnly}
          </div>
        </div>
      );
    }

    return null;
  }
};

const RadioPanel = () => {
  const radioStation = useReadable(radioStationStore);
  const mediaAudioState = useAtomValue(mediaAudioStateAtom);

  return (
    <>
      <div className="mr-2 flex shrink-0 gap-1 md:gap-2">
        {!mediaAudioState.isPlaying &&
          !mediaAudioState.isLoading &&
          (!radioStation ? (
            <Loading className="h-8 w-8 animate-spin text-slate-600 opacity-80 hover:opacity-100" />
          ) : (
            <Play />
          ))}

        {mediaAudioState.isPlaying && !mediaAudioState.isLoading && <Stop />}

        {mediaAudioState.isLoading && (
          <Loading className="h-8 w-8 animate-spin text-slate-600 opacity-80 hover:opacity-100" />
        )}

        {radioStation && (
          <>
            <Random />
            <Volume />
          </>
        )}
      </div>
    </>
  );
};

export default function RadioPanelFooter({
  requestHeaders,
}: {
  requestHeaders: { [key: string]: string };
}) {
  const radioStation = useReadable(radioStationStore);
  const ipCountry = requestHeaders.hasOwnProperty("x-vercel-ip-country")
    ? requestHeaders["x-vercel-ip-country"]
    : null;

  useEffect(() => {
    const handleUseEffect = async () => {
      if (!get(radioStationStore)) {
        // Check if localStorage has radioStationSlug
        if (localStorage.getItem("radioStationSlug")) {
          await loadRadioStation(
            localStorage.getItem("radioStationSlug") as string,
          );
        } else {
          if (ipCountry) {
            await loadRandomRadioStation(ipCountry);
          } else {
            await loadRandomRadioStation();
          }
        }
      }
    };

    handleUseEffect();
  }, [ipCountry]);

  if (!radioStation) {
    return null;
  }

  return (
    <>
      <div className="fixed right-0 bottom-0 left-0 z-10 flex h-16 w-full items-center justify-between gap-2 border-t bg-white text-gray-600">
        <div className="flex items-center gap-1">
          <RadioThumbnail />
        </div>
        <RadioPanel />
      </div>
    </>
  );
}
