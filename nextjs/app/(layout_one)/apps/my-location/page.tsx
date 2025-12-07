import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRequestHeaders } from "@/lib/header";
import type { Metadata } from "next";
import Link from "next/link";
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

  return (
    <>
      <PageHeaderInfo
        moduleName={moduleName}
        pageDescription={`${pageDescription} Based on my IP address.`}
      >
        {" "}
        /{" "}
        <Link href="/apps" className="underline">
          Apps
        </Link>{" "}
        /{" "}
      </PageHeaderInfo>
      <h1 className="hidden">{pageDescription}</h1>
      {/* <div className="mt-9 flex w-full flex-col gap-3 md:flex-row"> */}
      <div className="mt-9 w-full">
        <div className="flex flex-col gap-3 md:flex-row">
          <Card className="rounded-lg shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">IP address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto text-xl font-semibold">
                {/* {requestHeaders["cf-connecting-ip"] */}
                {requestHeaders["x-real-ip"]
                  ? // ? requestHeaders["cf-connecting-ip"]
                    requestHeaders["x-real-ip"]
                  : `Unknown`}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">City</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto text-xl font-semibold">
                {/* {requestHeaders["cf-ipcity"] */}
                {requestHeaders["x-vercel-ip-city"]
                  ? // ? requestHeaders["cf-ipcity"]
                    requestHeaders["x-vercel-ip-city"]
                  : `Unknown`}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Country</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto text-xl font-semibold">
                {/* {requestHeaders["cf-ipcountry"] */}
                {requestHeaders["x-vercel-ip-country"]
                  ? // ? requestHeaders["cf-ipcountry"]
                    requestHeaders["x-vercel-ip-country"]
                  : `Unknown`}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lat Long</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto text-xl font-semibold">
                {/* {requestHeaders["cf-iplatitude"] */}
                {requestHeaders["x-vercel-ip-latitude"]
                  ? // ? requestHeaders["cf-iplatitude"]
                    requestHeaders["x-vercel-ip-latitude"]
                  : `Unknown`}
                , {/* {requestHeaders["cf-iplongitude"] */}
                {requestHeaders["x-vercel-ip-longitude"]
                  ? // ? requestHeaders["cf-iplongitude"]
                    requestHeaders["x-vercel-ip-longitude"]
                  : `Unknown`}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timezone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto text-xl font-semibold">
                {/* {requestHeaders["cf-timezone"] */}
                {requestHeaders["x-vercel-ip-timezone"]
                  ? // ? requestHeaders["cf-timezone"]
                    requestHeaders["x-vercel-ip-timezone"]
                  : `Unknown`}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 overflow-hidden">
        <div className="relative h-[500px] w-full">
          <Card className="h-full w-full overflow-hidden rounded-lg shadow-none">
            <Map requestHeaders={requestHeaders} styleUrl={styleUrl} />
          </Card>
        </div>
      </div>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_my_location.svg"
          alt="My Location"
          className="h-[200px] w-[200px] md:h-[350px] md:w-[350px]"
        />
      </div>
    </>
  );
}
