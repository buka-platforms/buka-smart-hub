"use client";

import "@fontsource-variable/rubik";
import { useEffect, useState } from "react";

const updateDayMonthYear = (setDayMonthYear: (value: string) => void) => {
  const userLocale = navigator.language || "en-US";
  const now = new Date();
  const day = now.toLocaleString(userLocale, { weekday: "short" });
  const month = now.toLocaleString(userLocale, { month: "long" });
  const date = now.getDate();
  const year = now.getFullYear();

  setDayMonthYear(`${day}, ${month} ${date}, ${year}`);
};

export default function DateComponent() {
  const [dayMonthYear, setDayMonthYear] = useState<string>("");

  useEffect(() => {
    // Initial update
    updateDayMonthYear(setDayMonthYear);

    // Update every minute
    const intervalId = setInterval(() => {
      updateDayMonthYear(setDayMonthYear);
    }, 60000); // 1 minute interval

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <div className="text-shadow-1 mb-1 font-rubik leading-none font-light text-whitesmoke">
        {dayMonthYear}
      </div>
    </>
  );
}
