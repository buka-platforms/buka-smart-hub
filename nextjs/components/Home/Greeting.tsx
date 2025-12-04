"use client";

import { getCookie } from "@/lib/cookies";
import "@fontsource-variable/rubik";
import React, { useEffect, useState } from "react";

const updateGreeting = (setGreetingMessage: (value: string) => void) => {
  const hours = new Date().getHours();

  let greeting = "";
  let firstName = "";

  const cookieUserDetails = getCookie("_b_ud")
    ? decodeURIComponent(getCookie("_b_ud") as string)
    : null;

  if (cookieUserDetails) {
    const userDetails = JSON.parse(cookieUserDetails);
    // Check if the userDetails has a first name
    if (userDetails.first_name) {
      firstName = userDetails.first_name;
    }
  }

  if (hours >= 5 && hours < 12) {
    greeting = `Good morning${firstName ? `, ${firstName}.` : "."}`;
  } else if (hours >= 12 && hours < 18) {
    greeting = `Good afternoon${firstName ? `, ${firstName}.` : "."}`;
  } else if (hours >= 18 && hours < 24) {
    greeting = `Good evening${firstName ? `, ${firstName}.` : "."}`;
  } else {
    greeting = `Good night${firstName ? `, ${firstName}.` : "."}`;
  }

  setGreetingMessage(greeting);
};

export default function Greeting() {
  const [greetingMessage, setGreetingMessage] = useState("");

  useEffect(() => {
    updateGreeting(setGreetingMessage);

    // Update every second
    const intervalId = setInterval(() => {
      updateGreeting(setGreetingMessage);
    }, 1000); // 1 second in milliseconds

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="text-shadow-1 mb-[0.625rem] font-rubik text-3xl leading-tight text-whitesmoke md:mb-5 md:text-4xl">
      {greetingMessage}
    </div>
  );
}
