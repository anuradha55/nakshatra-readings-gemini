import { requireAdminRole } from "@/lib/admin-auth";
import AdminDashboard from "@/components/AdminDashboard";

export default async function DeveloperDashboardPage() {
  const session = await requireAdminRole("developer");
  return <AdminDashboard role="developer" name={session.name} email={session.email} />;
}
