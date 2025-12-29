import Search from "@/components/General/Search";
import UserAvatar from "@/components/General/UserAvatar";
import AppsLink from "@/components/Home/AppsLink";
import AudioSpectrumCanvas from "@/components/Home/AudioSpectrumCanvas";
import RandomBackgroundImage from "@/components/Home/BackgroundImageContainer";
import BackgroundImageDropdownMenu from "@/components/Home/BackgroundImageDropdownMenu";
import Date from "@/components/Home/Date";
import Fullscreen from "@/components/Home/Fullscreen";
import InfoDropdownMenu from "@/components/Home/InfoDropdownMenu";
// import RadioCoverArt from "@/components/Home/RadioCoverArt";
import RadioPanel from "@/components/Home/RadioPanel";
import Time from "@/components/Home/Time";
import Volume from "@/components/Home/Volume";
import Weather from "@/components/Home/Weather";
import WidgetDraggableRadioPlayer from "@/components/Home/WidgetDraggableRadioPlayer";
import { getRequestHeaders } from "@/lib/header";
// import { Radio } from "lucide-react";
import Link from "next/link";

/* eslint-disable @next/next/no-img-element */
export default async function Home({
  userSession,
}: {
  userSession: { [key: string]: unknown };
}) {
  const requestHeaders = await getRequestHeaders();

  if (process.env.NEXT_PUBLIC_HOSTNAME === "localhost") {
    // Set the IP latitude and longitude for localhost as Jakarta, Indonesia and the country as Indonesia
    requestHeaders["x-vercel-ip-latitude"] = "-6.2114";
    requestHeaders["x-vercel-ip-longitude"] = "106.8451";
    requestHeaders["x-vercel-ip-country"] = "ID";
  }

  return (
    <>
      <h1 className="hidden">
        {process.env.NEXT_PUBLIC_APP_TITLE}, something that you open everyday.
      </h1>
      <div className="relative z-0 h-screen w-full overflow-hidden">
        <RandomBackgroundImage />
        {/* Header: logo left, controls right */}
        <header className="absolute top-0 left-0 z-10 flex w-full items-start justify-between p-4">
          <div
            className="flex items-center"
            title={`${process.env.NEXT_PUBLIC_APP_TITLE}, something that you open everyday.`}
          >
            <img
              src="/assets/images/logo-white.svg"
              alt={`${process.env.NEXT_PUBLIC_APP_TITLE}`}
              className="isolate h-8 w-8 md:h-10 md:w-10"
            />
          </div>
          <div className="flex items-center gap-x-3">
            <div title="Search" className="flex items-center">
              <Search
                className="h-6 w-6 cursor-pointer opacity-80 hover:opacity-100 md:h-8 md:w-8"
                color="#f5f5f5"
              />
            </div>
            <div className="flex items-center">
              <Weather requestHeaders={requestHeaders} />
            </div>
            <UserAvatar userSession={userSession} />
          </div>
        </header>
        {/* Bottom left: WidgetDraggableRadioPlayer above Date & Time */}
        <div className="absolute bottom-46 left-3 z-20 md:bottom-68 md:left-6">
          <WidgetDraggableRadioPlayer />
        </div>
        <div className="absolute bottom-3 left-3 z-10 flex max-w-[60%] flex-col md:bottom-6 md:left-6 md:max-w-full">
          <Date />
          <Time />
        </div>
        {/* Bottom right: Apps, RadioPanel, Controls (restored absolute edge attachment) */}
        <>
          <div className="absolute right-0 bottom-[6.3rem] z-10 rounded-l-full bg-linear-to-r from-fuchsia-600 to-purple-600 p-1 pl-2 shadow-md md:bottom-[8.2rem] md:pl-3">
            <div className="flex items-center">
              <Link
                href="/apps"
                title={`${process.env.NEXT_PUBLIC_APP_TITLE} Apps`}
              >
                <AppsLink />
              </Link>
            </div>
          </div>
          <div className="absolute right-0 bottom-11 z-10 rounded-l-full bg-linear-to-r from-fuchsia-600 to-pink-600 p-1 shadow-md md:bottom-16">
            <div className="flex items-center gap-2">
              <RadioPanel requestHeaders={requestHeaders} />
            </div>
          </div>
          <div className="absolute right-3 bottom-3 z-10 md:right-3 md:bottom-3">
            <div className="flex gap-x-2">
              <Volume />
              <BackgroundImageDropdownMenu />
              <Fullscreen />
              <InfoDropdownMenu />
            </div>
          </div>
        </>
        <AudioSpectrumCanvas />
      </div>
    </>
  );
}
