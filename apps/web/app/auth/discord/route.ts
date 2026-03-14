import { upsertUserSessionViaBackend } from "@/lib/auth-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const identityProviderName = "Discord";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/");
  }

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const clientSecret = process.env.SECRET_DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return redirect("/");
  }

  const accessTokenResponse = await fetch(
    "https://discord.com/api/oauth2/token",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
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
  const userInfoResponse = await fetch("https://discord.com/api/users/@me", {
    headers: {
      authorization: `Bearer ${access_token}`,
    },
  });

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

  const normalizedUserInfo = {
    ...userInfo,
    avatar_url: userInfo.avatar
      ? `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}`
      : null,
  };

  const userSession = await upsertUserSessionViaBackend({
    provider: "discord",
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

  const firstName = userInfo.global_name
    ? userInfo.global_name.split(" ")[0]
    : null;
  const lastName = userInfo.global_name
    ? userInfo.global_name.split(" ").slice(1).join(" ")
    : null;

  const cookieUserData = {
    provider_id: null,
    name: userInfo.global_name ? userInfo.global_name : null,
    first_name: firstName,
    last_name: lastName,
    picture: normalizedUserInfo.avatar_url
      ? normalizedUserInfo.avatar_url
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
