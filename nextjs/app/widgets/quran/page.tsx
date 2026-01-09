"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const WidgetDraggableQuran = dynamic(
  () => import("@/components/Widget/WidgetDraggableQuran"),
  { ssr: false },
);

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-neutral-900 p-8 text-white">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-semibold mb-4">Quran Widget Demo</h1>
        <p className="mb-4 text-sm text-white/70">This page demonstrates the draggable Quran widget for reading and listening.</p>
        <div className="mb-4">
          <WidgetDraggableQuran />
        </div>
        <Link href="/" className="text-sm text-white/60 underline">Back</Link>
      </div>
    </div>
  );
}
