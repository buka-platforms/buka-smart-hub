import AppsLink from "@/components/General/AppsLink";
import RadioPanelFooter from "@/components/General/RadioPanelFooter";
import SignedInHeader from "@/components/General/SignedInHeader";
import { getRequestHeaders } from "@/lib/header";
import { checkUserSession } from "@/lib/user";

/* eslint-disable @next/next/no-img-element */
export default async function LayoutOne({
  children,
}: {
  children: React.ReactNode;
}) {
  const userSession = await checkUserSession();
  const requestHeaders = await getRequestHeaders();

  if (process.env.NEXT_PUBLIC_HOSTNAME === "localhost") {
    // Set the IP country for localhost as Indonesia
    requestHeaders["x-vercel-ip-country"] = "ID";
  }

  return (
    <>
      <div>
        <SignedInHeader userSession={userSession} />
        <div className="container mx-auto mt-7">{children}</div>
        {process.env.NEXT_PUBLIC_HOSTNAME === "buka.sh" ? (
          <>
            <div className="h-64"></div>
          </>
        ) : (
          <div className="h-64"></div>
        )}
        <AppsLink />
        <RadioPanelFooter requestHeaders={requestHeaders} />
      </div>
    </>
  );
}
