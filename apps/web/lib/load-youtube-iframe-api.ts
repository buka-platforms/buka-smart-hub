"use client";

type YouTubeWindow = Window & {
  YT?: {
    Player?: unknown;
  };
  onYouTubeIframeAPIReady?: () => void;
};

let ytApiPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi() {
  if (typeof window === "undefined") return Promise.resolve();

  const ytWindow = window as YouTubeWindow;
  if (ytWindow.YT?.Player) {
    return Promise.resolve();
  }

  if (ytApiPromise) {
    return ytApiPromise;
  }

  ytApiPromise = new Promise<void>((resolve) => {
    const existingCallback = ytWindow.onYouTubeIframeAPIReady;

    ytWindow.onYouTubeIframeAPIReady = () => {
      existingCallback?.();
      resolve();
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.body.appendChild(script);
  });

  return ytApiPromise;
}
