import type { Metadata } from "next";

// const pageTitle = `--------------------------------`;
const pageTitle = `────────────────────────────────`;
const pageDescription = `This is a separator page.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BUKA_BASE_URL}/separator`;

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
export default async function SeparatorPage() {
  return <>{pageTitle}</>;
}
