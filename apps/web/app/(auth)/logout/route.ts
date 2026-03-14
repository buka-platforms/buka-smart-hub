import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const getSafeRedirectPath = (value?: string) => {
  if (!value || typeof value !== "string") {
    return "/";
  }

  if (!value.startsWith("/")) {
    return "/";
  }

  if (value.startsWith("//") || value.includes("://")) {
    return "/";
  }

  return value;
};

const buildLogoutUrl = () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL_V1;
  if (!apiBaseUrl) {
    return null;
  }

  return `${apiBaseUrl.replace(/\/+$/, "")}/api/auth/logout`;
};

const revokeBackendSession = async ({
  userId,
  deviceId,
  userSessionToken,
}: {
  userId?: string;
  deviceId?: string;
  userSessionToken?: string;
}) => {
  const endpoint = buildLogoutUrl();
  if (!endpoint || !userId || !deviceId || !userSessionToken) {
    return;
  }

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        device_id: deviceId,
        session_token: userSessionToken,
      }),
    });
  } catch {
    // Logout should still clear local cookies even if backend revoke fails.
  }
};

export async function GET() {
  return redirect("/");
}

export async function POST() {
  const cookieStore = await cookies();

  // Get device_id from cookies
  const deviceId = cookieStore.get("_b_did")?.value;

  // Get user_id from cookies
  const userId = cookieStore.get("_b_uid")?.value;

  // Get user_session_token from cookies
  const userSessionToken = cookieStore.get("_b_ust")?.value;

  const redirectPath = getSafeRedirectPath(cookieStore.get("_b_crt")?.value);

  await revokeBackendSession({
    userId,
    deviceId,
    userSessionToken,
  });

  // Delete _b_ust cookie (user session token)
  cookieStore.delete("_b_ust");

  // Delete _b_uid cookie (user id)
  cookieStore.delete("_b_uid");

  // Delete _b_did cookie (device id)
  cookieStore.delete("_b_did");

  // Delete _b_ud cookie (user data)
  cookieStore.delete("_b_ud");
  cookieStore.delete("_b_crt");

  return redirect(redirectPath);
}
