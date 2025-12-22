import {
  backgroundImageStateAtom,
  jotaiStore,
  radioStationStateAtom,
} from "@/data/store";
import type { RadioStation } from "@/data/type";
import { initAudioVisualization, randomizeRainbowColor } from "@/lib/audio";
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
  if (jotaiStore.get(radioStationStateAtom).radioStation) {
    const request = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL_V1
      }/music-track?q=${encodeURIComponent(jotaiStore.get(radioStationStateAtom).currentTitle)}`,
    );

    const currentExternalTrackDetails = await request.json();

    jotaiStore.set(radioStationStateAtom, (prev) => ({
      ...prev,
      currentExternalDetails: currentExternalTrackDetails.data,
    }));

    if (
      currentExternalTrackDetails?.status === 0 &&
      currentExternalTrackDetails?.data?.resultCount !== undefined
    ) {
      if (currentExternalTrackDetails?.data?.resultCount > 0) {
        jotaiStore.set(radioStationStateAtom, (prev) => ({
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

        jotaiStore.set(radioStationStateAtom, (prev) => ({
          ...prev,
          exposedArtwork: artworkUrl,
          metadataExists: true,
        }));

        // Only if $exposedTrackTitle and $exposedTrackArtist are not ""
        if (
          jotaiStore.get(radioStationStateAtom).exposedTitle !== "" &&
          jotaiStore.get(radioStationStateAtom).exposedArtist !== ""
        ) {
          // Send virtual page view event to Google Analytics
          if (window && window.gtag) {
            window.gtag("event", "page_view", {
              page_title: `Now playing ${jotaiStore.get(radioStationStateAtom).exposedTitle} - ${
                jotaiStore.get(radioStationStateAtom).exposedArtist
              } on ${
                jotaiStore.get(radioStationStateAtom).radioStation?.name
              } from ${
                jotaiStore.get(radioStationStateAtom).radioStation?.country
                  ?.name_alias
              }`,
              page_location: window.location.href,
              page_path: window.location.pathname,
            });
          }
        }

        // Set mediaSession metadata
        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: jotaiStore.get(radioStationStateAtom).exposedTitle,
            artist: jotaiStore.get(radioStationStateAtom).exposedArtist,
            album:
              jotaiStore.get(radioStationStateAtom).exposedAlbum !== ""
                ? jotaiStore.get(radioStationStateAtom).exposedAlbum
                : "",
            artwork: [
              {
                src: jotaiStore.get(radioStationStateAtom).exposedArtwork,
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
          jotaiStore.set(backgroundImageStateAtom, (prev) => ({
            ...prev,
            randomBackgroundImage: backgroundCoverArt,
          }));
        }
      } else {
        jotaiStore.set(radioStationStateAtom, (prev) => ({
          ...prev,
          metadataExists: false,
          exposedTitleOnly: jotaiStore.get(radioStationStateAtom).currentTitle,
        }));
      }
    } else {
      jotaiStore.set(radioStationStateAtom, (prev) => ({
        ...prev,
        metadataExists: false,
        exposedTitleOnly: jotaiStore.get(radioStationStateAtom).currentTitle,
      }));
    }
  }
};

const getTrackMetadata = async () => {
  if (jotaiStore.get(radioStationStateAtom).radioStation) {
    const request = await fetch(
      (jotaiStore.get(radioStationStateAtom).radioStation as RadioStation)
        .radio_stations_radio_streams[0]?.radio_stream?.metadata_url,
    );
    const currentTrackMetadata = await request.json();

    jotaiStore.set(radioStationStateAtom, (prev) => ({
      ...prev,
      currentMetadata: currentTrackMetadata?.data,
    }));

    if (
      currentTrackMetadata?.data?.title &&
      currentTrackMetadata?.data?.iArtist &&
      currentTrackMetadata?.data?.iImg &&
      currentTrackMetadata?.data?.iName
    ) {
      jotaiStore.set(radioStationStateAtom, (prev) => ({
        ...prev,
        currentTitle: currentTrackMetadata?.data?.title,
        exposedTitle: currentTrackMetadata?.data?.iName,
        exposedArtist: currentTrackMetadata?.data?.iArtist,
      }));

      let artworkUrl = currentTrackMetadata?.data?.iImg;
      artworkUrl = replaceArtworkSizes(artworkUrl);

      const largeArtworkUrl = artworkUrl.replace("600x600", "1200x1200");

      jotaiStore.set(radioStationStateAtom, (prev) => ({
        ...prev,
        exposedArtwork: artworkUrl,
        metadataExists: true,
      }));

      if (
        jotaiStore.get(radioStationStateAtom).currentTitle !==
        jotaiStore.get(radioStationStateAtom).previousTitle
      ) {
        jotaiStore.set(radioStationStateAtom, (prev) => ({
          ...prev,
          metadataImageLoaded: false,
          previousTitle: jotaiStore.get(radioStationStateAtom).currentTitle,
        }));

        // Randomize the rainbow color for the audio visualization
        randomizeRainbowColor();

        // Initialize the audio visualization again
        initAudioVisualization();

        // Only if $exposedTrackTitle and $exposedTrackArtist are not ""
        if (
          jotaiStore.get(radioStationStateAtom).exposedTitle !== "" &&
          jotaiStore.get(radioStationStateAtom).exposedArtist !== ""
        ) {
          // Send virtual page view event to Google Analytics
          if (window && window.gtag) {
            window.gtag("event", "page_view", {
              page_title: `Now playing ${jotaiStore.get(radioStationStateAtom).exposedTitle} - ${
                jotaiStore.get(radioStationStateAtom).exposedArtist
              } on ${
                jotaiStore.get(radioStationStateAtom).radioStation?.name
              } from ${
                jotaiStore.get(radioStationStateAtom).radioStation?.country
                  ?.name_alias
              }`,
              page_location: window.location.href,
              page_path: window.location.pathname,
            });
          }
        }

        // Set mediaSession metadata
        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: jotaiStore.get(radioStationStateAtom).exposedTitle,
            artist: jotaiStore.get(radioStationStateAtom).exposedArtist,
            album:
              jotaiStore.get(radioStationStateAtom).exposedAlbum !== ""
                ? jotaiStore.get(radioStationStateAtom).exposedAlbum
                : "",
            artwork: [
              {
                src: jotaiStore.get(radioStationStateAtom).exposedArtwork,
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
          jotaiStore.set(backgroundImageStateAtom, (prev) => ({
            ...prev,
            randomBackgroundImage: backgroundCoverArt,
          }));
        }
      }
    } else if (currentTrackMetadata?.data?.title) {
      jotaiStore.set(radioStationStateAtom, (prev) => ({
        ...prev,
        currentTitle: currentTrackMetadata?.data?.title,
      }));

      if (
        jotaiStore.get(radioStationStateAtom).currentTitle !==
        jotaiStore.get(radioStationStateAtom).previousTitle
      ) {
        jotaiStore.set(radioStationStateAtom, (prev) => ({
          ...prev,
          metadataImageLoaded: false,
        }));

        await getExternalTrackDetails();

        jotaiStore.set(radioStationStateAtom, (prev) => ({
          ...prev,
          previousTitle: jotaiStore.get(radioStationStateAtom).currentTitle,
        }));

        // Randomize the rainbow color for the audio visualization
        randomizeRainbowColor();

        // Initialize the audio visualization again
        initAudioVisualization();
      }
    } else {
      jotaiStore.set(radioStationStateAtom, (prev) => ({
        ...prev,
        metadataExists: false,
      }));
    }
  }
};
