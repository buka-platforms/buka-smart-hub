"use client";

import AppsLink from "@/components/General/AppsLink";
import SignedInHeader from "@/components/General/SignedInHeader";
import UserSessionProvider from "@/components/General/UserSessionProvider";
import type { UserSession } from "@/data/type";
import { usePathname } from "next/navigation";

export default function OneClient({
  children,
  userSession,
}: {
  children: React.ReactNode;
  userSession: UserSession;
}) {
  const pathname = usePathname();
  const isAppsRoute = pathname?.startsWith("/apps");

  if (isAppsRoute) {
    return (
      <div className="min-h-screen">
        <UserSessionProvider userSession={userSession} />
        {children}
      </div>
    );
  }

  return (
    <div>
      <UserSessionProvider userSession={userSession} />
      <SignedInHeader userSession={userSession} />
      <div className="container mx-auto mt-7">{children}</div>
      {process.env.NEXT_PUBLIC_HOSTNAME === "buka.sh" ? (
        <div className="h-64"></div>
      ) : (
        <div className="h-64"></div>
      )}
      <AppsLink />
    </div>
  );
}
