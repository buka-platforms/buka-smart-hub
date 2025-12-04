"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { mediaAudio as mediaAudioStore } from "@/data/store";
import { useReadable } from "@/lib/react_use_svelte_store";
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

export default function Volume() {
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

  useEffect(() => {
    mediaAudio && setVolume([(mediaAudio?.volume as number) * 100 || 0]);
  }, [mediaAudio]);

  return (
    <>
      <Popover>
        <PopoverTrigger>
          <div id="volume" className="cursor-pointer" title="Volume">
            {Number(mediaAudio?.volume) * 100 === 0 ? (
              <VolumeX className="text-shadow-1 h-5 w-5 text-white opacity-80 hover:opacity-100" />
            ) : Number(mediaAudio?.volume) * 100 <= 50 ? (
              <Volume1 className="text-shadow-1 h-5 w-5 text-white opacity-80 hover:opacity-100" />
            ) : Number(mediaAudio?.volume) * 100 > 50 ? (
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
