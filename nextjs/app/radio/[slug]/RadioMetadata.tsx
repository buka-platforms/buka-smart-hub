"use client";

import { radioStation as radioStationStore } from "@/data/store";
import { useReadable } from "@/lib/react_use_svelte_store";

/* eslint-disable @next/next/no-img-element */
export default function RadioMetadata() {
  const radioStation = useReadable(radioStationStore);

  return (
    <>
      {radioStation ? (
        <div className="text-shadow-1 mb-[0.625rem] font-rubik text-3xl leading-tight text-whitesmoke md:mb-5 md:text-4xl">
          {radioStation?.name}
          {radioStation?.city ? (
            radioStation?.city !== radioStation?.country?.name_alias ? (
              <div className="text-sm font-thin">{`${radioStation?.city}, ${radioStation?.country?.name_alias}`}</div>
            ) : (
              <div className="text-sm font-thin">{radioStation?.city}</div>
            )
          ) : (
            <div className="text-sm font-thin">
              {radioStation?.country?.name_alias}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
