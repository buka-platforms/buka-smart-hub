"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ClientSideOperationOnPage() {
  const pathname = usePathname();

  const buildCookieDomain = () => {
    if (typeof window === "undefined") {
      return "";
    }

    const { hostname } = window.location;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
    ) {
      return "";
    }

    const parts = hostname.split(".");
    if (parts.length < 2) {
      return "";
    }

    return `; domain=.${parts.slice(-2).join(".")}`;
  };

  const buildSecureFlag = () => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.location.protocol === "https:" ? "; secure" : "";
  };

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    }
  }, []);

  useEffect(() => {
    // Do not store the cookie if the pathname is /login, because if it stored, the user will be redirected to the login page and not the last page they visited
    if (pathname === "/login") {
      return;
    }

    document.cookie = `_b_crt=${encodeURIComponent(pathname ?? "/")}; path=/;max-age=31536000; samesite=lax${buildCookieDomain()}${buildSecureFlag()}`;
  }, [pathname]);

  return null;
}
