import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  const user = await getAuthenticatedUser();
  if (!user?.isAdmin) {
    redirect("/");
  }
  return <AdminDashboard />;
}
