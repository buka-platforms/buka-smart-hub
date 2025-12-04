"use client";

import {
  exposedTrackArtist as exposedTrackArtistStore,
  exposedTrackArtwork as exposedTrackArtworkStore,
  exposedTrackTitleOnly as exposedTrackTitleOnlyStore,
  exposedTrackTitle as exposedTrackTitleStore,
  isMediaAudioLoading as isMediaAudioLoadingStore,
  isMediaAudioMetadataExists as isMediaAudioMetadataExistsStore,
  isMediaAudioMetadataImageLoaded as isMediaAudioMetadataImageLoadedStore,
  isMediaAudioPlaying as isMediaAudioPlayingStore,
  isRadioStationLogoLoaded as isRadioStationLogoLoadedStore,
  radioStationPlaying,
  radioStationPlaying as radioStationPlayingStore,
  radioStation as radioStationStore,
} from "@/data/store";
import { transparent1x1Pixel } from "@/lib/audio";
import { useReadable } from "@/lib/react_use_svelte_store";

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
      <div
        className={`flex h-52 w-52 min-w-52 items-center justify-center overflow-hidden rounded-md bg-white ${radioStation && radioStation?.logo === "" ? "hidden" : ""}`}
      >
        <img
          className={`h-full w-full object-scale-down p-2 ${isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
          src={radioStation ? radioStation?.logo : transparent1x1Pixel}
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
  const exposedTrackTitle = useReadable(exposedTrackTitleStore);
  const exposedTrackArtist = useReadable(exposedTrackArtistStore);
  const exposedTrackArtwork = useReadable(exposedTrackArtworkStore);
  const isMediaAudioMetadataImageLoaded = useReadable(
    isMediaAudioMetadataImageLoadedStore,
  );

  const handleMediaAudioMetadataImageLoad = () => {
    isMediaAudioMetadataImageLoadedStore.set(true);
  };

  return (
    <div
      className={`fixed inset-0 z-10 m-auto flex w-fit max-w-[60%] min-w-fit flex-col items-center justify-center gap-y-1 text-whitesmoke md:relative md:inset-auto md:m-0 md:max-w-full md:items-start md:justify-start ${isMediaAudioMetadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
    >
      <div
        className={`h-52 w-52 overflow-hidden rounded-md ${isMediaAudioMetadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
      >
        <img
          className={`h-full w-full object-scale-down ${isMediaAudioMetadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
          src={exposedTrackArtwork}
          alt=""
          loading="lazy"
          onLoad={handleMediaAudioMetadataImageLoad}
        />
      </div>
      <div className="flex flex-col items-center md:items-start">
        <div
          className={`text-shadow-1 text-center font-rubik text-lg font-light md:text-left ${isMediaAudioMetadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
        >
          {exposedTrackTitle != "" && exposedTrackTitle}
        </div>
        <div
          className={`text-shadow-1 text-center font-rubik text-sm font-light md:text-left ${isMediaAudioMetadataImageLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
        >
          {exposedTrackArtist != "" && exposedTrackArtist}
        </div>
      </div>
      <div className="mt-3 mb-3 hidden w-full border-b border-b-[#f5f5f5] md:block"></div>
    </div>
  );
};

/* eslint-disable @next/next/no-img-element */
const RadioStationPlayingWithTitleMetadata = () => {
  const radioStation = useReadable(radioStationStore);
  const radioStationPlaying = useReadable(radioStationPlayingStore);
  const isRadioStationLogoLoaded = useReadable(isRadioStationLogoLoadedStore);
  const exposedTrackTitleOnly = useReadable(exposedTrackTitleOnlyStore);

  const handleRadioStationImageLoad = () => {
    isRadioStationLogoLoadedStore.set(true);
  };

  return (
    <div
      className={`fixed inset-0 z-10 m-auto flex w-max max-w-fit flex-col items-center justify-center gap-y-1 text-whitesmoke md:relative md:inset-auto md:m-0 md:items-start md:justify-start ${isRadioStationLogoLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
    >
      <div
        className={`flex h-52 w-52 min-w-52 items-center justify-center rounded-md bg-white ${radioStation && radioStation?.logo === "" ? "hidden" : null}`}
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
          {exposedTrackTitleOnly}
        </div>
      </div>
      <div className="mt-3 mb-3 hidden w-full border-b border-b-[#f5f5f5] md:block"></div>
    </div>
  );
};

export default function RadioCoverArt() {
  const isMediaAudioMetadataExists = useReadable(
    isMediaAudioMetadataExistsStore,
  );
  const isMediaAudioLoading = useReadable(isMediaAudioLoadingStore);
  const radioStation = useReadable(radioStationStore);
  const radioStationPlaying = useReadable(radioStationPlayingStore);
  const isMediaAudioPlaying = useReadable(isMediaAudioPlayingStore);
  const exposedTrackTitleOnly = useReadable(exposedTrackTitleOnlyStore);

  // return (
  //   <>
  //     {radioStation ? (
  //       !isMediaAudioLoading && !isMediaAudioPlaying ? (
  //         <RadioStation />
  //       ) : isMediaAudioLoading ? (
  //         <RadioStation />
  //       ) : isMediaAudioPlaying ? (
  //         isMediaAudioMetadataExists ? (
  //           <RadioStationPlayingWithCompleteMetadata />
  //         ) : exposedTrackTitleOnly !== "" ? (
  //           <RadioStationPlayingWithTitleMetadata />
  //         ) : (
  //           <RadioStation />
  //         )
  //       ) : null
  //     ) : null}
  //   </>
  // );

  return (
    <>
      {radioStation &&
        (() => {
          if (!isMediaAudioLoading && !isMediaAudioPlaying) {
            return <RadioStation />;
          }

          if (isMediaAudioLoading) {
            return <RadioStation />;
          }

          if (isMediaAudioPlaying) {
            if (isMediaAudioMetadataExists) {
              return <RadioStationPlayingWithCompleteMetadata />;
            }

            if (exposedTrackTitleOnly !== "") {
              return <RadioStationPlayingWithTitleMetadata />;
            }

            // if (radioStation !== radioStationPlaying) {
            //   return <RadioStation />;
            // }

            return <RadioStation />;
          }

          return null;
        })()}
    </>
  );
}
