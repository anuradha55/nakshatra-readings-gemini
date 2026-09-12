import { requireAdminRole } from "@/lib/admin-auth";
import AdminDashboard from "@/components/AdminDashboard";

export default async function AstrologerDashboardPage() {
  const session = await requireAdminRole("astrologer");
  return <AdminDashboard role="astrologer" name={session.name} email={session.email} />;
}
