"use client";

import Link from "next/link";

const cancelLogin = () => {
  // Send virtual page view event to Google Analytics
  if (window && window.gtag) {
    window.gtag("event", "page_view", {
      page_title: `Cancel login screen`,
      page_location: window.location.href,
      page_path: window.location.pathname,
    });
  }
};

export default function GoHomeLink() {
  return (
    <>
      <div className="mt-5 flex items-center justify-center text-sm text-black">
        <Link href="/" className="underline" onClick={cancelLogin}>
          Go back to home
        </Link>
      </div>
    </>
  );
}
