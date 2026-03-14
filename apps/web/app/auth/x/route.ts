import { upsertUserSessionViaBackend } from "@/lib/auth-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const identityProviderName = "X";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return redirect("/");
  }

  const clientId = process.env.NEXT_PUBLIC_X_CLIENT_ID;
  const clientSecret = process.env.SECRET_X_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_X_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return redirect("/");
  }

  const accessTokenResponse = await fetch(
    "https://api.twitter.com/2/oauth2/token",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        code,
        code_verifier: state,
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
    "https://api.twitter.com/2/users/me?user.fields=id,name,username,description,verified,verified_type,profile_image_url",
    {
      headers: {
        authorization: `Bearer ${access_token}`,
      },
    },
  );

  const userInfo = await userInfoResponse.json();
  if (!userInfoResponse.ok || !userInfo?.data?.id) {
    return redirect("/");
  }

  const userAgent = request.headers.get("User-Agent") || "";
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${userAgent}-${userInfo.data.id}`),
  );
  const deviceId = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const normalizedUserInfo = {
    ...userInfo.data,
  };

  const userSession = await upsertUserSessionViaBackend({
    provider: "x",
    userInfo: normalizedUserInfo,
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

  const firstName = userInfo.data.name
    ? userInfo.data.name.split(" ")[0]
    : null;
  const lastName = userInfo.data.name
    ? userInfo.data.name.split(" ").slice(1).join(" ")
    : null;

  const cookieUserData = {
    provider_id: userInfo.data.username ?? null,
    name: userInfo.data.name ? userInfo.data.name : null,
    first_name: firstName,
    last_name: lastName,
    picture: userInfo.data.profile_image_url
      ? userInfo.data.profile_image_url
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
