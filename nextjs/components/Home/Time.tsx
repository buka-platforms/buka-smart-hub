"use client";

import { T } from "@/lib/app";
import React, { useEffect, useState } from "react";

const updateTime = (
  previousTime: Date | null,
  setPreviousTime: (value: Date | null) => void,
  setMeridiem: (value: string) => void,
) => {
  const currentTime = new Date();

  if (
    previousTime === null ||
    currentTime.getMinutes() !== previousTime.getMinutes()
  ) {
    setPreviousTime(currentTime);
    if (currentTime.getHours() >= 12) {
      setMeridiem("PM");
    } else {
      setMeridiem("AM");
    }
  }
};

export default function Time() {
  const [previousTime, setPreviousTime] = useState<Date | null>(null);
  const [meridiem, setMeridiem] = useState<string>("");

  useEffect(() => {
    // Initial update
    updateTime(previousTime, setPreviousTime, setMeridiem);

    // Use setInterval with interval 1 second
    const intervalId = setInterval(
      () => updateTime(previousTime, setPreviousTime, setMeridiem),
      1000,
    );

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [previousTime]);

  return (
    <div className="flex w-max max-w-fit">
      <div className="text-shadow-1 flex font-rubik text-6xl leading-none text-whitesmoke md:text-8xl">
        {previousTime ? T.format(previousTime) : ""}
      </div>
      <div className="ml-[0.125rem] flex flex-col justify-between py-[2px] md:ml-1 md:py-2">
        <div className="text-shadow-1 font-rubik text-whitesmoke">
          {meridiem}
        </div>
      </div>
    </div>
  );
}
