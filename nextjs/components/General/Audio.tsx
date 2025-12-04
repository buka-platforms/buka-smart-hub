"use client";

import {
  animationId as animationIdStore,
  canvasAudioVisualization as canvasAudioVisualizationStore,
  isMediaAudioContextCreated as isMediaAudioContextCreatedStore,
  isMediaAudioPlaying as isMediaAudioPlayingStore,
  mediaAudio as mediaAudioStore,
  radioStation as radioStationStore,
} from "@/data/store";
import {
  initAudioVisualization,
  renderAudioVisualization,
  setupMediaAudio,
  setupMediaAudioContext,
} from "@/lib/audio";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { get } from "svelte/store";

const sendGoogleAnalyticsEvent = () => {
  if (get(isMediaAudioPlayingStore) && get(radioStationStore)) {
    // Send virtual page view event to Google Analytics
    if (window && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: `Still listening to ${get(radioStationStore)?.name} from ${get(radioStationStore)?.country?.name_alias}`,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }
};

const AudioContext = () => {
  const pathname = usePathname();

  // Handle user gesture to create audio context
  useEffect(() => {
    const handleUserGesture = () => {
      if (!get(isMediaAudioContextCreatedStore) && get(mediaAudioStore)) {
        setupMediaAudioContext();
      }
    };

    window.addEventListener("click", handleUserGesture);

    return () => {
      window.removeEventListener("click", handleUserGesture);
    };
  }, []);

  useEffect(() => {
    if (pathname === "/login") {
      cancelAnimationFrame(get(animationIdStore) as number);
      animationIdStore.set(undefined);
    } else {
      if (
        get(isMediaAudioContextCreatedStore) &&
        get(canvasAudioVisualizationStore) &&
        get(isMediaAudioPlayingStore)
      ) {
        initAudioVisualization();
        animationIdStore.set(requestAnimationFrame(renderAudioVisualization));
      }
    }

    return () => {
      cancelAnimationFrame(get(animationIdStore) as number);
      animationIdStore.set(undefined);
    };
  }, [pathname]);

  return <></>;
};

export default function Audio() {
  // Handle setup of media audio
  useEffect(() => {
    setupMediaAudio();
  }, []);

  // Handle if user still listening to the radio and send the GA event every 5 minutes
  useEffect(() => {
    const intervalId = setInterval(sendGoogleAnalyticsEvent, 300000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <AudioContext />
    </>
  );
}
