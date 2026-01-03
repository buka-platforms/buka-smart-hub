"use client";

import { Loading } from "@/components/General/AudioUI";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { radioAudioStateAtom, radioStationStateAtom } from "@/data/store";
import {
  loadRadioStationBySlug,
  play,
  // playRandom,
  stop,
} from "@/lib/radio-audio";
import { useAtomValue, useSetAtom } from "jotai";
import {
  Loader2,
  PlayCircle,
  // Shuffle,
  StopCircle,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Storage keys
const WIDGET_RADIO_PLAYER_VOLUME_KEY = "widgetRadioPlayerVolume";
const WIDGET_RADIO_PLAYER_STATION_SLUG_KEY = "widgetRadioPlayerStationSlug";

const Play = () => {
  const radioStationState = useAtomValue(radioStationStateAtom);

  return (
    <>
      <div
        onClick={() => play(false)}
        className="cursor-pointer"
        title={
          radioStationState.radioStation
            ? `Play ${radioStationState.radioStation?.name} from ${radioStationState.radioStation?.country?.name_alias}`
            : "Play"
        }
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

// const Random = () => {
//   return (
//     <>
//       <div
//         // onClick={() => playRandom(false)}
//         className="cursor-pointer"
//         title="Random radio station"
//       >
//         <Shuffle className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
//       </div>
//     </>
//   );
// };

const Volume = () => {
  const radioAudioState = useAtomValue(radioAudioStateAtom);
  const setRadioAudioStore = useSetAtom(radioAudioStateAtom);

  const [volume, setVolume] = useState([
    (radioAudioState.radioAudio?.volume as number) * 100 || 0,
  ]);

  const adjustVolume = (value: number[]) => {
    setVolume(value);

    // Adjust the volume of the audio on radioAudioStore
    setRadioAudioStore((prev) => {
      if (prev.radioAudio) {
        prev.radioAudio.volume = value[0] / 100;
      }
      return {
        ...prev,
        radioAudio: prev.radioAudio,
      };
    });

    // Save the volume to local storage
    localStorage.setItem(
      WIDGET_RADIO_PLAYER_VOLUME_KEY,
      JSON.stringify(value[0]),
    );
  };

  return (
    <>
      <Popover>
        <PopoverTrigger>
          <div id="volume" className="cursor-pointer" title="Volume">
            {Number(radioAudioState.radioAudio?.volume) * 100 === 0 ? (
              <VolumeX className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
            ) : Number(radioAudioState.radioAudio?.volume) * 100 <= 50 ? (
              <Volume1 className="h-8 w-8 text-slate-600 opacity-80 hover:opacity-100" />
            ) : Number(radioAudioState.radioAudio?.volume) * 100 > 50 ? (
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
  const radioAudioState = useAtomValue(radioAudioStateAtom);
  const radioStationState = useAtomValue(radioStationStateAtom);
  const setRadioStationState = useSetAtom(radioStationStateAtom);

  const handleMediaAudioMetadataImageLoad = () => {
    setRadioStationState((prev) => ({
      ...prev,
      metadataImageLoaded: true,
    }));
  };

  const handleRadioStationImageLoad = () => {
    setRadioStationState((prev) => ({
      ...prev,
      isRadioStationLogoLoaded: true,
    }));
  };

  return (
    <>
      {!radioAudioState.isLoading && (
        <>
          <div className="h-16 w-16 shrink-0 p-1">
            <Link href={`/radio/${radioStationState.radioStation?.slug}`}>
              {radioAudioState.isPlaying && radioStationState.metadataExists ? (
                <img
                  className={`h-full w-full overflow-hidden rounded-md object-scale-down ${
                    radioStationState.metadataImageLoaded
                      ? "opacity-100 transition-opacity duration-500 ease-in-out"
                      : "opacity-0"
                  }`}
                  src={radioStationState.exposedArtwork}
                  onLoad={handleMediaAudioMetadataImageLoad}
                  alt=""
                />
              ) : (
                <img
                  className={`h-full w-full overflow-hidden rounded-md border border-slate-200 object-scale-down ${
                    radioStationState.isRadioStationLogoLoaded
                      ? "opacity-100 transition-opacity duration-500 ease-in-out"
                      : "opacity-0"
                  }`}
                  src={radioStationState.radioStation?.logo}
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
                radioStationState.radioStation?.country?.name_alias as string
              }
              className="w-36 overflow-hidden text-ellipsis whitespace-nowrap md:w-full"
            >
              <Link href={`/radio/${radioStationState.radioStation?.slug}`}>
                {radioStationState.radioStation?.name}
              </Link>
            </div>
            {renderTrackDetails()}
          </div>
        </>
      )}

      {radioAudioState.isLoading && (
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
    if (radioAudioState.isPlaying && radioStationState.metadataExists) {
      return "justify-between";
    }

    if (
      radioAudioState.isPlaying &&
      !radioStationState.metadataExists &&
      radioStationState.exposedTitleOnly !== ""
    ) {
      return "justify-between";
    }

    return "justify-center";
  }

  // Helper function to render track details
  function renderTrackDetails() {
    if (radioAudioState.isPlaying && radioStationState.metadataExists) {
      return (
        <div>
          <div
            title={
              radioStationState.exposedTitle !== ""
                ? radioStationState.exposedTitle
                : ""
            }
            className="w-36 overflow-hidden font-medium text-ellipsis whitespace-nowrap md:w-full"
          >
            {radioStationState.exposedTitle !== "" &&
              radioStationState.exposedTitle}
          </div>
          <div
            title={
              radioStationState.exposedArtist !== ""
                ? radioStationState.exposedArtist
                : ""
            }
            className="w-36 overflow-hidden text-ellipsis whitespace-nowrap md:w-full"
          >
            {radioStationState.exposedArtist !== "" &&
              radioStationState.exposedArtist}
          </div>
        </div>
      );
    }

    if (
      radioAudioState.isPlaying &&
      !radioStationState.metadataExists &&
      radioStationState.exposedTitleOnly !== ""
    ) {
      return (
        <div>
          <div
            title={radioStationState.exposedTitleOnly as string}
            className="w-36 overflow-hidden text-ellipsis whitespace-nowrap md:w-full"
          >
            {radioStationState.exposedTitleOnly}
          </div>
        </div>
      );
    }

    return null;
  }
};

const RadioPanel = () => {
  const radioStationState = useAtomValue(radioStationStateAtom);
  const radioAudioState = useAtomValue(radioAudioStateAtom);

  return (
    <>
      <div className="mr-2 flex shrink-0 gap-1 md:gap-2">
        {!radioAudioState.isPlaying &&
          !radioAudioState.isLoading &&
          (!radioStationState.radioStation ? (
            <Loading className="h-8 w-8 animate-spin text-slate-600 opacity-80 hover:opacity-100" />
          ) : (
            <Play />
          ))}

        {radioAudioState.isPlaying && !radioAudioState.isLoading && <Stop />}

        {radioAudioState.isLoading && (
          <Loading className="h-8 w-8 animate-spin text-slate-600 opacity-80 hover:opacity-100" />
        )}

        {radioStationState.radioStation && (
          <>
            {/* <Random /> */}
            <Volume />
          </>
        )}
      </div>
    </>
  );
};

export default function RadioPanelFooter() {
  const radioStationState = useAtomValue(radioStationStateAtom);

  useEffect(() => {
    const handleUseEffect = async () => {
      if (!radioStationState.radioStation) {
        // Check if localStorage has widgetRadioPlayerStationSlug
        if (localStorage.getItem(WIDGET_RADIO_PLAYER_STATION_SLUG_KEY)) {
          await loadRadioStationBySlug(
            localStorage.getItem(
              WIDGET_RADIO_PLAYER_STATION_SLUG_KEY,
            ) as string,
          );
        } else {
          await loadRadioStationBySlug(
            process.env.NEXT_PUBLIC_DEFAULT_RADIO_STATION_SLUG || "gold905",
          );
        }
      }
    };

    handleUseEffect();
  }, [radioStationState.radioStation]);

  if (!radioStationState.radioStation) {
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
