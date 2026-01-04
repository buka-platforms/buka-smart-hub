"use client";

import {
  backgroundImageStateAtom,
  requestHeadersStateAtom,
} from "@/data/store";
import { useAtomValue, useSetAtom } from "jotai";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

interface RequestHeaders {
  "cf-region"?: string; // The question mark indicates that the property is optional
}

// Storage keys
const RANDOM_BACKGROUND_IMAGE_ID_KEY = "randomBackgroundImageId";

export default function BackgroundImageContainerClient() {
  const backgroundImageState = useAtomValue(backgroundImageStateAtom);
  const setBackgroundImageState = useSetAtom(backgroundImageStateAtom);
  const requestHeadersState = useAtomValue(requestHeadersStateAtom);
  const searchParams = useSearchParams();
  const isNoBackgroundImage = searchParams?.get("nobg") === "1"; // nobg = No Background Image
  const isNoBackgroundPattern = searchParams?.get("nobgp") === "1"; // nobgp = No Background Pattern
  const styleBackgroundColor = searchParams?.get("bgcolsty") || ""; // bgcolsty = Background Color Style
  const isBackgroundImageFollowsCoverArt =
    searchParams?.get("bgimgcov") === "1"; // bgimgcov = Background Image Follows Cover Art

  useEffect(() => {
    setBackgroundImageState((prev) => ({
      ...prev,
      tmpRandomBackgroundImage: backgroundImageState.randomBackgroundImage,
    }));

    // Clear tmpRandomBackgroundImage when unmount
    return () => {
      setBackgroundImageState((prev) => ({
        ...prev,
        tmpRandomBackgroundImage: undefined,
      }));
    };
  }, [backgroundImageState.randomBackgroundImage, setBackgroundImageState]);

  const loadBackgroundImage = async (dataId: string) => {
    setBackgroundImageState((prev) => ({
      ...prev,
      isLoaded: false,
      isLoading: true,
    }));

    // Fetch data in parallel
    const [unsplashResult] = await Promise.all([
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL_V1}/background-image?id=${dataId}`,
        {
          cache: "no-cache",
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    ]);

    const unsplash = await unsplashResult.json();

    // Check if the image is not found, on Unsplash it will return an object with errors key
    if (unsplash.data.errors) {
      loadRandomBackgroundImage();
      return;
    }

    const { id, urls, alt_description, links, user } = unsplash.data;

    setBackgroundImageState((prev) => ({
      ...prev,
      randomBackgroundImage: {
        id,
        urls,
        alt_description,
        links,
        user,
      },
    }));
  };

  const loadRandomBackgroundImage = async () => {
    setBackgroundImageState((prev) => ({
      ...prev,
      isLoaded: false,
      isLoading: true,
    }));

    const requestHeaders = requestHeadersState as unknown as RequestHeaders;
    const backgroundImageQuery = (requestHeaders ?? {})["cf-region"] || "Bali";

    let apiUrl = `${process.env.NEXT_PUBLIC_API_URL_V1}/background-image?random=true`;

    // Check if randomBackgroundImageId is not set, then include ?query
    if (!localStorage.getItem(RANDOM_BACKGROUND_IMAGE_ID_KEY)) {
      apiUrl += `?query=${backgroundImageQuery}`;
    }

    // Fetch data in parallel
    const [unsplashResult] = await Promise.all([
      fetch(apiUrl, {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    ]);

    const unsplash = await unsplashResult.json();

    const { id, urls, alt_description, links, user } = unsplash.data;

    setBackgroundImageState((prev) => ({
      ...prev,
      randomBackgroundImage: {
        id,
        urls,
        alt_description,
        links,
        user,
      },
    }));

    localStorage.setItem(RANDOM_BACKGROUND_IMAGE_ID_KEY, id);
  };

  useEffect(() => {
    if (backgroundImageState.randomBackgroundImage) {
      return;
    }
    if (!localStorage.getItem(RANDOM_BACKGROUND_IMAGE_ID_KEY)) {
      loadBackgroundImage(
        process.env.NEXT_PUBLIC_DEFAULT_UNSPLASH_BACKGROUND_IMAGE_ID as string,
      );
    } else {
      loadBackgroundImage(
        localStorage.getItem(RANDOM_BACKGROUND_IMAGE_ID_KEY) as string,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setBackgroundImageState((prev) => ({
      ...prev,
      isFollowsCoverArt: isBackgroundImageFollowsCoverArt,
    }));
  }, [isBackgroundImageFollowsCoverArt, setBackgroundImageState]);

  // Preload image and apply to body
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Apply background image to body when loaded
  useEffect(() => {
    const imageUrl = backgroundImageState.randomBackgroundImage?.urls?.full;
    const shouldShowImage =
      backgroundImageState.randomBackgroundImage &&
      ((!isNoBackgroundImage && !backgroundImageState.isFollowsCoverArt) ||
        (isNoBackgroundImage &&
          backgroundImageState.isFollowsCoverArt &&
          backgroundImageState.randomBackgroundImage?.id === "cover-art"));

    if (!shouldShowImage || !imageUrl) {
      // Clear body background when no image should be shown
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundPosition = "";
      document.body.style.backgroundRepeat = "";
      return;
    }

    // Create an image element to preload
    const img = new Image();
    imageRef.current = img;

    img.onload = () => {
      // Apply background to body
      document.body.style.backgroundImage = `url(${imageUrl})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundRepeat = "no-repeat";
      document.body.style.backgroundAttachment = "fixed";

      setBackgroundImageState((prev) => ({
        ...prev,
        isLoaded: true,
        isLoading: false,
      }));
    };

    img.src = imageUrl;

    // Cleanup: remove body background styles when component unmounts
    return () => {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundSize = "";
      document.body.style.backgroundPosition = "";
      document.body.style.backgroundRepeat = "";
      document.body.style.backgroundAttachment = "";
      imageRef.current = null;
    };
  }, [
    backgroundImageState.randomBackgroundImage,
    backgroundImageState.isFollowsCoverArt,
    isNoBackgroundImage,
    setBackgroundImageState,
  ]);

  return (
    <>
      {/* Overlay div - fixed position to cover the body background */}
      <div
        className={`fixed inset-0 z-[-1] ${styleBackgroundColor == "" && "bg-black"} ${backgroundImageState.isLoaded ? "opacity-50" : `${!isNoBackgroundPattern ? "wave-bg" : ""}`}`}
        style={{ backgroundColor: `#${styleBackgroundColor}` }}
      ></div>
    </>
  );
}
