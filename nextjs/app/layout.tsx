import { cn } from "../lib/utils";
import "./globals.css";
import Audio from "@/components/General/Audio";
import ClientSideOperationOnPage from "@/components/General/ClientSideOperationOnPage";
import { GoogleAnalytics } from "@/components/General/GoogleAnalytics";
import JotaiProvider from "@/components/JotaiProvider";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const pageTitle = `${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `${process.env.NEXT_PUBLIC_APP_TITLE}, something that you open everyday.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}`;

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
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Disable zooming
  userScalable: false, // Disable zooming
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: `${pageTitle}`,
  url: `${pageUrl}`,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {process.env.NEXT_PUBLIC_HOSTNAME ===
        process.env.NEXT_PUBLIC_FINAL_HOSTNAME ? (
          <>
            <GoogleAnalytics />
          </>
        ) : null}
      </head>
      <body
        className={cn("bg-background font-sans antialiased", inter.variable)}
      >
        <NextTopLoader
          color="#cb3837"
          shadow={false}
          showSpinner={false}
          height={3}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <JotaiProvider>
          {children}
          <Audio />
        </JotaiProvider>
      </body>
      <ClientSideOperationOnPage />
    </html>
  );
}
