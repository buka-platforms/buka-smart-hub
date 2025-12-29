import AudioSpectrumCanvas from "@/components/General/AudioSpectrumCanvas";
import RequestHeadersProvider from "@/components/General/RequestHeadersProvider";
import Search from "@/components/General/Search";
import UserAvatar from "@/components/General/UserAvatar";
import AppsLink from "@/components/Home/AppsLink";
import RandomBackgroundImage from "@/components/Home/BackgroundImageContainer";
import BackgroundImageDropdownMenu from "@/components/Home/BackgroundImageDropdownMenu";
import Fullscreen from "@/components/Home/Fullscreen";
import InfoDropdownMenu from "@/components/Home/InfoDropdownMenu";
import Volume from "@/components/Home/Volume";
import WidgetDraggableDateTime from "@/components/Home/WidgetDraggableDateTime";
import WidgetDraggableRadioPlayer from "@/components/Home/WidgetDraggableRadioPlayer";
import WidgetDraggableWeather from "@/components/Home/WidgetDraggableWeather";
import { getRequestHeaders } from "@/lib/header";
import Link from "next/link";

/* eslint-disable @next/next/no-img-element */
export default async function Home() {
  const requestHeaders = await getRequestHeaders();

  // Use environment variables for localhost geolocation (fallback to Jakarta, Indonesia if not set)
  if (process.env.NEXT_PUBLIC_HOSTNAME === "localhost") {
    requestHeaders["x-vercel-ip-latitude"] =
      process.env.NEXT_PUBLIC_LOCALHOST_LATITUDE || "-6.2114";
    requestHeaders["x-vercel-ip-longitude"] =
      process.env.NEXT_PUBLIC_LOCALHOST_LONGITUDE || "106.8451";
    requestHeaders["x-vercel-ip-country"] =
      process.env.NEXT_PUBLIC_LOCALHOST_COUNTRY || "ID";
  }

  return (
    <>
      <RequestHeadersProvider requestHeaders={requestHeaders} />
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
            <UserAvatar />
          </div>
        </header>
        {/* Bottom left: WidgetDraggableRadioPlayer and WidgetDraggableWeather above Date & Time */}
        <div className="absolute bottom-111 left-3 z-20 md:bottom-113 md:left-6">
          <WidgetDraggableWeather />
        </div>
        <div className="absolute bottom-72 left-3 z-20 md:bottom-74 md:left-6">
          <WidgetDraggableRadioPlayer />
        </div>
        <div className="absolute bottom-36 left-3 z-20 md:bottom-38 md:left-6">
          <WidgetDraggableDateTime />
        </div>
        {/* Bottom right: Apps CTA */}
        <>
          <div className="absolute right-0 bottom-11 z-10 rounded-l-full bg-linear-to-r from-fuchsia-600 to-purple-600 p-1 pl-2 shadow-md md:bottom-16 md:pl-3">
            <div className="flex items-center">
              <Link
                href="/apps"
                title={`${process.env.NEXT_PUBLIC_APP_TITLE} Apps`}
              >
                <AppsLink />
              </Link>
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
