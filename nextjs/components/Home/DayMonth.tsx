"use client";

import "@fontsource-variable/rubik";
import { useEffect, useState } from "react";

const updateDayMonthYear = (setDayMonthYear: (value: string) => void) => {
  const userLocale = navigator.language || "en-US";
  const now = new Date();
  const day = now.toLocaleString(userLocale, { weekday: "short" });
  const month = now.toLocaleString(userLocale, { month: "long" });
  const date = now.getDate();

  setDayMonthYear(`${day}, ${month} ${date}`);
};

export default function DayMonth() {
  const [dayMonthYear, setDayMonthYear] = useState<string>("");

  useEffect(() => {
    // Initial update
    updateDayMonthYear(setDayMonthYear);

    // Update every second
    const intervalId = setInterval(() => {
      updateDayMonthYear(setDayMonthYear);
    }, 1000); // 1 second in milliseconds

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
