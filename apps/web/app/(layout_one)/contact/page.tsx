import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import type { Metadata } from "next";

const moduleName = `Contact`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `Contact ${process.env.NEXT_PUBLIC_APP_TITLE} for any inquiries or feedback.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/contact`;

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
export default async function ContactPage() {
  return (
    <>
      <PageHeaderInfo moduleName={moduleName} pageDescription={pageDescription}>
        {" "}
        /{" "}
      </PageHeaderInfo>
      <h1 className="hidden">{pageDescription}</h1>
      {/* <main className="mt-9 md:px-0"> */}
      <main className="mt-9 w-full">
        <p>
          Suggestions? Question? Say hello? Partnership? Acquisition? You can
          contact us in several ways.
        </p>
        <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
          <li>
            E-mail to{" "}
            <a href="mailto:info@buka.sh" className="underline">
              info@buka.sh
            </a>
          </li>
          <li>
            Fill{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://forms.gle/RLveZPx9mbjN6mXp9"
              className="underline"
            >
              this form
            </a>
          </li>
        </ul>
        <p>Happy to hear from you.</p>
        {/* <h2 className="mt-5 text-base font-medium tracking-tighter md:text-lg">
          Acquisitions
        </h2>
        <p className="leading-7 not-first:mt-6">
          We also welcome any acquisition inquiries. Please contact us.
        </p> */}
      </main>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_contact.svg"
          alt="Contact"
          className="h-[200px] w-[200px] md:h-[350px] md:w-[350px]"
        />
      </div>
    </>
  );
}
