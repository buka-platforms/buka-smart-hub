"use client";

import { fetchAuthenticatedApi } from "@/lib/authenticated-api";
import "@fontsource-variable/rubik";
import React, { useEffect, useState } from "react";

const updateGreeting = (
  setGreetingMessage: (value: string) => void,
  firstName?: string,
) => {
  const hours = new Date().getHours();

  let greeting = "";

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
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    void fetchAuthenticatedApi("/api/auth/session")
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as
          | {
              is_authenticated?: boolean;
              user_details?: { first_name?: string; name?: string } | null;
              data?: {
                is_authenticated?: boolean;
                user_details?: { first_name?: string; name?: string } | null;
              };
            }
          | null;
      })
      .then((payload) => {
        const resolved =
          payload && typeof payload.is_authenticated === "boolean"
            ? payload
            : payload?.data &&
                typeof payload.data.is_authenticated === "boolean"
              ? payload.data
              : null;

        const nextFirstName =
          resolved?.user_details?.first_name ||
          resolved?.user_details?.name?.split(" ")[0] ||
          "";

        setFirstName(nextFirstName);
      })
      .catch(() => {
        setFirstName("");
      });
  }, []);

  useEffect(() => {
    updateGreeting(setGreetingMessage, firstName);

    // Update every second
    const intervalId = setInterval(() => {
      updateGreeting(setGreetingMessage, firstName);
    }, 1000); // 1 second in milliseconds

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [firstName]);

  return (
    <div className="text-shadow-1 mb-2.5 font-rubik text-3xl leading-tight text-whitesmoke md:mb-5 md:text-4xl">
      {greetingMessage}
    </div>
  );
}
