import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type GoogleUserInfo = {
  id: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
};

type UserSessionRecord = {
  session_token: string;
  user_id: string;
  device_id: string;
  is_new_user?: boolean;
};

const identityProviderCode = "google";
const identityProviderName = "Google";

const normalizeSessionRecord = (value: unknown): UserSessionRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const sessionToken =
    typeof raw.session_token === "string" ? raw.session_token : null;
  const userId =
    typeof raw.user_id === "string" || typeof raw.user_id === "number"
      ? String(raw.user_id)
      : null;
  const deviceId =
    typeof raw.device_id === "string"
      ? raw.device_id
      : typeof raw.deviceId === "string"
        ? raw.deviceId
        : null;
  const isNewUser =
    typeof raw.is_new_user === "boolean"
      ? raw.is_new_user
      : typeof raw.isNewUser === "boolean"
        ? raw.isNewUser
        : undefined;

  if (!sessionToken || !userId || !deviceId) {
    return null;
  }

  return {
    session_token: sessionToken,
    user_id: userId,
    device_id: deviceId,
    is_new_user: isNewUser,
  };
};

const buildGoogleAuthUrl = () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL_V1;
  if (!apiBaseUrl) {
    return null;
  }

  const endpoint = "/api/auth/google/session";

  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, "");
  const normalizedPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
};

const upsertGoogleUserSessionViaBackend = async ({
  userInfo,
  deviceId,
  userAgent,
}: {
  userInfo: GoogleUserInfo;
  deviceId: string;
  userAgent: string;
}) => {
  const endpoint = buildGoogleAuthUrl();
  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        provider: identityProviderCode,
        device_id: deviceId,
        user_agent: userAgent,
        user_info: userInfo,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload: unknown = await response.json();
    const record = normalizeSessionRecord(payload);
    if (record) {
      return record;
    }

    if (
      payload &&
      typeof payload === "object" &&
      "data" in payload &&
      (payload as Record<string, unknown>).data
    ) {
      return normalizeSessionRecord((payload as Record<string, unknown>).data);
    }

    return null;
  } catch {
    return null;
  }
};

export async function GET(request: Request) {
  // Check if the request query contains the code
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/");
  }

  // Check all data against identity provider token endpoint
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.SECRET_GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return redirect("/");
  }

  // Get the access token from the identity provider based on the code
  const accessTokenResponse = await fetch(
    "https://accounts.google.com/o/oauth2/token",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    },
  );

  const accessToken = await accessTokenResponse.json();

  if (!accessTokenResponse.ok) {
    return redirect("/");
  }

  const { access_token } = accessToken;

  // Get the user info from identity provider based on the access token on the response
  const userInfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
  );

  const userInfo = await userInfoResponse.json();

  if (!userInfoResponse.ok) {
    return redirect("/");
  }

  // Create a hash based on the user agent and the user id
  const userAgent = request.headers.get("User-Agent") || "";
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${userAgent}-${userInfo.id}`),
  );
  const deviceId = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const userSession = await upsertGoogleUserSessionViaBackend({
    userInfo,
    deviceId,
    userAgent,
  });

  if (!userSession) {
    return redirect("/");
  }

  const cookieStore = await cookies();

  // Set cookie _b_ust (user session token)
  cookieStore.set("_b_ust", userSession.session_token, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  // Set cookie _b_uid (user id)
  cookieStore.set("_b_uid", userSession.user_id, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  // Set cookie _b_did (device id)
  cookieStore.set("_b_did", userSession.device_id, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  // Prepare user data for the cookie
  const cookieUserData = {
    provider_id: userInfo.email,
    name: userInfo.name ? userInfo.name : null,
    first_name: userInfo.given_name ? userInfo.given_name : null,
    last_name: userInfo.family_name ? userInfo.family_name : null,
    picture: userInfo.picture
      ? userInfo.picture
      : `${process.env.NEXT_PUBLIC_BASE_URL}/assets/images/user.png`,
    provider_name: identityProviderName,
  };

  // Set cookie _b_ud (user data)
  cookieStore.set("_b_ud", JSON.stringify(cookieUserData), {
    path: "/",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  if (cookieStore.has("_b_crt")) {
    // Get cookie named _b_crt
    const cookieCurrentRoute = cookieStore.get("_b_crt");

    if (cookieCurrentRoute && typeof cookieCurrentRoute.value === "string") {
      // Redirect page to the last visited page
      return redirect(cookieCurrentRoute.value);
    } else {
      // Redirect page to the home page
      return redirect("/");
    }
  } else {
    return redirect("/");
  }
}
