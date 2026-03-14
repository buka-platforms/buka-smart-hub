import type { UserSession } from "@/data/type";
import { cookies } from "next/headers";

const buildSessionUrl = () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL_V1;
  if (!apiBaseUrl) {
    return null;
  }

  return `${apiBaseUrl.replace(/\/+$/, "")}/api/auth/session`;
};

type UserSessionResponse = {
  is_authenticated?: boolean;
  user_details?: {
    picture?: string;
    name?: string;
    first_name?: string;
    provider_id?: string;
    provider_name?: string;
  } | null;
  data?: {
    is_authenticated?: boolean;
    user_details?: {
      picture?: string;
      name?: string;
      first_name?: string;
      provider_id?: string;
      provider_name?: string;
    } | null;
  };
};

const readSessionViaBackend = async (
  cookieHeader: string,
): Promise<UserSession> => {
  const endpoint = buildSessionUrl();
  if (!endpoint) {
    return { is_authenticated: false };
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return { is_authenticated: false };
    }

    const payload = (await response.json()) as UserSessionResponse | undefined;
    const resolved =
      typeof payload?.is_authenticated === "boolean"
        ? payload
        : payload?.data && typeof payload.data.is_authenticated === "boolean"
          ? payload.data
          : null;

    if (!resolved) {
      return { is_authenticated: false };
    }

    return {
      is_authenticated: resolved.is_authenticated,
      user_details: resolved.user_details ?? null,
    };
  } catch {
    return { is_authenticated: false };
  }
};

export const checkUserSession = async (): Promise<UserSession> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader) {
    return { is_authenticated: false };
  }

  return readSessionViaBackend(cookieHeader);
};
