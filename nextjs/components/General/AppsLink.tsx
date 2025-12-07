import AppsLinkHome from "@/components/Home/AppsLink";
import Link from "next/link";

export default function AppsLink() {
  return (
    <>
      <div className="fixed right-0 bottom-20 z-10 rounded-l-full bg-gradient-to-r from-fuchsia-600 to-purple-600 p-1 pl-2 shadow-md md:pl-3">
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
