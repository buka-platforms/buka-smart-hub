import {
  currentTrackMetadata as currentTrackMetadataStore,
  currentTrackTitle as currentTrackTitleStore,
  exposedTrackAlbum as exposedTrackAlbumStore,
  exposedTrackArtist as exposedTrackArtistStore,
  exposedTrackArtwork as exposedTrackArtworkStore,
  exposedTrackTitleOnly as exposedTrackTitleOnlyStore,
  exposedTrackTitle as exposedTrackTitleStore,
  intervalIdTrackMetadata as intervalIdTrackMetadataStore,
  isBackgroundImageFollowsCoverArt as isBackgroundImageFollowsCoverArtStore,
  isMediaAudioMetadataExists as isMediaAudioMetadataExistsStore,
  isMediaAudioMetadataImageLoaded as isMediaAudioMetadataImageLoadedStore,
  previousTrackTitle as previousTrackTitleStore,
  radioStationPlaying as radioStationPlayingStore,
  randomBackgroundImage as randomBackgroundImageStore,
} from "@/data/store";
import { get } from "svelte/store";
import { replaceArtworkSizes } from "./utils";

export const stopPeriodicGetTrackMetadata = () => {
  if (get(intervalIdTrackMetadataStore)) {
    const intervalIdGetTrackMetadata = get(intervalIdTrackMetadataStore);
    clearInterval(intervalIdGetTrackMetadata as NodeJS.Timeout);
  }
};

export const startPeriodicGetTrackMetadata = async () => {
  if (get(intervalIdTrackMetadataStore)) {
    stopPeriodicGetTrackMetadata();
  }

  await getTrackMetadata();
  const intervalIdGetTrackMetadata = setInterval(async () => {
    await getTrackMetadata();
  }, 7000);
  intervalIdTrackMetadataStore.set(intervalIdGetTrackMetadata);
};

const getExternalTrackDetails = async () => {
  if (get(radioStationPlayingStore)) {
    const request = await fetch(
      `${
        process.env.NEXT_PUBLIC_BUKA_API_URL_V1
      }/music-track?q=${encodeURIComponent(get(currentTrackTitleStore))}`,
    );

    const currentExternalTrackDetails = await request.json();

    currentTrackMetadataStore.set(currentExternalTrackDetails.data);

    if (
      currentExternalTrackDetails?.status === 0 &&
      currentExternalTrackDetails?.data?.resultCount !== undefined
    ) {
      if (currentExternalTrackDetails?.data?.resultCount > 0) {
        exposedTrackTitleStore.set(
          currentExternalTrackDetails?.data?.results[0]?.trackName,
        );
        exposedTrackArtistStore.set(
          currentExternalTrackDetails?.data?.results[0]?.artistName,
        );
        exposedTrackAlbumStore.set(
          currentExternalTrackDetails?.data?.results[0]?.collectionName,
        );

        let artworkUrl =
          currentExternalTrackDetails?.data?.results[0]?.artworkUrl100;
        artworkUrl = replaceArtworkSizes(artworkUrl);

        const largeArtworkUrl = artworkUrl.replace("600x600", "1200x1200");

        exposedTrackArtworkStore.set(artworkUrl);

        isMediaAudioMetadataExistsStore.set(true);

        // Only if $exposedTrackTitle and $exposedTrackArtist are not ""
        if (
          get(exposedTrackTitleStore) !== "" &&
          get(exposedTrackArtistStore) !== ""
        ) {
          // Send virtual page view event to Google Analytics
          if (window && window.gtag) {
            window.gtag("event", "page_view", {
              page_title: `Now playing ${get(
                exposedTrackTitleStore,
              )} - ${get(exposedTrackArtistStore)} on ${
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
            title: get(exposedTrackTitleStore),
            artist: get(exposedTrackArtistStore),
            album:
              get(exposedTrackAlbumStore) !== ""
                ? get(exposedTrackAlbumStore)
                : "",
            artwork: [
              {
                src: get(exposedTrackArtworkStore),
                sizes: "600x600",
                type: "image/png",
              },
            ],
          });
        }

        if (get(isBackgroundImageFollowsCoverArtStore)) {
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
        isMediaAudioMetadataExistsStore.set(false);
        exposedTrackTitleOnlyStore.set(get(currentTrackTitleStore));
      }
    } else {
      isMediaAudioMetadataExistsStore.set(false);
      exposedTrackTitleOnlyStore.set(get(currentTrackTitleStore));
    }
  }
};

const getTrackMetadata = async () => {
  if (get(radioStationPlayingStore)) {
    const request = await fetch(
      (get(radioStationPlayingStore) as any).radio_stations_radio_streams[0]
        ?.radio_stream?.metadata_url,
    );
    const currentTrackMetadata = await request.json();

    currentTrackMetadataStore.set(currentTrackMetadata?.data);

    if (
      currentTrackMetadata?.data?.title &&
      currentTrackMetadata?.data?.iArtist &&
      currentTrackMetadata?.data?.iImg &&
      currentTrackMetadata?.data?.iName
    ) {
      currentTrackTitleStore.set(currentTrackMetadata?.data?.title);
      exposedTrackTitleStore.set(currentTrackMetadata?.data?.iName);
      exposedTrackArtistStore.set(currentTrackMetadata?.data?.iArtist);

      let artworkUrl = currentTrackMetadata?.data?.iImg;
      artworkUrl = replaceArtworkSizes(artworkUrl);

      const largeArtworkUrl = artworkUrl.replace("600x600", "1200x1200");

      exposedTrackArtworkStore.set(artworkUrl);

      isMediaAudioMetadataExistsStore.set(true);

      if (get(currentTrackTitleStore) !== get(previousTrackTitleStore)) {
        isMediaAudioMetadataImageLoadedStore.set(false);

        previousTrackTitleStore.set(get(currentTrackTitleStore));

        // Only if $exposedTrackTitle and $exposedTrackArtist are not ""
        if (
          get(exposedTrackTitleStore) !== "" &&
          get(exposedTrackArtistStore) !== ""
        ) {
          // Send virtual page view event to Google Analytics
          if (window && window.gtag) {
            window.gtag("event", "page_view", {
              page_title: `Now playing ${get(exposedTrackTitleStore)} - ${get(
                exposedTrackArtistStore,
              )} on ${get(radioStationPlayingStore)?.name} from ${
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
            title: get(exposedTrackTitleStore),
            artist: get(exposedTrackArtistStore),
            album:
              get(exposedTrackAlbumStore) !== ""
                ? get(exposedTrackAlbumStore)
                : "",
            artwork: [
              {
                src: get(exposedTrackArtworkStore),
                sizes: "600x600",
                type: "image/png",
              },
            ],
          });
        }

        if (get(isBackgroundImageFollowsCoverArtStore)) {
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
      currentTrackTitleStore.set(currentTrackMetadata?.data?.title);

      if (get(currentTrackTitleStore) !== get(previousTrackTitleStore)) {
        isMediaAudioMetadataImageLoadedStore.set(false);

        await getExternalTrackDetails();

        previousTrackTitleStore.set(get(currentTrackTitleStore));
      }
    } else {
      isMediaAudioMetadataExistsStore.set(false);
    }
  }
};
