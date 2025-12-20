"use client";

import { Loading } from "@/components/General/AudioUI";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  mediaAudioStateAtom,
  mediaAudio as mediaAudioStore,
  radioStation as radioStationStore,
} from "@/data/store";
import type { RadioStation } from "@/data/type";
import { play, playRandom, stop } from "@/lib/audio";
import { useReadable } from "@/lib/react_use_svelte_store";
import { useAtomValue } from "jotai";
import {
  Loader2,
  PlayCircle,
  Shuffle,
  StopCircle,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const Play = () => {
  const radioStation = useReadable(radioStationStore);

  return (
    <>
      <div
        onClick={() => play(false)}
        className="cursor-pointer"
        title={
          radioStation
            ? `Play ${radioStation?.name} from ${radioStation?.country?.name_alias}`
            : "Play"
        }
      >
        <PlayCircle
          className="h-10 w-10 opacity-80 hover:opacity-100 md:h-12 md:w-12"
          color="#f5f5f5"
        />
      </div>
    </>
  );
};

const Stop = () => {
  return (
    <>
      <div onClick={stop} className="cursor-pointer" title="Stop">
        <StopCircle
          className="h-10 w-10 opacity-80 hover:opacity-100 md:h-12 md:w-12"
          color="#f5f5f5"
        />
      </div>
    </>
  );
};

const Random = () => {
  return (
    <>
      <div
        onClick={() => playRandom(true)}
        className="cursor-pointer"
        title="Random radio station"
      >
        <Shuffle
          className="h-10 w-10 opacity-80 hover:opacity-100 md:h-12 md:w-12"
          color="#f5f5f5"
        />
      </div>
    </>
  );
};

const Volume = () => {
  const searchParams = useSearchParams();
  const mediaAudio = useReadable(mediaAudioStore);
  const initialVolume = (() => {
    const vol = Number(searchParams.get("vol"));
    if (isNaN(vol)) return (mediaAudio?.volume as number) * 100 || 0;
    if (vol > 100) return 100;
    if (vol < 0) return 0;
    return vol;
  })();

  const [volume, setVolume] = useState([initialVolume]);

  // const [volume, setVolume] = useState([
  //   (mediaAudio?.volume as number) * 100 || 0,
  // ]);

  const adjustVolume = (value: number[]) => {
    setVolume(value);

    mediaAudioStore.update((ma) => {
      if (ma) {
        ma.volume = value[0] / 100;
      }
      return ma;
    });

    // Save the volume to local storage
    if (localStorage) {
      localStorage.setItem("mediaAudioVolume", JSON.stringify(value[0]));
    }
  };

  useEffect(() => {
    if (searchParams.get("vol")) {
      let definedVolume = Number(searchParams.get("vol"));

      if (definedVolume > 100) {
        definedVolume = 100;
      }

      if (definedVolume < 0) {
        definedVolume = 0;
      }

      mediaAudioStore.update((ma) => {
        if (ma) {
          ma.volume = definedVolume / 100;
        }
        return ma;
      });

      // Save the volume to local storage
      if (localStorage) {
        localStorage.setItem(
          "mediaAudioVolume",
          definedVolume as unknown as string,
        );
      }
    }
  }, [searchParams]);

  return (
    <>
      <Popover>
        <PopoverTrigger>
          <div id="volume" className="cursor-pointer" title="Volume">
            {Number(mediaAudio?.volume) * 100 === 0 ? (
              <VolumeX
                className="h-10 w-10 opacity-80 hover:opacity-100 md:h-12 md:w-12"
                color="#f5f5f5"
              />
            ) : Number(mediaAudio?.volume) * 100 <= 50 ? (
              <Volume1
                className="h-10 w-10 opacity-80 hover:opacity-100 md:h-12 md:w-12"
                color="#f5f5f5"
              />
            ) : Number(mediaAudio?.volume) * 100 > 50 ? (
              <Volume2
                className="h-10 w-10 opacity-80 hover:opacity-100 md:h-12 md:w-12"
                color="#f5f5f5"
              />
            ) : null}
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

export default function RadioPanel({
  radioStationData,
}: {
  radioStationData: RadioStation;
}) {
  const radioStation = useReadable(radioStationStore);
  const mediaAudioState = useAtomValue(mediaAudioStateAtom);
  const searchParams = useSearchParams();
  const isInIframe = searchParams.get("if") === "1";

  useEffect(() => {
    radioStationStore.set(radioStationData);
  }, [radioStationData]);

  return (
    <>
      {!mediaAudioState.isPlaying &&
        !mediaAudioState.isLoading &&
        (!radioStation ? (
          <Loader2
            className="h-10 w-10 animate-spin opacity-80 hover:opacity-100 md:h-12 md:w-12"
            color="#f5f5f5"
          />
        ) : (
          <Play />
        ))}

      {mediaAudioState.isPlaying && !mediaAudioState.isLoading && <Stop />}

      {mediaAudioState.isLoading && (
        <Loading
          className="h-10 w-10 animate-spin opacity-80 hover:opacity-100 md:h-12 md:w-12"
          color="#f5f5f5"
        />
      )}

      {radioStation && (
        <>
          {!isInIframe && <Random />}
          <Volume />
          <div className="w-0"></div>
        </>
      )}
    </>
  );
}
