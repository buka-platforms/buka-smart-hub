import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import type { Metadata } from "next";

const moduleName = `Credits`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `Some of the resources used in ${process.env.NEXT_PUBLIC_APP_TITLE}.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/credits`;

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
export default async function CreditsPage() {
  return (
    <>
      <PageHeaderInfo moduleName={moduleName} pageDescription={pageDescription}>
        {" "}
        /{" "}
      </PageHeaderInfo>
      <h1 className="hidden">{pageDescription}</h1>
      <main className="mt-9 w-full">
        <div className="my-6 w-full overflow-y-auto">
          <table className="w-full">
            <tbody>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  UI icons
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Lucide
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  UI facades
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Tailwind CSS, shadcn/ui, Unsplash, Storyset, IconScout
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Buka Smart Hub logo
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  <a
                    rel="noopener"
                    target="_blank"
                    href="https://www.flaticon.com/free-icon/layers_16967606"
                  >
                    Layers from ekays.dsgn
                  </a>{" "}
                  at{" "}
                  <a rel="noopener" target="_blank" href="https://flaticon.com">
                    Flaticon
                  </a>
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Web framework & library
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Next.js, React
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  IDE
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Visual Studio Code Insiders, Cursor
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Code repository
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  GitHub
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Languages
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  JavaScript, TypeScript, PHP
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Database & APIs
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  MySQL, Directus, Redis, Memcached
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Infrastructure & hosting
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Contabo, Cloudflare, Docker, Docker Mailserver, n8n, Nginx,
                  Nginx Proxy Manager, Node.js, Ubuntu, Vercel
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Development hardware
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  MSI, Logitech, LG, Soundtech, Intel, NVIDIA, Royal Kludge,
                  Huawei, Xiaomi
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  AI tools
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  ChatGPT, GitHub Copilot Pro
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  AI models
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  GPT-5 Mini, Opus 4.5
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Snacks and drinks
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Good Day Mocacinno, Dilmah Earl Grey, Gudang Garam
                  International, Ichi Ocha, Chitato, Gorengan and others
                </td>
              </tr>
              <tr className="m-0 border-t p-0 even:bg-muted">
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  Investors
                </td>
                <td className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right">
                  <a rel="noopener" target="_blank" href="https://sony-ak.com">
                    Sony AK
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_credits.svg"
          alt="Credits"
          className="h-[200px] w-[200px] md:h-[350px] md:w-[350px]"
        />
      </div>
    </>
  );
}
