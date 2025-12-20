"use client";

import {
  mediaAudioStateAtom,
  mediaAudio as mediaAudioStore,
  radioStationStateAtom,
} from "@/data/store";
import {
  initAudioVisualization,
  setupMediaAudio,
  setupMediaAudioContext,
} from "@/lib/audio";
import { useAtomValue } from "jotai";
import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";
import { get } from "svelte/store";

const AudioContext = () => {
  const pathname = usePathname();
  const mediaAudioState = useAtomValue(mediaAudioStateAtom);

  // Handle user gesture to create audio context
  useEffect(() => {
    const handleUserGesture = () => {
      if (!mediaAudioState.contextCreated && get(mediaAudioStore)) {
        setupMediaAudioContext();
      }
    };

    window.addEventListener("click", handleUserGesture);

    return () => {
      window.removeEventListener("click", handleUserGesture);
    };
  }, [mediaAudioState.contextCreated]);

  useEffect(() => {
    if (pathname === "/login") {
      return;
    } else {
      if (mediaAudioState.contextCreated && mediaAudioState.isPlaying) {
        initAudioVisualization();
      }
    }

    return () => {
      // Cleanup if needed
    };
  }, [pathname, mediaAudioState.contextCreated, mediaAudioState.isPlaying]);

  return <></>;
};

export default function Audio() {
  const mediaAudioState = useAtomValue(mediaAudioStateAtom);
  const radioStationState = useAtomValue(radioStationStateAtom);

  const sendGoogleAnalyticsEvent = useCallback(() => {
    if (mediaAudioState.isPlaying && radioStationState.radioStation) {
      if (window && window.gtag) {
        window.gtag("event", "page_view", {
          page_title: `Still listening to ${radioStationState.radioStation.name} from ${radioStationState.radioStation.country?.name_alias}`,
          page_location: window.location.href,
          page_path: window.location.pathname,
        });
      }
    }
  }, [mediaAudioState.isPlaying, radioStationState.radioStation]);

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
  }, [sendGoogleAnalyticsEvent]);

  return (
    <>
      <AudioContext />
    </>
  );
}
