import {
  audioTrackStateAtom,
  backgroundImageStateAtom,
  jotaiStore,
  radioStationPlaying as radioStationPlayingStore,
  randomBackgroundImage as randomBackgroundImageStore,
} from "@/data/store";
import type { RadioStation } from "@/data/type";
import { get } from "svelte/store";
import { replaceArtworkSizes } from "./utils";

let intervalIdTrackMetadata: NodeJS.Timeout | null = null;

export const stopPeriodicGetTrackMetadata = () => {
  if (intervalIdTrackMetadata) {
    const intervalIdGetTrackMetadata = intervalIdTrackMetadata;
    clearInterval(intervalIdGetTrackMetadata as NodeJS.Timeout);
  }
};

export const startPeriodicGetTrackMetadata = async () => {
  if (intervalIdTrackMetadata) {
    stopPeriodicGetTrackMetadata();
  }

  await getTrackMetadata();
  const intervalIdGetTrackMetadata = setInterval(async () => {
    await getTrackMetadata();
  }, 7000);
  intervalIdTrackMetadata = intervalIdGetTrackMetadata;
};

const getExternalTrackDetails = async () => {
  if (get(radioStationPlayingStore)) {
    const request = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL_V1
      }/music-track?q=${encodeURIComponent(jotaiStore.get(audioTrackStateAtom).currentTitle)}`,
    );

    const currentExternalTrackDetails = await request.json();

    jotaiStore.set(audioTrackStateAtom, (prev) => ({
      ...prev,
      currentExternalDetails: currentExternalTrackDetails.data,
    }));

    if (
      currentExternalTrackDetails?.status === 0 &&
      currentExternalTrackDetails?.data?.resultCount !== undefined
    ) {
      if (currentExternalTrackDetails?.data?.resultCount > 0) {
        jotaiStore.set(audioTrackStateAtom, (prev) => ({
          ...prev,
          exposedTitle:
            currentExternalTrackDetails?.data?.results[0]?.trackName,
          exposedArtist:
            currentExternalTrackDetails?.data?.results[0]?.artistName,
          exposedAlbum:
            currentExternalTrackDetails?.data?.results[0]?.collectionName,
        }));

        let artworkUrl =
          currentExternalTrackDetails?.data?.results[0]?.artworkUrl100;
        artworkUrl = replaceArtworkSizes(artworkUrl);

        const largeArtworkUrl = artworkUrl.replace("600x600", "1200x1200");

        jotaiStore.set(audioTrackStateAtom, (prev) => ({
          ...prev,
          exposedArtwork: artworkUrl,
          metadataExists: true,
        }));

        // Only if $exposedTrackTitle and $exposedTrackArtist are not ""
        if (
          jotaiStore.get(audioTrackStateAtom).exposedTitle !== "" &&
          jotaiStore.get(audioTrackStateAtom).exposedArtist !== ""
        ) {
          // Send virtual page view event to Google Analytics
          if (window && window.gtag) {
            window.gtag("event", "page_view", {
              page_title: `Now playing ${jotaiStore.get(audioTrackStateAtom).exposedTitle} - ${
                jotaiStore.get(audioTrackStateAtom).exposedArtist
              } on ${
                get(radioStationPlayingStore)?.name
              } from ${get(radioStationPlayingStore)?.country?.name_alias}`,
              page_location: window.location.href,
              page_path: window.location.pathname,
            });
          }
        }

        // Set mediaSession metadata
        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: jotaiStore.get(audioTrackStateAtom).exposedTitle,
            artist: jotaiStore.get(audioTrackStateAtom).exposedArtist,
            album:
              jotaiStore.get(audioTrackStateAtom).exposedAlbum !== ""
                ? jotaiStore.get(audioTrackStateAtom).exposedAlbum
                : "",
            artwork: [
              {
                src: jotaiStore.get(audioTrackStateAtom).exposedArtwork,
                sizes: "600x600",
                type: "image/png",
              },
            ],
          });
        }

        if (jotaiStore.get(backgroundImageStateAtom).isFollowsCoverArt) {
          const backgroundCoverArt = {
            id: "cover-art",
            urls: {
              regular: largeArtworkUrl,
              full: largeArtworkUrl,
              raw: largeArtworkUrl,
            },
            alt_description: "",
            links: {
              html: "",
            },
            user: {
              username: "",
              name: "",
              links: {
                html: "",
              },
            },
          };
          randomBackgroundImageStore.set(backgroundCoverArt);
        }
      } else {
        jotaiStore.set(audioTrackStateAtom, (prev) => ({
          ...prev,
          metadataExists: false,
          exposedTitleOnly: jotaiStore.get(audioTrackStateAtom).currentTitle,
        }));
      }
    } else {
      jotaiStore.set(audioTrackStateAtom, (prev) => ({
        ...prev,
        metadataExists: false,
        exposedTitleOnly: jotaiStore.get(audioTrackStateAtom).currentTitle,
      }));
    }
  }
};

const getTrackMetadata = async () => {
  if (get(radioStationPlayingStore)) {
    const request = await fetch(
      (get(radioStationPlayingStore) as RadioStation)
        .radio_stations_radio_streams[0]?.radio_stream?.metadata_url,
    );
    const currentTrackMetadata = await request.json();

    jotaiStore.set(audioTrackStateAtom, (prev) => ({
      ...prev,
      currentMetadata: currentTrackMetadata?.data,
    }));

    if (
      currentTrackMetadata?.data?.title &&
      currentTrackMetadata?.data?.iArtist &&
      currentTrackMetadata?.data?.iImg &&
      currentTrackMetadata?.data?.iName
    ) {
      jotaiStore.set(audioTrackStateAtom, (prev) => ({
        ...prev,
        currentTitle: currentTrackMetadata?.data?.title,
        exposedTitle: currentTrackMetadata?.data?.iName,
        exposedArtist: currentTrackMetadata?.data?.iArtist,
      }));

      let artworkUrl = currentTrackMetadata?.data?.iImg;
      artworkUrl = replaceArtworkSizes(artworkUrl);

      const largeArtworkUrl = artworkUrl.replace("600x600", "1200x1200");

      jotaiStore.set(audioTrackStateAtom, (prev) => ({
        ...prev,
        exposedArtwork: artworkUrl,
        metadataExists: true,
      }));

      if (
        jotaiStore.get(audioTrackStateAtom).currentTitle !==
        jotaiStore.get(audioTrackStateAtom).previousTitle
      ) {
        jotaiStore.set(audioTrackStateAtom, (prev) => ({
          ...prev,
          metadataImageLoaded: false,
          previousTitle: jotaiStore.get(audioTrackStateAtom).currentTitle,
        }));

        // Only if $exposedTrackTitle and $exposedTrackArtist are not ""
        if (
          jotaiStore.get(audioTrackStateAtom).exposedTitle !== "" &&
          jotaiStore.get(audioTrackStateAtom).exposedArtist !== ""
        ) {
          // Send virtual page view event to Google Analytics
          if (window && window.gtag) {
            window.gtag("event", "page_view", {
              page_title: `Now playing ${jotaiStore.get(audioTrackStateAtom).exposedTitle} - ${
                jotaiStore.get(audioTrackStateAtom).exposedArtist
              } on ${get(radioStationPlayingStore)?.name} from ${
                get(radioStationPlayingStore)?.country?.name_alias
              }`,
              page_location: window.location.href,
              page_path: window.location.pathname,
            });
          }
        }

        // Set mediaSession metadata
        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: jotaiStore.get(audioTrackStateAtom).exposedTitle,
            artist: jotaiStore.get(audioTrackStateAtom).exposedArtist,
            album:
              jotaiStore.get(audioTrackStateAtom).exposedAlbum !== ""
                ? jotaiStore.get(audioTrackStateAtom).exposedAlbum
                : "",
            artwork: [
              {
                src: jotaiStore.get(audioTrackStateAtom).exposedArtwork,
                sizes: "600x600",
                type: "image/png",
              },
            ],
          });
        }

        if (jotaiStore.get(backgroundImageStateAtom).isFollowsCoverArt) {
          const backgroundCoverArt = {
            id: "cover-art",
            urls: {
              regular: largeArtworkUrl,
              full: largeArtworkUrl,
              raw: largeArtworkUrl,
            },
            alt_description: "",
            links: {
              html: "",
            },
            user: {
              username: "",
              name: "",
              links: {
                html: "",
              },
            },
          };
          randomBackgroundImageStore.set(backgroundCoverArt);
        }
      }
    } else if (currentTrackMetadata?.data?.title) {
      jotaiStore.set(audioTrackStateAtom, (prev) => ({
        ...prev,
        currentTitle: currentTrackMetadata?.data?.title,
      }));

      if (
        jotaiStore.get(audioTrackStateAtom).currentTitle !==
        jotaiStore.get(audioTrackStateAtom).previousTitle
      ) {
        jotaiStore.set(audioTrackStateAtom, (prev) => ({
          ...prev,
          metadataImageLoaded: false,
        }));

        await getExternalTrackDetails();

        jotaiStore.set(audioTrackStateAtom, (prev) => ({
          ...prev,
          previousTitle: jotaiStore.get(audioTrackStateAtom).currentTitle,
        }));
      }
    } else {
      jotaiStore.set(audioTrackStateAtom, (prev) => ({
        ...prev,
        metadataExists: false,
      }));
    }
  }
};
