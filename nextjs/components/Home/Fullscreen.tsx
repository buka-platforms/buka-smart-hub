"use client";

import { Fullscreen } from "lucide-react";

const toggleFullscreen = () => {
  const elem = document.documentElement;

  if (!document.fullscreenElement) {
    elem.requestFullscreen().catch((err) => {
      alert(
        `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
      );
    });

    // Send virtual page view event to Google Analytics
    if (window && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: `Enter fullscreen`,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  } else {
    document.exitFullscreen();

    // Send virtual page view event to Google Analytics
    if (window && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: `Exit fullscreen`,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }
};

export default function FullScreen() {
  return (
    <>
      <div
        className="cursor-pointer"
        title="Fullscreen mode"
        onClick={toggleFullscreen}
      >
        <Fullscreen className="text-shadow-1 h-5 w-5 text-white opacity-80 hover:opacity-100" />
      </div>
    </>
  );
}
