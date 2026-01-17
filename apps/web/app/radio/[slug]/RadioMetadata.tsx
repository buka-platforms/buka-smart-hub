"use client";

import { radioStationStateAtom } from "@/data/store";
import { useAtomValue } from "jotai";

export default function RadioMetadata() {
  const radioStationState = useAtomValue(radioStationStateAtom);

  return (
    <>
      {radioStationState.radioStation ? (
        <div className="text-shadow-1 mb-2.5 font-rubik text-3xl leading-tight text-whitesmoke md:mb-5 md:text-4xl">
          {radioStationState.radioStation?.name}
          {radioStationState.radioStation?.city ? (
            radioStationState.radioStation?.city !==
            radioStationState.radioStation?.country?.name_alias ? (
              <div className="text-sm font-thin">{`${radioStationState.radioStation?.city}, ${radioStationState.radioStation?.country?.name_alias}`}</div>
            ) : (
              <div className="text-sm font-thin">
                {radioStationState.radioStation?.city}
              </div>
            )
          ) : (
            <div className="text-sm font-thin">
              {radioStationState.radioStation?.country?.name_alias}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
