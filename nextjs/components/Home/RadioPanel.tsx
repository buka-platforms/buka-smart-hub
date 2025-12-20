"use client";

import { Loading } from "@/components/General/AudioUI";
import { mediaAudioStateAtom, radioStationStateAtom } from "@/data/store";
import {
  loadRadioStationBySlug as loadRadioStation,
  loadRadioStationBySlug,
  play,
  playRandom,
  stop,
} from "@/lib/audio";
import { useAtomValue } from "jotai";
import { Loader2, PlayCircle, Shuffle, StopCircle } from "lucide-react";
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

const Random = () => {
  return (
    <>
      <div
        onClick={() => playRandom()}
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

export default function RadioPanel({
  requestHeaders,
}: {
  requestHeaders: { [key: string]: string };
}) {
  const radioStationState = useAtomValue(radioStationStateAtom);
  const mediaAudioState = useAtomValue(mediaAudioStateAtom);
  const ipCountry = requestHeaders.hasOwnProperty("x-vercel-ip-country")
    ? requestHeaders["x-vercel-ip-country"]
    : null;

  useEffect(() => {
    const handleUseEffect = async () => {
      if (!radioStationState.radioStation) {
        // Check if localStorage has radioStationSlug
        if (localStorage.getItem("radioStationSlug")) {
          await loadRadioStation(
            localStorage.getItem("radioStationSlug") as string,
          );
        } else {
          await loadRadioStationBySlug("gold905");
        }
      }
    };

    handleUseEffect();
  }, [ipCountry, radioStationState.radioStation]);

  return (
    <>
      {!mediaAudioState.isPlaying &&
        !mediaAudioState.isLoading &&
        (!radioStationState.radioStation ? (
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

      {radioStationState.radioStation && (
        <>
          <Random />
          <div className="w-0"></div>
        </>
      )}
    </>
  );
}
