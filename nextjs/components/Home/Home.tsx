import Search from "@/components/General/Search";
import UserAvatar from "@/components/General/UserAvatar";
import AppsLink from "@/components/Home/AppsLink";
import RandomBackgroundImage from "@/components/Home/BackgroundImageContainer";
import BackgroundImageDropdownMenu from "@/components/Home/BackgroundImageDropdownMenu";
import Canvas from "@/components/Home/Canvas";
import Date from "@/components/Home/Date";
import Fullscreen from "@/components/Home/Fullscreen";
// import Greeting from "@/components/Home/Greeting";
import InfoDropdownMenu from "@/components/Home/InfoDropdownMenu";
import RadioCoverArt from "@/components/Home/RadioCoverArt";
import RadioPanel from "@/components/Home/RadioPanel";
// import RadioPlayer from "@/components/Home/RadioPlayer";
import Time from "@/components/Home/Time";
import Volume from "@/components/Home/Volume";
import Weather from "@/components/Home/Weather";
import { getRequestHeaders } from "@/lib/header";
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
      <div>
        <h1 className="hidden">
          {process.env.NEXT_PUBLIC_APP_TITLE}, something that you open everyday.
        </h1>
        <div className="fixed top-0 left-0 z-0 flex h-full w-full items-center justify-center">
          <RandomBackgroundImage />
          <div
            className="absolute top-5 left-3 flex"
            title={`${process.env.NEXT_PUBLIC_APP_TITLE}, something that you open everyday.`}
          >
            <img
              src="/assets/images/logo-white.svg"
              alt={`${process.env.NEXT_PUBLIC_APP_TITLE}`}
              className="isolate h-8 w-8 md:h-10 md:w-10"
            />
          </div>
          <div className="absolute top-5 right-3 z-20 flex cursor-pointer items-center gap-x-3 md:z-auto">
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
          <div className="absolute bottom-0 left-0 w-full">
            <div className="absolute bottom-3 left-3 z-10 flex max-w-[60%] flex-col md:bottom-6 md:left-6 md:max-w-full">
              <RadioCoverArt />
              <div className="z-10 flex flex-col">
                <Date />
                <Time />
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0">
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
                {/* <RadioPlayer /> */}
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
          </div>
          <Canvas />
        </div>
      </div>
    </>
  );
}
