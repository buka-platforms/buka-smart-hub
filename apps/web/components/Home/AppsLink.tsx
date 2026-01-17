"use client";

import { Grip } from "lucide-react";

export default function AppsLink() {
  return (
    <>
      <div
        title={`${process.env.NEXT_PUBLIC_APP_TITLE} Apps`}
        className="group flex"
      >
        <Grip
          className="-mr-2 h-10 w-10 cursor-pointer opacity-80 group-hover:opacity-100 md:-mr-3 md:h-12 md:w-12"
          color="#f5f5f5"
        />
        <div className="-mr-1 flex items-center tracking-wide text-whitesmoke opacity-80 group-hover:opacity-100 md:-mr-2">
          <span className="inline-block rotate-90 transform text-[0.7rem] md:text-sm">
            APPS
          </span>
        </div>
      </div>
    </>
  );
}
