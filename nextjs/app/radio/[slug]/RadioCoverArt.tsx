"use client";

import { radioAudioStateAtom, radioStationStateAtom } from "@/data/store";
import { transparent1x1Pixel } from "@/lib/radio-audio";
import { useAtomValue, useSetAtom } from "jotai";

/* eslint-disable @next/next/no-img-element */
const RadioStation = () => {
  const radioStationState = useAtomValue(radioStationStateAtom);
  const setRadioStationState = useSetAtom(radioStationStateAtom);

  const handleRadioStationImageLoad = () => {
    setRadioStationState((prev) => ({
      ...prev,
      isRadioStationLogoLoaded: true,
    }));
  };

  return (
    <div
      className={`fixed inset-0 z-10 m-auto flex w-max max-w-fit flex-col items-center justify-center text-whitesmoke md:relative md:inset-auto md:m-0 md:items-start md:justify-start ${radioStationState.isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
    >
      <div
        className={`flex h-52 w-52 min-w-52 items-center justify-center overflow-hidden rounded-md bg-white ${radioStationState.radioStation && radioStationState.radioStation?.logo === "" ? "hidden" : ""}`}
      >
        <img
          className={`h-full w-full object-scale-down p-2 ${radioStationState.isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
          src={
            radioStationState.radioStation
              ? radioStationState.radioStation?.logo
              : transparent1x1Pixel
          }
          alt=""
          loading="lazy"
          onLoad={handleRadioStationImageLoad}
        />
      </div>
      <div className="mt-3 hidden w-full md:block"></div>
    </div>
  );
};

/* eslint-disable @next/next/no-img-element */
const RadioStationPlayingWithCompleteMetadata = () => {
  const radioStationState = useAtomValue(radioStationStateAtom);
  const setRadioStationState = useSetAtom(radioStationStateAtom);

  const handleMediaAudioMetadataImageLoad = () => {
    setRadioStationState((prev) => ({
      ...prev,
      metadataImageLoaded: true,
    }));
  };

  return (
    <div
      className={`fixed inset-0 z-10 m-auto flex w-fit max-w-[60%] min-w-fit flex-col items-center justify-center gap-y-1 text-whitesmoke md:relative md:inset-auto md:m-0 md:max-w-full md:items-start md:justify-start ${radioStationState.metadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
    >
      <div
        className={`h-52 w-52 overflow-hidden rounded-md ${radioStationState.metadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
      >
        <img
          className={`h-full w-full object-scale-down ${radioStationState.metadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
          src={radioStationState.exposedArtwork}
          alt=""
          loading="lazy"
          onLoad={handleMediaAudioMetadataImageLoad}
        />
      </div>
      <div className="flex flex-col items-center md:items-start">
        <div
          className={`text-shadow-1 text-center font-rubik text-lg font-light md:text-left ${radioStationState.metadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
        >
          {radioStationState.exposedTitle != "" &&
            radioStationState.exposedTitle}
        </div>
        <div
          className={`text-shadow-1 text-center font-rubik text-sm font-light md:text-left ${radioStationState.metadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
        >
          {radioStationState.exposedArtist != "" &&
            radioStationState.exposedArtist}
        </div>
      </div>
      <div className="mt-3 mb-3 hidden w-full border-b border-b-[#f5f5f5] md:block"></div>
    </div>
  );
};

/* eslint-disable @next/next/no-img-element */
const RadioStationPlayingWithTitleMetadata = () => {
  const radioStationState = useAtomValue(radioStationStateAtom);
  const setRadioStationState = useSetAtom(radioStationStateAtom);

  const handleRadioStationImageLoad = () => {
    setRadioStationState((prev) => ({
      ...prev,
      metadataImageLoaded: true,
    }));
  };

  return (
    <div
      className={`fixed inset-0 z-10 m-auto flex w-max max-w-fit flex-col items-center justify-center gap-y-1 text-whitesmoke md:relative md:inset-auto md:m-0 md:items-start md:justify-start ${radioStationState.isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
    >
      <div
        className={`flex h-52 w-52 min-w-52 items-center justify-center rounded-md bg-white ${radioStationState.radioStation && radioStationState.radioStation?.logo === "" ? "hidden" : null}`}
      >
        <img
          className={`h-full w-full object-scale-down p-2 ${radioStationState.isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
          src={
            radioStationState.radioStation
              ? radioStationState.radioStation?.logo
              : transparent1x1Pixel
          }
          alt=""
          loading="lazy"
          onLoad={handleRadioStationImageLoad}
        />
      </div>
      <div className="mt-1 flex flex-col items-center md:items-start">
        <div
          className={`text-shadow-1 text-center font-rubik text-sm font-light md:text-left ${radioStationState.isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
        >
          {radioStationState.exposedTitleOnly}
        </div>
      </div>
      <div className="mt-3 mb-3 hidden w-full border-b border-b-[#f5f5f5] md:block"></div>
    </div>
  );
};

export default function RadioCoverArt() {
  const radioAudioState = useAtomValue(radioAudioStateAtom);
  const radioStationState = useAtomValue(radioStationStateAtom);

  return (
    <>
      {radioStationState.radioStation &&
        (() => {
          if (!radioAudioState.isLoading && !radioAudioState.isPlaying) {
            return <RadioStation />;
          }

          if (radioAudioState.isLoading) {
            return <RadioStation />;
          }

          if (radioAudioState.isPlaying) {
            if (radioStationState.metadataExists) {
              return <RadioStationPlayingWithCompleteMetadata />;
            }

            if (radioStationState.exposedTitleOnly !== "") {
              return <RadioStationPlayingWithTitleMetadata />;
            }

            return <RadioStation />;
          }

          return null;
        })()}
    </>
  );
}
