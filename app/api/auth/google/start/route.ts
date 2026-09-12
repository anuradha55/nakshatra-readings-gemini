import { NextResponse } from "next/server";
import crypto from "crypto";
import { googleOAuthConfig, setOAuthState } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { clientId, redirectUri } = googleOAuthConfig();
    const state = crypto.randomBytes(32).toString("hex");
    await setOAuthState(state);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("GOOGLE_AUTH_START_ERROR", error);
    return NextResponse.redirect(new URL("/admin/login?error=config", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }
}
