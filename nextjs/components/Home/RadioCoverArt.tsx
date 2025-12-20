"use client";

import {
  audioTrackStateAtom,
  isRadioStationLogoLoaded as isRadioStationLogoLoadedStore,
  mediaAudioStateAtom,
  radioStation as radioStationStore,
} from "@/data/store";
import { transparent1x1Pixel } from "@/lib/audio";
import { useReadable } from "@/lib/react_use_svelte_store";
import { useAtomValue, useSetAtom } from "jotai";
import Link from "next/link";

/* eslint-disable @next/next/no-img-element */
const RadioStation = () => {
  const radioStation = useReadable(radioStationStore);
  const isRadioStationLogoLoaded = useReadable(isRadioStationLogoLoadedStore);

  const handleRadioStationImageLoad = () => {
    isRadioStationLogoLoadedStore.set(true);
  };

  return (
    <div
      className={`fixed inset-0 z-10 m-auto flex w-max max-w-fit flex-col items-center justify-center text-whitesmoke md:relative md:inset-auto md:m-0 md:items-start md:justify-start ${isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
    >
      {radioStation && radioStation?.logo !== "" ? (
        <div
          className={`flex h-52 w-52 min-w-52 items-center justify-center rounded-md bg-white`}
        >
          <img
            className={`h-full w-full object-scale-down p-2 ${isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
            src={radioStation ? radioStation?.logo : transparent1x1Pixel}
            alt=""
            loading="lazy"
            onLoad={handleRadioStationImageLoad}
          />
        </div>
      ) : null}
      <div
        className="text-shadow-1 mt-3 text-center font-rubik text-sm md:text-left md:text-base"
        title={(radioStation && radioStation?.country?.name_alias) as string}
      >
        <Link href={`/radio/${radioStation?.slug}`}>
          {radioStation && radioStation?.name !== ""
            ? radioStation?.name
            : "\u00A0"}
        </Link>
      </div>
      <div className="mt-3 mb-3 hidden w-full border-b border-b-[#f5f5f5] md:block"></div>
    </div>
  );
};

/* eslint-disable @next/next/no-img-element */
const RadioStationPlayingWithCompleteMetadata = () => {
  const radioStation = useReadable(radioStationStore);
  const setAudioTrackState = useSetAtom(audioTrackStateAtom);
  const audioTrackState = useAtomValue(audioTrackStateAtom);

  const handleMediaAudioMetadataImageLoad = () => {
    setAudioTrackState((prev) => ({
      ...prev,
      metadataImageLoaded: true,
    }));
  };

  return (
    <div
      className={`fixed inset-0 z-10 m-auto flex w-fit max-w-[60%] min-w-fit flex-col items-center justify-center gap-y-1 text-whitesmoke md:relative md:inset-auto md:m-0 md:max-w-full md:items-start md:justify-start ${audioTrackState.metadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
    >
      <div
        className="text-shadow-1 text-center font-rubik text-sm font-light md:text-left"
        title={(radioStation && radioStation?.country?.name_alias) as string}
      >
        <Link href={`/radio/${radioStation?.slug}`}>{radioStation?.name}</Link>
      </div>
      <div
        className={`h-52 w-52 overflow-hidden rounded-md bg-white ${audioTrackState.metadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
      >
        <img
          className={`h-full w-full object-scale-down p-2 ${audioTrackState.metadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
          // Set src to null to prevent the browser from loading the image if exposedTrackArtwork is empty
          src={audioTrackState.exposedArtwork || transparent1x1Pixel}
          alt=""
          loading="lazy"
          onLoad={handleMediaAudioMetadataImageLoad}
        />
      </div>
      <div className="flex flex-col items-center md:items-start">
        <div
          className={`text-shadow-1 text-center font-rubik text-sm font-light md:text-left ${audioTrackState.metadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
        >
          {audioTrackState.exposedTitle != "" && audioTrackState.exposedTitle}
        </div>
        <div
          className={`text-shadow-1 text-center font-rubik text-sm font-light md:text-left ${audioTrackState.metadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
        >
          {audioTrackState.exposedArtist != "" && audioTrackState.exposedArtist}
        </div>
      </div>
      <div className="mt-3 mb-3 hidden w-full border-b border-b-[#f5f5f5] md:block"></div>
    </div>
  );
};

/* eslint-disable @next/next/no-img-element */
const RadioStationPlayingWithTitleMetadata = () => {
  const radioStation = useReadable(radioStationStore);
  const isRadioStationLogoLoaded = useReadable(isRadioStationLogoLoadedStore);
  const audioTrackState = useAtomValue(audioTrackStateAtom);

  const handleRadioStationImageLoad = () => {
    isRadioStationLogoLoadedStore.set(true);
  };

  return (
    <div
      className={`fixed inset-0 z-10 m-auto flex w-fit max-w-[60%] min-w-fit flex-col items-center justify-center gap-y-1 text-whitesmoke md:relative md:inset-auto md:m-0 md:max-w-full md:items-start md:justify-start ${isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
    >
      <div
        className="text-shadow-1 text-center font-rubik text-sm font-light md:text-left"
        title={(radioStation && radioStation?.country?.name_alias) as string}
      >
        <Link href={`/radio/${radioStation?.slug}`}>{radioStation?.name}</Link>
      </div>
      <div
        className={`h-52 w-52 overflow-hidden rounded-md bg-white ${isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
      >
        <img
          className={`h-full w-full object-scale-down p-2 ${isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
          src={radioStation ? radioStation?.logo : transparent1x1Pixel}
          alt=""
          loading="lazy"
          onLoad={handleRadioStationImageLoad}
        />
      </div>
      <div className="mt-1 flex flex-col items-center md:items-start">
        <div
          className={`text-shadow-1 text-center font-rubik text-sm font-light md:text-left ${isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
        >
          {audioTrackState.exposedTitleOnly}
        </div>
      </div>
      <div className="mt-3 mb-3 hidden w-full border-b border-b-[#f5f5f5] md:block"></div>
    </div>
  );
};

export default function RadioCoverArt() {
  const radioStation = useReadable(radioStationStore);
  const mediaAudioState = useAtomValue(mediaAudioStateAtom);
  const audioTrackState = useAtomValue(audioTrackStateAtom);

  return (
    <>
      {radioStation ? (
        !mediaAudioState.isLoading && !mediaAudioState.isPlaying ? (
          <RadioStation />
        ) : mediaAudioState.isLoading ? (
          <RadioStation />
        ) : mediaAudioState.isPlaying ? (
          audioTrackState.metadataExists ? (
            <RadioStationPlayingWithCompleteMetadata />
          ) : audioTrackState.exposedTitleOnly !== "" ? (
            <RadioStationPlayingWithTitleMetadata />
          ) : (
            <RadioStation />
          )
        ) : null
      ) : null}
    </>
  );
}
