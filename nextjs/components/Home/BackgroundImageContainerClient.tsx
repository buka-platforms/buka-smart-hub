"use client";

import {
  backgroundImageStateAtom,
  requestHeadersStateAtom,
} from "@/data/store";
import type { RequestHeaders as RequestHeadersType } from "@/data/type";
import { useAtomValue, useSetAtom } from "jotai";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface RequestHeaders {
  "cf-region"?: string; // The question mark indicates that the property is optional
}

/* eslint-disable @next/next/no-img-element */
export default function BackgroundImageContainerClient({
  requestHeaders,
}: {
  requestHeaders: RequestHeadersType | null | undefined;
}) {
  const backgroundImageState = useAtomValue(backgroundImageStateAtom);
  const setBackgroundImageState = useSetAtom(backgroundImageStateAtom);
  const requestHeadersState = useAtomValue(requestHeadersStateAtom);
  const setRequestHeadersState = useSetAtom(requestHeadersStateAtom);
  const searchParams = useSearchParams();
  const isNoBackgroundImage = searchParams.get("nobg") === "1"; // nobg = No Background Image
  const isNoBackgroundPattern = searchParams.get("nobgp") === "1"; // nobgp = No Background Pattern
  const styleBackgroundColor = searchParams.get("bgcolsty") || ""; // bgcolsty = Background Color Style
  const isBackgroundImageFollowsCoverArt = searchParams.get("bgimgcov") === "1"; // bgimgcov = Background Image Follows Cover Art

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
    if (!localStorage.getItem("randomBackgroundImageId")) {
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

    localStorage.setItem("randomBackgroundImageId", id);
  };

  useEffect(() => {
    setRequestHeadersState(requestHeaders);
  }, [requestHeaders, setRequestHeadersState]);

  useEffect(() => {
    if (backgroundImageState.randomBackgroundImage) {
      return;
    }
    if (!localStorage.getItem("randomBackgroundImageId")) {
      loadBackgroundImage(
        process.env.NEXT_PUBLIC_DEFAULT_UNSPLASH_BACKGROUND_IMAGE_ID as string,
      );
    } else {
      loadBackgroundImage(
        localStorage.getItem("randomBackgroundImageId") as string,
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

  const handleBackgroundImageLoad = () => {
    setBackgroundImageState((prev) => ({
      ...prev,
      isLoaded: true,
      isLoading: false,
    }));
  };

  return (
    <>
      {backgroundImageState.randomBackgroundImage &&
        (!isNoBackgroundImage && !backgroundImageState.isFollowsCoverArt ? (
          <img
            className={`h-full w-full object-cover ${backgroundImageState.isLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
            src={backgroundImageState.randomBackgroundImage?.urls?.full}
            srcSet={`${backgroundImageState.randomBackgroundImage?.urls?.full} 1080w, ${backgroundImageState.randomBackgroundImage?.urls?.raw} 2048w`}
            sizes="(min-width: 2048px) 2048px, (min-width: 1080px) 1080px, 100vw"
            alt=""
            loading="lazy"
            onLoad={handleBackgroundImageLoad}
          />
        ) : isNoBackgroundImage &&
          backgroundImageState.isFollowsCoverArt &&
          backgroundImageState.randomBackgroundImage?.id == "cover-art" ? (
          <img
            className={`h-full w-full object-cover ${backgroundImageState.isLoaded ? "opacity-100 transition-opacity duration-500 ease-in-out" : "opacity-0"}`}
            src={backgroundImageState.randomBackgroundImage?.urls?.full}
            srcSet={`${backgroundImageState.randomBackgroundImage?.urls?.full} 1080w, ${backgroundImageState.randomBackgroundImage?.urls?.raw} 2048w`}
            sizes="(min-width: 2048px) 2048px, (min-width: 1080px) 1080px, 100vw"
            alt=""
            loading="lazy"
            onLoad={handleBackgroundImageLoad}
          />
        ) : null)}
      <div
        className={`absolute inset-0 ${styleBackgroundColor == "" && "bg-black"} ${backgroundImageState.isLoaded ? "opacity-50" : `${!isNoBackgroundPattern ? "wave-bg" : ""}`}`}
        style={{ backgroundColor: `#${styleBackgroundColor}` }}
      ></div>
    </>
  );
}
