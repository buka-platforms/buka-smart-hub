import RadioCoverArt from "@/app/radio/[slug]/RadioCoverArt";
import RadioMetadata from "@/app/radio/[slug]/RadioMetadata";
import RadioPanel from "@/app/radio/[slug]/RadioPanel";
import Search from "@/components/General/Search";
import UserAvatar from "@/components/General/UserAvatar";
import AppsLink from "@/components/Home/AppsLink";
import BackgroundImageContainer from "@/components/Home/BackgroundImageContainer";
import BackgroundImageDropdownMenu from "@/components/Home/BackgroundImageDropdownMenu";
import Fullscreen from "@/components/Home/Fullscreen";
import InfoDropdownMenu from "@/components/Home/InfoDropdownMenu";
import { checkUserSession } from "@/lib/user";
import Canvas from "./Canvas";
import "@fontsource-variable/rubik";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const getRadioStationBySlug = cache(async (slug: string) => {
  // Fetch data in parallel
  const [radioStationResult] = await Promise.all([
    fetch(
      `${process.env.NEXT_PUBLIC_BUKA_API_URL_V1}/radio-station?slug=${slug}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  ]);

  const radioStation = await radioStationResult.json();

  // Detect if the radio station is not found
  if (radioStation.status == "0" && radioStation.data === null) {
    return notFound();
  }

  return radioStation.data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const paramsData = await params;
  let radioStation = await getRadioStationBySlug(paramsData.slug);

  const moduleName = `Radio`;
  const pageTitle = `${radioStation?.name} from ${radioStation?.country?.name} - ${moduleName} - ${process.env.NEXT_PUBLIC_BUKA_APP_TITLE}`;
  const pageDescription = `Listen to ${radioStation?.name} from ${radioStation?.country?.name}.`;
  const pageUrl = `${process.env.NEXT_PUBLIC_BUKA_BASE_URL}/radio/${`${radioStation?.slug}`}`;

  return {
    metadataBase: new URL(`${process.env.NEXT_PUBLIC_BUKA_BASE_URL}`),
    title: `${pageTitle}`,
    description: `${pageDescription}`,
    openGraph: {
      url: `${pageUrl}`,
      type: "website",
      title: `${pageTitle}`,
      description: `${pageDescription}`,
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_BUKA_SOCIAL_MEDIA_IMAGE_1}`,
          width: 1200,
          height: 630,
          alt: `${process.env.NEXT_PUBLIC_BUKA_APP_TITLE}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: `${process.env.NEXT_PUBLIC_BUKA_SOCIAL_MEDIA_IMAGE_1}`,
      title: `${pageTitle}`,
      description: `${pageDescription}`,
      creator: `@${process.env.NEXT_PUBLIC_BUKA_X_HANDLE}`,
      site: `@${process.env.NEXT_PUBLIC_BUKA_X_HANDLE}`,
    },
  };
}

/* eslint-disable @next/next/no-img-element */
export default async function RadioDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Props["searchParams"];
}) {
  const userSession = await checkUserSession();
  const paramsData = await params;
  const searchParamsData = await searchParams;

  let radioStation = await getRadioStationBySlug(paramsData.slug);
  const isInIframe = searchParamsData?.if == "1";

  return (
    <>
      <div>
        <h1 className="hidden">{`Listen to ${radioStation?.name} from ${radioStation?.country?.name}.`}</h1>
        <div className="fixed top-0 left-0 z-0 flex h-full w-full items-center justify-center">
          <BackgroundImageContainer />
          {!isInIframe && (
            <Link href="/">
              <div
                className="absolute top-5 left-3 flex"
                title={`${process.env.NEXT_PUBLIC_BUKA_APP_TITLE}, something that you open everyday.`}
              >
                <img
                  src="/assets/images/buka-white-v2.svg"
                  alt={`${process.env.NEXT_PUBLIC_BUKA_APP_TITLE}`}
                  className="isolate h-12 w-12 md:h-14 md:w-14"
                />
              </div>
            </Link>
          )}
          {!isInIframe && (
            <div className="absolute top-5 right-3 flex cursor-pointer items-center gap-x-3">
              <span title="Search">
                <Search
                  className="h-6 w-6 opacity-80 hover:opacity-100 md:h-8 md:w-8"
                  color="#f5f5f5"
                />
              </span>
              <UserAvatar userSession={userSession} />
            </div>
          )}
          <div className="absolute bottom-0 left-0 w-full">
            <div className="absolute bottom-3 left-3 z-10 flex max-w-[60%] flex-col md:bottom-6 md:left-6 md:max-w-full">
              <RadioCoverArt />
              <div className="z-10 mt-3 flex flex-col">
                <RadioMetadata />
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-0">
            {!isInIframe && (
              <div className="absolute right-0 bottom-[6.3rem] z-10 rounded-l-full bg-gradient-to-r from-fuchsia-600 to-purple-600 p-1 pl-2 shadow-md md:bottom-[8.2rem] md:pl-3">
                <div className="flex items-center">
                  <Link
                    href="/apps"
                    title={`${process.env.NEXT_PUBLIC_BUKA_APP_TITLE} Apps`}
                  >
                    <AppsLink />
                  </Link>
                </div>
              </div>
            )}
            <div className="absolute right-0 bottom-11 z-10 rounded-l-full bg-gradient-to-r from-fuchsia-600 to-pink-600 p-1 shadow-md md:bottom-16">
              <div className="flex items-center gap-1 md:gap-2">
                <RadioPanel radioStationData={radioStation} />
              </div>
            </div>
            <div className="absolute right-3 bottom-3 z-10 md:right-3 md:bottom-3">
              <div className="flex items-center gap-x-2">
                {isInIframe && (
                  <span className="text-xs font-light text-slate-300">
                    <a
                      href={`${process.env.NEXT_PUBLIC_BUKA_BASE_URL}`}
                      target="_blank"
                    >
                      Powered by {process.env.NEXT_PUBLIC_BUKA_APP_TITLE}
                    </a>
                  </span>
                )}
                <BackgroundImageDropdownMenu />
                {!isInIframe && <Fullscreen />}
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
