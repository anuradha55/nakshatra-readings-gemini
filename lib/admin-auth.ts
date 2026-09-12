import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AdminRole = "developer" | "astrologer";
export type AdminSession = { email: string; name: string; picture?: string; role: AdminRole };

const COOKIE_NAME = "nr_admin_session";
const STATE_COOKIE = "nr_google_oauth_state";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  return value;
}

function b64(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function roleForEmail(email: string): AdminRole | null {
  const normalized = email.trim().toLowerCase();
  const developers = (process.env.DEVELOPER_EMAILS ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const astrologers = (process.env.ASTROLOGER_EMAILS ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (developers.includes(normalized)) return "developer";
  if (astrologers.includes(normalized)) return "astrologer";
  return null;
}

export function createSessionToken(session: AdminSession) {
  const payload = b64(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

function readSessionToken(token: string | undefined): AdminSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !crypto.timingSafeEqual(Buffer.from(sign(payload)), Buffer.from(signature))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    return session?.email && session?.name && (session.role === "developer" || session.role === "astrologer") && roleForEmail(session.email) === session.role ? session : null;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const store = await cookies();
  return readSessionToken(store.get(COOKIE_NAME)?.value);
}

export async function requireAdminRole(role?: AdminRole) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (role && session.role !== role) redirect(session.role === "developer" ? "/admin/developer" : "/admin/astrologer");
  return session;
}

export async function setSessionCookie(session: AdminSession) {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !clientSecret || !appUrl) throw new Error("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and NEXT_PUBLIC_APP_URL must be configured.");
  return { clientId, clientSecret, redirectUri: `${appUrl.replace(/\/$/, "")}/api/auth/google/callback` };
}

export async function setOAuthState(state: string) {
  const store = await cookies();
  store.set(STATE_COOKIE, state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
}

export async function consumeOAuthState() {
  const store = await cookies();
  const value = store.get(STATE_COOKIE)?.value;
  store.set(STATE_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return value;
}
