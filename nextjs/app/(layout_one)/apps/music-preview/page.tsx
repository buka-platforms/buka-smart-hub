import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import { Metadata } from "next";
import Link from "next/link";
import MusicPreview from "./MusicPreview";

const moduleName = `Music Preview`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_BUKA_APP_TITLE}`;
const pageDescription = `A quick way to search for songs and listen to their previews. Songs only last for 30 seconds.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BUKA_BASE_URL}/apps/music-preview`;

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
export default async function MusicPreviewPage() {
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
        <MusicPreview />
      </div>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_music_preview.svg"
          alt="Music Preview"
          className="h-[200px] w-[200px] md:h-[350px] md:w-[350px]"
        />
      </div>
    </>
  );
}
