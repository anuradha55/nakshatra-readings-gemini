import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/admin-auth";

export async function POST(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}
