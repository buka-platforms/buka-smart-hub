"use client";

import { useDraggable } from "@neodrag/react";
import { useRef } from "react";

export default function RadioPlayer() {
  const draggableRef = useRef<HTMLDivElement>(null);
  useDraggable(draggableRef as React.RefObject<HTMLElement>);

  return (
    <div
      ref={draggableRef}
      className="h-2xs pointer-events-auto fixed right-4 bottom-4 z-50 flex w-2xs transform-gpu cursor-grab bg-white p-4 shadow-md will-change-transform data-[neodrag-state=dragging]:shadow-none dark:bg-gray-800"
    >
      Hello, World!
    </div>
  );
}
