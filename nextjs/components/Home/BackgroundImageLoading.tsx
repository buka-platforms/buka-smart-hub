"use client";

import { backgroundImageStateAtom } from "@/data/store";
import { useAtomValue } from "jotai";
import { useSearchParams } from "next/navigation";

export default function BackgroundImageLoading() {
  const backgroundImageState = useAtomValue(backgroundImageStateAtom);
  const searchParams = useSearchParams();
  const isNoBackgroundImage = searchParams?.get("nobg") === "1"; // nobg = No Background Image

  return (
    <>
      {backgroundImageState.isLoading && !isNoBackgroundImage && (
        <span className="absolute top-1 left-1/2 z-50 mx-auto -translate-x-1/2 transform rounded bg-yellow-300 p-1 text-xs leading-tight tracking-tighter">
          Loading background image...
        </span>
      )}
    </>
  );
}
