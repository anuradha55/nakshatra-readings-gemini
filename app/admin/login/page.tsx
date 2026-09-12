import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";

const messages: Record<string, string> = {
  not_authorized: "This Google account is not authorized for the admin area.",
  unverified: "Please use a verified Google account.",
  invalid_state: "The Google sign-in session expired. Please try again.",
  auth_failed: "Google sign-in could not be completed. Please try again.",
  config: "Google sign-in is not configured yet.",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getAdminSession();
  if (session) redirect(session.role === "developer" ? "/admin/developer" : "/admin/astrologer");
  const params = await searchParams;
  const message = params.error ? messages[params.error] ?? "Unable to sign in." : "";

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0F0C24", color: "#F3EFE6" }}>
      <div style={{ width: "100%", maxWidth: 440, padding: 36, borderRadius: 24, border: "1px solid rgba(205,164,99,.28)", background: "linear-gradient(160deg,#211A55,#191345)", textAlign: "center" }}>
        <div style={{ color: "#CDA463", letterSpacing: ".14em", fontSize: 12, marginBottom: 12 }}>NAKSHATRA READINGS</div>
        <h1 style={{ fontFamily: "Georgia,serif", fontWeight: 500, marginBottom: 10 }}>Admin sign in</h1>
        <p style={{ color: "#B9B3D6", marginBottom: 26 }}>Sign in with your authorized Google account to open the correct dashboard.</p>
        {message && <p style={{ color: "#E48787", fontSize: 14, marginBottom: 18 }}>{message}</p>}
        <a href="/api/auth/google/start" style={{ display: "block", padding: "13px 20px", borderRadius: 999, background: "#F3EFE6", color: "#1A1440", textDecoration: "none", fontWeight: 600 }}>Continue with Google</a>
        <a href="/" style={{ display: "inline-block", marginTop: 20, color: "#CDA463", textDecoration: "none", fontSize: 14 }}>← Back to website</a>
      </div>
    </main>
  );
}
