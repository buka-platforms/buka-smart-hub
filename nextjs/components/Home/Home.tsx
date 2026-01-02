import AudioSpectrumCanvas from "@/components/General/AudioSpectrumCanvas";
import RequestHeadersProvider from "@/components/General/RequestHeadersProvider";
import Search from "@/components/General/Search";
import UserAvatar from "@/components/General/UserAvatar";
import RandomBackgroundImage from "@/components/Home/BackgroundImageContainer";
import BackgroundImageDropdownMenu from "@/components/Home/BackgroundImageDropdownMenu";
import Fullscreen from "@/components/Home/Fullscreen";
import InfoDropdownMenu from "@/components/Home/InfoDropdownMenu";
import WidgetContainer from "@/components/Widget/WidgetContainer";
import { getRequestHeaders } from "@/lib/header";

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
        {/* Header: controls right */}
        <header className="absolute top-0 left-0 z-10 flex w-full items-start justify-end p-4">
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
        {/* Widget Container: Launcher Dock + All Widgets */}
        <WidgetContainer />
        <div className="absolute right-3 bottom-3 z-10 md:right-3 md:bottom-3">
          <div className="flex gap-x-2">
            <BackgroundImageDropdownMenu />
            <Fullscreen />
            <InfoDropdownMenu />
          </div>
        </div>
        <AudioSpectrumCanvas />
      </div>
    </>
  );
}
