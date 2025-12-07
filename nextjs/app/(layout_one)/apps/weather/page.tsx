import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import type { Metadata } from "next";
import Link from "next/link";
import MyAirQualityAndPollenWidget from "./MyAirQualityAndPollenWidget";
import MyAirQualityAndPollutantWidget from "./MyAirQualityAndPollutantWidget";
import MySummaryWeatherWidget from "./MySummaryWeatherWidget";
import MyWeatherWidget from "./MyWeatherWidget";
import PopularCitiesWeather1Widget from "./PopularCitiesWeather1Widget";
import PopularCitiesWeather2Widget from "./PopularCitiesWeather2Widget";
import PopularCitiesWeather3Widget from "./PopularCitiesWeather3Widget";

const moduleName = `Weather`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `Check weather condition. Powered by Tomorrow.io.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/apps/weather`;

export const metadata: Metadata = {
  metadataBase: new URL(`${process.env.NEXT_PUBLIC_BASE_URL}`),
  title: `${pageTitle}`,
  description: `${pageDescription}`,
  openGraph: {
    url: `${pageUrl}`,
    type: "website",
    title: `${pageTitle}`,
    description: `${pageDescription}`,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SOCIAL_MEDIA_IMAGE_1}`,
        width: 1200,
        height: 630,
        alt: `${process.env.NEXT_PUBLIC_APP_TITLE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: `${process.env.NEXT_PUBLIC_SOCIAL_MEDIA_IMAGE_1}`,
    title: `${pageTitle}`,
    description: `${pageDescription}`,
    creator: `@${process.env.NEXT_PUBLIC_X_HANDLE}`,
    site: `@${process.env.NEXT_PUBLIC_X_HANDLE}`,
  },
};

/* eslint-disable @next/next/no-img-element */
export default async function MyWeatherPage() {
  return (
    <>
      <PageHeaderInfo moduleName={moduleName} pageDescription={pageDescription}>
        {" "}
        /{" "}
        <Link href="/apps" className="underline">
          Apps
        </Link>{" "}
        /{" "}
      </PageHeaderInfo>
      <h1 className="hidden">{pageDescription}</h1>
      {/* <div className="mt-9 flex w-full flex-wrap items-center overflow-hidden"> */}
      <div className="mt-9 w-full">
        <div className="mt-7 flex w-full flex-col items-center justify-center">
          <h2 className="mb-3 self-start font-medium">Summary</h2>
          <MySummaryWeatherWidget />
        </div>
        <div className="mt-7 flex w-full flex-col items-center justify-center">
          <h2 className="mb-3 self-start font-medium">Upcoming Days</h2>
          <MyWeatherWidget />
        </div>
        <div className="mt-7 flex w-full flex-col items-center justify-center">
          <h2 className="mb-3 self-start font-medium">
            Air Quality and Pollutant
          </h2>
          <MyAirQualityAndPollutantWidget />
        </div>
        <div className="mt-7 flex w-full flex-col items-center justify-center">
          <h2 className="mb-3 self-start font-medium">
            Air Quality and Pollen
          </h2>
          <MyAirQualityAndPollenWidget />
        </div>
        <div className="mt-7 flex w-full flex-col items-center justify-center">
          <h2 className="mb-3 self-start font-medium">Popular Cities</h2>
          <PopularCitiesWeather1Widget />
          <PopularCitiesWeather2Widget />
          <PopularCitiesWeather3Widget />
        </div>
      </div>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_weather.svg"
          alt="Weather"
          className="h-[200px] w-[200px] md:h-[350px] md:w-[350px]"
        />
      </div>
    </>
  );
}
