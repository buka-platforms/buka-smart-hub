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
  exposedTrackArtist as exposedTrackArtistStore,
  exposedTrackArtwork as exposedTrackArtworkStore,
  exposedTrackTitleOnly as exposedTrackTitleOnlyStore,
  exposedTrackTitle as exposedTrackTitleStore,
  isMediaAudioLoading as isMediaAudioLoadingStore,
  isMediaAudioMetadataExists as isMediaAudioMetadataExistsStore,
  isMediaAudioMetadataImageLoaded as isMediaAudioMetadataImageLoadedStore,
  isMediaAudioPlaying as isMediaAudioPlayingStore,
  isRadioStationLogoLoaded as isRadioStationLogoLoadedStore,
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
      ma && (ma.volume = value[0] / 100);
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
  const isMediaAudioMetadataImageLoaded = useReadable(
    isMediaAudioMetadataImageLoadedStore,
  );
  const isRadioStationLogoLoaded = useReadable(isRadioStationLogoLoadedStore);
  const isMediaAudioPlaying = useReadable(isMediaAudioPlayingStore);
  const exposedTrackArtwork = useReadable(exposedTrackArtworkStore);
  const exposedTrackTitle = useReadable(exposedTrackTitleStore);
  const exposedTrackArtist = useReadable(exposedTrackArtistStore);
  const isMediaAudioMetadataExists = useReadable(
    isMediaAudioMetadataExistsStore,
  );
  const exposedTrackTitleOnly = useReadable(exposedTrackTitleOnlyStore);
  const isMediaAudioLoading = useReadable(isMediaAudioLoadingStore);

  const handleMediaAudioMetadataImageLoad = () => {
    isMediaAudioMetadataImageLoadedStore.set(true);
  };

  const handleRadioStationImageLoad = () => {
    isRadioStationLogoLoadedStore.set(true);
  };

  return (
    <>
      {!isMediaAudioLoading && (
        <>
          <div className="h-16 w-16 shrink-0 p-1">
            <Link
              href={`/radio/${radioStationPlaying?.slug || radioStation?.slug}`}
            >
              {isMediaAudioPlaying && isMediaAudioMetadataExists ? (
                <img
                  className={`h-full w-full overflow-hidden rounded-md object-scale-down ${
                    isMediaAudioMetadataImageLoaded
                      ? "opacity-100 transition-opacity duration-500 ease-in-out"
                      : "opacity-0"
                  }`}
                  src={exposedTrackArtwork}
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

      {isMediaAudioLoading && (
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
    if (isMediaAudioPlaying && isMediaAudioMetadataExists) {
      return "justify-between";
    }

    if (
      isMediaAudioPlaying &&
      !isMediaAudioMetadataExists &&
      exposedTrackTitleOnly !== ""
    ) {
      return "justify-between";
    }

    return "justify-center";
  }

  // Helper function to render track details
  function renderTrackDetails() {
    if (isMediaAudioPlaying && isMediaAudioMetadataExists) {
      return (
        <div>
          <div
            title={exposedTrackTitle !== "" ? exposedTrackTitle : ""}
            className="w-36 overflow-hidden font-medium text-ellipsis whitespace-nowrap md:w-full"
          >
            {exposedTrackTitle !== "" && exposedTrackTitle}
          </div>
          <div
            title={exposedTrackArtist !== "" ? exposedTrackArtist : ""}
            className="w-36 overflow-hidden text-ellipsis whitespace-nowrap md:w-full"
          >
            {exposedTrackArtist !== "" && exposedTrackArtist}
          </div>
        </div>
      );
    }

    if (
      isMediaAudioPlaying &&
      !isMediaAudioMetadataExists &&
      exposedTrackTitleOnly !== ""
    ) {
      return (
        <div>
          <div
            title={exposedTrackTitleOnly as string}
            className="w-36 overflow-hidden text-ellipsis whitespace-nowrap md:w-full"
          >
            {exposedTrackTitleOnly}
          </div>
        </div>
      );
    }

    return null;
  }
};

const RadioPanel = () => {
  const radioStation = useReadable(radioStationStore);
  const isMediaAudioPlaying = useReadable(isMediaAudioPlayingStore);
  const isMediaAudioLoading = useReadable(isMediaAudioLoadingStore);

  return (
    <>
      <div className="mr-2 flex shrink-0 gap-1 md:gap-2">
        {!isMediaAudioPlaying &&
          !isMediaAudioLoading &&
          (!radioStation ? (
            <Loading className="h-8 w-8 animate-spin text-slate-600 opacity-80 hover:opacity-100" />
          ) : (
            <Play />
          ))}

        {isMediaAudioPlaying && !isMediaAudioLoading && <Stop />}

        {isMediaAudioLoading && (
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
  requestHeaders: any;
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
          ipCountry
            ? await loadRandomRadioStation(ipCountry)
            : await loadRandomRadioStation();
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
