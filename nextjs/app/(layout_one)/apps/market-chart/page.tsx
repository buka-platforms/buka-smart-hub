import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import type { Metadata } from "next";
import Link from "next/link";
import TradingViewWidget from "./TradingViewWidget";

const moduleName = `Market Chart`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_BUKA_APP_TITLE}`;
const pageDescription = `Follow favorite stocks or crypto assets. Powered by TradingView.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BUKA_BASE_URL}/apps/market-chart`;

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
export default async function MarketChartPage() {
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
      {/* <div className="mt-9 flex items-center overflow-hidden"> */}
      <div className="mt-9 w-full">
        <div className="flex h-[calc(100vh-64px-81px-200px)] w-full justify-center">
          <TradingViewWidget />
        </div>
      </div>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_market_chart.svg"
          alt="Market Chart"
          className="h-[200px] w-[200px] md:h-[350px] md:w-[350px]"
        />
      </div>
    </>
  );
}
