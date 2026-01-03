"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { radioAudioStateAtom } from "@/data/store";
import { useAtomValue, useSetAtom } from "jotai";
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

// Storage keys
const WIDGET_RADIO_PLAYER_VOLUME_KEY = "widgetRadioPlayerVolume";

export default function Volume() {
  const radioAudioState = useAtomValue(radioAudioStateAtom);
  const setRadioAudioStore = useSetAtom(radioAudioStateAtom);

  const [volume, setVolume] = useState([
    (radioAudioState.radioAudio?.volume as number) * 100 || 0,
  ]);

  const adjustVolume = (value: number[]) => {
    setVolume(value);

    // Adjust the volume of the audio on mediaAudioStore
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

  useEffect(() => {
    const radioAudio = radioAudioState.radioAudio;
    if (!radioAudio) return;

    const handleVolumeChange = () => {
      setVolume([(radioAudio.volume as number) * 100 || 0]);
    };

    radioAudio.addEventListener("volumechange", handleVolumeChange);

    // Set initial volume state
    handleVolumeChange();

    return () => {
      radioAudio.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [radioAudioState.radioAudio]);

  return (
    <>
      <Popover>
        <PopoverTrigger>
          <div id="volume" className="cursor-pointer" title="Volume">
            {Number(radioAudioState.radioAudio?.volume) * 100 === 0 ? (
              <VolumeX className="text-shadow-1 h-5 w-5 text-white opacity-80 hover:opacity-100" />
            ) : Number(radioAudioState.radioAudio?.volume) * 100 <= 50 ? (
              <Volume1 className="text-shadow-1 h-5 w-5 text-white opacity-80 hover:opacity-100" />
            ) : Number(radioAudioState.radioAudio?.volume) * 100 > 50 ? (
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
