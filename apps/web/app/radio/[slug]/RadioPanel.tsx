"use client";

import { Loading } from "@/components/General/AudioUI";
import { radioAudioStateAtom, radioStationStateAtom } from "@/data/store";
import type { RadioStation } from "@/data/type";
import { play, stop } from "@/lib/radio-audio";
import { useAtomValue, useSetAtom } from "jotai";
import { ListMusic, Loader2, PlayCircle, StopCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

export default function RadioPanel({
  radioStationData,
}: {
  radioStationData: RadioStation;
}) {
  const radioStationState = useAtomValue(radioStationStateAtom);
  const setRadioStationStore = useSetAtom(radioStationStateAtom);
  const radioAudioState = useAtomValue(radioAudioStateAtom);
  const searchParams = useSearchParams();
  const isInIframe = searchParams?.get("if") === "1";

  useEffect(() => {
    setRadioStationStore((prev) => ({
      ...prev,
      radioStation: radioStationData,
    }));
  }, [radioStationData, setRadioStationStore]);

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
          {!isInIframe && <RadioStationDirectory />}
          <div className="w-0"></div>
        </>
      )}
    </>
  );
}
