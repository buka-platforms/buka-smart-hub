import type { Metadata } from "next";
import AppPageIntro from "../AppPageIntro";
import QuranReader from "./QuranReader";

const moduleName = `Quran`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `Read and listen to the Holy Quran with beautiful Arabic recitation.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/apps/quran`;

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

export default async function QuranPage() {
  return (
    <>
      <AppPageIntro title={moduleName} description={pageDescription} />
      <h1 className="hidden">{pageDescription}</h1>
      <div className="mt-6 w-full">
        <QuranReader />
      </div>
      <div className="mt-10">
        <h2 className="scroll-m-20 text-xl font-semibold tracking-tight">
          About
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Read the Holy Quran with Arabic text and listen to recitations by
          Sheikh Mishary Rashid Al-Afasy. Navigate through all 114 surahs, play
          individual ayahs, or listen continuously with auto-advance.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Powered by{" "}
          <a
            href="https://alquran.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Al Quran Cloud API
          </a>
          .
        </p>
      </div>
    </>
  );
}
