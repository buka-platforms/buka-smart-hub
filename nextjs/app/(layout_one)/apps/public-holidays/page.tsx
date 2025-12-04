import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import { getRequestHeaders } from "@/lib/header";
import { Metadata } from "next";
import Link from "next/link";
import PublicHolidays from "./PublicHolidays";

const moduleName = `Public Holidays`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_BUKA_APP_TITLE}`;
const pageDescription = `Check the public holidays schedule. Powered by Nager.at.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BUKA_BASE_URL}/apps/public-holidays`;

export const metadata: Metadata = {
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

/* eslint-disable @next/next/no-img-element */
export default async function PublicHolidaysPage() {
  const requestHeaders = await getRequestHeaders();

  if (process.env.NEXT_PUBLIC_HOSTNAME === "localhost") {
    // Set the IP country for localhost as Indonesia
    // requestHeaders["cf-ipcountry"] = "ID";
    requestHeaders["x-vercel-ip-country"] = "ID";
  }

  const availableCountries = await fetch(
    `https://date.nager.at/api/v3/AvailableCountries`,
    {
      method: "GET",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
    },
  ).then((res) => res.json());

  // Check if the IP country is available in the list of available countries
  const isCountryAvailable = availableCountries.some(
    // (country: any) => country.countryCode === requestHeaders["cf-ipcountry"],
    (country: any) =>
      country.countryCode === requestHeaders["x-vercel-ip-country"],
  );

  // Get currrent year
  const currentYear = new Date().getFullYear();

  // Prepare query string for search at Google `public holiday in country code ISO3166 {country code} for {current year}`
  // const searchQuery = `public holiday in country code ISO3166 ${requestHeaders["cf-ipcountry"]} for ${currentYear}`;
  const searchQuery = `public holiday in country code ISO3166 ${requestHeaders["x-vercel-ip-country"]} for ${currentYear}`;

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
      <div className="mt-9 w-full">
        {isCountryAvailable ? (
          <PublicHolidays requestHeaders={requestHeaders} />
        ) : (
          <div className="text-sm">
            Sorry, public holidays data not yet available for{" "}
            {/* {requestHeaders["cf-ipcountry"]}.{" "} */}
            {requestHeaders["x-vercel-ip-country"]}.{" "}
            <a
              href={`https://www.google.com/search?q=${searchQuery}`}
              className="underline"
              target="_blank"
            >
              Click here to get results
            </a>
            .
          </div>
        )}
      </div>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_public_holidays.svg"
          alt="Radio"
          className="h-[200px] w-[200px] md:h-[350px] md:w-[350px]"
        />
      </div>
    </>
  );
}
