"use client";

import { Users } from "lucide-react";

export default function Discord() {
  return (
    <>
      <a
        href="https://discord.gg/ypK9wMGEuG"
        target="_blank"
        className="cursor-pointer"
        title={`Join ${process.env.NEXT_PUBLIC_BUKA_APP_TITLE} Discord server`}
      >
        <Users className="text-shadow-1 h-5 w-5 text-white opacity-80 hover:opacity-100" />
      </a>
    </>
  );
}
