import type { Metadata } from "next";
import AppPageIntro from "../AppPageIntro";
import SomaFMChannels from "./SomaFMChannels";

const moduleName = `SomaFM`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `Browse and listen to SomaFM internet radio channels — commercial-free, listener-supported.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/apps/somafm`;

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

export default async function SomaFMPage() {
  return (
    <>
      <AppPageIntro title={moduleName} description={pageDescription} />
      <h1 className="hidden">{pageDescription}</h1>
      <div className="mt-6 w-full">
        <p className="leading-7 not-first:mt-6">
          <a
            href="https://somafm.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            SomaFM
          </a>{" "}
          is a listener-supported, commercial-free internet radio service
          broadcasting from San Francisco. Explore all available channels below.
        </p>
        <SomaFMChannels />
      </div>
    </>
  );
}
