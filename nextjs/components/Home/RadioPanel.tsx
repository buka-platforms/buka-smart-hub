"use client";

import { Loading } from "@/components/General/AudioUI";
import { radioAudioStateAtom, radioStationStateAtom } from "@/data/store";
import { loadRadioStationBySlug, play, stop } from "@/lib/radio-audio";
import { useAtomValue } from "jotai";
import { ListMusic, Loader2, PlayCircle, StopCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

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

const RadioStationDirectory = () => {
  return (
    <>
      <Link href="/apps/radio" title="Radio station directory">
        <div className="cursor-pointer">
          <ListMusic
            className="h-10 w-10 opacity-80 hover:opacity-100 md:h-12 md:w-12"
            color="#f5f5f5"
          />
        </div>
      </Link>
    </>
  );
};

export default function RadioPanel() {
  const radioStationState = useAtomValue(radioStationStateAtom);
  const radioAudioState = useAtomValue(radioAudioStateAtom);

  useEffect(() => {
    const handleUseEffect = async () => {
      if (!radioStationState.radioStation) {
        // Check if localStorage has widgetRadioPlayerStationSlug
        if (localStorage.getItem("widgetRadioPlayerStationSlug")) {
          await loadRadioStationBySlug(
            localStorage.getItem("widgetRadioPlayerStationSlug") as string,
          );
        } else {
          await loadRadioStationBySlug("gold905");
        }
      }
    };

    handleUseEffect();
  }, [radioStationState.radioStation]);

  return (
    <>
      {!radioAudioState.isPlaying &&
        !radioAudioState.isLoading &&
        (!radioStationState.radioStation ? (
          <Loader2
            className="h-10 w-10 animate-spin opacity-80 hover:opacity-100 md:h-12 md:w-12"
            color="#f5f5f5"
          />
        ) : (
          <Play />
        ))}

      {radioAudioState.isPlaying && !radioAudioState.isLoading && <Stop />}

      {radioAudioState.isLoading && (
        <Loading
          className="h-10 w-10 animate-spin opacity-80 hover:opacity-100 md:h-12 md:w-12"
          color="#f5f5f5"
        />
      )}

      {radioStationState.radioStation && (
        <>
          <RadioStationDirectory />
          <div className="w-0"></div>
        </>
      )}
    </>
  );
}
