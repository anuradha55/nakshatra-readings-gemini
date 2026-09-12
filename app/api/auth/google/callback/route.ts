import { NextResponse } from "next/server";
import { consumeOAuthState, googleOAuthConfig, roleForEmail, setSessionCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const expectedState = await consumeOAuthState();
    if (error) return NextResponse.redirect(new URL(`/admin/login?error=${encodeURIComponent(error)}`, appUrl));
    if (!code || !state || !expectedState || state !== expectedState) return NextResponse.redirect(new URL("/admin/login?error=invalid_state", appUrl));

    const { clientId, clientSecret, redirectUri } = googleOAuthConfig();
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
      cache: "no-store",
    });
    if (!tokenRes.ok) throw new Error("Google token exchange failed.");
    const tokens = await tokenRes.json() as { access_token?: string };
    if (!tokens.access_token) throw new Error("Google did not return an access token.");

    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });
    if (!userRes.ok) throw new Error("Unable to read Google account information.");
    const user = await userRes.json() as { email?: string; name?: string; picture?: string; email_verified?: boolean };
    const email = user.email?.trim().toLowerCase();
    if (!email || user.email_verified === false) return NextResponse.redirect(new URL("/admin/login?error=unverified", appUrl));

    const role = roleForEmail(email);
    if (!role) return NextResponse.redirect(new URL("/admin/login?error=not_authorized", appUrl));

    await setSessionCookie({ email, name: user.name || email, picture: user.picture, role });
    return NextResponse.redirect(new URL(role === "developer" ? "/admin/developer" : "/admin/astrologer", appUrl));
  } catch (error) {
    console.error("GOOGLE_AUTH_CALLBACK_ERROR", error);
    return NextResponse.redirect(new URL("/admin/login?error=auth_failed", appUrl));
  }
}
