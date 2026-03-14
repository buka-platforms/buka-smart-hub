import { upsertUserSessionViaBackend } from "@/lib/auth-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const identityProviderName = "GitHub";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/");
  }

  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const clientSecret = process.env.SECRET_GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return redirect("/");
  }

  const accessTokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    },
  );

  const accessToken = await accessTokenResponse.json();
  if (!accessTokenResponse.ok) {
    return redirect("/");
  }

  const { access_token } = accessToken;
  const userInfoResponse = await fetch("https://api.github.com/user", {
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

  const userSession = await upsertUserSessionViaBackend({
    provider: "github",
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

  const firstName = userInfo.name ? userInfo.name.split(" ")[0] : "";
  const lastName = userInfo.name
    ? userInfo.name.split(" ").slice(1).join(" ")
    : "";

  const cookieUserData = {
    provider_id: userInfo.email ? userInfo.email : userInfo.login,
    name: userInfo.name ? userInfo.name : null,
    first_name: firstName,
    last_name: lastName,
    picture: userInfo.avatar_url
      ? userInfo.avatar_url
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
