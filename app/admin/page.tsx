import { redirect } from "next/navigation";
import { requireAdminRole } from "@/lib/admin-auth";

export default async function AdminPage() {
  const session = await requireAdminRole();
  redirect(session.role === "developer" ? "/admin/developer" : "/admin/astrologer");
}
