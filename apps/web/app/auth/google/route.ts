import { upsertUserSessionViaBackend } from "@/lib/auth-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const identityProviderName = "Google";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/");
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.SECRET_GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return redirect("/");
  }

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

  const userAgent = request.headers.get("User-Agent") || "";
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${userAgent}-${userInfo.id}`),
  );
  const deviceId = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const userSession = await upsertUserSessionViaBackend({
    provider: "google",
    userInfo,
    deviceId,
    userAgent,
  });

  if (!userSession) {
    return redirect("/");
  }

  const cookieStore = await cookies();

  cookieStore.set("_b_ust", userSession.session_token, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set("_b_uid", userSession.user_id, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set("_b_did", userSession.device_id, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
  });

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

  cookieStore.set("_b_ud", JSON.stringify(cookieUserData), {
    path: "/",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
  });

  if (cookieStore.has("_b_crt")) {
    const cookieCurrentRoute = cookieStore.get("_b_crt");

    if (cookieCurrentRoute && typeof cookieCurrentRoute.value === "string") {
      return redirect(cookieCurrentRoute.value);
    }
  }

  return redirect("/");
}
