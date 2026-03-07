"use client";

import AppsLinkHome from "@/components/Home/AppsLink";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppsLink() {
  const pathname = usePathname();
  if (pathname?.startsWith("/apps")) return null;

  return (
    <>
      <div className="fixed right-0 bottom-20 z-10 rounded-l-full bg-linear-to-r from-fuchsia-600 to-purple-600 p-1 pl-2 shadow-md md:pl-3">
        <div className="flex items-center">
          <Link
            href="/apps"
            title={`${process.env.NEXT_PUBLIC_APP_TITLE} Apps`}
          >
            <AppsLinkHome />
          </Link>
        </div>
      </div>
    </>
  );
}
