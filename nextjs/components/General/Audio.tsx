"use client";

import { radioAudioStateAtom, radioStationStateAtom } from "@/data/store";
import {
  initAudioVisualization,
  renderAudioVisualization,
  setupRadioAudioContext,
} from "@/lib/audio-visualizer";
import { setupRadioAudio } from "@/lib/radio-audio";
import { useAtomValue } from "jotai";
import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";

const AudioContext = () => {
  const pathname = usePathname();
  const radioAudioState = useAtomValue(radioAudioStateAtom);

  // Handle user gesture to create audio context
  useEffect(() => {
    const handleUserGesture = () => {
      if (!radioAudioState.contextCreated && radioAudioState.radioAudio) {
        setupRadioAudioContext();
      }
    };

    window.addEventListener("click", handleUserGesture);

    return () => {
      window.removeEventListener("click", handleUserGesture);
    };
  }, [radioAudioState.contextCreated, radioAudioState.radioAudio]);

  useEffect(() => {
    if (pathname === "/login") {
      return;
    } else {
      if (radioAudioState.contextCreated && radioAudioState.isPlaying) {
        // Re-initialize and start rendering when navigating between pages
        initAudioVisualization();
        renderAudioVisualization();
      }
    }

    return () => {
      // Cleanup if needed
    };
  }, [pathname, radioAudioState.contextCreated, radioAudioState.isPlaying]);

  return <></>;
};

export default function Audio() {
  const radioAudioState = useAtomValue(radioAudioStateAtom);
  const radioStationState = useAtomValue(radioStationStateAtom);

  const sendGoogleAnalyticsEvent = useCallback(() => {
    if (radioAudioState.isPlaying && radioStationState.radioStation) {
      if (window && window.gtag) {
        window.gtag("event", "page_view", {
          page_title: `Still listening to ${radioStationState.radioStation.name} from ${radioStationState.radioStation.country?.name_alias}`,
          page_location: window.location.href,
          page_path: window.location.pathname,
        });
      }
    }
  }, [radioAudioState.isPlaying, radioStationState.radioStation]);

  // Handle setup of media audio
  useEffect(() => {
    setupRadioAudio();
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
