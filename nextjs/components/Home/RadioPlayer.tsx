"use client";

import { useDraggable } from "@neodrag/react";
import { useRef } from "react";

export default function RadioPlayer() {
  const draggableRef = useRef(null);
  useDraggable(draggableRef as any);

  return (
    <div
      ref={draggableRef}
      className="h-2xs fixed right-4 bottom-4 z-50 flex w-2xs cursor-grab items-center justify-center rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800"
    >
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Radio Player Container Here</h1>
        {/* <p className="mt-2 text-gray-500">This is a placeholder for the radio player.</p> */}
      </div>
    </div>
  );
}
