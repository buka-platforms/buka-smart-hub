"use client";

import { isBackgroundImageLoading as isBackgroundImageLoadingStore } from "@/data/store";
import { useReadable } from "@/lib/react_use_svelte_store";
import { useSearchParams } from "next/navigation";

export default function BackgroundImageLoading() {
  const isBackgroundImageLoading = useReadable(isBackgroundImageLoadingStore);
  const searchParams = useSearchParams();
  const isNoBackgroundImage = searchParams.get("nobg") === "1"; // nobg = No Background Image

  return (
    <>
      {isBackgroundImageLoading && !isNoBackgroundImage && (
        <span className="absolute top-1 left-1/2 z-50 mx-auto -translate-x-1/2 transform rounded bg-yellow-300 p-1 text-xs leading-tight tracking-tighter">
          Loading background image...
        </span>
      )}
    </>
  );
}
