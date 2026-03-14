"use client";

import { useState } from "react";

const buildLogoutUrl = () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL_V1;
  if (!apiBaseUrl) {
    return null;
  }

  return `${apiBaseUrl.replace(/\/+$/, "")}/api/auth/logout`;
};

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

const expireClientCookie = (name: string) => {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax${buildCookieDomain()}${buildSecureFlag()}`;
};

type LogoutButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function LogoutButton({
  children,
  disabled,
  onClick,
  ...props
}: LogoutButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (event.defaultPrevented || isPending) {
      return;
    }

    setIsPending(true);

    const logoutUrl = buildLogoutUrl();
    const redirectPath =
      typeof window !== "undefined" && window.location.pathname !== "/login"
        ? window.location.pathname
        : "/";

    try {
      if (logoutUrl) {
        await fetch(logoutUrl, {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
      }
    } finally {
      expireClientCookie("_b_crt");
      window.location.assign(redirectPath);
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || isPending}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
