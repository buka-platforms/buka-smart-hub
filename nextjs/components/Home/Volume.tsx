"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { mediaAudioStateAtom } from "@/data/store";
import { useAtomValue, useSetAtom } from "jotai";
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

export default function Volume() {
  const mediaAudioState = useAtomValue(mediaAudioStateAtom);
  const setMediaAudioStore = useSetAtom(mediaAudioStateAtom);

  const [volume, setVolume] = useState([
    (mediaAudioState.mediaAudio?.volume as number) * 100 || 0,
  ]);

  const adjustVolume = (value: number[]) => {
    setVolume(value);

    // Adjust the volume of the audio on mediaAudioStore
    setMediaAudioStore((prev) => {
      if (prev.mediaAudio) {
        prev.mediaAudio.volume = value[0] / 100;
      }
      return {
        ...prev,
        mediaAudio: prev.mediaAudio,
      };
    });

    // Save the volume to local storage
    localStorage.setItem("mediaAudioVolume", JSON.stringify(value[0]));
  };

  useEffect(() => {
    const mediaAudio = mediaAudioState.mediaAudio;
    if (!mediaAudio) return;

    const handleVolumeChange = () => {
      setVolume([(mediaAudio.volume as number) * 100 || 0]);
    };

    mediaAudio.addEventListener("volumechange", handleVolumeChange);

    // Set initial volume state
    handleVolumeChange();

    return () => {
      mediaAudio.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [mediaAudioState.mediaAudio]);

  return (
    <>
      <Popover>
        <PopoverTrigger>
          <div id="volume" className="cursor-pointer" title="Volume">
            {Number(mediaAudioState.mediaAudio?.volume) * 100 === 0 ? (
              <VolumeX className="text-shadow-1 h-5 w-5 text-white opacity-80 hover:opacity-100" />
            ) : Number(mediaAudioState.mediaAudio?.volume) * 100 <= 50 ? (
              <Volume1 className="text-shadow-1 h-5 w-5 text-white opacity-80 hover:opacity-100" />
            ) : Number(mediaAudioState.mediaAudio?.volume) * 100 > 50 ? (
              <Volume2 className="text-shadow-1 h-5 w-5 text-white opacity-80 hover:opacity-100" />
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
}
