"use client";

import { useEffect } from "react";

export default function GoogleAdSenseDisplay1() {
  const googleAdSenseScript = `
<!-- Responsive 1 -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-2410702554753526"
     data-ad-slot="4646501148"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>`;

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_HOSTNAME === "buka.sh") {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  });

  return (
    <>
      <div
        className="container mx-auto"
        dangerouslySetInnerHTML={{ __html: googleAdSenseScript }}
      ></div>
    </>
  );
}
