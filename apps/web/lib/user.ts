import { cookies } from "next/headers";

const buildVerifySessionUrl = () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL_V1;
  if (!apiBaseUrl) {
    return null;
  }

  return `${apiBaseUrl.replace(/\/+$/, "")}/api/auth/session/verify`;
};

const verifySessionViaBackend = async ({
  userId,
  userDeviceId,
  userSessionToken,
}: {
  userId?: string;
  userDeviceId?: string;
  userSessionToken?: string;
}) => {
  const endpoint = buildVerifySessionUrl();
  if (!endpoint || !userId || !userDeviceId || !userSessionToken) {
    return false;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        device_id: userDeviceId,
        session_token: userSessionToken,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as
      | { is_authenticated?: boolean; data?: { is_authenticated?: boolean } }
      | undefined;

    if (typeof payload?.is_authenticated === "boolean") {
      return payload.is_authenticated;
    }

    if (typeof payload?.data?.is_authenticated === "boolean") {
      return payload.data.is_authenticated;
    }

    return false;
  } catch {
    return false;
  }
};

export const checkUserSession = async () => {
  const cookieStore = await cookies();

  // Check if has cookie called "_b_ust" not exists
  if (!cookieStore.has("_b_ust")) {
    return { is_authenticated: false };
  }

  // Check if has cookie called "_b_did" not exists
  if (!cookieStore.has("_b_did")) {
    return { is_authenticated: false };
  }

  // Check if has cookie called "_b_uid" not exists
  if (!cookieStore.has("_b_uid")) {
    return { is_authenticated: false };
  }

  // Get cookie called _b_ust
  const userSessionToken = cookieStore.get("_b_ust")?.value;

  // Get cookie called _b_did
  const userDeviceId = cookieStore.get("_b_did")?.value;

  // Get cookie called _b_uid
  const userId = cookieStore.get("_b_uid")?.value;

  const isAuthenticated = await verifySessionViaBackend({
    userId,
    userDeviceId,
    userSessionToken,
  });

  if (!isAuthenticated) {
    return { is_authenticated: false };
  }

  const userData = cookieStore.get("_b_ud")?.value;
  if (!userData) {
    return { is_authenticated: false };
  }

  try {
    return {
      is_authenticated: true,
      user_details: JSON.parse(userData),
    };
  } catch {
    return { is_authenticated: false };
  }
};
