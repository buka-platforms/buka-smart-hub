import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRequestHeaders } from "@/lib/header";
import type { Metadata } from "next";
import AppPageIntro from "../AppPageIntro";
import Map from "./Map";

const moduleName = `My Location`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `Get my location detail and see it in the map.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/apps/my-location`;

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
export default async function MyLocationPage() {
  const requestHeaders = await getRequestHeaders();

  if (process.env.NEXT_PUBLIC_HOSTNAME === "localhost") {
    // Set the IP latitude and longitude for localhost as Jakarta, Indonesia and the country as Indonesia
    // requestHeaders["cf-iplongitude"] = "106.8446";
    requestHeaders["x-vercel-ip-latitude"] = "-6.2114";
    requestHeaders["x-vercel-ip-longitude"] = "106.8451";
    // requestHeaders["cf-iplatitude"] = "-6.2114";
    // requestHeaders["cf-ipcountry"] = "ID";
    requestHeaders["x-vercel-ip-country"] = "ID";
    // requestHeaders["cf-timezone"] = "Asia/Jakarta";
    requestHeaders["x-vercel-ip-timezone"] = "Asia/Jakarta";
    // requestHeaders["cf-ipcity"] = "Jakarta";
    requestHeaders["x-vercel-ip-city"] = "Jakarta";
    // requestHeaders["cf-connecting-ip"] = "localhost";
    requestHeaders["x-vercel-real-ip"] = "localhost";
  }

  const styleUrl = `https://api.maptiler.com/maps/streets-v2/style.json?key=${process.env.SECRET_MAPTILER_API_KEY}`;
  const ipAddress = requestHeaders["x-real-ip"] || `Unknown`;
  const city = requestHeaders["x-vercel-ip-city"] || `Unknown`;
  const country = requestHeaders["x-vercel-ip-country"] || `Unknown`;
  const latitude = requestHeaders["x-vercel-ip-latitude"] || `Unknown`;
  const longitude = requestHeaders["x-vercel-ip-longitude"] || `Unknown`;
  const timezone = requestHeaders["x-vercel-ip-timezone"] || `Unknown`;

  return (
    <>
      <AppPageIntro
        title={moduleName}
        description={`${pageDescription} Based on my IP address.`}
      />
      <h1 className="hidden">{pageDescription}</h1>
      <section className="mt-6 w-full">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="rounded-xl border-border/70 bg-gradient-to-b from-background to-muted/20 py-4 shadow-none">
            <CardHeader className="gap-1 px-5 pb-1">
              <CardTitle className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                IP Address
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <p className="truncate text-2xl leading-tight font-semibold">
                {ipAddress}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border/70 bg-gradient-to-b from-background to-muted/20 py-4 shadow-none">
            <CardHeader className="gap-1 px-5 pb-1">
              <CardTitle className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                City
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <p className="truncate text-2xl leading-tight font-semibold">
                {city}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border/70 bg-gradient-to-b from-background to-muted/20 py-4 shadow-none">
            <CardHeader className="gap-1 px-5 pb-1">
              <CardTitle className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Country
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <p className="truncate text-2xl leading-tight font-semibold">
                {country}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border/70 bg-gradient-to-b from-background to-muted/20 py-4 shadow-none">
            <CardHeader className="gap-1 px-5 pb-1">
              <CardTitle className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Coordinates
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <p className="truncate text-base leading-tight font-semibold text-muted-foreground">
                Lat {latitude}
              </p>
              <p className="truncate text-base leading-tight font-semibold text-muted-foreground">
                Long {longitude}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border/70 bg-gradient-to-b from-background to-muted/20 py-4 shadow-none">
            <CardHeader className="gap-1 px-5 pb-1">
              <CardTitle className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Timezone
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <p className="truncate text-2xl leading-tight font-semibold">
                {timezone}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="mt-5 flex items-center gap-2 overflow-hidden">
        <div className="relative h-[420px] w-full md:h-[540px]">
          <Card className="h-full w-full overflow-hidden rounded-xl border-border/70 shadow-none">
            <Map requestHeaders={requestHeaders} styleUrl={styleUrl} />
          </Card>
        </div>
      </section>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_my_location.svg"
          alt="My Location"
          className="h-50 w-50 md:h-87.5 md:w-87.5"
        />
      </div>
    </>
  );
}
