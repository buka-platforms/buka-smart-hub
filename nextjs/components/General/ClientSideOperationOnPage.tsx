"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ClientSideOperationOnPage() {
  const pathname = usePathname();

  useEffect(() => {
    // Do not store the cookie if the pathname is /login, because if it stored, the user will be redirected to the login page and not the last page they visited
    if (pathname === "/login") {
      return;
    }

    document.cookie = `_b_crt=${pathname}; path=/;max-age=31536000`;
  }, [pathname]);

  return null;
}
