import type { Metadata } from "next";
import AppPageIntro from "../AppPageIntro";
import NotesClient from "./NotesClient";

const moduleName = `Notes`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `Capture and organize your notes. Synced to your account when signed in.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/apps/notes`;

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

export default async function NotesPage() {
  return (
    <>
      <AppPageIntro title={moduleName} description={pageDescription} />
      <h1 className="hidden">{pageDescription}</h1>
      <div className="mt-6 w-full">
        <NotesClient />
      </div>
    </>
  );
}
